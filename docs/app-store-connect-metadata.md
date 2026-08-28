# App Store Connect — Metadata

> Säljtext redo att klistras in i App Store Connect.
> Fyll i eventuella varianter (ditt land/reglering) vid behov.
> Svensk text — översätt till engelska vid sidan av Apple Store Review.

> **⚠️ Åtgärd krävs i App Store Connect (2026-08-28):** Apple avslog inlämningen — "does not include a functional link to the Terms of Use (EULA) in the app metadata that appears on the app's App Store product page." Beskrivningen nedan har nu en Användarvillkor-länk längst ner. Klistra in den uppdaterade **Description** i App Store Connect → App Information → *Description* (och i en-GB-versionen, se `app-store-connect-metadata-en-GB.md`) och skicka in på nytt. Detta är en ren metadata-ändring i App Store Connect — kräver ingen ny build. Se `docs/app-store-review-notes.md` för svarstext till Apple.

---

## App Information

**App Name:** Min Stjärndag

**Subtitle** (max 30 tecken):
> Dagliga scheman för barn

---

## Description (App Description)

> Max 4000 tecken. Svensk text för svenska App Store.

Min Stjärndag hjälper föräldrar och barn att få en lugnare vardag — tillsammans.

**För föräldrar:**
Skapa dagsscheman med aktiviteter och belöningar, följ hur det går och ge stjärnor när barnet gör bra ifrån sig. Du ser allas framsteg i en tydlig översikt och kan dela utvald information med förskola eller skola via säkra delningslänkar.

**För barn:**
Barn loggar in med en egen PIN-kod och möts av en färgglad, stjärnbaserad vy. Där ser de sitt dagsschema med bilder och får belöningar när aktiviteter är klara. Allt är utformat för att vara självständigt för ett barn i förskoleåldern.

**Vad du får:**
- Dagliga och veckovisa scheman anpassade för ditt barn
- Stjärnbelöningar och belöningskammare (Skattkammaren)
- Push-notiser för påminnelser och framsteg
- Delning av rapporter med pedagoger och terapeuter
- Pedagoganteckningar (för pedagoger)
- Offline-läge — funkar även utan internet

Passar för familjer med barn i åldrarna 3–10 år.

Användarvillkor (EULA): [REDACTED]/terms
Integritetspolicy: [REDACTED]/privacy

---

## Keywords (Keywords)

> Max 100 tecken per nyckelord. Sju nyckelord à max 100 tecken = 700 tecken totalt.

Nyckelord 1 (59 tecken):
> dagliga scheman barn förskola föräldrar rutiner aktiviteter

Nyckelord 2 (69 tecken):
> stjärnbelöning belöningssystem familjeapp barnschema vardagsrutiner

Nyckelord 3 (51 tecken):
> förskola skola pedagoganteckningar observationer barnutveckling

Nyckelord 4 (57 tecken):
> push-notiser påminnelse föräldraapp familjeliv schema barn

Nyckelord 5 (60 tecken):
> skattkammare belöningskammare star rewards barn app rutiner

Nyckelord 6 (37 tecken):
> offline familjeapp förskolebarn dagliga rutiner

Nyckelord 7 (46 tecken):
> swedish family app kids schedule routine star rewards

---

## Promotional Text

> Max 170 tecken. Uppdateras utan ny version.

Skapa dagsscheman, ge stjärnor och låt barnen följa sin egen vy. Min Stjärndag – ordning och glädje för hela familjen. ★

---

## Screenshots & Preview

**Källa:** Xcode Simulator eller TestFlight (native app) — se `docs/app-store-screenshots/NATIVE-CAPTURE.md`.  
Playwright/PWA-bilder i repot är **inte** för upload.

### Godkända mått (endast dessa)

| Portrait | Landscape |
|----------|-----------|
| **1242 × 2688** | **2688 × 1242** |
| **1284 × 2778** | **2778 × 1284** |

**Avvisas:** 1290×2796, 1242×2208, och alla andra storlekar.

Simulator: **iPhone 14 Plus** → 1284×2778 · **iPhone 11 Pro Max** → 1242×2688 · Screenshot **⌘S**.

### Innehåll (ordning 1–5)

| # | Vy | Innehåll |
|---|-----|----------|
| 1 | Förälder | Hem med native bottenflik (Hem · Schema · …) |
| 2 | Barn | Välj barn / PIN |
| 3 | Barn | **☀️ Idag** |
| 4 | Barn | **💎 Skattkammaren** (rum-hub) |
| 5 | Barn | **🏡 Familj** |

**Screenshot-krav:**
- Native UI (inte mobil webb med hamburger-meny)
- **3-fliksnavigation** i barnvy (Idag · Skattkammaren · Familj)
- Reellt innehåll från review-kontot

---

## Category & Age Rating

**Primary Category:** Family & Education
**Secondary Category:** Lifestyle

**Age Rating:** 4+
**Content Flags:** None (app does not contain mature content)

---

## URLs

| Field | URL |
|-------|-----|
| Support URL | https://mystarday.se |
| Privacy Policy URL | https://mystarday.se/privacy |
| Marketing URL | https://mystarday.se |

---

## Contact & Legal

| Field | Value |
|-------|-------|
| Developer Website | https://mystarday.se |
| Copyright | © 2026 Papa Bravo AB |

---

## Review Information

**Contact First Name:** [First name]
**Contact Last Name:** [Last name]
**Contact Email:** info@mystarday.se
**Phone:** [Phone number — optional]
**Demo Account Username:** review@mystarday.se
**Demo Account Password:** APP_REVIEW_PASSWORD (secret store)

**Notes to Reviewer (Engelska):**
> The app is a Swedish family routine and reward app. The reviewer can log in with the test account above. The parent logs in with email + password. Children use a 4-digit PIN to access the child view. The app has a privacy policy at /privacy.html and terms of service at /terms.html. All user data is stored in EU. Push notifications are opt-in. No advertising. No third-party analytics without consent.