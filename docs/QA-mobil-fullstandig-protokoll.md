# QA — Fullständigt mobiltest (Förälder + Barn)

**Version:** 1.0  
**Datum:** 2026-06-25  
**Miljö:** iPhone 14 Pro-lik viewport (390×844), touch, sv-SE  
**App:** Min Stjärndag (mystarday.se / lokal dev)

---

## 1. Syfte

Detta dokument är den **officiella testplanen** för regression av hela familjeupplevelsen på mobil:

- Förälder: alla fem primärflikar + djup-länkar, barnprofil, inställningar
- Barn: tre världar (Idag · Min värld · Mina personer) + systemmeny bakom Parental Gate
- Flerbarn: familj med **två barn**, byte mellan barn, separata PIN

Målet är **~200 testpunkter** som kan köras manuellt eller delvis automatiserat via `scripts/smoke-mobile-full-qa.mjs`.

---

## 2. Testprotokoll

### 2.1 Förutsättningar

| Krav | Detalj |
|------|--------|
| Enhet / emulator | Mobil viewport 390×844, `hasTouch: true` |
| Språk | Svenska (sv-SE) |
| Cookies | Godkänn cookie-banner vid första sidladdning |
| E-postverifiering | Av (`REQUIRE_EMAIL_VERIFICATION=false` i dev) |
| Familj | Skapas med `scripts/seed-smoke-family.mjs` (idempotent) |

### 2.2 Testfamilj (credentials)

Kör seed **en gång** innan test:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/stjarndag"
export JWT_SECRET="dev-jwt-secret-at-least-32-chars-long"
export BASE="http://127.0.0.1:3000"

export SMOKE_PARENT_EMAIL="qa.mobil@test.stjarndag.local"
export SMOKE_PARENT_PASSWORD="QaMobilTest2026!Secure"
export SMOKE_PARENT_NAME="QA Mobil"
export SMOKE_CHILD_NAME="Astrid"
export SMOKE_CHILD_PIN="4829"
export SMOKE_CHILD2_NAME="Erik"
export SMOKE_CHILD2_PIN="7391"

node scripts/seed-smoke-family.mjs
```

| Roll | Användarnamn | PIN / lösenord |
|------|---------------|----------------|
| Förälder | `qa.mobil@test.stjarndag.local` | `QaMobilTest2026!Secure` |
| Barn 1 | Astrid | `4829` |
| Barn 2 | Erik | `7391` |

> **Prod:** Använd egna env-variabler — skapa aldrig testkonton på prod utan godkännande.

### 2.3 Körordning

1. **Seed** — skapa/uppdatera familj (2 barn)
2. **Automatiserat** — `node scripts/smoke-mobile-full-qa.mjs` (mobil, headless eller headed)
3. **Manuellt** — punkter märkta `[M]` i checklistan (interaktioner som kräver mänsklig bedömning)
4. **Rapport** — fyll i §5 utifrån `artifacts/mobile-full-qa/results.json`

### 2.4 Godkännandekriterier

| Nivå | Krav |
|------|------|
| **P0 blocker** | Alla P0-punkter gröna; inga 500-fel; inga JS-crash på kärnflöden |
| **Release OK** | ≥95 % av alla punkter gröna; P1-fel dokumenterade med ticket |
| **Mobil UX** | Bottennav synligt; inga horisontella scroll-fel; touch-targets ≥44 px |

### 2.5 Automatisering

```bash
# Headless mobil (CI)
BASE=http://127.0.0.1:3000 node scripts/smoke-mobile-full-qa.mjs

