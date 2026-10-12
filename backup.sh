#!/bin/bash
# Copia diaria: base de datos (consistente) + imágenes. Guarda 14 días.
set -e
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="${BACKUP_DIR:-/var/backups/integra}"
STAMP=$(date +%Y%m%d_%H%M)
mkdir -p "$DEST"
sqlite3 "$APP_DIR/data/integra.db" ".backup '$DEST/integra_$STAMP.db'"
tar -czf "$DEST/uploads_$STAMP.tar.gz" -C "$APP_DIR/data" uploads
find "$DEST" -type f -mtime +14 -delete
echo "Respaldo listo: $DEST ($STAMP)"
