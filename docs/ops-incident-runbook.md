# Ops — incident runbook (utdrag)

Kortreferens för drift vid incidenter. Fullständig deploy-info: root `AGENTS.md`, `.cursor/rules/mystarday-deploy.mdc`.

## Authz hardening (`AUTHZ_HARDENING_ENABLED`)

- **Default:** middleware och helpers är **på** (saknas env → enabled).
- **Kill switch:** sätt `AUTHZ_HARDENING_ENABLED=false` i `.env` på VPS, `sudo systemctl restart mystarday`.
  - Middleware (`requireChildAccess`, `requireLogAccess`, …) blir no-op.
  - Inline `getChildAccess` / `getLogAccess` i routes fortsätter gälla — full avstängning sker inte.
- **När använda:** misstänkt authz-regression efter deploy; max 1–2 timmar med root cause-analys parallellt.
- **Status (2026-07-02):** H1/N4 deployad och stabil i prod. Kill switch kvar som nödbroms; planera borttagning när inga authz-incidenter på 90 dagar.

## Pool-övervakning

Se [`docs/ops-pool-monitoring.md`](ops-pool-monitoring.md).

## Rate limiting (single-instance)

`express-rate-limit` använder MemoryStore — OK för nuvarande en-process-VPS. Vid horizontal skalning: Redis store krävs (se kommentar i `src/middleware/rateLimiter.js`).

## Återställning juli–augusti 2026 (familjesupport)

- **Publik info:** landningsbanner (`config/incident-notice.js`, `landingBannerEnabled`) → `/viktig-information`.
- **Support:** förtroendebaserat — kräv inte bevis när en familj rapporterar saknade stjärnor/framsteg från 30 juli–1 augusti 2026. Justera rimligt antal stjärnor i admin när det efterfrågas.
- **Lova inte** att all förlorad data kan återskapas; merparten av konton fanns i säkerhetskopian.