# Synlig mobil (demo)
SMOKE_HEADED=1 SMOKE_SLOW_MS=80 node scripts/smoke-mobile-full-qa.mjs
```

Artifacts: `artifacts/mobile-full-qa/` (screenshots, `results.json`, `rapport.md`).

---

## 3. Testpunkter (200 st)

**Förkortningar:** ✅ = godkänd · ❌ = underkänd · ⏭ = ej tillämplig · `[A]` = automatiserbar · `[M]` = manuell

### A — Setup & infrastruktur (8)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| A01 | P0 | [A] | `GET /health` | `status: healthy`, version satt |
| A02 | P0 | [A] | `GET /manifest.json` | 200, `name` innehåller Stjärndag |
| A03 | P0 | [A] | `GET /sw.js` | Service worker laddar, CACHE_NAME matchar repo |
| A04 | P1 | [A] | PWA-ikoner (`/icon-192.png`) | 200 OK |
| A05 | P0 | [A] | Seed: förälder login API | 200, `user.email` matchar |
| A06 | P0 | [A] | Seed: barn 1 + barn 2 finns | `GET /api/children` → ≥2 barn |
| A07 | P0 | [A] | Barn 1 PIN-login API | 200 |
| A08 | P0 | [A] | Barn 2 PIN-login API | 200 |

### B — Publik & cookie (6)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| B01 | P1 | [A] | `/` landning | HTML laddar, CTA synlig |
| B02 | P1 | [A] | `/login` | Inloggningsformulär |
| B03 | P1 | [A] | `/child-login` | Barnväljare eller PIN |
| B04 | P1 | [A] | Cookie-banner | "Godkänn alla" stänger banner |
| B05 | P2 | [A] | `/faq` | Sida laddar |
| B06 | P2 | [M] | Footer-länkar (Guider) | Interna SEO-länkar fungerar |

### C — Förälder: inloggning & session (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| C01 | P0 | [A] | Login med test-email | Redirect till `/dashboard` eller onboarding |
| C02 | P0 | [A] | Rollväljare dold efter login | `#role-selection` ej synlig |
| C03 | P0 | [A] | `NavConfig` laddad | `window.NavConfig.PRIMARY_NAV` har 5 flikar |
| C04 | P0 | [A] | Bottennav mobil | Hem · Planering · Belöningar · För dig · Familj |
| C05 | P1 | [A] | `/api/auth/me` | Returnerar förälder + barnlista |
| C06 | P1 | [A] | Session refresh | `/api/auth/refresh` → 200 efter login |
| C07 | P1 | [M] | Felaktigt lösenord | Tydligt felmeddelande, ingen crash |
| C08 | P1 | [A] | `/child-login` blockerar förälder-session | Barnflöde separat |
| C09 | P2 | [A] | `/upgrade` redirect | → dashboard eller settings (billing av) |
| C10 | P0 | [A] | Logga ut via avatar/meny | Tillbaka till `/login` |

### D — Hem / Dashboard (18)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| D01 | P0 | [A] | `/dashboard` laddar | Body >80 tecken, inga JS-fel |
| D02 | P0 | [A] | Barnkort visas (≥2) | Astrid + Erik synliga |
| D03 | P0 | [M] | Expandera barnkort | Status idag, stjärnor, paus-state |
| D04 | P0 | [A] | `initDragDrop` finns | Fas-8 split OK |
| D05 | P1 | [A] | Stjärnhistorik-modul | `loadStarHistory` är function |
| D06 | P1 | [M] | "Ge stjärnor"-modal öppnas | Modal synlig, stängs |
| D07 | P1 | [M] | "Kopiera dag"-modal | Modal öppnas från dashboard |
| D08 | P1 | [A] | Specialdagar-kalender | `renderSpecialDaysCalendar` function |
| D09 | P1 | [M] | Pausa dag (snabbknapp) | Barnkort visar paus |
| D10 | P1 | [M] | Återuppta pausad dag | Paus borta |
| D11 | P1 | [A] | Handoff "Barnet loggar in" | Länk till `/child-login` |
| D12 | P2 | [M] | Aktiveringsprogram-banner | Visas eller döljs korrekt per flag |
| D13 | P2 | [M] | Systemmeddelande-banner | Läsbar om aktivt |
| D14 | P1 | [A] | Notis-ikon i header | 🔔 länkar till `/notifications` |
| D15 | P1 | [A] | Avatar → inställningar | Navigering till `/settings` |
| D16 | P2 | [M] | Dela dagens schema | Native share eller fallback |
| D17 | P1 | [M] | Tidslinje-vy | Aktiviteter per sektion FM/EM/kväll |
| D18 | P1 | [M] | Side-by-side vy | Växling fungerar utan crash |

