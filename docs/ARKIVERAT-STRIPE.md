# Arkiverat: Stripe / webb-betalning

**Status (juni 2026):** Stripe är **borttaget** som aktiv betalväg. Enda betalningssystem är **RevenueCat + Apple/Google IAP** på native (se [`app-store-iap.md`](app-store-iap.md)).

## Historik

| Period | Betalväg | Notering |
|--------|----------|----------|
| Polsia-era | Stripe via Polsia-proxy | `stjarndag.polsia.app`, `STRIPE_*` env via Polsia Dashboard |
| VPS-migrering (vår 2026) | Stripe direkt på servern | Kortvarig övergång efter Polsia-avveckling |
| IAP-migrering (maj 2026) | RevenueCat + StoreKit/Play Billing | `family.subscription_status`, `rc_customer_id`, lifetime-free för befintliga familjer |
| Refactor Fas 5 (jun 2026) | Stripe borttaget ur kod | A4–A6: routes, middleware, admin-UI; A7: docs; A5c (planerad): droppa `stripe_*`-kolumner |

## Vad som togs bort (Fas 5)

- Stripe Checkout-routes (`/api/stripe/*`) — ej monterade
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_ENABLED` — bort från `.env.example`
- Admin prenumerations-UI för Stripe (A6)
- Webb-betalningslänkar och kortformulär — aldrig aktivt i produktion (`BILLING_UI_DISABLED`)

## Kvarvarande legacy (tills A5c)

- DB-kolumner: `family.stripe_customer_id`, `family.stripe_subscription_id` (ej lästa av aktiv kod)
- Admin addon-API kan fortfarande acceptera `stripe_price_id` i request body (död parameter)

## Kanonisk betalningsdokumentation

- **Aktiv arkitektur:** [`docs/app-store-iap.md`](app-store-iap.md)
- **Paywall-inventering:** [`docs/paywall-inventory.md`](paywall-inventory.md)
- **Produktbeslut (ingen webb-checkout):** [`docs/paket-v1.2-spec.md`](paket-v1.2-spec.md) §9.7
