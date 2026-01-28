#!/bin/bash
# Scan ALL companies for available documents in Bolagsverket API

# Get fresh token
get_token() {
  curl -s -X POST "https://portal.api.bolagsverket.se/oauth2/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=UIiATHgXGSP6HIyOlqWZkX51dnka&client_secret=H10hBNr_KeYqA9h5AEe7J32HkFsa&scope=vardefulla-datamangder:read vardefulla-datamangder:ping" | jq -r '.access_token'
}

TOKEN=$(get_token)
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token received, scanning companies..."
echo ""

# Output file for results
RESULTS_FILE="/tmp/bv_annual_reports.json"
echo "[]" > "$RESULTS_FILE"

# All org numbers (without hyphens)
ORGS='5560015272 5560169095 5560326158 5560553181 5560561283 5560709429 5560777434 5561088393 5561180836 5561330506 5561477166 5561810911 5561934133 5562008283 5562150606 5562249424 5562331560 5562410406 5562574680 5562627728 5562629211 5562634088 5562655430 5562828060 5562943323 5563013472 5563052892 5563114254 5563129716 5563146660 5563211902 5563466167 5563569192 5563622074 5563627131 5563808939 5563907491 5563976710 5563998789 5564192663 5564299500 5564380284 5564385572 5564461043 5564580578 5564583473 5564700309 5564725397 5564746476 5564760642'

found=0
not_found=0
total=0
found_orgs=""

for org in $ORGS; do
  total=$((total + 1))
  result=$(curl -s -X POST "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1/dokumentlista" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"identitetsbeteckning\":\"$org\"}" 2>/dev/null)
  
  doc_count=$(echo "$result" | jq '.dokument | length' 2>/dev/null || echo "0")
  
  if [ "$doc_count" != "0" ] && [ "$doc_count" != "null" ] && [ -n "$doc_count" ]; then
    echo "✅ $org: $doc_count document(s)"
    found=$((found + 1))
    found_orgs="$found_orgs $org"
  fi
  
  # Refresh token every 100 requests
  if [ $((total % 100)) -eq 0 ]; then
    TOKEN=$(get_token)
    echo "--- Refreshed token at $total ---"
  fi
  
  sleep 0.05
done

echo ""
echo "=== Summary (first 50) ==="
echo "Scanned: $total"
echo "Found documents: $found"
echo "No documents: $((total - found))"
echo ""
echo "Orgs with documents:$found_orgs"
