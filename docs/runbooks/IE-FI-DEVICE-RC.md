# Ireland + Finland real-device RC (closed markets)

Do **not** set `market_ie_open` or `market_fi_open` to true.

## Isolated access

Use one of:

1. Admin family country override (`PUT /api/admin/families/:id/country`) on a test family.
2. `npm run rc:ie-fi:prepare -- --country IE --lang en-GB` (validates params; refuses live-looking `DATABASE_URL`).
3. Existing iOS sandbox path documented in `docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`.

## Ireland flow (acceptance)

Ireland → English (`en-GB`) → register (admin/test) → child → schedule → child view → paywall (EUR store `priceString`) → sandbox purchase → entitlement → restore.

## Finland flow (acceptance)

Finland → Svenska (`sv-SE`) → same loop. Do **not** test FI in English as the acceptance language.

If the device locale is `fi-FI`, expect Swedish (`sv-SE`) via `src/lib/locale.js` — there is no Finnish locale.

## Fail-closed

Until this runbook has a dated PASS log (like payments v1 iOS):

- `IE_DEVICE_VERIFIED = NOT VERIFIED`
- `FI_DEVICE_VERIFIED = NOT VERIFIED`
- `READY_TO_OPEN` cannot be YES
