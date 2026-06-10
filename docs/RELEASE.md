# Lanseringsguide — v1.0.0

> Status: **🚀 READY FOR RELEASE — v1.0.0**
> Uppdaterad: 2026-05-28 | SW v129

---

## Lifetime Free — Topp 200 Familjer

Familjer #1–200 får automatiskt `is_lifetime_free=true` vid registrering.
Ingen prenumeration krävs — RevenueCat-webhooks ignoreras för dessa konton.

- **Logg:** Varje registrering loggar `Family #N created — lifetime_free: true/false`
- **Från familj #201:** Normalt trial/subscription-flöde via RevenueCat (14 dagars trial, sedan betalvägg)
- **Verifiera:** Kör `SELECT id, name, is_lifetime_free FROM family ORDER BY created_at` i Neon-konsolen

### Så fungerar det
Backend räknar befintliga familjer i samma transaktion som insert — race-condition-säkert.
`hasActiveSubscription()` i `src/lib/subscription.js` returnerar `true` direkt för `is_lifetime_free=true`.

---

## Miljövariabler att verifiera på Render

Kontrollera att samtliga nedan är satta i Render → Environment-variabler innan submission:

| Variabel | Värde | Kommentar |
|----------|-------|-----------|
| `REVENUECAT_API_KEY` | (från RevenueCat Dashboard) | Publika nyckeln — exponeras via `/api/iap/config` |
| `REVENUECAT_WEBHOOK_SECRET` | (från RevenueCat Dashboard) | Hemlig nyckel för webhook-HMAC-validering |
| `APNS_KEY_ID` | `RTJ37525AU` | 10-teckens Key ID från Apple Developer → Keys |
| `APNS_TEAM_ID` | `PQ7M3B7VW5` | Apple Team ID |
| `APNS_KEY_CONTENT` | (PEM-nyckel inkl. `-----BEGIN PRIVATE KEY-----`) | Hela .p8-nyckeln som env-var |
| `APNS_BUNDLE_ID` | `se.mystarday.app` | Bundle ID |
| `APNS_SANDBOX` | `false` | `true` endast vid testflight; `false` för produktion |
| `VAPID_PUBLIC_KEY` | (web-push VAPID publik nyckel) | För PWA push-notiser |
| `VAPID_PRIVATE_KEY` | (web-push VAPID hemlig nyckel) | Backend-användning |
| `PAYMENT_ENABLED` | `false` | Stripe inaktiverat — IAP via RevenueCat |
| `STRIPE_SECRET_KEY` | (sätts ändå för admin-fliken) | Backend Stripe-funktionalitet |
| `STRIPE_WEBHOOK_SECRET` | (från Stripe Dashboard) | För Stripe-webhooks |
| `RESEND_API_KEY` | (från Resend Dashboard) | All e-post (verifiering, nyhetsbrev, välkomst m.m.) |
| `EMAIL_FROM` | `info@mystarday.se` | Avsändaradress (måste vara verifierad domän i Resend) |
| `EMAIL_ENABLED` | `true` | Sätt `false` för att stänga av utskick |
| `POLSIA_API_KEY` | (från Polsia Dashboard) | Bilduppladdning (R2-proxy) — **inte** e-post |
| `DATABASE_URL` | (Neon-connection string) | Ska redan finnas |

### Resend MCP (Cursor / Claude Code)

Projektet inkluderar `.cursor/mcp.json` för Resend MCP (skicka/testa mail från editorn).

1. Sätt `RESEND_API_KEY` i din shell eller `.env` (kopiera från `.env.example`)
2. Starta om Cursor → **Settings → MCP** → aktivera `resend`

**Stdio (standard, redan konfigurerad):** läser nyckeln från `${env:RESEND_API_KEY}`.

**HTTP (valfritt, t.ex. flera klienter):**
```bash
RESEND_API_KEY=re_xxx npx -y resend-mcp --http --port 3000
```
Lägg till i Cursor MCP med URL `http://127.0.0.1:3000/mcp` och header `Authorization: Bearer re_xxx`.

### RevenueCat Webhook — URL
Peka RevenueCat-dashboarden mot:
```
https://mystarday.se/api/iap/webhook
```
> Se `docs/app-store-iap.md` för full dokumentation.

---

## Testkonto — skapa manuellt på mystarday.se

Pontus registrerar sig manuellt på https://mystarday.se:
1. Gå till https://mystarday.se/register
2. E-post: `review@mystarday.se` | Lösenord: `AppReview2026!`
3. Namn: Pontus (valfritt)
4. Bekräfta e-post (klicka länken i inkorgen)
5. Lägg till barn: **Anna**, född 2018-09-08, PIN **4455**
6. Skapa minst ett veckoschema med aktiviteter + en belöning i Skattkammaren

> ⚠️ Kontot hamnar bland de <200 och får **lifetime free automatiskt** — bekräfta med:
> ```sql
> SELECT is_lifetime_free FROM family WHERE id = (SELECT family_id FROM parent WHERE email = 'review@mystarday.se');
> -- Förväntat: true
> ```

