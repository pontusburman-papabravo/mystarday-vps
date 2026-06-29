# App Store Connect — Metadata

> Appen är **redan live** — metadata, screenshots och promotional text kan uppdateras **utan ny app-version** (ingen ny build till review).  
> Säljtext redo att klistras in i App Store Connect.  
> Skärmbilder med overlay-copy: [`app-store-screenshots/SCREENSHOT-PLAN.md`](./app-store-screenshots/SCREENSHOT-PLAN.md)  
> Custom Product Pages: [`app-store-custom-product-pages.md`](./app-store-custom-product-pages.md)  
> Featuring-pitch: [`app-store-featuring-pitch.md`](./app-store-featuring-pitch.md)

### Snabbast effekt (redan publicerad app)

| Åtgärd | Ny build? | Var i Connect |
|--------|-----------|---------------|
| Subtitle + keywords | Nej | App Information → Swedish |
| Description | Nej | Version → Description |
| Promotional text | Nej | Version → Promotional Text |
| Screenshots | Nej | Version → Screenshots |
| Custom Product Pages | Nej | Custom Product Pages |
| App Name | Sällan (review) | App Information |

**Gör idag:** subtitle, keywords, promotional text → screenshots med overlay → spara. Ingen väntan på review om du bara ändrar metadata/screenshots på befintlig version.

---

## App Information

**App Name:** Min Stjärndag   <!-- pragma: allowlist secret -->
*(max 30 tecken — behåll kort; nyckelord i subtitle)*

**Subtitle** (max 30 tecken):
> Visuellt stöd & rutiner

*Tecken: 22/30. Alternativ om A/B-test:*
- `Bildschema & belöningar` (23 tecken)
- `Rutiner utan tjat` (18 tecken)

---

## Description (App Description)

> Max 4000 tecken. Svensk text för svenska App Store.

Min Stjärndag hjälper föräldrar och barn att få en lugnare vardag — tillsammans. <!-- pragma: allowlist secret -->

**Visuellt stöd som barnet förstår**
Bygg dagsscheman med bilder och delsteg. Barnet ser exakt vad som händer nu och vad som kommer sen — perfekt för barn som behöver tydlig struktur, oavsett om det gäller morgonrutin, läxor eller läggdags.

**Belöningar som motiverar**
Varje avklarat steg ger stjärnor. Stjärnorna samlas i Skattkammaren mot belöningar ni själva väljer — från extra saga till restaurangbesök. Positiv förstärkning istället för tjat.

**För föräldrar**
- Skapa och redigera scheman på några minuter
- Följ alla barns framsteg i en överblick
- Bjud in medförälder — samma schema, ingen dubbelplanering
- Boendeschema för växelvis boende (vecka A/B)
- Dela rapporter säkert med förskola, skola eller terapeut
- Skriv ut schema som PDF

**För barn**
Barn loggar in med egen PIN och möts av en färgglad vy med dagens uppdrag, stjärnor och belöningar. Utformat för självständighet — barn i åldrarna 3–10 kan bocka av själva.

**Färdiga rutiner att aktivera**
Morgonrutin, kvällsrutin, självständighet och mer — aktivera på en minut via För dig-fliken.

**Trygghet**
- Svensk app, data i EU
- Ingen reklam
- Offline-läge
- Sign in with Apple

Passar familjer med barn 3–10 år — särskilt de som söker bildschema, bildstöd eller tydligare vardagsrutiner.

---

## Keywords

> **Ett** fält, **max 100 tecken totalt**. Kommaseparerat, **inga mellanslag** efter komma.  
> Upprepa inte ord som redan finns i App Name eller Subtitle (`Min`, `Stjärndag`, `visuellt`, `stöd`, `rutiner`).

**Klistra in (98 tecken):**
```
bildschema,bildstöd,NPF,ADHD,autism,belöning,förskola,morgon,kväll,medförälder,pedagog,barn,rutin
```

*Verifiering:* `echo -n 'bildschema,bildstöd,NPF,ADHD,autism,belöning,förskola,morgon,kväll,medförälder,pedagog,barn,rutin' | wc -c` → 98

---

## Promotional Text

> Max 170 tecken. Uppdateras utan ny version.

Bildschema med stjärnbelöningar — barnet ser vad som händer, ni slipper tjat. Aktivera morgon- eller kvällsrutin på en minut. Prova gratis. ★

*Tecken: 138/170*

---

## Screenshots & Preview

**Detaljerad plan:** [`app-store-screenshots/SCREENSHOT-PLAN.md`](./app-store-screenshots/SCREENSHOT-PLAN.md)  
**Inspelning:** [`app-store-screenshots/NATIVE-CAPTURE.md`](./app-store-screenshots/NATIVE-CAPTURE.md)

### Snabbreferens — standardordning (5 bilder)

| # | Källa | Overlay-rubrik |
|---|-------|----------------|
| 1 | Barnvy — Dagens uppdrag | Barnet ser vad som händer nu |
| 2 | Skattkammaren | Stjärnor som motiverar |
| 3 | För dig — rutiner | Morgon & kväll utan maktkamp |
| 4 | Hem — översikt | Hela familjen i samma överblick |
| 5 | Boendeschema | Växelvis boende? Vecka A & B |

Lägg **alltid** overlay-text ovanpå mockupen innan upload. Ladda inte upp rena screenshots utan säljcopy.

---

## Category & Age Rating

**Primary Category:** Education  
**Secondary Category:** Lifestyle

*Alternativ om Education känns smal:* Primary Family, Secondary Education.

**Age Rating:** 4+  
**Content Flags:** None

---

## URLs

| Field | URL |
|-------|-----|
| Support URL | https://mystarday.se | <!-- pragma: allowlist secret -->
| Privacy Policy URL | https://mystarday.se/privacy | <!-- pragma: allowlist secret -->
| Marketing URL | https://mystarday.se | <!-- pragma: allowlist secret -->

---

## Contact & Legal

| Field | Value |
|-------|-------|
| Developer Website | https://mystarday.se | <!-- pragma: allowlist secret -->
| Copyright | © 2026 Papa Bravo AB |

---

## Review Information

**Contact Email:** info@mystarday.se   <!-- pragma: allowlist secret -->
**Demo Account Username:** review@mystarday.se   <!-- pragma: allowlist secret -->
**Demo Account Password:** AppReview2026!

**Notes to Reviewer (engelska):**
> Min Stjärndag is a Swedish family routine and visual schedule app. Log in with the test account above (parent: email + password). Children use a 4-digit PIN (4455 for child Anna). Parent nav: Home · Planning · Rewards · For You · Family. Child view shows daily missions with visual sub-steps and a star reward system (Skattkammaren). Privacy policy at /privacy. Data stored in EU. Push notifications are opt-in. No ads. <!-- pragma: allowlist secret -->
