# Env — kopiera till Polsia Dashboard

**Var:** Polsia Dashboard → Manage App → Environment Variables (Polsias app-miljö, inte nödvändigtvis Render UI direkt).

| Variabel | Värde (fyll i) | Sprint | Kommentar |
|----------|----------------|--------|-----------|
| `SENTRY_DSN` | `https://…@….ingest.sentry.io/…` | 14 | Valfritt men rekommenderat |
| `PARENTAL_GATE_ENABLED` | `true` | 3c | `false` endast nödfall |
| `NATIVE_TABBAR_ENABLED` | `true` | 4 | |
| `FCM_SERVER_KEY` | `AAAA…` | 19 | Firebase legacy server key |
| `GOOGLE_WEB_CLIENT_ID` | `….apps.googleusercontent.com` | 18 | Web client ID för Android |
| `ANDROID_SHA256_CERT_FINGERPRINT` | `AA:BB:…` | 22a | Release-keystore SHA256 |
| `ANDROID_PACKAGE_NAME` | `se.mystarday.app` | 22a | |
| `APPLE_TEAM_ID` | `XXXXXXXXXX` | 22a | 10 tecken |
| `APNS_KEY_ID` | *(befintlig)* | 20 | |
| `APNS_TEAM_ID` | *(befintlig)* | 20 | |
| `APNS_KEY_PATH` / secret | *(befintlig)* | 20 | |
| `APNS_BUNDLE_ID` | `se.mystarday.app` | 20/22a | |

**Redan satta (rör ej om de fungerar):** `DATABASE_URL`, `JWT_SECRET`, `POLSIA_API_KEY`, `STRIPE_*`, `VAPID_*`

### Föräldraaktivering 7D (go-live — efter Fas 6C + PO-beslut)

> **Obs:** Polsia används inte längre. Sätt variablerna i **Render → Environment** (samma service som övrig prod).

Full runbook: [`docs/foraldaraktivering-go-live.md`](../foraldaraktivering-go-live.md)

| Variabel | Go-live | Kommentar |
|----------|---------|-----------|
| `ACTIVATION_PROGRAM_ENABLED` | `true` | Master switch — **ändra inte utan PO** |
| `ACTIVATION_PROGRAM_LAUNCH_AT` | ISO UTC, t.ex. `2026-06-11T06:00:00Z` | **Fryses efter första enroll** |
| `ACTIVATION_PROGRAM_EMAIL_ENABLED` | `true` | Väg B (7+ dagar inaktiv) |
| `ACTIVATION_PROGRAM_AB_ENABLED` | *(tom)* | **Inte** `true` vid launch |
| `ACTIVATION_PROGRAM_EXPIRY_DAY` | `21` | Default |

Efter env: **Deploy Latest** på Render. Verifiera: `npm run verify:activation-go-live` (Render Shell)

### Migration export (tillfälligt vid plattformsflytt)

| Variabel | Värde | Kommentar |
|----------|-------|-----------|
| `MIGRATION_EXPORT_ENABLED` | `true` | Sätt `false` eller ta bort efter flytt |
| `MIGRATION_EXPORT_SECRET` | lång slumpsträng | Samma värde lokalt som `MIGRATION_EXPORT_SECRET` i CLI |

Lokal nedladdning: `npm run migration:export` (admin-e-post/lösenord + secret).

**Hel databas som SQL** (alla public-tabeller, schema + data):

| Metod | Krav |
|-------|------|
| Admin UI → Familjer → **Exportera hela databasen (SQL)** | `MIGRATION_EXPORT_ENABLED=true` + admin-inloggning |
| `GET /api/admin/export/sql` | Samma |
| `npm run export:database:sql` | `DATABASE_URL` (Render Shell / lokal) |

Maskerar `password_hash`, `token_hash`, `native_token` som `[REDACTED]`. Schema via `pg_dump --schema-only` när verktyget finns på servern; annars kör `npm run migrate` på måldatabasen först.

Efter env-ändring: **omstart/redeploy** app på Render.
