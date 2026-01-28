#!/usr/bin/env python3
"""
Parse iXBRL annual reports and extract financial data to CompanyFinancials table.
Also extracts auditor info, business description, and significant events.
Uses Swedish XBRL taxonomy (se-gen-base, se-cd-base).
"""

import os
import re
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from decimal import Decimal, InvalidOperation

# Configuration
SUPABASE_URL = "https://rpjmsncjnhtnjnycabys.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwam1zbmNqbmh0bmpueWNhYnlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkxNjg2MCwiZXhwIjoyMDgzNDkyODYwfQ.Q7a5N0x0W7gQxKW2kHmzuw2h2jLppyIU6eOy62N20SA")
STORAGE_BUCKET = "annual-reports"

# Text fields to extract (not numeric) - Svenska kolumnnamn
TEXT_FIELDS = {
    # Revisor
    "ValtRevisionsbolagsnamn": "revisionsbolag",  # se-cd-base
    "ValtRevisionsbolagNamn": "revisionsbolag",   # se-ar-base variant

    # Verksamhetsbeskrivning
    "AllmantVerksamheten": "verksamhetsbeskrivning",
    "VerksamhetenArtInriktning": "verksamhetsbeskrivning",

    # Väsentliga händelser
    "ViktigaForhallandenVasentligaHandelser": "vasentliga_handelser",
    "VasentligaHandelserRakenskapsaret": "vasentliga_handelser",

    # Händelser efter bokslut
    "OvrigaViktigaForhallandenVasentligaHandelser": "handelser_efter_bokslut",
    "VasentligaHandelserEfterRakenskapsaretsSlut": "handelser_efter_bokslut",
}

