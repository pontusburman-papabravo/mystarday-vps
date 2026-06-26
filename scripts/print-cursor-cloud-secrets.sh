#!/usr/bin/env bash
# Fullständig checklista: alla Cursor Cloud Agent-secrets för mystarday-vps.
# Kör: ./scripts/print-cursor-cloud-secrets.sh
# Eller: ./scripts/setup-cursor-agent-ssh.sh secrets-all
#
# Vid sammanslagning mystarday-polsia → mystarday-vps: kopiera ALLA rader nedan
# från gamla miljön till mystarday-vps (Cloud Agents → Secrets → Environment).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_RULES="${DEPLOY_RULES:-$(find "$REPO_ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)}"

VPS_HOST="${VPS_HOST:-188.66.60.93}"
VPS_USER="${VPS_USER:-deploy}"
VPS_APP_PATH="${VPS_APP_PATH:-/var/www/mystarday}"
VPS_SERVICE="${VPS_SERVICE:-mystarday}"

if [ -f "$DEPLOY_RULES" ]; then
  ssh_cell="$(grep -E '^\| VPS SSH \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  path_cell="$(grep -E '^\| VPS path \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  service_cell="$(grep -E '^\| systemd \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  if [[ "$ssh_cell" == *@* ]]; then
    VPS_USER="${ssh_cell%%@*}"
    VPS_HOST="${ssh_cell#*@}"
  fi
  VPS_APP_PATH="${path_cell:-$VPS_APP_PATH}"
  VPS_SERVICE="${service_cell:-$VPS_SERVICE}"
fi

cat <<EOF
================================================================================
Cursor Cloud Agent — ALLA secrets (mystarday-vps)
================================================================================

Dashboard: https://cursor.com/dashboard → Cloud Agents → Secrets
Environment: pontusburman-papabravo/mystarday-vps  (ta bort mystarday-polsia efteråt)

Typ:
  SECRET  = Runtime Secret (hemligheter — visas inte i chat)
  ENV     = Environment Variable (icke-hemliga eller dev-defaults)

--------------------------------------------------------------------------------
A. Lokal dev — krävs för npm run dev / npm test
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| DATABASE_URL                 | ENV    | postgresql://stjarndag:stjarndag@localhost:5432/stjarndag |
| JWT_SECRET                   | SECRET | minst 32 tecken (dev-sträng OK i cloud) |
| REQUIRE_EMAIL_VERIFICATION   | ENV    | false |
| NODE_ENV                     | ENV    | test (vid npm test) eller unset (dev server) |

--------------------------------------------------------------------------------
B. VPS SSH — prod-loggar, health, manuell deploy
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| VPS_SSH_KEY                  | SECRET | Hela privata ed25519-nyckeln (setup-cursor-agent-ssh.sh) |
| VPS_HOST                     | ENV    | ${VPS_HOST} |
| VPS_USER                     | ENV    | ${VPS_USER} |
| VPS_APP_PATH                 | ENV    | ${VPS_APP_PATH} |
| VPS_SERVICE                  | ENV    | ${VPS_SERVICE} |
| VPS_SSH_PORT                 | ENV    | 22 (valfritt om standard) |

Nätverk: tillåt utgående TCP 22 → ${VPS_HOST}

Verifiera: ./scripts/vps-ssh.sh check

--------------------------------------------------------------------------------
C. Prod admin / harvest / migration (valfritt men behövs för harvest:library m.m.)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| ADMIN_EMAIL                  | SECRET | Admin-inloggning på mystarday.se |
| ADMIN_PASSWORD               | SECRET | Admin-lösenord |
| MIGRATION_EXPORT_SECRET      | SECRET | Samma som MIGRATION_EXPORT_SECRET på prod (export API) |
| MIGRATION_EXPORT_BASE_URL    | ENV    | https://mystarday.se |
| HARVEST_IMPORT_PASSWORD      | SECRET | Lösenord för import:harvest lokalt (valfritt) |

--------------------------------------------------------------------------------
D. E-post (Resend) — valfritt lokalt; krävs INTE för npm test (mockas)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| RESEND_API_KEY               | SECRET | re_… från Resend Dashboard |
| RESEND_API_KEY_WEEKLY        | SECRET | Separat nyckel för söndagsmail (valfritt) |
| RESEND_WEBHOOK_SECRET        | SECRET | whsec_… (webhook-signering) |
| EMAIL_ENABLED                | ENV    | true (sätt INTE false vid npm test) |
| EMAIL_FROM                   | ENV    | info@mystarday.se |
| EMAIL_FROM_NAME              | ENV    | Min Stjärndag |
| APP_URL                      | ENV    | https://mystarday.se |

--------------------------------------------------------------------------------
E. Bilduppladdning (R2) — valfritt lokalt (lokal disk utan nycklar)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| UPLOAD_STORAGE               | ENV    | r2 eller local |
| R2_ACCOUNT_ID                | SECRET | Cloudflare account ID |
| R2_BUCKET_NAME               | ENV    | mystarday |
| R2_ACCESS_KEY_ID             | SECRET | R2 API token |
| R2_SECRET_ACCESS_KEY         | SECRET | R2 API secret |
| R2_S3_ENDPOINT               | ENV    | https://<account>.r2.cloudflarestorage.com |
| R2_PUBLIC_BASE_URL           | ENV    | https://pub-….r2.dev |

--------------------------------------------------------------------------------
F. Push-notiser
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| VAPID_PUBLIC_KEY             | SECRET | Web Push |
| VAPID_PRIVATE_KEY            | SECRET | Web Push |
| VAPID_SUBJECT                | ENV    | mailto:info@mystarday.se |
| APNS_KEY_ID                  | SECRET | iOS push |
| APNS_TEAM_ID                 | ENV    | Apple Team ID (10 tecken) |
| APNS_KEY_PATH                | ENV    | Sökväg till .p8 på VPS (prod) |
| APNS_KEY_CONTENT             | SECRET | Alternativ: hela .p8-innehållet (cloud) |
| APNS_BUNDLE_ID               | ENV    | se.mystarday.app |
| FCM_SERVER_KEY               | SECRET | Firebase legacy server key (Android) |

--------------------------------------------------------------------------------
G. In-app purchases (RevenueCat)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| REVENUECAT_API_KEY           | SECRET | Publik RC-nyckel |
| REVENUECAT_WEBHOOK_SECRET    | SECRET | Webhook HMAC-hemlighet |

--------------------------------------------------------------------------------
H. OAuth / native
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| APPLE_CLIENT_ID              | ENV    | Web Service ID |
| APPLE_BUNDLE_ID              | ENV    | se.mystarday.app |
| APPLE_TEAM_ID                | ENV    | 10 tecken |
| GOOGLE_WEB_CLIENT_ID         | ENV    | ….apps.googleusercontent.com |
| GOOGLE_ANDROID_CLIENT_ID     | ENV    | Android client (valfritt) |
| GOOGLE_IOS_CLIENT_ID         | ENV    | iOS client (valfritt) |
| ANDROID_PACKAGE_NAME         | ENV    | se.mystarday.app |
| ANDROID_SHA256_CERT_FINGERPRINT | ENV | Release-keystore SHA256 |

--------------------------------------------------------------------------------
I. Övriga integrationer (valfritt)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| OPENAI_API_KEY               | SECRET | AI-starter-schema (valfritt) |
| OPENAI_MODEL                 | ENV    | gpt-4o-mini (default) |
| SENTRY_DSN                   | SECRET | Crash reporting |
| FACEBOOK_PAGE_ACCESS_TOKEN   | SECRET | Dagens nyhet cross-post |
| FACEBOOK_PAGE_ID             | ENV    | Facebook page ID |
| FACEBOOK_APP_ID              | ENV    | OAuth app |
| FACEBOOK_APP_SECRET          | SECRET | OAuth secret |

--------------------------------------------------------------------------------
J. Smoke / QA (valfritt — prod-browser-tester)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Värde / kommentar |
|------------------------------|--------|-------------------|
| SMOKE_PARENT_EMAIL           | SECRET | Testförälder |
| SMOKE_PARENT_PASSWORD        | SECRET | Testlösenord |
| SMOKE_CHILD_NAME             | ENV    | t.ex. astrid |
| SMOKE_CHILD_PIN              | SECRET | Barn-PIN |
| BASE                         | ENV    | https://mystarday.se |

--------------------------------------------------------------------------------
K. Legacy Polsia (kopiera BARA om de fortfarande finns i mystarday-polsia)
--------------------------------------------------------------------------------
| Namn                         | Typ    | Kommentar |
|------------------------------|--------|-----------|
| POLSIA_API_KEY               | SECRET | Ersatt av R2 direkt / Resend — kan tas bort |
| POLSIA_API_TOKEN             | SECRET | Legacy JWT-fallback — använd JWT_SECRET istället |
| POLSIA_IN_PROCESS_CRONS_ENABLED | ENV | Ersatt av IN_PROCESS_CRONS_ENABLED |
| POLSIA_ANALYTICS_SLUG        | ENV    | Legacy analytics — kan ignoreras |

================================================================================
Sammanslagning mystarday-polsia → mystarday-vps
================================================================================

1. Öppna Secrets för BÅDA miljöerna i två flikar.
2. Kopiera varje secret/env från polsia till vps (samma namn + värde).
3. Lägg till saknade från listan ovan (särskilt A + B).
4. Ta bort mystarday-polsia-miljön i Environments.
5. Kör New Setup Run på mystarday-vps (läser .cursor/environment.json).
6. Verifiera: ./scripts/vps-ssh.sh check && NODE_ENV=test npm test

Se även: docs/CURSOR-AGENT-VPS-SSH.md · .env.example
================================================================================
EOF
