# Ta bort Polsia — migrationsplan (VPS)

Målet: **ingen** runtime-beroende av Polsia (proxy, API-nyckel, hosting). Appen körs på Ubuntu VPS med lokal Postgres.

## Vad som ersatts

| Tidigare (Polsia) | Nu (VPS) |
|-------------------|----------|
| `POLSIA_API_KEY` + e-postproxy | **SMTP** (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) |
| Polsia R2-proxy | **Cloudflare R2** direkt (`R2_*` env, `@aws-sdk/client-s3`) |
| Polsia Stripe verify | **Stripe SDK** (`STRIPE_SECRET_KEY`) — redan i `stripe-checkout.js` / `payment.js` |
| `polsia.toml` | `deploy/crons.toml` |
| `POLSIA_IN_PROCESS_CRONS_ENABLED` | `IN_PROCESS_CRONS_ENABLED=true` |
| `POLSIA_ANALYTICS_SLUG` | `GA_MEASUREMENT_ID` (Google Analytics ID) |
| Render/Neon | VPS + lokal Postgres — se `docs/ubuntu-24-vps-deploy.md` |

## `.env` på VPS (utan Polsia)

```bash
# App
NODE_ENV=production
APP_URL=https://mystarday.se
JWT_SECRET=<minst 32 tecken>
DATABASE_URL=postgresql://mystarday_app:...@localhost:5432/mystarday
IN_PROCESS_CRONS_ENABLED=true

# E-post (t.ex. er domänleverantör, Amazon SES, Mailgun SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_ENABLED=true

# Bilder — Cloudflare R2 (egna API-nycklar, inte Polsia)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mystarday-uploads
R2_PUBLIC_BASE_URL=https://cdn.mystarday.se

# Betalning (direkt Stripe — redan i koden)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_ENABLED=false

# Push, IAP, APNs — oförändrat (se docs/RELEASE.md)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
REVENUECAT_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...
APNS_KEY_ID=...
# ...
```

## Checklista vid cutover

1. [ ] Postgres på VPS + dataimport (`docs/MIGRATION_IMPORT.md`)
2. [ ] R2-bucket + publik URL (eller custom domain `cdn.mystarday.se`)
3. [ ] SMTP test: registrering → verifieringsmail
4. [ ] Uppladdning: manuell stjärna + barnavatar
5. [ ] `IN_PROCESS_CRONS_ENABLED=true`, omstart `mystarday`
6. [ ] DNS `mystarday.se` → VPS
7. [ ] Ta bort **alla** `POLSIA_*` från miljö (ska inte behövas)
8. [ ] RevenueCat/Stripe webhooks pekar på `https://mystarday.se`

## Kod som fortfarande kan nämna Polsia

- `docs/polsia-release-os/` — historisk release-dokumentation (arkiv)
- `POLSIA_IN_PROCESS_CRONS_ENABLED` — läses fortfarande som fallback en release; ta bort när prod `.env` är uppdaterad
- `__POLSIA_SLUG__` i HTML — ersätts av `__GA_MEASUREMENT_ID__` vid server-render

## R2-setup (Cloudflare)

1. Skapa bucket i Cloudflare R2
2. API-token med Object Read & Write
3. Public access via `r2.dev` subdomain eller custom domain
4. Sätt `R2_PUBLIC_BASE_URL` till exakt origin som CSP och `<img src>` använder

## SMTP-alternativ

| Leverantör | Kommentar |
|------------|-----------|
| Domänens e-post (One.com, Loopia, …) | Enklast för `info@mystarday.se` |
| Amazon SES | Skalbart, kräver DNS-verifiering |
| Mailgun / SendGrid | SMTP-relay, bra leverans |

Avsändare i kod är alltid `Min Stjärndag <info@mystarday.se>`.

## Efter migration

- Stäng Render/Polsia-appen
- Rotera bort `POLSIA_API_KEY` (ogiltig)
- Uppdatera App Store / support-länkar om de pekade på `*.polsia.app`