# XBRL tag to database field mapping - COMPREHENSIVE (Svenska kolumnnamn)
# Maps Swedish XBRL taxonomy tags to Swedish database column names
XBRL_MAPPING = {
    # === RESULTATRÄKNING ===

    # Rörelseintäkter
    "Nettoomsattning": "nettoomsattning",
    "NettoomssattningOrganisationsredovisning": "nettoomsattning",
    "AktiveratArbeteEgenRakning": "aktiverat_arbete",
    "OvrigaRorelseintakter": "ovriga_rorelseintakter",
    "RorelseintakterLagerforandringarMm": "summa_rorelseintakter",

    # Rörelsekostnader
    "RavarorFornodenheterKostnader": "ravaror_fornodenheter",
    "HandelsvarorKostnader": "handelsvaror",
    "OvrigaExternaKostnader": "ovriga_externa_kostnader",
    "Personalkostnader": "personalkostnader",
    "AvskrivningarNedskrivningarMateriellaImmateriellaAnlaggningstillgangar": "avskrivningar",
    "AvskrivningarNedskrivningar": "avskrivningar",
    "OvrigaRorelsekostnader": "ovriga_rorelsekostnader",
    "Rorelsekostnader": "summa_rorelsekostnader",

    # Rörelseresultat
    "Rorelseresultat": "rorelseresultat",

    # Finansiella poster
    "OvrigaRanteintakterLiknandeResultatposter": "ranteintakter",
    "RantekostnaderLiknandeResultatposter": "rantekostnader",
    "FinansiellaPoster": "finansiella_poster",
    "ResultatEfterFinansiellaPoster": "resultat_efter_finansiella",

    # Bokslutsdispositioner
    "Bokslutsdispositioner": "bokslutsdispositioner",
    "ForandringPeriodiseringsfond": "forandring_periodiseringsfond",
    "ForandringOveravskrivningar": "forandring_overavskrivningar",
    "ErhallnaKoncernbidrag": "erhallna_koncernbidrag",
    "LamnadeKoncernbidrag": "lamnade_koncernbidrag",

    # Skatt och resultat
    "ResultatForeSkatt": "resultat_fore_skatt",
    "SkattAretsResultat": "skatt",
    "AretsResultat": "arets_resultat",
    "AretsResultatEgetKapital": "arets_resultat_ek",

    # === BALANSRÄKNING - TILLGÅNGAR ===

    # Immateriella anläggningstillgångar
    "ImmateriellaAnlaggningstillgangar": "immateriella_anlaggningstillgangar",
    "BalanseradeUtgifterUtvecklingsarbetenLiknandeArbeten": "balanserade_utgifter_utveckling",
    "KoncessionerPatentLicenserVarumarkenLiknandeRattigheter": "patent_licenser",
    "Goodwill": "goodwill",
    "HyresratterLiknandeRattigheter": "hyresratter",

    # Materiella anläggningstillgångar
    "MateriellaAnlaggningstillgangar": "materiella_anlaggningstillgangar",
    "ByggnaderMark": "byggnader_mark",
    "MaskinerAndraTekniskaAnlaggningar": "maskiner_inventarier",
    "InventarierVerktygInstallationer": "inventarier_verktyg",
    "ForbattringsutgifterAnnansFastighet": "forbattringsutgifter_fastighet",
    "PagaendeNyanlaggningarForskottMateriellaAnlaggningstillgangar": "pagaende_nyanlaggningar",

    # Finansiella anläggningstillgångar
    "FinansiellaAnlaggningstillgangar": "finansiella_anlaggningstillgangar",
    "AndelarKoncernforetag": "andelar_koncernforetag",
    "FordringarKoncernforetag": "fordringar_koncernforetag",
    "AndelarIntresseforetagGemensamtStyrdaForetag": "andelar_intresseforetag",
    "AndraLangfristigaVardepappersinnehav": "ovriga_vardepapper",
    "AndraLangfristigaFordringar": "ovriga_langfristiga_fordringar",

    # Summa anläggningstillgångar
    "Anlaggningstillgangar": "anlaggningstillgangar",

    # Omsättningstillgångar
    "VarulagerMm": "varulager",
    "Kundfordringar": "kundfordringar",
    "FordringarKoncernforetagKortfristiga": "fordringar_koncernforetag_kort",
    "OvrigaFordringarKortfristiga": "ovriga_fordringar",
    "OvrigaKortfristigaFordringar": "ovriga_fordringar",
    "KortfristigaFordringar": "kortfristiga_fordringar",
    "ForutbetaldaKostnaderUpplupnaIntakter": "forutbetalda_kostnader",
    "KortfristigaPlaceringar": "kortfristiga_placeringar",
    "KassaBank": "kassa_bank",
    "KassaBankExklRedovisningsmedel": "kassa_bank",

    # Summa omsättningstillgångar och totalt
    "Omsattningstillgangar": "omsattningstillgangar",
    "Tillgangar": "summa_tillgangar",

    # === BALANSRÄKNING - EGET KAPITAL & SKULDER ===

    # Eget kapital
    "Aktiekapital": "aktiekapital",
    "Overkursfond": "overkursfond",
    "Uppskrivningsfond": "uppskrivningsfond",
    "Reservfond": "reservfond",
    "FondUtvecklingsutgifter": "fond_utvecklingsutgifter",
    "BundetEgetKapital": "bundet_eget_kapital",
    "BalanseratResultat": "balanserat_resultat",
    "FrittEgetKapital": "fritt_eget_kapital",
    "EgetKapital": "eget_kapital",

    # Obeskattade reserver
    "ObeskattadeReserver": "obeskattade_reserver",
    "Periodiseringsfonder": "periodiseringsfonder",
    "AckumuleradeOveravskrivningar": "ackumulerade_overavskrivningar",

    # Avsättningar
    "Avsattningar": "avsattningar",
    "AvsattningarPensioner": "pensionsavsattningar",

    # Långfristiga skulder
    "LangfristigaSkulder": "langfristiga_skulder",
    "OvrigaLangfristigaSkulderKreditinstitut": "bankskulder_langfristiga",
    "SkulderKoncernforetagLangfristiga": "skulder_koncernforetag_lang",
    "LangfristigaSkulderForfallerSenare5Ar": "skulder_forfaller_5_ar",

    # Kortfristiga skulder
    "KortfristigaSkulder": "kortfristiga_skulder",
    "OvrigaKortfristigaSkulderKreditinstitut": "bankskulder_kortfristiga",
    "Leverantorsskulder": "leverantorsskulder",
    "SkulderKoncernforetagKortfristiga": "skulder_koncernforetag_kort",
    "Skatteskulder": "skatteskulder",
    "OvrigaKortfristigaSkulder": "ovriga_kortfristiga_skulder",
    "UpplupnaKostnaderForutbetaldaIntakter": "upplupna_kostnader",

    # Summa
    "EgetKapitalSkulder": "summa_eget_kapital_skulder",

    # === NYCKELTAL ===
    "Soliditet": "soliditet",
    "Likviditet": "likviditet",
    "Avkastning": "avkastning_eget_kapital",
    "Rantabilitet": "rantabilitet",

    # === ANSTÄLLDA ===
    "MedelantaletAnstallda": "medelantal_anstallda",
    "AntalAnstallda": "antal_anstallda",

    # === AKTIEDATA ===
    "AntalAktier": "antal_aktier",

    # === UTDELNING ===
    "ForslagDispositionUtdelning": "forslagen_utdelning",
    "ForslagDispositionBalanserasINyRakning": "balanseras_i_ny_rakning",
    "ForslagDisposition": "resultatdisposition",

    # === STÄLLDA SÄKERHETER ===
    "StalldaSakerheterForetagsinteckningar": "stallda_sakerheter_inteckningar",
    "StalldaSakerheterTillgangarAganderattsforbehall": "stallda_sakerheter_agande",
    "StalldaSakerheter": "summa_stallda_sakerheter",

    # === EVENTUALFÖRPLIKTELSER ===
    "Eventualforpliktelser": "eventualforpliktelser",
    "Ansvarsforpliktelser": "borgensforpliktelser",
}