### Testkonto-referens (för Apple-revisorer)
- E-post: `review@mystarday.se`
- Lösenord: `AppReview2026!`
- Barn: Anna, PIN: 4455

---

## Lokala byggsteg (Pontus kör dessa)

```bash
# 1. Bygg produktions-frontend
npm run build

# 2. Kopiera webbassets till iOS-skalet
npx cap copy ios

# 3. Synka plugins och dependencies
npx cap update ios

# 4. I Xcode — sätt versioner manuellt:
#    Product → Select target "MinStjarndag" → Build Settings
#    CFBundleShortVersionString = 1.0.0
#    CFBundleVersion = 1
#    (Info.plist behöver inte redigeras — Xcode hanterar det)

# 5. Archivera och distribuera
#    Product → Archive → Distribute App → App Store Connect
```

### Checklista före Xcode-arkivering

| Kontroll | Status |
|----------|--------|
| Xcode-projektet heter `stjarndag.xcworkspace` (CocoaPods) eller `stjarndag.xcodeproj` | ☐ |
| Signing: Team valt, Automatic Signing | ☐ |
| Bundle ID: `se.mystarday.app` | ☐ |
| Capabilities: Push Notifications, Sign in with Apple | ☐ |
| Info.plist: Display Name = "Min Stjärndag" | ☐ |
| TestFlight-build? Sätt `APNS_SANDBOX=true` i Render först | ☐ |

---

## App Store Connect — steg-för-steg

### 1. Logga in på App Store Connect
```
https://appstoreconnect.apple.com
```

### 2. Förbered appen
1. Välj **Mina appar** → **Min Stjärndag**
2. Gå till fliken **App Store** → **Versioner**
3. Klicka på **+ Ny version eller plattform**: `1.0.0`

### 3. Fyll i metadata

| Fält | Värde |
|------|-------|
| **App-namn** | Min Stjärndag |
| **Undertext** | Familjerutin & belöningsapp |
| **Kategori** | Livsstil > Utbildning |
| **Åldersklassificering** | 4+ (inget innehåll kräver högre) |
| **Prissättning** | Gratis (IAP konfigureras separat i App Store Connect → Inköp) |

### 4. App Privacy
- Samlar in: **Namn**, **E-postadress**, **Användarinnehåll** (barnprofiler)
- Länkad till användare: **Ja**
- Beskrivning: "För att skapa familjekonton och hantera barnprofiler."

### 5. Review Notes
Klista in hela innehållet från `docs/app-store-review-notes.md` i fältet **Review Notes**.

### 6. Screenshots

**Godkända mått:** 1242×2688, 1284×2778, 2688×1242, 2778×1284 (inga andra).

Ta i **Xcode Simulator** (native app) — se `docs/app-store-screenshots/NATIVE-CAPTURE.md`.  
⌘S sparar på Skrivbordet. Verifiera: `file ~/Desktop/*.png`

Ladda upp (portrait **1284×2778** från iPhone 14 Plus simulator):
1. Föräldraöversikt
2. Barnväljare (PIN-inloggning)
3. Barnvy — Idag
4. Barnvy — Skattkammaren
5. Barnvy — Familj

### 7. Inköp i appen (IAP)
Konfigurera i App Store Connect → **Inköp i appen**:
- `com.mystarday.app.subscription.monthly` — Monthly
- `com.mystarday.app.subscription.yearly` — Yearly
- Ladda upp metadata och pris för varje

### 8. Submit for Review
1. Klicka **Lägg till för granskning**
2. Kontrollera att allt är ifyllt
3. Klicka **Skicka in för granskning**

### Förväntad granskningstid
- Initialt: 1–3 dagar
- Vid avslag: läs kommentarerna, åtgärda, ladda upp ny build (version +1)

---

## App Store Review Notes (referens)

Barnet i testkontot heter **Anna** med PIN **4455** (ej å/ä/ö för Apple-granskare).

### Snabbtest för reviewer
1. Logga in: `review@mystarday.se` / `AppReview2026!`
2. Öppna parent dashboard
3. "Barnet loggar in" → välj Anna → PIN `4455`
4. Markera en aktivitet på **Idag**-fliken
5. Byt till **Skattkammaren** och **Familj** via bottenflikarna
6. Testa inställningar → Integritetspolicy

---

## Kända begränsningar vid submission

- Push-notifier på simulator fungerar ej (iOS-begränsning, inte bugg)
- Apple Sign In kräver fysisk enhet för full testning
- PWA-guiden i inställningar döljs automatiskt på native iOS

---

## Efter release

1. Sätt `APNS_SANDBOX=false` i Render (om det inte redan är gjort)
2. Verifiera RevenueCat-webhook pekar mot `https://mystarday.se/api/iap/webhook`
3. Övervaka `/api/iap/webhook`-loggar efter första köp
4. Kontrollera att `subscription_status` uppdateras korrekt vid köp