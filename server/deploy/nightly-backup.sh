#!/bin/sh
# Nightly backup for the Docker setup: snapshot the live database inside the container (VACUUM INTO,
# gzip, keep 14 on the server), then copy the backups off the server with rclone, if a remote is set up.
# Cron line (crontab -e as the user that runs docker):
#   17 3 * * * /home/ubuntu/earth-interactive/server/deploy/nightly-backup.sh >> /home/ubuntu/earth-backup.log 2>&1
# RCLONE_REMOTE defaults to gdrive:earth-interactive-backups (Google Drive, free 15 GB; setup in docs/backend.md).
# BACKUP_PING_URL (optional): a healthchecks.io-style URL pinged after a successful run, so a silent
# failure turns into an email.
set -eu
cd "$(dirname "$0")"
REMOTE="${RCLONE_REMOTE:-gdrive:earth-interactive-backups}"

docker compose exec -T api node node/backup.mjs

if command -v rclone >/dev/null 2>&1 && rclone listremotes | grep -qx "${REMOTE%%:*}:"; then
  # copy, not sync: a damaged or emptied server never wipes the off-site copies
  rclone copy ./data/backups "$REMOTE" --include 'earth-*.db.gz'
  # keep ~60 days off-site (each backup is small, but don't grow forever)
  rclone delete "$REMOTE" --include 'earth-*.db.gz' --min-age 60d
  echo "$(date -u +%FT%TZ) backup copied to $REMOTE"
else
  echo "$(date -u +%FT%TZ) no rclone remote '${REMOTE%%:*}': backup kept on this server only"
fi

if [ -n "${BACKUP_PING_URL:-}" ]; then curl -fsS -m 10 --retry 3 "$BACKUP_PING_URL" >/dev/null || true; fi