# Namespaces to search
NAMESPACES = [
    "se-gen-base",
    "se-cd-base",
    "se-k2-base",
    "se-k3-base",
]


def download_xhtml(storage_path: str) -> str:
    """Download XHTML file from Supabase Storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"
    response = requests.get(url)
    if response.status_code == 200:
        # Force UTF-8 encoding to handle Swedish characters correctly
        response.encoding = 'utf-8'
        return response.text
    return None


def parse_value(element) -> float:
    """Parse XBRL value considering scale and sign attributes."""
    try:
        text = element.get_text(strip=True)
        if not text:
            return None

        # Remove spaces and replace comma with dot
        text = text.replace(" ", "").replace(",", ".").replace("\xa0", "")

        # Parse base value
        value = float(text)

        # Apply scale (e.g., scale="3" means thousands)
        scale = element.get("scale")
        if scale:
            value *= 10 ** int(scale)

        # Apply sign
        sign = element.get("sign")
        if sign == "-":
            value = -abs(value)

        return value
    except (ValueError, InvalidOperation):
        return None


def get_context_year(soup, context_ref: str) -> int:
    """Extract the year from a context reference."""
    if not context_ref:
        return None

    # Find context element
    context = soup.find(attrs={"id": context_ref})
    if not context:
        # Try lowercase
        context = soup.find(attrs={"id": context_ref.lower()})

    if context:
        # Look for period end date
        period_end = context.find(["xbrli:enddate", "enddate", "instant"])
        if period_end:
            date_text = period_end.get_text(strip=True)
            match = re.search(r"(\d{4})", date_text)
            if match:
                return int(match.group(1))

    # Fallback: extract year from context name
    match = re.search(r"(\d{4})", context_ref)
    if match:
        return int(match.group(1))

    return None


def get_all_years_from_contexts(soup) -> dict:
    """Extract all years from context definitions and map context IDs to years."""
    context_years = {}

    # Find all context elements
    for context in soup.find_all(["xbrli:context", "context"]):
        context_id = context.get("id")
        if not context_id:
            continue

        # Look for period end date or instant
        period_end = context.find(["xbrli:enddate", "enddate", "xbrli:instant", "instant"])
        if period_end:
            date_text = period_end.get_text(strip=True)
            match = re.search(r"(\d{4})-(\d{2})-(\d{2})", date_text)
            if match:
                context_years[context_id] = int(match.group(1))
                context_years[context_id.lower()] = int(match.group(1))

    return context_years


def extract_text_field(soup, xbrl_tag: str) -> str:
    """Extract text content from XBRL element."""
    # Try different namespace prefixes
    for ns in NAMESPACES + ["se-cd-base", "se-ar-base"]:
        full_tag = f"{ns}:{xbrl_tag}".lower()
        elements = soup.find_all(attrs={"name": re.compile(full_tag, re.IGNORECASE)})
        for el in elements:
            text = el.get_text(strip=True)
            if text and len(text) > 5:  # Ignore very short texts
                return text[:5000]  # Limit length
    return None


def extract_auditor_name(soup) -> str:
    """Extract auditor name from signature elements."""
    # Look for auditor signature
    first_name = None
    last_name = None

    for el in soup.find_all(attrs={"name": lambda x: x and "UnderskriftHandling" in x}):
        name_attr = el.get("name", "")
        text = el.get_text(strip=True)

        if not text:
            continue

        # Check if this is an auditor (check title element nearby or in same tuple)
        if "Tilltalsnamn" in name_attr:
            # Look for title in siblings or parent
            parent = el.parent
            title_el = parent.find(attrs={"name": lambda x: x and "Titel" in x}) if parent else None
            if title_el:
                title = title_el.get_text(strip=True).lower()
                if "revisor" in title:
                    first_name = text
        elif "Efternamn" in name_attr:
            # Store as potential last name
            last_name = text
        elif "Titel" in name_attr:
            title = text.lower()
            if "revisor" in title and first_name and last_name:
                return f"{first_name} {last_name}"

    # Fallback: look for revisor in se-ar-base namespace
    for el in soup.find_all(attrs={"name": lambda x: x and "UnderskriftRevisionsberattelseRevisor" in x}):
        name_attr = el.get("name", "")
        text = el.get_text(strip=True)
        if "Tilltalsnamn" in name_attr:
            first_name = text
        elif "Efternamn" in name_attr:
            last_name = text

    if first_name and last_name:
        return f"{first_name} {last_name}"

    return None


def extract_financials(xhtml_content: str, org_number: str, fiscal_year: int) -> dict:
    """Extract financial data from iXBRL content for a single year."""
    all_years = extract_financials_all_years(xhtml_content, org_number)
    return all_years.get(fiscal_year)


def extract_financials_all_years(xhtml_content: str, org_number: str) -> dict:
    """Extract financial data from iXBRL content for ALL years in the document.

    Returns: dict mapping year -> financials dict
    """
    soup = BeautifulSoup(xhtml_content, "html.parser")

    # Get all context years
    context_years = get_all_years_from_contexts(soup)
    all_years = set(context_years.values())

    # Initialize financials for each year
    financials_by_year = {}
    for year in all_years:
        financials_by_year[year] = {
            "orgNumber": org_number,
            "fiscalYear": year,
            "source": "xbrl_parser",
            "currency": "SEK",
        }

    # Track which fields we found per year
    found_fields_by_year = {year: set() for year in all_years}

    # Find all XBRL tagged elements (numeric)
    for ns in NAMESPACES:
        for xbrl_tag, db_field in XBRL_MAPPING.items():
            # Search for the tag with namespace prefix
            full_tag = f"{ns}:{xbrl_tag}".lower()
            elements = soup.find_all(attrs={"name": re.compile(full_tag, re.IGNORECASE)})

            # Also try finding by tag name directly
            if not elements:
                elements = soup.find_all(re.compile(f"^(ix:|){xbrl_tag}$", re.IGNORECASE))

            # Also search in ix:nonfraction elements
            if not elements:
                for el in soup.find_all(["ix:nonfraction", "ix:nonnumeric"]):
                    name = el.get("name", "")
                    if xbrl_tag.lower() in name.lower():
                        elements.append(el)

            for element in elements:
                # Get context and year
                context_ref = element.get("contextref", element.get("contextRef"))
                if not context_ref:
                    continue

                # Get year from context mapping
                element_year = context_years.get(context_ref) or context_years.get(context_ref.lower())
                if not element_year:
                    element_year = get_context_year(soup, context_ref)

                if not element_year or element_year not in financials_by_year:
                    continue

                # Skip if already found this field for this year
                if db_field in found_fields_by_year[element_year]:
                    continue

                value = parse_value(element)
                if value is not None:
                    financials_by_year[element_year][db_field] = value
                    found_fields_by_year[element_year].add(db_field)

    # Extract text fields (apply to all years - they're usually the same)
    shared_text_fields = {}
    for xbrl_tag, db_field in TEXT_FIELDS.items():
        text = extract_text_field(soup, xbrl_tag)
        if text:
            shared_text_fields[db_field] = text

    # Extract auditor name
    auditor_name = extract_auditor_name(soup)
    if auditor_name:
        shared_text_fields["revisor_namn"] = auditor_name

    # Apply shared text fields to all years
    for year in financials_by_year:
        for field, value in shared_text_fields.items():
            if field not in found_fields_by_year[year]:
                financials_by_year[year][field] = value
                found_fields_by_year[year].add(field)

    # Filter out years with no data
    base_fields = ["orgNumber", "fiscalYear", "source", "currency"]
    result = {}
    for year, data in financials_by_year.items():
        field_count = len([k for k in data.keys() if k not in base_fields])
        if field_count > 0:
            result[year] = data

    return result


def get_unparsed_reports() -> list:
    """Get list of annual reports without extracted financials."""
    query = """
    SELECT ar."orgNumber", ar."fiscalYear", ar."storagePath"
    FROM "AnnualReport" ar
    LEFT JOIN "CompanyFinancials" cf
      ON ar."orgNumber" = cf."orgNumber"
      AND ar."fiscalYear" = cf."fiscalYear"
    WHERE cf.id IS NULL
      AND ar."storagePath" IS NOT NULL
      AND ar."storagePath" LIKE '%.xhtml'
    ORDER BY ar."orgNumber", ar."fiscalYear"
    """

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/sql",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
        },
        json={"query": query}
    )

    # Fallback: use REST API
    if response.status_code != 200:
        # Get all annual reports
        ar_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/AnnualReport?select=orgNumber,fiscalYear,storagePath&storagePath=like.*.xhtml",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
            }
        )

        # Get all company financials
        cf_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/CompanyFinancials?select=orgNumber,fiscalYear",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
            }
        )

        if ar_response.status_code == 200 and cf_response.status_code == 200:
            ar_data = ar_response.json()
            cf_data = cf_response.json()

            # Create set of existing (orgNumber, fiscalYear) pairs
            existing = {(cf["orgNumber"], cf["fiscalYear"]) for cf in cf_data}

            # Filter unparsed
            unparsed = [
                ar for ar in ar_data
                if ar.get("storagePath") and
                   ar["storagePath"].endswith(".xhtml") and
                   (ar["orgNumber"], ar["fiscalYear"]) not in existing
            ]
            return unparsed

    return response.json() if response.status_code == 200 else []


def insert_financials(financials: dict) -> tuple:
    """Insert or update financials in database.
    Returns: (success: bool, was_update: bool)
    """
    # Convert integer fields (bigint/integer columns)
    int_fields = ["antal_aktier", "antal_anstallda", "medelantal_anstallda"]
    for field in int_fields:
        if field in financials and financials[field] is not None:
            try:
                financials[field] = int(float(financials[field]))
            except (ValueError, TypeError):
                del financials[field]  # Remove invalid values

    org_number = financials.get("orgNumber")
    fiscal_year = financials.get("fiscalYear")

    # First try INSERT
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/CompanyFinancials",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=financials
    )

    if response.status_code in [200, 201]:
        return (True, False)  # Inserted

    # If duplicate, do PATCH to update
    if response.status_code == 409 or "duplicate" in response.text.lower():
        # Remove id field if present (can't update primary key)
        update_data = {k: v for k, v in financials.items() if k not in ["id"]}

        patch_response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/CompanyFinancials?orgNumber=eq.{org_number}&fiscalYear=eq.{fiscal_year}',
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json",
            },
            json=update_data
        )

        if patch_response.status_code in [200, 204]:
            return (True, True)  # Updated
        else:
            print(f"\n  PATCH failed: {patch_response.status_code} - {patch_response.text[:200]}")
            return (False, True)

    print(f"\n  INSERT failed: {response.status_code} - {response.text[:200]}")
    return (False, False)


def update_watched_company(org_number: str, revisionsbolag: str = None, revisor_namn: str = None, verksamhetsbeskrivning: str = None) -> bool:
    """Update WatchedCompany with auditor and business description."""
    update_data = {}
    if revisionsbolag:
        update_data["revisionsbolag"] = revisionsbolag
    if revisor_namn:
        update_data["revisor_namn"] = revisor_namn
    if verksamhetsbeskrivning:
        update_data["verksamhetsbeskrivning"] = verksamhetsbeskrivning[:2000]  # Limit length

    if not update_data:
        return True

    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/WatchedCompany?orgNumber=eq.{org_number}",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
        },
        json=update_data
    )
    return response.status_code in [200, 204]


def get_all_reports() -> list:
    """Get ALL annual reports with storage paths."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/AnnualReport?select=orgNumber,fiscalYear,storagePath&storagePath=like.*.xhtml",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
        }
    )
    if response.status_code == 200:
        return response.json()
    return []


