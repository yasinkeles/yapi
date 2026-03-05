#!/bin/bash

###############################################################################
# Yapi - Export / Packaging Tool (Linux)
# Author: YASİN KELEŞ (Yapi)
###############################################################################

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Yapi Export Tool                         ║"
echo "║                    by YASİN KELEŞ (Yapi)                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Generate timestamp (YYYYMMDD_HHMMSS)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Choose Export Type:"
echo "[1] Full Data Export (Include your endpoints, users, and settings)"
echo "[2] Clean Setup (Code only, for fresh installation)"
echo ""
read -p "Enter choice (1 or 2): " CHOICE

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
EXPORT_DIR="$ROOT_DIR/exports"

if [ ! -d "$EXPORT_DIR" ]; then
    mkdir -p "$EXPORT_DIR"
fi

if [ "$CHOICE" == "1" ]; then
    EXPORT_TYPE="Full Data"
    ZIP_NAME="Yapi-full-backup_$TIMESTAMP.zip"
else
    EXPORT_TYPE="Clean Setup"
    ZIP_NAME="Yapi-clean-setup_$TIMESTAMP.zip"
fi

# Check for zip command
if ! command -v zip &> /dev/null; then
    echo "Error: 'zip' command not found. Please install it (e.g., sudo apt install zip)."
    exit 1
fi

echo "[1/2] Creating archive for $EXPORT_TYPE..."
echo "Root Directory: $ROOT_DIR"
echo "Output: $EXPORT_DIR/$ZIP_NAME"
echo ""

cd "$ROOT_DIR"

# Zip everything while excluding unnecessary folders/files
# Note: zip handles exclusions naturally without the 'nul' issue Windows has
if [ "$CHOICE" == "1" ]; then
    zip -r "$EXPORT_DIR/$ZIP_NAME" . \
        -x "**/node_modules/*" \
        -x "**/.git/*" \
        -x "**/logs/*" \
        -x "**/.env" \
        -x "**/frontend/dist/*" \
        -x "**/brain/*" \
        -x "**/backup/*" \
        -x "**/exports/*" \
        -x "**/temp/*" \
        -x "**/.agent/*" \
        -x "$ZIP_NAME"
else
    zip -r "$EXPORT_DIR/$ZIP_NAME" . \
        -x "**/node_modules/*" \
        -x "**/.git/*" \
        -x "**/logs/*" \
        -x "**/.env" \
        -x "**/backend/data/*.sqlite" \
        -x "**/frontend/dist/*" \
        -x "**/brain/*" \
        -x "**/backup/*" \
        -x "**/exports/*" \
        -x "**/temp/*" \
        -x "**/.agent/*" \
        -x "$ZIP_NAME"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          $EXPORT_TYPE Export Successful! ✓                      ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "File created in exports/: $ZIP_NAME"
    echo ""
else
    echo ""
    echo "[ERROR] Export failed!"
fi
