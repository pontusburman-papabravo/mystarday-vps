# Ireland + Finland real-device RC (closed markets)

Do **not** set `market_ie_open` or `market_fi_open` to true.

## Isolated access

Use one of:

1. Admin family country override (`PUT /api/admin/families/:id/country`) on a test family.
2. `npm run rc:ie-fi:prepare -- --country IE --lang en-GB` (validates params; refuses live-looking `DATABASE_URL`).
3. Existing iOS sandbox path documented in `docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`.

## Ireland flow (acceptance)

Print the executable checklist:

```bash
node scripts/ie-fi-device-rc.mjs --country IE --lang en-GB
```

Ireland → English (`en-GB`) → EUR → admin/test family (do not flip public flags):

1. T0 temporary access (`access_kind=prebilling`, no Subscribe now).
2. T1 approaching paid start (settings shows launch access + cutoff date).
3. T2 paid transition with billing ON: paywall → sandbox purchase → entitlement → restore.
4. Failure: cutoff reached, billing OFF → hold, no mass 402.
5. App restart, parent session, child session.

## Finland flow (acceptance)

```bash
node scripts/ie-fi-device-rc.mjs --country FI --lang sv-SE
```

Finland → Svenska (`sv-SE`) → EUR → same T0/T1/T2/hold loop. Do **not** test FI in English as the acceptance language.

If the device locale is `fi-FI`, expect Swedish (`sv-SE`) via `src/lib/locale.js` — there is no Finnish locale.

## Fail-closed

Until this runbook has a dated PASS log (like payments v1 iOS):

- `IE_DEVICE_VERIFIED = NOT VERIFIED`
- `FI_DEVICE_VERIFIED = NOT VERIFIED`
- `IRELAND_BILLING_READY` / `FINLAND_BILLING_READY` cannot be YES

Missing paid-store/device verification does **not** block CODE READY or PREBILLING MARKET READY. See `docs/ie-fi-prebilling-access.md`.