def main():
    print("=== XBRL Annual Report Parser (Multi-Year) ===\n")

    # Get ALL reports (we'll extract all years from each file)
    print("Fetching all reports...")
    reports = get_all_reports()
    print(f"Found {len(reports)} report files\n")

    if not reports:
        print("No reports found.")
        return

    # Group by storage path to avoid processing same file multiple times
    files_by_path = {}
    for r in reports:
        path = r.get("storagePath")
        if path:
            if path not in files_by_path:
                files_by_path[path] = r

    unique_files = list(files_by_path.values())
    print(f"Unique files to process: {len(unique_files)}\n")

    stats = {
        "files_processed": 0,
        "years_extracted": 0,
        "records_inserted": 0,
        "records_updated": 0,
        "failed": 0,
        "no_data": 0,
        "companies_updated": 0,
    }

    # Track latest year per company for WatchedCompany updates
    latest_per_company = {}

    for i, report in enumerate(unique_files):
        org_number = report["orgNumber"]
        storage_path = report["storagePath"]

        print(f"[{i+1}/{len(unique_files)}] {org_number}... ", end="", flush=True)

        try:
            # Download XHTML
            xhtml_content = download_xhtml(storage_path)
            if not xhtml_content:
                print("download failed")
                stats["failed"] += 1
                continue

            stats["files_processed"] += 1

            # Extract financials for ALL years
            all_years_data = extract_financials_all_years(xhtml_content, org_number)

            if not all_years_data:
                print("no data found")
                stats["no_data"] += 1
                continue

            # Process each year
            years_ok = []
            base_fields = ["orgNumber", "fiscalYear", "source", "currency"]

            for year, financials in sorted(all_years_data.items()):
                field_count = len([k for k in financials.keys() if k not in base_fields])

                if field_count == 0:
                    continue

                stats["years_extracted"] += 1

                # Insert or update in database
                success, was_update = insert_financials(financials)
                if success:
                    if was_update:
                        years_ok.append(f"{year}*")
                        stats["records_updated"] += 1
                    else:
                        years_ok.append(f"{year}({field_count})")
                        stats["records_inserted"] += 1

                    # Track for WatchedCompany update (keep latest year)
                    if org_number not in latest_per_company or year > latest_per_company[org_number]["year"]:
                        latest_per_company[org_number] = {
                            "year": year,
                            "revisionsbolag": financials.get("revisionsbolag"),
                            "revisor_namn": financials.get("revisor_namn"),
                            "verksamhetsbeskrivning": financials.get("verksamhetsbeskrivning"),
                        }
                else:
                    stats["failed"] += 1
                    years_ok.append(f"{year}!")

            if years_ok:
                # Check for text fields in any year
                text_fields_found = []
                for y in all_years_data:
                    if all_years_data[y].get("revisionsbolag"):
                        text_fields_found.append("rev")
                    if all_years_data[y].get("verksamhetsbeskrivning"):
                        text_fields_found.append("verk")
                    if all_years_data[y].get("vasentliga_handelser"):
                        text_fields_found.append("händ")
                    break  # Text fields are same for all years
                extra = f" +{','.join(set(text_fields_found))}" if text_fields_found else ""
                print(f"OK [{', '.join(years_ok)}]{extra}")
            else:
                print("no numeric data")
                stats["no_data"] += 1

        except Exception as e:
            print(f"error: {e}")
            stats["failed"] += 1

        # Progress every 25
        if (i + 1) % 25 == 0:
            print(f"\n--- Progress: {i+1}/{len(unique_files)} files ---")
            print(f"Years: {stats['years_extracted']}, Inserted: {stats['records_inserted']}, Failed: {stats['failed']}\n")

    # Update WatchedCompany with latest data
    if latest_per_company:
        print(f"\nUpdating {len(latest_per_company)} companies in WatchedCompany...")
        for org_number, data in latest_per_company.items():
            if data["revisionsbolag"] or data["verksamhetsbeskrivning"]:
                if update_watched_company(
                    org_number,
                    revisionsbolag=data["revisionsbolag"],
                    revisor_namn=data["revisor_namn"],
                    verksamhetsbeskrivning=data["verksamhetsbeskrivning"]
                ):
                    stats["companies_updated"] += 1

    # Final stats
    print("\n=== COMPLETE ===")
    print(f"Files processed: {stats['files_processed']}")
    print(f"Years extracted: {stats['years_extracted']}")
    print(f"Records inserted: {stats['records_inserted']}")
    print(f"Records updated: {stats['records_updated']}")
    print(f"No data: {stats['no_data']}")
    print(f"Failed: {stats['failed']}")
    print(f"Companies updated: {stats['companies_updated']}")


if __name__ == "__main__":
    main()
