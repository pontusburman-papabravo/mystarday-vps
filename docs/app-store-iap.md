# App Store IAP — RevenueCat + StoreKit Integration

[REDACTED] supports in-app purchases (IAP) on **iOS and Android** via **RevenueCat** and the platform stores (Apple StoreKit / Google Play Billing). This is the **sole active payment path** — there is no web checkout. This document covers the architecture: client SDK, webhook backend, lifetime-free model, and troubleshooting.

> **Stripe removed (Fas 5, 2026-06):** historical web/Stripe integration is archived in [`ARKIVERAT-STRIPE.md`](ARKIVERAT-STRIPE.md).

---

## 1. Översikt

### Varför RevenueCat?

Apple kräver StoreKit för alla digitala köp inuti iOS-appar (App Store Review Guideline 3.1.1). En direkt StoreKit-integration kräver server-side receipt validation, vilket RevenueCat abstraherar bort med en enkel webhook-modell. Samma mönster gäller Android via Play Billing.

### Produkt

| Attribut | Värde |
|---|---|
| **Produkt-ID** | `se.mystarday.app.basic` |
| **Typ** | Månadsabonnemang |
| **Pris** | 59 SEK / månad |
| **Entitlement** | `basic` (tillgång till betalfunktion) |

### Plattformar och betalning

| Plattform | Betalningsmetod | Status |
|---|---|---|
| **iOS / Android (native)** | RevenueCat + App Store / Play Store IAP | **Enda aktiva betalväg** |
| **Webb (PWA)** | Ingen köp-UI | Ingen checkout — preview/ladda ner-flöde endast |

Webb-användare kan aldrig köpa via webbläsaren. Betalningsflöden på webben är blockerade (`BILLING_UI_DISABLED`, `IAPManager.canShowPaymentUI() === false`). Se §9.7 i [`paket-v1.2-spec.md`](paket-v1.2-spec.md).

---

## 2. Arkitektur

### Köpflöde

```
App-start (native)
  │
  ├── IAPManager.init()
  │     ↓
  │   GET /api/iap/config   ← fetchar REVENUECAT_API_KEY
  │     ↓
  │   Purchases.configure({ apiKey })
  │     ↓
  │   Purchases.login(familyId)   ← family UUID som appUserID
  │
  └── Användare väljer köp
        ↓
      Purchases.purchasePackage(package)
        ↓
      Apple StoreKit (native UI)
        ↓
     köpet genomförs / avbryts
        ↓
      RevenueCat registrerar händelsen
        ↓
      POST /api/iap/webhook   →  backend uppdaterar subscription_status
        ↓
      Database: family.subscription_status ← nytt värde
```

### Involverade filer

| Fil | Roll |
|---|---|
| `public/js/iap-manager.js` | Klient-side: SDK init, entitlement-kontroll, plattforms-gating |
| `src/routes/iap.js` | Backend: `/api/iap/config` + `/api/iap/webhook` |
| `src/lib/subscription.js` | `hasActiveSubscription()`-hjälpreda för alla route-guard-logik |
| `migrations/1790070000000_iap_subscription_cols.js` | DB-schema: `is_lifetime_free`, `rc_customer_id`, `subscription_status` |

---

## 3. Miljövariabler

Alla variabler sätts i **VPS `.env`** (eller Render om staging) för produktion.

| Variabel | Krav | Var/vem |
|---|---|---|
| `REVENUECAT_API_KEY` | **Nödvändig** — publik nyckel, safe i klient-kod | Frontend + backend (via `/api/iap/config`) |
| `REVENUECAT_WEBHOOK_SECRET` | **Nödvändig** — hemlig nyckel, enbart backend | Backend webhook-validering (`src/routes/iap.js`) |

`REVENUECAT_API_KEY` exponeras offentligt via `GET /api/iap/config` (kräver auth). Detta är avsiktligt — det är en publik nyckel och RevenueCat förutsätter det.

`REVENUECAT_WEBHOOK_SECRET` ska aldrig exponeras till klienten. Om den saknas loggar webhook-routen ett fel och returnerar `500` — inga familjer påverkas.

---

## 4. Plattforms-gating

All plattformslogik bor i `public/js/iap-manager.js`.

### `Platform.isNative()`-gaten

```javascript
function isNative() {
  // Primärt: window.Platform.isNative() (Capacitor)
  // Fallback: Capacitor.isNativePlatform()
}

async function init() {
  if (!isNative()) {
    // Webb: skippa RevenueCat helt
    _initialized = true;
    return;
  }
  // native: init RevenueCat SDK
}
```

### Webb-betalning blockerad

Ingen webb-betalning finns i appen:

```javascript
function canShowPaymentUI() {
  return false; // Alltid false — ingen webb-betalning
}

function canPurchase() {
  return isNative() && _initialized; // Endast native + SDK redo (när IAP är aktiverat)
}
```

- Klient: `canShowPaymentUI() === false` döljer alla köp-CTA på webb
- Backend: endast `POST /api/iap/webhook` (RevenueCat) — inga checkout-routes
- `/pricing-info` och `/upgrade` redirectas till dashboard när `BILLING_UI_DISABLED=true`

> **App Review (2026):** `iap-manager.js` kan vara en stub (`canPurchase() === false`) tills IAP produkter är live i App Store Connect. Webhook-backend och `family.subscription_status` är redo oavsett.

---

## 5. Webhook-validering

### Endpoint

```
POST /api/iap/webhook
Content-Type: application/json
Authorization: <värde från RevenueCat Dashboard>
```

Valfritt vid HMAC-signering i RevenueCat:

```
X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>
```

### Valideringssteg