### E — Planering hub (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| E01 | P0 | [A] | `/planning` hub | Sida laddar, planeringskort |
| E02 | P0 | [A] | Länk Daglig logg | → `/daily-log` |
| E03 | P0 | [A] | Länk Schema | → `/schedule` |
| E04 | P1 | [A] | Länk Bibliotek | → `/library` |
| E05 | P1 | [A] | Länk Kalender | → `/calendar` |
| E06 | P1 | [A] | Länk Tilldela schema | → `/assign-schedule` |
| E07 | P2 | [A] | Länk Aktiviteter | → `/activities` |
| E08 | P1 | [M] | Hub-kort touch | Hela kortet klickbart, inget dubbeltryck |
| E09 | P2 | [M] | TEACCH/barn-stöd (gated) | Döljs eller länkar korrekt |
| E10 | P1 | [A] | Soft-nav vs hard-nav | `/schedule` full page load (tung sida) |

### F — Daglig logg (16)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| F01 | P0 | [A] | `/daily-log` laddar | Innehåll >80 tecken |
| F02 | P0 | [M] | Välj barn (Astrid) | Logg filtreras |
| F03 | P0 | [M] | Välj barn (Erik) | Separata aktiviteter |
| F04 | P0 | [M] | Bocka av aktivitet | Stjärna tilldelas |
| F05 | P0 | [M] | Ångra avbockning | Stjärna tas bort |
| F06 | P1 | [M] | Markera hel sektion klar | Bulk-complete |
| F07 | P0 | [M] | Pausa dag | "Ledig idag"-state |
| F08 | P0 | [M] | Återuppta dag | Aktiviteter tillbaka |
| F09 | P1 | [M] | Datumväljare (igår) | Backfill fungerar |
| F10 | P1 | [M] | Bump-tid +15 min | Tid uppdateras |
| F11 | P2 | [M] | Föräldrabetyg | Mood/rating sparas |
| F12 | P2 | [M] | Skriv ut | Print-dialog öppnas |
| F13 | P1 | [M] | Flytta aktivitet (D&D) | Ordning ändras |
| F14 | P1 | [A] | `?childId=` deep link | Rätt barn förvalt |
| F15 | P1 | [A] | `?date=` deep link | Rätt datum |
| F16 | P2 | [M] | Engångsaktivitet från logg | Ny rad syns |

### G — Schema (18)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| G01 | P0 | [A] | `/schedule` laddar | `ScheduleCore` + moduler |
| G02 | P0 | [M] | Välj barn Astrid | Veckoschema visas |
| G03 | P0 | [M] | Välj barn Erik | Eget schema |
| G04 | P0 | [M] | Lägg till aktivitet | Modal, spara OK |
| G05 | P0 | [M] | Redigera aktivitet | Ändring sparas |
| G06 | P1 | [M] | Ta bort aktivitet | Bekräftelse, borta |
| G07 | P1 | [M] | "Bara denna dag" | Exclusion fungerar |
| G08 | P1 | [M] | Kopiera dag | Modal → annan dag |
| G09 | P1 | [M] | Kopiera till syskon (Erik) | Schema kopieras |
| G10 | P1 | [A] | Mall-modal | `openTemplateModal` function |
| G11 | P1 | [A] | Fyll vecka-modal | `openFillWeekModal` function |
| G12 | P1 | [M] | Infoga dag | `openInsertDayModal` |
| G13 | P1 | [M] | Specialdagar | Kalender + redigera |
| G14 | P2 | [M] | Byt dag (swap) | Två dagar byter plats |
| G15 | P1 | [M] | Familjevecka-vy | `?view=family` |
| G16 | P1 | [M] | Engångsaktivitet | En dag, försvinner |
| G17 | P1 | [M] | Återkommande flera dagar | Upprepas korrekt |
| G18 | P2 | [M] | Skriv ut schema | Print OK |

### H — Bibliotek & aktiviteter (14)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| H01 | P0 | [A] | `/library` hub | Standard + Mina sektioner |
| H02 | P0 | [M] | Skapa aktivitet | Sparas i bibliotek |
| H03 | P0 | [M] | Redigera aktivitet | Uppdaterad |
| H04 | P1 | [M] | Lägg till delsteg | Sub-steps sparas |
| H05 | P1 | [M] | Skapa belöning | I belöningsflik |
| H06 | P1 | [M] | Kopiera från standardbibliotek | Aktivitet importerad |
| H07 | P2 | [M] | Kopiera standardbelöning | Belöning importerad |
| H08 | P1 | [M] | Kategorier | CRUD fungerar |
| H09 | P1 | [M] | Ordna/favoritmarkera belöning | Ordning sparas |
| H10 | P1 | [A] | `/activities` | Aktivitetslista |
| H11 | P2 | [M] | Sök/filter aktiviteter | Träffar visas |
| H12 | P1 | [A] | `LibraryMagicHub` global | Hub-script laddat |
| H13 | P2 | [M] | Emoji/ikon på aktivitet | Visas i schema |
| H14 | P2 | [M] | Radera aktivitet | Bekräftelse, borta |

