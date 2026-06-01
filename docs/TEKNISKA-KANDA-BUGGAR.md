# Kända buggar & förbättringar (teknisk backlog)

Uppdaterad vid kodgranskning 2026-05-29.

## Åtgärdat i `main` (senaste pass)

| Problem | Fix |
|---------|-----|
| Val av barn från API-lista tappade namn/avatar på PIN-skärm | `lastMergedChildren` + `selectChild` |
| `GET /api/auth/me` som barn saknade `avatar_url` | SELECT utökad |
| `getChildAccess` ignorerade `revoked_at` | `AND pc.revoked_at IS NULL` |
| Barnavatar utan default-bild | `dom-utils.js` på `child-login.html` |
| `switchChildMember` utan CSRF-förberedelse | `ensureCsrfToken()` |

## Kvar — medium prioritet

| # | Beskrivning | Förslag |
|---|-------------|--------|
| 1 | **HTML via `express.static`** (t.ex. `/dashboard.html`) får inte Release OS-injektion | Route-only eller static middleware som injicerar |
| 2 | **Barn-header** (`child-dashboard`) visar emoji, inte selfie | Använd `renderChildAvatar` i header |
| 3 | **Vuxen utloggning** rensar `known_children` | Behåll lista vid “Byt användare” vs “Logga ut alla”; eller synka från login-picker |
| 4 | **`/login` utan barnlista** | Ev. länk “Fortsätt som barn” med förhandsvisning |
| 5 | **Native tab bar** dold tills `/api/app-config` 200 | Prod före deploy: ingen tab bar (avsiktligt fail-closed) |
| 6 | **Capacitor App deep link** på vissa builds | Verifiera efter deploy + `Capacitor.getPlugin('App')` |

## Kvar — produkt / preset (ej kod)

| # | Förbättring |
|---|-------------|
| P1 | “Koppla barnets telefon”-QR från vuxen (enhet utan föräldersession) |
| P2 | `@capacitor/preferences` för `device_mode` / `known_children` (native persistence) |
| P3 | Tydlig skillnad **Byt barn** vs **Logga ut** i barnvy (ev. två texter på svenska i UI) |
| P4 | Gate 24/25, TestFlight, Google native plugin (se `app2.md`) |

## Verifiering efter deploy

```bash
npm test
curl -sS https://mystarday.se/api/app-config
curl -sS https://mystarday.se/sw.js | head -3
```

Se även `docs/POLSIA-DEPLOY-EFTER-MAIN.md`.