1. **Webhook auth ej konfigurerad** (`REVENUECAT_WEBHOOK_SECRET` och `REVENUECAT_WEBHOOK_SIGNING_SECRET` saknas) → `500`
2. **Ogiltig auth** → `401 Unauthorized`
3. **Body inte valid JSON** → `400 Bad Request`
4. **Saknat `event` eller `event.type`** → `400 Bad Request`
5. **Saknad app-användaridentitet** → `400 Bad Request`
6. **Familj hittas inte** → `404 Not Found`
7. **Tillfälligt DB-fel** → `503 Service Unavailable` (RevenueCat retryar)
8. **Lyckad bearbetning eller duplicerat `event.id`** → `200 OK`

Payload-fält läses från `payload.event` (inte `event.data.attributes`): `id`, `type`, `app_user_id`, `original_app_user_id`, `aliases`, `expiration_at_ms`.

### Event-typer och statusuppdateringar

| Event-typ | `subscription_status` | Kommentar |
|---|---|---|
| `INITIAL_PURCHASE` | `active` | Sätter även `rc_customer_id = app_user_id` |
| `RENEWAL` | `active` | |
| `UNCANCELLATION`, `PRODUCT_CHANGE`, … | `active` | |
| `CANCELLATION` | `active` om `expiration_at_ms` ligger i framtiden | Avslutar inte åtkomst före periodslut |
| `EXPIRATION` | `expired` | |
| `BILLING_ISSUE` | `grace_period` | Apple försöker betala igen |
| `(övriga)` | *(ingen statusändring)* | `200 OK`, loggas som skipped |

Idempotens: `event.id` lagras i `iap_webhook_log.revenuecat_event_id` (UNIQUE). Duplicerade leveranser returnerar `200` utan ny effekt.

### Lookup-logik

1. `family.id` matchar någon av: `app_user_id`, `original_app_user_id`, `aliases`
2. Annars `family.rc_customer_id` matchar samma kandidater

Se även `docs/code-review-p0-iap-deploy.md` för drifts- och verifieringschecklista.

---

## 6. Lifetime Free (Beta-användare)

### `is_lifetime_free = true`

Alla familjer som existerade vid IAP-releasen (2026-05-28) är markerade som lifetime-free. De betalar aldrig och deras `subscription_status` uppdateras aldrig via webhooks.

**Migration:** `migrations/1790070000000_iap_subscription_cols.js` sätter `is_lifetime_free = true` för alla befintliga familjer vid release. Nya familjer registreras med `is_lifetime_free = false` (default).

### `hasActiveSubscription()`-hjälpen

```javascript
// src/lib/subscription.js
function hasActiveSubscription(family) {
  if (!family) return false;
  if (family.is_lifetime_free) return true; // ← alltid true
  return (
    family.subscription_status === 'active' ||
    family.subscription_status === 'grace_period'
  );
}
```

**Kontrollordning:** 1) `is_lifetime_free` → 2) `subscription_status`.

### Vad som skyddas

- Webhook-uppdateringar hoppar över lifetime-free-familjer (steg 5 i webhook-handler)
- `checkSubscriptionStatus()` i `iap-manager.js` returnerar `true` direkt för lifetime-free
- Inga betalväggar eller prenumerationsmodaler visas för lifetime-free-användare

---

## 7. Felsökning

### RevenueCat Dashboard

1. Logga in på [RevenueCat Dashboard](https://app.revenuecat.com)
2. Välj projektet (Min Stjärndag)
3. **Purchases → Overview** — visar aktiva subscriptioner per entitlement
4. **Events → Webhooks** — visar skickade webhook-händelser och leveransstatus
5. **Diagnostics** — visar webhook-fel och retry-loggar

### Testa webhooken manuellt

**Generera signatur (Linux/macOS):**
```bash
# Med echo och hmac
SECRET="ditt_revenuecat_webhook_secret"
BODY='{"event":{"type":"INITIAL_PURCHASE","data":{"attributes":{"app_user_id":"familj-uuid-här"}}}}'

SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# curl-exempel
curl -X POST "https://[REDACTED]/api/iap/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key:$SIGNATURE" \
  -d "$BODY"
```

**Med testfamiljens UUID:**
```bash
SECRET="your_revenuecat_webhook_secret_here"
BODY='{"event":{"type":"INITIAL_PURCHASE","data":{"attributes":{"app_user_id":"FAMILJ_UUID"}}}}'

SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -X POST "https://[REDACTED]/api/iap/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_key:$SIGNATURE" \
  -d "$BODY"
```

### Vanliga problem

| Problem | Symptom | Åtgärd |
|---|---|---|
| SDK inte initierat | `RevenueCat is not configured` i konsol | Kontrollera att `REVENUECAT_API_KEY` är satt i VPS `.env` och att `GET /api/iap/config` returnerar en nyckel |
| Fel appUserID | Ingen entitlement aktiveras | Verifiera att `familyId` från `window.Auth.getFamilyId()` matchar family UUID i databasen |
| Webhook 401 | Loggen visar `Signature mismatch` | Kontrollera att `REVENUECAT_WEBHOOK_SECRET` i VPS `.env` matchar värdet i RevenueCat Dashboard → Webhooks |
| Webhook 500 | Loggen visar `REVENUECAT_WEBHOOK_SECRET not configured` | Sätt `REVENUECAT_WEBHOOK_SECRET` i VPS `.env` |
| Lifetime-free hoppas över | Beta-användare kan inte köpa | Detta är avsiktligt — `is_lifetime_free = true` familjer har permanent gratis. Sätt `is_lifetime_free = false` i databasen för att testa köp: `UPDATE family SET is_lifetime_free = false WHERE id = 'familj_uuid';` |
| App startar ej köpflöde | `canPurchase() === false` | Verifiera att `isNative() === true` och `_initialized === true` i konsolen |