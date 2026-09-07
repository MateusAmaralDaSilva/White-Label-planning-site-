#!/usr/bin/env bash 
set -euo pipefail 

# Exporta automaticamente as variáveis do arquivo .env
set -a
source /home/ubuntu/White-Label-planning-site-/.env
set +a

NOTIFY_TO=${NOTIFY_TO:-}
NOTIFY_FROM=${NOTIFY_FROM:-}
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_SECURE=${SMTP_SECURE:-false}
MAILER_BIN=""

if [ -z "$NOTIFY_TO" ] || [ -z "$NOTIFY_FROM" ]; then
  echo "NOTIFY_TO and NOTIFY_FROM must be set" >&2
  exit 0
fi

# List unhealthy containers (name and status)
unhealthy=$(docker ps --filter "health=unhealthy" --format '{{.Names}} - {{.Status}}')
if [ -z "$unhealthy" ]; then
  echo "No unhealthy containers"
  exit 0
fi

subject="Alert: unhealthy Docker containers"
body=$(cat <<EOF
A seguinte(s) instancia(s) do Docker ficou(aram) unhealthy:

$unhealthy

Host: $(hostname)
Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
EOF
)

# Prefer sendmail/ssmtp/msmtp if available.
for candidate in sendmail ssmtp msmtp; do
  if command -v "$candidate" >/dev/null 2>&1; then
    MAILER_BIN="$candidate"
    break
  fi
done

if [ -n "$MAILER_BIN" ]; then
  if [ "$MAILER_BIN" = "sendmail" ]; then
    printf 'To: %s\nFrom: %s\nSubject: %s\n\n%s\n' "$NOTIFY_TO" "$NOTIFY_FROM" "$subject" "$body" | sendmail -t
  elif [ "$MAILER_BIN" = "ssmtp" ]; then
    printf 'To: %s\nFrom: %s\nSubject: %s\n\n%s\n' "$NOTIFY_TO" "$NOTIFY_FROM" "$subject" "$body" | ssmtp "$NOTIFY_TO"
  else
    printf 'To: %s\nFrom: %s\nSubject: %s\n\n%s\n' "$NOTIFY_TO" "$NOTIFY_FROM" "$subject" "$body" | msmtp --from=auto "$NOTIFY_TO"
  fi
else
  if [ -n "$SMTP_HOST" ] && command -v python3 >/dev/null 2>&1; then
    python3 - "$NOTIFY_TO" "$NOTIFY_FROM" "$subject" "$body" "$SMTP_HOST" "$SMTP_PORT" "$SMTP_USER" "$SMTP_PASS" "$SMTP_SECURE" <<'PY'
import sys
import smtplib
from email.message import EmailMessage

recipient = sys.argv[1]
from_addr = sys.argv[2]
subject = sys.argv[3]
body = sys.argv[4]
SMTP_HOST = sys.argv[5]
SMTP_PORT = int(sys.argv[6])
SMTP_USER = sys.argv[7]
SMTP_PASS = sys.argv[8]
SMTP_SECURE = sys.argv[9].lower() == 'true'

msg = EmailMessage()
msg['Subject'] = subject
msg['From'] = from_addr
msg['To'] = recipient
msg.set_content(body)

server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
if SMTP_SECURE:
    server.starttls()
if SMTP_USER and SMTP_PASS:
    server.login(SMTP_USER, SMTP_PASS)
server.send_message(msg)
server.quit()
PY
  else
    echo "No mailer available. Install sendmail/ssmtp/msmtp or configure SMTP." >&2
    exit 0
  fi
fi

echo "Email sent to $NOTIFY_TO"