### I — Belöningar (14)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| I01 | P0 | [A] | `/rewards` hub | Sida laddar |
| I02 | P0 | [A] | `/skattkammaren` → `/rewards` | Redirect för inloggad förälder |
| I03 | P0 | [M] | Godkänn väntande inlösning | Status approved |
| I04 | P0 | [M] | Neka inlösning | Status rejected |
| I05 | P0 | [M] | Godkänn måländring | Mål uppdaterat |
| I06 | P1 | [M] | Ge extra stjärnor (manuellt) | Saldo ökar |
| I07 | P1 | [M] | Sätt målbelöning per barn | Mål syns |
| I08 | P1 | [M] | Dölj belöning för barn | Ej synlig i barnvy |
| I09 | P2 | [M] | Familjekista toggle | Inställning sparas |
| I10 | P2 | [M] | Familjemuseum | Widget laddar |
| I11 | P1 | [A] | Pending-lista API | Inga 500 |
| I12 | P1 | [M] | Stjärnhistorik i hub | Diagram/teaser |
| I13 | P2 | [A] | `/skattkammaren-parent` | Föräldervy skatt |
| I14 | P1 | [M] | Touch på godkänn-knapp | ≥44 px, ett tryck räcker |

### J — För dig (8)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| J01 | P0 | [A] | `/for-dig` laddar | Mål/rekommendationer |
| J02 | P1 | [M] | Bläddra mål | Kort scrollas |
| J03 | P1 | [M] | Aktivera mål | CTA fungerar |
| J04 | P2 | [M] | Favoritmarkera mål | Sparas |
| J05 | P2 | [M] | Feedback-formulär | Skickas utan crash |
| J06 | P1 | [M] | Paketcoach-kort | Gated innehåll korrekt |
| J07 | P2 | [M] | Bjud in medförälder (coach) | → Familj-flöde |
| J08 | P1 | [A] | `GET /api/for-dig/goals` | 200 |

### K — Familj (12)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| K01 | P0 | [A] | `/family` laddar | Barn + vuxna |
| K02 | P0 | [A] | Båda barnen listade | Astrid + Erik |
| K03 | P0 | [M] | Klick barn → barnprofil | `/family/child/:id` |
| K04 | P1 | [M] | Lägg till barn (wizard) | `/child-wizard` eller modal |
| K05 | P1 | [M] | Bjud in medförälder | E-post skickas (dev: log) |
| K06 | P1 | [M] | Återkalla inbjudan | Invite borta |
| K07 | P2 | [M] | Omsortera barn | Ordning sparas |
| K08 | P2 | [M] | Spara familjenamn | PUT family OK |
| K09 | P1 | [M] | Lista vuxna/medlemmar | Namn + roller |
| K10 | P2 | [M] | Pedagog-intresse (gated) | Sektion eller länk |
| K11 | P1 | [A] | Inga GDPR-knappar på /family | Endast i settings |
| K12 | P1 | [M] | Familjemuseum widget | Om aktiv |

### L — Barnprofil `/family/child/:id` (14)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| L01 | P0 | [A] | Öppna Astrids profil | URL med UUID |
| L02 | P0 | [A] | Tab `overview` default | Status idag |
| L03 | P0 | [M] | Tab `log` → daglig logg | Deep link med childId |
| L04 | P0 | [M] | Tab `schema` | Veckosammanfattning + CTA |
| L05 | P0 | [M] | Tab `rewards` | Extra stjärnor, mål |
| L06 | P1 | [M] | Tab `progress` | Stjärndiagram |
| L07 | P0 | [M] | Tab `setup` | PIN, vy, foto |
| L08 | P0 | [M] | Tab `child-view` | Handoff barnläge |
| L09 | P0 | [M] | Snabbåtgärd: pausa | Från overview |
| L10 | P0 | [M] | Snabbåtgärd: extra stjärnor | Modal fungerar |
| L11 | P1 | [M] | Ändra PIN | Ny PIN fungerar vid login |
| L12 | P1 | [M] | Ladda upp avatar | Bild eller fallback emoji |
| L13 | P1 | [M] | Växla vy-läge (classic/magic) | Barn-UI ändras |
| L14 | P1 | [A] | `/child-settings?id=` redirect | → `?tab=setup` |

