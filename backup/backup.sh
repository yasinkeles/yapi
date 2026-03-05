#!/bin/bash

###############################################################################
# Yapi - Daily Backup Script (Linux)
# Author: YASİN KELEŞ (reapex)
###############################################################################

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)/dailybackup"
DB_FILE="$ROOT_DIR/backend/data/app.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Yapi Backup System                       ║"
echo "║                    by YASİN KELEŞ (Yapi)                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "[$(date)] Starting backup..."

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
fi

if [ ! -f "$DB_FILE" ]; then
    echo "[ERROR] Database file not found at: $DB_FILE"
    exit 1
fi

DEST_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"

echo "Copying $DB_FILE to $DEST_FILE..."
cp "$DB_FILE" "$DEST_FILE"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Backup created in dailybackup/"
    
    # Keep only last 30 backups
    echo "Cleaning up old backups (keeping last 30)..."
    ls -tp "$BACKUP_DIR"/db_backup_*.sqlite | grep -v '/$' | tail -n +31 | xargs -I {} rm -- {}
else
    echo "[ERROR] Backup failed!"
fi

echo "--------------------------------------------------"
