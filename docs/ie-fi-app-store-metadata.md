# IE / FI App Store metadata

External App Store Connect task. This file does not change listing copy in code.

Fetched **2026-08-31** from public iTunes lookup `id=6774493098`.

## Required console action

### Ireland

Set the **English** App Store description, subtitle, keywords, and screenshots for the Ireland storefront.

Current public listing description is **Swedish**. Languages advertised: `EN`, `SV`.

`IE_APP_STORE_METADATA = REVIEW_REQUIRED`

Evidence: iTunes lookup country=ie description is Swedish, not English. App Store Connect was not opened in this pass.

### Finland

Swedish listing copy is acceptable for the current launch scope (no Finnish locale).

Public FI lookup description is Swedish. Languages: `EN`, `SV`. That matches the Swedish-only FI product policy.

`FI_APP_STORE_METADATA = REVIEW_REQUIRED`

Reason: storefront metadata was not confirmed inside App Store Connect (localization slots vs fallback). Public lookup is consistent with Swedish copy, but console verification is still required before calling it PASS.

## Download price vs IAP

Public sources still conflict (iTunes `price=5.99` EUR software vs App Store HTML `hasInAppPurchases:true` + "Get").

`APPLE_DOWNLOAD_PRICE = REVIEW_REQUIRED`

Do not infer free-download+subscription or paid-download-only until App Store Connect is checked.