### M — Rapporter (6)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| M01 | P1 | [A] | `/reports` (gated) | Laddar eller 403/redirect |
| M02 | P1 | [M] | Välj barn i rapport | Data filtreras |
| M03 | P1 | [M] | Flikar: Aktiviteter / Observationer | Byte fungerar |
| M04 | P2 | [M] | Skapa delningslänk | PIN + expiry |
| M05 | P2 | [M] | Allmän observation | Sparas |
| M06 | P2 | [M] | Mobil scroll i rapporttabeller | Ingen layout-brott |

### N — Inställningar & notiser (14)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| N01 | P0 | [A] | `/settings` laddar | Sektioner synliga |
| N02 | P0 | [M] | Konto: ändra namn | Sparas |
| N03 | P1 | [M] | Byt lösenord | Fungerar |
| N04 | P1 | [M] | Notispreferenser | Toggle sparas |
| N05 | P1 | [M] | Push/PWA-sektion | Instruktioner synliga |
| N06 | P2 | [M] | Nyhetsbrev opt-in/out | Status uppdateras |
| N07 | P1 | [M] | Mörkt läge | Tema byts |
| N08 | P1 | [M] | Förälder-PIN | Sätt/ändra |
| N09 | P1 | [A] | Prenumeration (#prenumeration) | IAP-status eller dold |
| N10 | P2 | [M] | Exportera data | Nedladdning startar |
| N11 | P2 | [M] | Radera konto (avbryt) | Modal, ingen radering |
| N12 | P0 | [A] | `/notifications` | Lista laddar |
| N13 | P1 | [M] | Markera notis som läst | Badge minskar |
| N14 | P1 | [A] | `/api/notifications/unread-count` | 200 |

### O — Barn: inloggning (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| O01 | P0 | [A] | `/child-login` efter utloggning | Barnväljare |
| O02 | P0 | [M] | Välj Astrid | PIN-tangentbord |
| O03 | P0 | [M] | PIN 4829 Astrid | → `/child/today` |
| O04 | P0 | [M] | Fel PIN | Felmeddelande, ingen lockout direkt |
| O05 | P0 | [M] | Välj Erik | Separat PIN |
| O06 | P0 | [M] | PIN 7391 Erik | → `/child/today` som Erik |
| O07 | P1 | [M] | Manuellt namn (ingen picker) | `#clManualNameForm` |
| O08 | P1 | [A] | Redirect `/child-dashboard` | → `/child/today` |
| O09 | P1 | [A] | `ChildWorlds` global | Tre världar config |
| O10 | P1 | [A] | Bottennav 3 knappar | today · world · family |

### P — Barn: ☀️ Idag (16)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| P01 | P0 | [A] | Landning på Idag | `/child/today` |
| P02 | P0 | [M] | NU/NÄSTA/SEN eller aktivitetslista | Minst en aktivitet eller tom-state |
| P03 | P0 | [M] | Bocka av aktivitet | Animation/feedback |
| P04 | P0 | [M] | Stjärna efter avbockning | Saldo ökar |
| P05 | P1 | [M] | Expandera delsteg | Checklista |
| P06 | P1 | [M] | Bocka delsteg | Progress uppdateras |
| P07 | P1 | [M] | Mood-rating efter aktivitet | Modal om aktiverat |
| P08 | P1 | [M] | Pausad dag (förälder pausat) | "Ledig idag" |
| P09 | P1 | [M] | Veckonav (klassisk) | Byta dag |
| P10 | P2 | [M] | Progress-ring i header | Uppdateras |
| P11 | P1 | [A] | Inga `daily-log?date=null` | API-fel förbjudet |
| P12 | P1 | [A] | `coalescedLoadDay` function | Engine OK |
| P13 | P2 | [M] | TEACCH NU-overlay (gated) | Fullskärm, Escape till Idag |
| P14 | P2 | [M] | Coach "Bra jobbat" (gated) | Nästa steg-knapp |
| P15 | P1 | [M] | Toggle dagsvy/veckovy | `toggleViewType` |
| P16 | P2 | [M] | Skriv ut (klassisk header) | Print |

### Q — Barn: 🏰 Min värld (14)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| Q01 | P0 | [A] | Navigera till Min värld | `/child/world` |
| Q02 | P0 | [M] | Stjärnsaldo synligt | Matchar API |
| Q03 | P0 | [M] | Målprogress | "X av Y stjärnor" |
| Q04 | P0 | [M] | Begär belöning | Pending skapas |
| Q05 | P1 | [M] | Lösa in belöning | Pending → förälder godkänner |
| Q06 | P1 | [M] | Universum-hub rum | Stjärnkistan alltid öppen |
| Q07 | P1 | [M] | Navigera in i rum | Hub → rum → tillbaka |
| Q08 | P1 | [M] | Låst rum | Unlock-krav visas |
| Q09 | P2 | [M] | Avatar-redigering | Om unlockad |
| Q10 | P2 | [M] | Husdjur | Om unlockad |
| Q11 | P1 | [A] | `loadRewards` / `renderSkattkammaren` | Functions |
| Q12 | P1 | [M] | Manuella stjärnor (Stjärnfronten) | Syns efter förälder gav |
| Q13 | P2 | [M] | Pending inlösning status | "Väntar på godkännande" |
| Q14 | P2 | [M] | Välj tema (slott/träd/rymd) | UI uppdateras |

### R — Barn: ❤️ Mina personer (8)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| R01 | P0 | [A] | Navigera Mina personer | `/child/family` |
| R02 | P0 | [M] | Personkort (förälder) | Namn/emoji |
| R03 | P1 | [M] | Familjeskista / "Vi tillsammans" | Aggregerade stjärnor |
| R04 | P1 | [M] | Familjeprojekt (tom eller data) | Ingen crash |
| R05 | P2 | [M] | Familjens berättelse feed | Read-only |
| R06 | P1 | [A] | `GET /api/me/family` | 200 i barnsession |
| R07 | P2 | [M] | Pedagog som person (gated) | Extra kort |
| R08 | P1 | [M] | Scroll på smal skärm | Ingen clipping |

### S — Barn: system & Parental Gate (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| S01 | P0 | [M] | Vuxenikon i header | Synlig |
| S02 | P0 | [M] | Öppna systemmeny kräver PIN | Parental Gate |
| S03 | P0 | [M] | Fel förälder-PIN | Blockerad |
| S04 | P0 | [M] | Rätt PIN → byt barn | Barnväljare |
| S05 | P0 | [M] | Byt till syskon (Erik) | Ny session |
| S06 | P1 | [M] | Mörkt läge via gate | Tema byts |
| S07 | P0 | [M] | Logga ut via gate | → `/child-login` |
| S08 | P1 | [A] | Header: 🔄 Byt barn synlig | Distinkt från ⚙️ |
| S09 | P1 | [A] | Header: ⚙️ Förälder / 🚪 Logga ut | Tre distinkta kontroller |
| S10 | P1 | [M] | Barn når inte `/dashboard` | Redirect child-login |

### T — Flerbarn & korsflöden (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| T01 | P0 | [M] | Förälder: Astrids stjärnor ≠ Eriks | Separata saldon |
| T02 | P0 | [M] | Schema Astrid ≠ Erik | Oberoende scheman |
| T03 | P1 | [M] | Kopiera schema Astrid → Erik | Efter G09 |
| T04 | P0 | [M] | Barn Astrid ser egna aktiviteter | Ej Eriks |
| T05 | P0 | [M] | Byte barn Astrid→Erik | PIN + ny vy |
| T06 | P1 | [M] | Förälder godkänner Eriks inlösning | Ej Astrids |
| T07 | P1 | [M] | Hem-dashboard: båda kort | Parallell status |
| T08 | P2 | [M] | Daglig logg: snabbbyte barn | Dropdown/tabs |
| T09 | P1 | [A] | `GET /api/children` ≥2 | API |
| T10 | P1 | [M] | Barnprofil: öppna båda | Unika URLs |

### U — Mobil UX, redirects & stabilitet (10)

| ID | Pri | Typ | Testpunkt | Förväntat resultat |
|----|-----|-----|-----------|-------------------|
| U01 | P0 | [A] | Ingen horisontell scroll (body) | dashboard, schedule, child |
| U02 | P0 | [A] | Inga okända JS pageerror | Kärnsidor |
| U03 | P1 | [A] | `/today` → `/child/today` | 302 |
| U04 | P1 | [A] | `/universe` → `/child/world` | 302 |
| U05 | P1 | [A] | `/family-week` → schedule | 301 |
| U06 | P1 | [M] | Keyboard ej täcker PIN-fält | child-login |
| U07 | P2 | [M] | Safe-area (notch) | Bottennav inte klippt |
| U08 | P1 | [M] | Tillbaka-knapp Android (PWA) | Rimlig navigation |
| U09 | P2 | [A] | Offline-sida `/offline` | SW precache |
| U10 | P1 | [M] | Touch targets bottennav | ≥44×44 px |

**Totalt: 200 testpunkter** (A01–U10)

---

## 4. Automatiseringsmatris

| Kategori | Antal | Automatiserbara `[A]` | Manuella `[M]` |
|----------|-------|----------------------|----------------|
| A–U | 200 | ~72 | ~128 |
| Script täcker | — | ~72 via `smoke-mobile-full-qa.mjs` | Resterande i manuell runda |

Automatiserade ID:n: alla `[A]` i tabellerna ovan.

---

## 5. Rapportmall

### 5.1 Testmetadata

| Fält | Värde |
|------|-------|
| Testare | |
| Datum | |
| Miljö | `local` / `staging` / `prod` |
| BASE URL | |
| App-version (`/health`) | |
| SW-version | |
| Enhet | iPhone 14 Pro emulator 390×844 |
| Git commit | |
| Automatiserad körning | `artifacts/mobile-full-qa/results.json` |

### 5.2 Sammanfattning

| Metric | Värde |
|--------|-------|
| Totalt antal punkter | 200 |
| ✅ Godkända | |
| ❌ Underkända | |
| ⏭ Ej körda | |
| Pass rate | |
| P0-fel (blocker) | |

### 5.3 Resultat per kategori

| Kategori | Pass | Fail | Skip |
|----------|------|------|------|
| A Setup | | | |
| B Publik | | | |
| C Auth förälder | | | |
| D Hem | | | |
| E Planering | | | |
| F Daglig logg | | | |
| G Schema | | | |
| H Bibliotek | | | |
| I Belöningar | | | |
| J För dig | | | |
| K Familj | | | |
| L Barnprofil | | | |
| M Rapporter | | | |
| N Inställningar | | | |
| O Barn login | | | |
| P Barn Idag | | | |
| Q Barn Min värld | | | |
| R Barn Mina personer | | | |
| S Barn system | | | |
| T Flerbarn | | | |
| U Mobil UX | | | |

### 5.4 Underkännanden (obligatorisk rad per fel)

| ID | Beskrivning | Steg att reproducera | Förväntat | Faktiskt | Skärmdump | Ticket |
|----|-------------|---------------------|-----------|----------|-----------|--------|
| | | | | | | |

### 5.5 Sign-off

| Roll | Namn | Datum | Godkänd |
|------|------|-------|---------|
| QA | | | ☐ |
| Produkt | | | ☐ |
| Teknik | | | ☐ |

---

## 6. Relaterade filer

| Fil | Syfte |
|-----|-------|
| `scripts/seed-smoke-family.mjs` | Skapa testfamilj (2 barn) |
| `scripts/smoke-mobile-full-qa.mjs` | Mobil browser-automation |
| `scripts/lib/mobile-qa-checkpoints.mjs` | Checkpoint-definitioner |
| `docs/vuxenmeny-v2-operations-checklist.md` | Operationsreferens förälder |
| `docs/barnmeny-v2.md` | Operationsreferens barn |

---

*Uppdatera detta dokument när nya features shippar — lägg nya punkter i rätt kategori och håll totalen ~200 genom att deprecate gamla rader.*
