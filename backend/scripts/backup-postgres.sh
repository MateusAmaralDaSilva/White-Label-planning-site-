#!/bin/sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_PREFIX=${BACKUP_PREFIX:-whitelabel}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
INTERVAL_SECONDS=${BACKUP_INTERVAL_SECONDS:-86400}

mkdir -p "$BACKUP_DIR"

until pg_isready -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-whitelabel}"; do
  sleep 5
done

while true; do
  day=$(date -u +%Y%m%d)
  target="$BACKUP_DIR/$BACKUP_PREFIX-$day.dump"
  temporary="$target.$$"

  echo "[backup] creating $target"
  if pg_dump -Fc --no-owner --no-privileges -h "${PGHOST:-db}" -U "${PGUSER:-postgres}" \
    -d "${PGDATABASE:-whitelabel}" -f "$temporary"; then
    pg_restore --list "$temporary" >/dev/null
    mv -f "$temporary" "$target"
    echo "[backup] completed $target"
  else
    rm -f "$temporary"
    echo "[backup] failed" >&2
    sleep 60
    continue
  fi

  find "$BACKUP_DIR" -type f -name "$BACKUP_PREFIX-*.dump" \
    -mtime +"$RETENTION_DAYS" -delete
  sleep "$INTERVAL_SECONDS"
done
