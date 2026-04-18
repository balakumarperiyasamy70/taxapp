#!/bin/bash
# Downloads IRS fillable PDFs to the backend forms directory.
# Run once on VPS after deploy.
# Usage: bash /opt/taxapp/backend/scripts/download_irs_forms.sh

set -e

FORMS_DIR="/opt/taxapp/backend/app/forms"
mkdir -p "$FORMS_DIR"
cd "$FORMS_DIR"

BASE="https://www.irs.gov/pub/irs-pdf"

echo "Downloading Form 1040 (main return)..."
curl -fsSL -o f1040.pdf "$BASE/f1040.pdf"

echo "Downloading Schedule 1 (additional income/adjustments)..."
curl -fsSL -o f1040s1.pdf "$BASE/f1040s1.pdf"

echo "Downloading Schedule A (itemized deductions)..."
curl -fsSL -o f1040sa.pdf "$BASE/f1040sa.pdf"

echo "Downloading Schedule B (interest & dividends)..."
curl -fsSL -o f1040sb.pdf "$BASE/f1040sb.pdf"

echo "Downloading Schedule C (self-employment income)..."
curl -fsSL -o f1040sc.pdf "$BASE/f1040sc.pdf"

echo "Downloading Form 4868 (extension)..."
curl -fsSL -o f4868.pdf "$BASE/f4868.pdf"

echo ""
echo "Done! Forms saved to $FORMS_DIR"
ls -lh "$FORMS_DIR"
