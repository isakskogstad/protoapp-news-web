#!/usr/bin/env python3
"""
Fetch missing annual reports from Bolagsverket API
and upload to Supabase Storage
"""

import os
import sys
import json
import time
import zipfile
import tempfile
import requests
from io import BytesIO
from datetime import datetime
from supabase import create_client

# Configuration
BOLAGSVERKET_CLIENT_ID = "UIiATHgXGSP6HIyOlqWZkX51dnka"
BOLAGSVERKET_CLIENT_SECRET = "H10hBNr_KeYqA9h5AEe7J32HkFsa"
BOLAGSVERKET_TOKEN_URL = "https://portal.api.bolagsverket.se/oauth2/token"
BOLAGSVERKET_API_BASE = "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://rpjmsncjnhtnjnycabys.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwam1zbmNqbmh0bmpueWNhYnlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTQ5MjE4MCwiZXhwIjoyMDUxMDY4MTgwfQ.s3g-x8IcxnWGLdIQxfz-7U_e0Yme0LGtQ6QKJiJPPxM")

STORAGE_BUCKET = "annual-reports"
RATE_LIMIT_DELAY = 0.05  # seconds between API calls (20 req/s limit)


class BolagsverketClient:
    def __init__(self):
        self.access_token = None
        self.token_expires_at = 0

    def get_token(self):
        """Get or refresh access token"""
        if self.access_token and time.time() < self.token_expires_at - 60:
            return self.access_token

        response = requests.post(
            BOLAGSVERKET_TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "client_credentials",
                "client_id": BOLAGSVERKET_CLIENT_ID,
                "client_secret": BOLAGSVERKET_CLIENT_SECRET,
                "scope": "vardefulla-datamangder:read vardefulla-datamangder:ping"
            }
        )
        response.raise_for_status()
        data = response.json()

        self.access_token = data["access_token"]
        self.token_expires_at = time.time() + data.get("expires_in", 3600)
        return self.access_token

    def get_document_list(self, org_number: str) -> list:
        """Get list of available annual reports for a company"""
        # Remove hyphen if present
        org_number_clean = org_number.replace("-", "")

        token = self.get_token()
        response = requests.post(
            f"{BOLAGSVERKET_API_BASE}/dokumentlista",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"identitetsbeteckning": org_number_clean}
        )

        if response.status_code == 404:
            return []

        response.raise_for_status()
        return response.json().get("dokument", [])

    def download_document(self, dokument_id: str) -> bytes:
        """Download annual report ZIP file"""
        token = self.get_token()
        response = requests.get(
            f"{BOLAGSVERKET_API_BASE}/dokument/{dokument_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.content


def get_missing_companies(supabase) -> list:
    """Get companies that don't have annual reports"""
    result = supabase.rpc(
        "get_companies_missing_annual_reports",
        {}
    ).execute()

    # If RPC doesn't exist, use direct query
    if not result.data:
        # Get all watched companies
        watched = supabase.table("WatchedCompany").select("orgNumber,name").execute()
        watched_orgs = {c["orgNumber"] for c in watched.data}

        # Get companies with annual reports
        reports = supabase.table("AnnualReport").select("orgNumber").execute()
        has_report_orgs = {r["orgNumber"] for r in reports.data}

        # Return missing
        missing = [
            {"orgNumber": c["orgNumber"], "name": c["name"]}
            for c in watched.data
            if c["orgNumber"] not in has_report_orgs
        ]
        return missing

    return result.data


def extract_xhtml_from_zip(zip_content: bytes) -> tuple[str, bytes]:
    """Extract the largest XHTML file from ZIP (that's the full annual report)"""
    with zipfile.ZipFile(BytesIO(zip_content)) as zf:
        xhtml_files = [
            (name, zf.getinfo(name).file_size)
            for name in zf.namelist()
            if name.endswith(".xhtml")
        ]

        if not xhtml_files:
            raise ValueError("No XHTML files in ZIP")

        # Get largest file (full annual report, not just audit report)
        largest = max(xhtml_files, key=lambda x: x[1])
        return largest[0], zf.read(largest[0])


def upload_to_storage(supabase, org_number: str, fiscal_year: str, content: bytes, dokument_id: str) -> str:
    """Upload XHTML to Supabase Storage"""
    org_clean = org_number.replace("-", "")
    storage_path = f"{org_clean}/{org_number}.{fiscal_year}.xhtml"

    # Check if already exists
    try:
        existing = supabase.storage.from_(STORAGE_BUCKET).list(org_clean)
        if any(f["name"] == f"{org_number}.{fiscal_year}.xhtml" for f in existing):
            print(f"  Already exists: {storage_path}")
            return storage_path
    except:
        pass

    # Upload
    supabase.storage.from_(STORAGE_BUCKET).upload(
        storage_path,
        content,
        {"content-type": "application/xhtml+xml"}
    )

    return storage_path


def insert_annual_report(supabase, org_number: str, dokument_id: str, fiscal_year: str, storage_path: str):
    """Insert record into AnnualReport table"""
    # Check if exists
    existing = supabase.table("AnnualReport")\
        .select("id")\
        .eq("orgNumber", org_number)\
        .eq("fiscalYear", int(fiscal_year))\
        .execute()

    if existing.data:
        print(f"  Record exists: {org_number} {fiscal_year}")
        return

    supabase.table("AnnualReport").insert({
        "orgNumber": org_number,
        "dokumentId": dokument_id,
        "fiscalYear": int(fiscal_year),
        "storagePath": storage_path,
        "sourceType": "bolagsverket_api",
        "fetchedAt": datetime.utcnow().isoformat()
    }).execute()


def main():
    print("=== Bolagsverket Annual Report Fetcher ===\n")

    # Initialize clients
    bv = BolagsverketClient()
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get companies missing annual reports
    print("Fetching companies missing annual reports...")

    # Direct query since RPC might not exist
    watched = supabase.table("WatchedCompany").select("orgNumber,name").execute()
    reports = supabase.table("AnnualReport").select("orgNumber").execute()

    watched_dict = {c["orgNumber"]: c["name"] for c in watched.data}
    has_report_orgs = {r["orgNumber"] for r in reports.data}

    missing = [
        {"orgNumber": org, "name": name}
        for org, name in watched_dict.items()
        if org not in has_report_orgs
    ]

    print(f"Found {len(missing)} companies missing annual reports\n")

    # Stats
    stats = {
        "processed": 0,
        "found_documents": 0,
        "downloaded": 0,
        "uploaded": 0,
        "errors": 0,
        "no_documents": 0
    }

    # Process each company
    for i, company in enumerate(missing):
        org_number = company["orgNumber"]
        name = company.get("name", "Unknown")

        print(f"[{i+1}/{len(missing)}] {name} ({org_number})")

        try:
            # Get document list
            documents = bv.get_document_list(org_number)
            stats["processed"] += 1

            if not documents:
                print(f"  No documents available")
                stats["no_documents"] += 1
                time.sleep(RATE_LIMIT_DELAY)
                continue

            stats["found_documents"] += len(documents)
            print(f"  Found {len(documents)} document(s)")

            # Process each document
            for doc in documents:
                dokument_id = doc["dokumentId"]
                fiscal_year_end = doc.get("rapporteringsperiodTom", "")

                # Extract year from fiscal year end date (e.g., "2024-12-31" -> "2024")
                if fiscal_year_end:
                    fiscal_year = fiscal_year_end.split("-")[0]
                else:
                    fiscal_year = "unknown"

                print(f"  Downloading {dokument_id} (FY {fiscal_year})...")

                try:
                    # Download ZIP
                    zip_content = bv.download_document(dokument_id)
                    stats["downloaded"] += 1

                    # Extract XHTML
                    filename, xhtml_content = extract_xhtml_from_zip(zip_content)

                    # Skip small files (audit reports only)
                    if len(xhtml_content) < 50000:
                        print(f"    Skipping small file ({len(xhtml_content)} bytes) - likely audit report only")
                        continue

                    # Upload to storage
                    storage_path = upload_to_storage(supabase, org_number, fiscal_year, xhtml_content, dokument_id)
                    print(f"    Uploaded: {storage_path}")

                    # Insert record
                    insert_annual_report(supabase, org_number, dokument_id, fiscal_year, storage_path)
                    stats["uploaded"] += 1

                except Exception as e:
                    print(f"    Error processing document: {e}")
                    stats["errors"] += 1

                time.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            print(f"  Error: {e}")
            stats["errors"] += 1

        time.sleep(RATE_LIMIT_DELAY)

        # Progress update every 50 companies
        if (i + 1) % 50 == 0:
            print(f"\n--- Progress: {i+1}/{len(missing)} ---")
            print(f"Downloaded: {stats['downloaded']}, Uploaded: {stats['uploaded']}, Errors: {stats['errors']}\n")

    # Final stats
    print("\n=== COMPLETE ===")
    print(f"Processed: {stats['processed']} companies")
    print(f"Documents found: {stats['found_documents']}")
    print(f"Downloaded: {stats['downloaded']}")
    print(f"Uploaded: {stats['uploaded']}")
    print(f"No documents: {stats['no_documents']}")
    print(f"Errors: {stats['errors']}")


if __name__ == "__main__":
    main()
