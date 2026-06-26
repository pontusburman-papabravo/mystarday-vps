#!/usr/bin/env bash
# Minimal Cursor Cloud secrets — behåll vs ta bort.
# Kör: ./scripts/print-cursor-cloud-secrets-minimal.sh
set -euo pipefail

cat <<'EOF'
================================================================================
Cursor Cloud — MINIMAL secrets (mystarday-vps)
================================================================================

Dashboard: Secrets → ta bort alla under "TA BORT", behåll "BEHÅLL".
Scope: Environment (inte Personal) om du vill isolera till detta repo.

--------------------------------------------------------------------------------
BEHÅLL (14 st)
--------------------------------------------------------------------------------
| Namn                         | Typ                  | Värde |
|------------------------------|----------------------|-------|
| DATABASE_URL                 | Runtime Secret       | postgresql://stjarndag:stjarndag@localhost:5432/stjarndag |
| JWT_SECRET                   | Runtime Secret       | minst 32 tecken |
| REQUIRE_EMAIL_VERIFICATION   | Environment Variable | false |
| VPS_SSH_KEY                  | Runtime Secret       | privat ed25519-nyckel |
| VPS_HOST                     | Environment Variable | 188.66.60.93 |
| VPS_USER                     | Environment Variable | deploy |
| VPS_APP_PATH                 | Environment Variable | /var/www/mystarday |
| VPS_SERVICE                  | Environment Variable | mystarday |
| ADMIN_EMAIL                  | Runtime Secret       | prod admin (harvest) |
| ADMIN_PASSWORD               | Runtime Secret       | prod admin (harvest) |
| PROD_EMAIL                   | Environment Variable | smoke-test förälder |
| PROD_PASSWORD                | Environment Variable | smoke-test lösenord |
| PROD_USER_CHILD              | Environment Variable | smoke-test barnnamn |
| PROD_USER_CHILD_PASSWORD     | Environment Variable | smoke-test barn-PIN |

--------------------------------------------------------------------------------
TA BORT (32 st) — onödiga i Cloud Agent-VM
--------------------------------------------------------------------------------
ACTIVATION_PROGRAM_ENABLED
ACTIVATION_PROGRAM_EXPIRY_DAY
ACTIVATION_PROGRAM_LAUNCH_AT
APNS_BUNDLE_ID
APNS_KEY_ID
APNS_KEY_PATH
APNS_SANDBOX
APNS_TEAM_ID
APP_URL                  # default: https://mystarday.se
EMAIL_ENABLED            # risk: false bryter tester
EMAIL_FROM                 # default i kod
EMAIL_FROM_NAME            # default i kod
HARVEST_IMPORT_PASSWORD    # bara vid import:harvest med lösenord
IN_PROCESS_CRONS_ENABLED   # prod-cron, irrelevant i cloud-VM
NATIVE_TABBAR_ENABLED      # default i kod
NODE_ENV                   # sätt bara NODE_ENV=test vid npm test
PARENTAL_GATE_ENABLED      # default i kod
PAYMENT_ENABLED            # legacy Stripe — borttaget
QA_MODE
QA_SECRET
R2_ACCESS_KEY_ID           # lokal disk-fallback utan R2
R2_ACCOUNT_ID
R2_BUCKET_NAME
R2_JURISDICTION
R2_PUBLIC_BASE_URL
R2_S3_ENDPOINT
R2_SECRET_ACCESS_KEY
RESEND_API_KEY             # tester mockar egen nyckel
RESEND_WEBHOOK_SECRET
UPLOAD_STORAGE
VAPID_PRIVATE_KEY          # push testas på prod/VPS
VAPID_PUBLIC_KEY
VAPID_SUBJECT

Lägg till senare BARA om du behöver testa funktionen:
  RESEND_API_KEY, R2_*, VAPID_*, REVENUECAT_*, QA_MODE/QA_SECRET

Full lista: ./scripts/print-cursor-cloud-secrets.sh --full
================================================================================
EOF
