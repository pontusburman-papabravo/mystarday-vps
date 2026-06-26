#!/usr/bin/env bash
# Cursor Cloud secrets — tre nivåer: kärna / tveksam / behåll om du använder.
# Kör: ./scripts/print-cursor-cloud-secrets-minimal.sh
set -euo pipefail

cat <<'EOF'
================================================================================
Cursor Cloud secrets — ärlig guide (mystarday-vps)
================================================================================

Extra secrets SKADAR inte — de är mest rörigt med "Personal" överallt.
Ta bara bort det du är säker på; börja med nivå 1.

--------------------------------------------------------------------------------
NIVÅ 0 — MÅSTE finnas (9 st)
--------------------------------------------------------------------------------
DATABASE_URL                 Runtime Secret
JWT_SECRET                   Runtime Secret
REQUIRE_EMAIL_VERIFICATION   Environment Variable → false
VPS_SSH_KEY                  Runtime Secret
VPS_HOST                     Environment Variable → 188.66.60.93
VPS_USER                     Environment Variable → deploy
VPS_APP_PATH                 Environment Variable → /var/www/mystarday
VPS_SERVICE                  Environment Variable → mystarday
ADMIN_EMAIL                  Runtime Secret   (harvest från prod)
ADMIN_PASSWORD               Runtime Secret

--------------------------------------------------------------------------------
NIVÅ 1 — SÄKERT att ta bort (skadar inte dev/test/VPS)
--------------------------------------------------------------------------------
NODE_ENV                     # farlig om "production" — ta bort
PAYMENT_ENABLED              # Stripe borttaget
APNS_KEY_PATH                  # sökväg på VPS, finns inte i cloud-VM
APNS_BUNDLE_ID
APNS_KEY_ID
APNS_SANDBOX
APNS_TEAM_ID
IN_PROCESS_CRONS_ENABLED       # prod-cron i cloud-VM

--------------------------------------------------------------------------------
NIVÅ 2 — TROLIGEN onödiga (npm test mockar / kod har defaults)
--------------------------------------------------------------------------------
APP_URL                        # default mystarday.se
EMAIL_FROM / EMAIL_FROM_NAME   # defaults i kod
NATIVE_TABBAR_ENABLED
PARENTAL_GATE_ENABLED
ACTIVATION_PROGRAM_ENABLED
ACTIVATION_PROGRAM_EXPIRY_DAY
ACTIVATION_PROGRAM_LAUNCH_AT
VAPID_SUBJECT                  # default mailto:info@mystarday.se
R2_JURISDICTION

OBS: EMAIL_ENABLED — ta bort BARA om värdet är "false".
     Om "true" eller saknas: ofarligt att behålla.

--------------------------------------------------------------------------------
NIVÅ 3 — BEHÅLL om du faktiskt använder funktionen
--------------------------------------------------------------------------------
RESEND_API_KEY                 # riktiga mejl från dev-server (tester mockar)
RESEND_WEBHOOK_SECRET          # webhook-test
R2_* + UPLOAD_STORAGE          # bilduppladdning mot R2 (annars lokal disk)
VAPID_PUBLIC_KEY / PRIVATE_KEY # push-test lokalt
HARVEST_IMPORT_PASSWORD        # eget lösenord vid import:harvest (annars default i kod)
QA_MODE                        # npm run qa:mobile-gate / qa:mobile-full
QA_SECRET                      # finns INTE i repot — okänd källa, behåll om du vet vad den gör

PROD_EMAIL / PROD_PASSWORD / PROD_USER_CHILD / PROD_USER_CHILD_PASSWORD
  → används INTE av smoke-skript (de vill ha SMOKE_PARENT_EMAIL m.fl.)
  → behåll om DU manuellt använder dem; annars ta bort

--------------------------------------------------------------------------------
Personal vs Environment
--------------------------------------------------------------------------------
Personal = alla dina repos. Environment = bara mystarday-vps.
Funktionellt OK med Personal — städa scope när du vill isolera.

Full referens: ./scripts/print-cursor-cloud-secrets.sh --full
================================================================================
EOF
