# Platform — Temporärt samlingsdokument (kopiera/klistra)

> **TEMP** · Genererat 2026-06-26

**Rekommenderad läsordning:** VISION-2030 → **USE_CASES_PLATFORM** → architecture-platform → APP-V2-KRAVSPEC

## Innehållsförteckning

| # | Källfil |
|---|---------|
| 1 | `VISION-2030.md` (~69 r) |
| 2 | `USE_CASES_PLATFORM.md` (~919 r) |
| 3 | `architecture-platform.md` (~369 r) |
| 4 | `APP-V2-KRAVSPEC.md` (~685 r) |
| 5 | `barnmeny-v2.md` (~1414 r) |
| 6 | `vuxenmeny-v2.md` (~858 r) |
| 7 | `vuxenmeny-v2-operations-checklist.md` (~416 r) |
| 8 | `informationsarkitektur-barnapp.md` (~352 r) |
| 9 | `separation-contract-barnapp.md` (~285 r) |
| 10 | `engineering-architecture-barnapp.md` (~517 r) |
| 11 | `implementation-plan-3-layers.md` (~131 r) |
| 12 | `magic-view-rollout.md` (~69 r) |

---


========================================================================
KÄLLA: VISION-2030.md
========================================================================

# Vision 2030 — Executive summary

**Skapad:** 2026-06-26  
**Status:** Strategisk riktning — kompletterar [`architecture-platform.md`](./architecture-platform.md)

---

## En mening

Vi bygger en **motor för exekutiv funktion** — inte en barnapp. Generation 1 (barn 4–12 + föräldrar) är första kunden, inte slutprodukten.

---

## Arkitektur i tre rader

1. **Core Platform** — tasks, goals, rewards, progress, relationships, coach, permissions (delad logik).
2. **Presentation Profiles** — Child, Teen, Young Adult, Adult (samma data, annan nav/språk/design).
3. **Produkter** — olika upplevelser på samma motor.

Full spec: **[`architecture-platform.md`](./architecture-platform.md)**  
Use cases (människans resa): **[`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md)**

---

## Beslutsgate

Innan varje större v2-beslut:

> *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?*

---

## Generationer

| Gen | Målgrupp | Status |
|-----|----------|--------|
| 1 | Barn 4–12, föräldrar, pedagoger | Live |
| 2 | Ungdomar 13–17 | Spec |
| 3 | Unga vuxna 18–30 | Horisont |
| 4 | Vuxna | Horisont |

**App v2 = Platform v1** — nav, domänmodell och config som gör Gen 2–4 möjliga.

---

## Tre engines (plattformsneutralt)

| Engine | Barn (Gen 1) | Tonåring | Vuxen |
|--------|--------------|----------|-------|
| Execution | Idag | Idag | Tasks / Idag |
| Progress | Min värld | Mitt space | Mål / Growth |
| Relationship | Mina personer | Mina personer | Network |

---

## Vad vi säljer (egentligen)

Inte *bildschema* — utan **mindre stress, bättre rutiner, fungerande vardag**. Gäller barn, studenter och vuxna med NPF/ADHD.

---

## Nästa dokument att läsa

| Dokument | Innehåll |
|----------|----------|
| [`architecture-platform.md`](./architecture-platform.md) | Full plattformsspec |
| [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md) | Platform v1 leveranskrav |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Gen 1 implementation idag |

========================================================================
KÄLLA: USE_CASES_PLATFORM.md
========================================================================

# Plattform — Use cases (människans resa)

**Skapad:** 2026-06-26  
**Version:** 0.1 (utkast)  
**Status:** Universella use cases — styr UX, utveckling, test och produktstrategi  
**Ägare:** Produkt

> **Relaterat:** [`architecture-platform.md`](./architecture-platform.md) · [`VISION-2030.md`](./VISION-2030.md) · [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md)

---

## 0. Hur det här dokumentet används

Use cases beskrivs **inte** utifrån funktioner (schema, stjärnor, inställningar) utan utifrån **människans resa** — samma berättelse för barn, ungdom och vuxen, med olika presentation.

| Roll | Användning |
|------|------------|
| **Produkt** | Prioritera generationer; testa beslut mot resan |
| **UX** | Designa per målgrupp utan att skriva om flödet |
| **Utveckling** | Mappa till Core engines — inte till skärmar |
| **Test** | Acceptanskriterier per UC, inte per sida |
| **Ny målgrupp** | Lägg till kolumn i §presentation — inte nytt dokument |

### Standardstruktur (varje UC)

1. Mål  
2. Primär användare  
3. Sekundära användare  
4. Förutsättningar  
5. Normalflöde  
6. Alternativa flöden  
7. Undantag / fel  
8. Affärsregler  
9. Mätetal (KPI)  
10. Presentation: Barn · Ungdom · Vuxen  

### Core engines (referens)

| UC | Primära engines |
|----|-----------------|
| UC01–02 | Identity, Task, Timeline, Coach |
| UC03 | Task (Execution) |
| UC04 | Reward, Progress |
| UC05 | Coach, Progress |
| UC06 | Coach (AI) |
| UC07 | Relationship, Permission |
| UC08 | Relationship, Permission |
| UC09 | Coach, Progress |
| UC10 | Coach, Permission |
| UC11 | Identity, Presentation Profile |
| UC12 | Presentation Profile (Adaptive Experience) |

### Generationsstatus (översikt)

| UC | Gen 1 (barn 4–12) | Gen 2–4 |
|----|-------------------|---------|
| UC01 Komma igång | ✅ Delvis live | Planerat |
| UC02 Planera dagen | ✅ Live | Planerat |
| UC03 Utföra aktivitet | ✅ Live | Planerat |
| UC04 Motivation | ✅ Live | Planerat |
| UC05 Reflektion | ⚠️ Delvis (mood, coach-loop v2) | Planerat |
| UC06 AI Coach | ⚠️ Delvis (För dig förälder; barn-loop v2) | Planerat |
| UC07 Relationer | ✅ Live | Planerat |
| UC08 Delning | ⚠️ Delvis (rapporter, pedagog) | Planerat |
| UC09 Kris / bakslag | ⚠️ Implicit, ej designat | Planerat |
| UC10 Självständighet | ⚠️ Delvis (gradvis PIN, inställningar) | Planerat |
| UC11 Livsövergångar | ❌ Ej byggt | Kärnstrategi |
| UC12 Anpassningsprofil | ⚠️ Delvis (`child_view_config`) | Planerat |

---

## UC01 — Komma igång

### Mål

Användaren ska förstå hur appen fungerar och känna sig trygg inom de första minuterna.

### Primär användare

Den som ska **använda** planeringen dagligen (barn, ungdom eller vuxen).

### Sekundära användare

Vårdnadshavare, pedagog, mentor, partner — den som stödjer uppstarten.

### Förutsättningar

- Konto eller inbjudan finns  
- Minst en grupp/relation kan skapas eller kopplas  
- Device och nätverk tillgängligt  

### Normalflöde

```
1. Konto skapas eller accepteras
2. Första kontext sätts (barn / mål / livsområde)
3. Första plan eller rutin skapas (mall eller coach-guidad)
4. Användaren landar i Execution (Idag)
5. Första uppgiften är synlig och begriplig
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Inbjuden vuxen | Accepterar invite → ser endast tilldelade medlemmar |
| A2 Befintlig familj, nytt barn | Onboarding-wizard → ny member |
| A3 Återkommande användare, ny enhet | Login → välj profil → Idag |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Tomt standardbibliotek | Coach erbjuder manuell aktivitet — inte tekniskt dödläge |
| Barn utan PIN | Förälder guidas att sätta PIN före barn-login |
| Avbruten onboarding | Hem visar "Nästa steg" (readiness) vid återkomst |

### Affärsregler

- **Framgång UC01** = första planerade dagen är på plats **och** (om execution-användare) första aktiviteten är synlig  
- Gen 1: framgång för barn = **första aktivitet genomförd** (första stjärnan)  
- Onboarding får inte kräva expertkunskap om schema-editor  

### Mätetal (KPI)

| KPI | Gen 1-baslinje | Mål |
|-----|----------------|-----|
| Tid till första synliga uppgift | — | < 5 min efter registrering |
| Onboarding completion rate | — | ↑ |
| Första completion (barn) | 17 % familjer | ↑ (North Star-funnel) |

### Presentation

| | **Barn (4–12)** | **Ungdom (13–17)** | **Vuxen (18+)** |
|--|-----------------|---------------------|-----------------|
| **Vem startar** | Förälder skapar konto, lägger till barn, väljer schema | Ungdom skapar själv eller med vuxen | Vuxen väljer livsområde själv |
| **Exempel mål** | Förskola/skola-mall | "Komma ivåg till skolan", "Plugga 30 min" | Morgon, Arbete, Hem, Hälsa, ADHD-stöd |
| **Inloggning** | PIN, visuell barnväljare | Eget konto | E-post / Apple |
| **Landning** | Idag — ett steg i taget | Idag — kort plan | Idag — prioriterad lista |
| **Framgång** | Första aktivitet genomförd | Första dagen planerad | Första rutinen skapad |
| **Ton** | Lekfull, trygg, få val | Personlig, inte barnslig | Effektiv, respektfull |

---

## UC02 — Planera dagen

### Mål

Användaren (eller stödperson) har en tydlig bild av vad dagen innehåller — utan kognitiv överbelastning.

### Primär användare

Den som **ska utföra** — eller i Gen 1 barn: den som **ska förstå** planen.

### Sekundära användare

Förälder, partner, pedagog — planerar åt eller tillsammans med.

### Förutsättningar

- Minst en aktivitet eller mall finns  
- Execution Engine har tillgång till dagens `daily_log`  

### Normalflöde

```
1. Öppna planeringsyta (förälder) eller Idag (executor)
2. Se dagens uppgifter i ordning (Timeline: NU / NÄSTA / SEN)
3. Vid behov: justera, pausa, lägg till
4. Executor ser uppdaterad plan utan att navigera "schema"
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder planerar, barn tittar | Planering hub → barn ser Idag |
| A2 Specialdag / ledig dag | Override utan att radera veckoschema |
| A3 Coach-förslag | "Vill du lägga till kvällsrutin?" → ett klick |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Tom dag | Coach: "Vill du kopiera igår?" — inte tom canvas |
| För många uppgifter | Visa max 5 i Execution; resten dold men planerad |

### Affärsregler

- Planering äger **Task + Timeline** engines — inte Execution UI  
- Barn ska inte behöva förstå veckoschema för att använda dagen  
- Ändringar i plan ska synas på barns Idag inom samma session (eller vid refresh)  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Andel dagar med ≥1 planerad uppgift | ↑ |
| Tid från öppna app → förstå "vad nu" | < 10 s (barn) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Planerar** | Förälder | Tillsammans med coach | Själv (+ coach) |
| **Ser plan** | Barn (Idag) | Ungdom (Idag) | Vuxen (Idag/Tasks) |
| **Coach-fråga** | — | "Vad vill du hinna idag?" | "Du har tre viktiga uppgifter. Vilken börjar du med?" |
| **UI** | Bilder, sektioner FM/EM | Tidslinje, mörkt läge | Prioriterad lista, block |

---

## UC03 — Utföra aktivitet

### Mål

Användaren genomför en uppgift från start till bekräftelse och vet vad som kommer härnäst.

**Det här är kärnan i plattformen.**

### Primär användare

Executor (member).

### Sekundära användare

Stödperson som kan bocka av åt (förälder), eller endast observera.

### Förutsättningar

- Uppgift finns i dagens logg  
- Användaren har åtkomst till Execution (Idag)  

### Normalflöde

```
Aktivitet → Start → Utför → Bekräfta → Nästa

1. NU-uppgift visas
2. (Valfritt) Delsteg (sub_steps) expanderas
3. Användaren markerar klar
4. Execution Engine: complete event
5. Coach: kort bekräftelse
6. NÄSTA uppgift blir NU
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Delsteg | Bocka delsteg → sedan huvudaktivitet |
| A2 Förälder bockar åt barn | Samma API, attribution `completed_by` |
| A3 Retroaktiv | Completion med `completed_date` ≠ idag |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Offline | Kö lokalt → synka vid uppkoppling |
| Dubbelklick | Idempotent completion |
| PIN-fel (barn) | Låsning enligt `pin_lockout` |

### Affärsregler

- **En motor** — samma `POST complete` oavsett presentation  
- Max synliga uppgifter i Execution: 5 (barn NPF-princip)  
- Bekräftelse ska leda till **nästa steg** — inte till meny  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Completions per aktiv användare / dag | ↑ |
| Tid från login → första completion | < 60 s (barn) |
| Andel uppgifter med delsteg använda | Kvalitativ (NPF) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Exempel** | "Borsta tänder" | "Lägg mobilen i väskan" | "Skicka fakturan" |
| **UI** | Stort kort, emoji, +⭐ teaser | Kompakt, swipe/check | Checkbox, tidsestimat |
| **Bekräftelse** | "Bra jobbat! 🎉" | Kort, neutral | Minimal eller inget firande |
| **Motor** | Identisk | Identisk | Identisk |

---

## UC04 — Motivation

### Mål

Användaren upplever att ansträngning leder till meningsfull progression — på sitt sätt.

### Primär användare

Executor.

### Sekundära användare

Stödperson som sätter belöningar (Gen 1 förälder).

### Förutsättningar

- Reward Engine kopplad till completion  
- Progress-yta tillgänglig (andra fliken / världen)  

### Normalflöde

```
Completion → progress_delta → Progress-yta uppdateras → (valfritt) inlösen / unlock
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Långsiktigt mål | Teaser på Idag → full vy i Progress |
| A2 Familjeprojekt | Delad kista (Relationship + Progress) |
| A3 Ingen gamification (vuxen profil) | Endast progressbar / mål % |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Belöning slut | Coach föreslår ny — inte tom butik |
| Överbelöning (förälder) | Valfri mjuk varning — inte block |

### Affärsregler

- **Samma Reward Engine** — tre (eller fler) presentationer  
- Progress-yta får inte konkurrera med Execution som startpunkt  
- Gamification-nivå styrs av `PresentationProfile` + UC12  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Andel completions följt av Progress-besök | Kvalitativ |
| Reward redemption rate | ↑ (barn) |
| Retention efter första belöning | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Enhet** | ⭐ Stjärnor | XP | Progress % |
| **Yta** | Skattkammaren / Min värld | Level, achievements | Mål, vanor |
| **Belöning** | Glass, utflykt (förälderset) | Privilegium, speltid | Månadsmål, vane-streak |
| **Kedja** | ⭐ → Skatt → Glass | XP → Level → Achievement | Progress → Mål → Vana |

---

## UC05 — Reflektion

### Mål

Användaren (eller stödperson) pausar och ser tillbaka — utan skam — för att lära av dagen.

### Primär användare

Executor; Gen 1 barn: ofta guidad av coach-text.

### Sekundära användare

Förälder (ser sammanfattning), pedagog (anteckningar).

### Förutsättningar

- Minst en completion eller avslutad sektion  
- Coach eller mood-UI tillgänglig  

### Normalflöde

```
1. Trigger: dag klar / sektion klar / kväll
2. Coach ställer reflektionsfråga
3. (Valfritt) Svar: mood, kort text, emoji
4. Data sparas för Progress / rapporter — inte straff
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Hoppa över | Alltid tillåtet — ingen skam-copy |
| A2 Förälder-initierad | Rapportvy → veckosammanfattning |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Barn vill inte svara | Frågan försvinner — ingen nagging |

### Affärsregler

- Reflektion är **opt-in**  
- Inga negativa poäng för "dålig dag"  
- Barndata: GDPR och föräldrainsyn enligt Permission Engine  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Mood/reflection completion rate | Kvalitativ |
| Korrelation reflection → nästa dags completion | Analys |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Coach** | "Vad gick bra idag?" + bilder | "Vad gjorde att du kom igång?" | "Vilka uppgifter gav dig mest energi?" |
| **Input** | Emoji, enkel skala | Kort text valfritt | Tagga uppgifter / energinivå |
| **Placering** | Efter sektion / dag | Idag eller kvällspush | Veckosammanfattning |

---

## UC06 — AI Coach

### Mål

Användaren får rätt stöd vid rätt tillfälle — inte en chatbot som konkurrerar med handling.

### Primär användare

Den som behöver guidning (varierar per UC12-profil).

### Sekundära användare

— (coach är system/agent).

### Förutsättningar

- Task, Progress, Timeline data tillgänglig  
- `PresentationProfile` sätter ton och längd  

### Normalflöde

```
1. Trigger: post-activity, planering, mönster detekterat, bakslag
2. Coach genererar kort förslag (1–3 meningar)
3. CTA: en primär handling ("Nästa steg", "Prova kortare start")
4. Användaren accepterar eller dismissar
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder (Gen 1) | För dig — problemorienterade paket (levererat) |
| A2 Proaktiv | "Du skjuter ofta upp X" — endast med samtycke |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| AI otillgänglig | Statiska coach-templates — inte tom UI |
| Fel förslag | Dismiss + ingen upprepning samma dag |

### Affärsregler

- Coach leder **alltid** tillbaka till Execution eller Planering — aldrig till meny |
- Ton ska matcha profil (UC12) — inte ålder ensam  
- Gen 1: För dig = förälder-coach; barn-coach-loop = v2  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| `readiness_action_click` / coach CTA rate | ↑ |
| Dismiss rate (skalad per trigger) | Balans |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Exempel** | "Bra jobbat! Nu är det dags för nästa steg." | "Du verkar fastna innan plugget. Ska vi testa en kortare start?" | "Du skjuter ofta upp uppgifter efter lunch. Flytta till förmiddagen?" |
| **Längd** | Mycket kort | Medium | Konkret, datadriven |
| **Placering** | Efter aktivitet (Idag) | Idag + notis | Hem + veckovy |

---

## UC07 — Relationer

### Mål

Användaren vet vem som finns i sitt stödnätverk och vad varje person får se/göra.

### Primär användare

Member (executor) eller gruppskapare (förälder/vuxen).

### Sekundära användare

Alla inbjudna roller.

### Förutsättningar

- Relationship + Permission engines  
- `parent_child` / invite-modell (Gen 1)  

### Normalflöde

```
1. Skapa eller gå med i grupp
2. Bjud in med roll (guardian, shared, pedagog, mentor…)
3. Inbjuden accepterar → begränsad åtkomst enligt roll
4. Executor ser "Mina personer" / Network
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Pedagog | Endast tilldelade barn, `source=educator` data |
| A2 Separerad vårdnad | Olika vuxna ser olika barn |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Invite expired | Tydligt fel + ny inbjudan |
| Revoked access | Omedelbar 403 — ingen läcka |

### Affärsregler

- **Samma Permission Engine** — olika rollmatriser per generation  
- Executor ska inte se administrativ komplexitet  
- Integritet ökar med ålder (UC10)  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Co-parent invite acceptance | ↑ |
| Pedagog-linked families active | Kvalitativ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Nätverk** | Föräldrar, pedagog, morföräldrar | Föräldrar, mentor, kurator | Partner, coach, psykolog, chef (valfritt) |
| **UI** | Mina personer — trygghet | Mina personer — integritet | Mitt nätverk — professionellt |
| **Barns syn** | Vem hjälper mig | Vem jag valt dela med | — |

---

## UC08 — Delning

### Mål

Rätt information delas med rätt person — med samtycke och tydliga gränser.

### Primär användare

Den som äger datan (executor eller guardian beroende på ålder).

### Sekundära användare

Mottagare (pedagog, terapeut, partner).

### Förutsättningar

- Permission Engine  
- Rapport/share-link eller inbyggd rollåtkomst  

### Normalflöde

```
1. Välj vad som delas (framsteg, period, fält)
2. Välj mottagare eller generera säker länk
3. Mottagare ser read-only vy
4. (Valfritt) Återkalla
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Pedagog | Inbyggd åtkomst via invite — inte export |
| A2 Professionell rapport | PIN-skyddad länk, 7 dagar |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Delning utan samtycke (teen+) | Blockerat |

### Affärsregler

- Barn: förälder kan dela inom rimliga gränser  
- Ungdom: **opt-in** per delning  
- Vuxen: delar mål/statistik — inte rå journal utan explicit val  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Share link usage (pedagog/rapporter) | Kvalitativ |
| Teen opt-in rate | — (Gen 2) |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Vem delar** | Förälder | Ungdomen själv | Vuxen själv |
| **Vad** | Framsteg, schema-sammanfattning | Valda mål | Mål, statistik — inte allt |
| **Gen 1** | Rapporter, pedagogvy | — | — |

---

## UC09 — Kris / bakslag

### Mål

När rutinen brister ska användaren kunna återuppta utan skam, bestraffning eller "nollställning" av identitet.

### Primär användare

Executor.

### Sekundära användare

Coach, stödperson.

### Förutsättningar

- Detekterat gap (missad dag/vecka) eller explicit "jag har tappat"  
- Coach Engine med **restorative** ton  

### Normalflöde

```
1. System eller användare markerar bakslag
2. Ingen negativ poäng / streak-straff som default
3. Coach: låg tröskel tillbaka
4. Ett litet steg idag → Execution
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Förälder orolig | Hem visar "börja om lugnt" — inte alarm |
| A2 Lång frånvaro | Historik bevaras; plan återställs utan radering |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Användare vill radera historik | GDPR-radering — separat flöde |

### Affärsregler

- **Aldrig** skambaserad copy ("Du misslyckades")  
- Streaks får pausas — inte alltid nollställas  
- Detta UC är ofta **underspecificerat** i Gen 1 — ska designas explicit  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Return rate efter 7+ dagars inaktivitet | ↑ |
| Completion inom 24 h efter coach "börja om" | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Miss** | En dag | En vecka | Tappad rutin |
| **Coach** | "Vi börjar om." | "Ska vi börja med en enda uppgift idag?" | "Vi återställer planen utan att radera historiken." |
| **UI** | Samma Idag — inga röda varningar | Diskret | Fokus på nästa steg |

---

## UC10 — Självständighet

### Mål

Användaren behöver allt mindre stöd från appen och stödpersoner — appen är en stege, inte ett krycka.

> Målet är inte mer användning. Målet är att användaren ska behöva appen **mindre**.

### Primär användare

Executor (växer över tid).

### Sekundära användare

Guardian — gradvis minskad insyn.

### Förutsättningar

- Permission Engine med integritetsnivåer  
- UC12-profil kan skifta från Guidad → Självständig  

### Normalflöde

```
1. Börja med hög guidning (100 % hjälp)
2. Vid mognad / ålder / val: minska prompts, delning, föräldrakontroll
3. Mät "hjälpgrad" ner över tid — inte DAU upp
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 NPF-vuxen | Kan stanna på Stöttad — inte "växa ut" som krav |
| A2 Tonåring tar över konto | Guardian → observer |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Förälder vill full insyn (teen) | Policy + produktbeslut — default integritet |

### Affärsregler

- Självständighet är **success metric** — inte churn  
- Gen 1: delvis via föräldrastyrda inställningar  
- Gen 2+: explicit integritetsnivå per relation  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Hjälpgrad-index (intern) | ↓ över livscykel |
| Teen self-completion utan förälder | ↑ |
| NPS hos användare i "Självständig" profil | ↑ |

### Presentation

| | **Barn** | **Ungdom** | **Vuxen** |
|--|----------|------------|-----------|
| **Hjälp** | ~100 % (vuxen planerar) | ~50 % | ~10 % |
| **Insyn** | Förälder ser allt | Sammanfattning | Endast delat |
| **Coach** | Varje steg | Vid fastnar | Vid mönster |

---

## UC11 — Livsövergångar

### Mål

När användarens liv förändras ska plattformen **växa med** — inte tvinga omstart.

### Primär användare

Member genom hela livscykeln (strategiskt).

### Sekundära användare

Guardians som gradvis lämnar över.

### Förutsättningar

- Identity Engine med kontinuerlig historik  
- `PresentationProfile` kan bytas utan nytt konto  
- Data migreras — inte kastas  

### Normalflöde

```
Barn → mellanstadie → högstadiet → gymnasium → universitet → jobb → eget hushåll

Vid varje steg:
1. Erbjud uppdaterad profil / målmallar
2. Behåll historik (Progress)
3. Justera Relationer och Permission
4. Uppdatera nav-etiketter — inte engines
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Ny app-installation | Samma konto — all data kvar |
| A2 Parallellt barn + vuxen | Samma person, två roller över tid |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Användare vill "börja om" visuellt | Reset presentation — behåll valfri historik |

### Affärsregler

- **Kärnstrategi för plattformen** — differensiator mot engångs-barnappar  
- Profilbyte ska vara one-click + coach-förklaring  
- Marketing får inte lova "app för barn" utan "växer med dig" om UC11 är sant  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Retention vid profilbyte (12→13 år) | ↑ vs benchmark churn |
| Multi-year account age | ↑ |

### Presentation

| Steg | Förändring |
|------|------------|
| 4–12 | CHILD — Idag, Min värld, Mina personer |
| 13–17 | TEEN — samma slots, ny ton + integritet |
| 18–30 | YOUNG_ADULT — mål, vanor |
| 30+ | ADULT — network, growth |

---

## UC12 — Anpassningsprofil (Adaptive Experience)

### Mål

Plattformen anpassar **mängd stöd** — inte bara ålder. En 30-åring med ADHD och en 12-åring kan behöva liknande guidning med olika presentation.

### Primär användare

Alla executors.

### Sekundära användare

Guardian, terapeut (kan rekommendera profil).

### Förutsättningar

- `adaptive_profile` (eller härledd) i member config  
- Styr: steg-visning, coach-frekvens, gamification, påminnelser  

### Profiler

| Profil | Typisk användare | Upplevelse |
|--------|------------------|------------|
| **Guidad** | Yngre barn, hög support | Mycket visuellt, ett steg i taget, tydliga belöningar |
| **Stöttad** | Tonåring eller vuxen med stort stödbehov | Coach, struktur, påminnelser, delmål |
| **Självständig** | Ung vuxen / vuxen | Mål, vanor, reflektion, minimal guidning |

### Normalflöde

```
1. Default profil vid onboarding (ålder + valfri "jag behöver extra stöd")
2. Profil styr UC03–UC06 presentation
3. (Valfritt) Profil ändras över tid (kopplat till UC10)
```

### Alternativa flöden

| Variant | Flöde |
|---------|-------|
| A1 Terapeut sätter Stöttad | Guardian-godkännande |
| A2 Auto-förslag | "Vill du prova färre påminnelser?" |

### Undantag / fel

| Situation | Beteende |
|-----------|----------|
| Profil för hög/svår | Användare kan alltid be om mer stöd |

### Affärsregler

- **Ålder ≠ profil** — 30-åring kan vara Guidad/Stöttad  
- Profil styr presentation — inte access till features (det är paket)  
- Gen 1: delvis `child_view_config`, TEACCH, `show_now_next`  

### Mätetal (KPI)

| KPI | Mål |
|-----|-----|
| Completion rate per profil | Balanserad — inte bara Självständig |
| Profil-switch satisfaction | Kvalitativ |

### Presentation

| Dimension | Guidad | Stöttad | Självständig |
|-----------|--------|---------|--------------|
| Steg i taget | Alltid | Vid behov | Sällan |
| Coach | Efter varje steg | Vid mönster | Veckovis |
| Belöning | Hög | Medium | Låg / progress |
| Nav komplexitet | Minimal | Medium | Full |

---

## Bilaga A — Use case → Platform v1 (Gen 1 leverans)

| UC | Platform v1 fokus |
|----|-------------------|
| UC01 | Onboarding + readiness på Hem |
| UC02 | Planeringshub + Idag |
| UC03 | Execution (Idag) + coach-loop |
| UC04 | Belöningshub + Min värld |
| UC05 | Mood + coach-loop (begränsat) |
| UC06 | För dig (förälder, klar); barn-coach v2 |
| UC07 | Familj-flik + pedagog |
| UC08 | Rapporter (delvis) |
| UC09 | **Designa** — ej live |
| UC10 | Inställningar — delvis |
| UC11 | Dokumentera — `PresentationProfile` i config |
| UC12 | `child_view_config` + TEACCH — utöka |

---

## Bilaga B — Testscenarier (kort)

Varje UC ska ha minst ett **röktest per generation** när den generationen lanseras.

| UC | Gen 1 röktest |
|----|---------------|
| UC01 | Registrera → onboarding → barn login → första completion |
| UC02 | Ändra schema → syns på barns Idag |
| UC03 | Bocka av med delsteg → nästa NU |
| UC04 | Stjärna → syns i Min värld |
| UC09 | Simulera 7 dagars gap → coach-copy (när implementerat) |

---

## Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första utkast. UC01–UC12 med universell struktur. |

========================================================================
KÄLLA: architecture-platform.md
========================================================================

# Core Platform — Arkitektur & presentationslager

**Skapad:** 2026-06-26  
**Version:** 0.1 (utkast)  
**Status:** Strategisk arkitekturspec — styr långsiktiga beslut, **ingen omedelbar implementation**  
**Ägare:** Produkt + teknik

> **Relaterat (Generation 1 — barn):** [`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md)

---

## 0. En rad som styr allt

> **Samma motor, olika upplevelser.**

Produkten är inte en barnapp. Den är **Generation 1** av en motor för **exekutiv funktion** — planera, utföra, bekräfta, belöna, bygga vanor. Den råkar idag användas av familjer med barn 4–12.

**Beslutsgate för varje v2-ändring:**

> *Kan samma motor presenteras för en 24-åring med ADHD utan att vi skriver om arkitekturen?*

| Svar | Betydelse |
|------|-----------|
| **Ja** | Plattform — bygg vidare |
| **Nej** | Barnapp-skuld — ompröva |

---

## 1. Vad kunderna faktiskt köper

Idag marknadsför vi *visuella scheman*. Det kunderna köper är:

| Värde | Gäller även 22-åring med ADHD? |
|-------|-------------------------------|
| Mindre stress | ✅ |
| Mindre tjat / självövertygelse | ✅ ("Jag säger till mig själv att jag ska börja") |
| Mer självständighet | ✅ |
| Bättre rutiner | ✅ |
| Lugnare vardag | ✅ |
| Fungerande exekutiva funktioner | ✅ |

**Kärnloopen (åldersneutral):**

```
Planera → Utföra → Bekräfta → Belöna → Bygga vanor
```

---

## 2. Produktgenerationer

```
Generation 1 (nu)     Barn 4–12 + föräldrar + pedagoger
        ↓
Generation 2          Ungdomar 13–17
        ↓
Generation 3          Unga vuxna 18–30
        ↓
Generation 4          Vuxna
```

**Vad förändras per generation:** nästan bara **presentation** (nav, språk, illustrationer, gamification-nivå, coach-ton).

**Vad förändras inte:** core engines, datamodell, API-kontrakt.

App v2 / nav v2 är **Platform v1** — grunden som gör Generation 2–4 möjliga utan omskrivning.

---

## 3. Två lager (övergripande)

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE PLATFORM (Layer 1)                   │
│         Domänlogik — förändras sällan, delas av alla         │
│                                                              │
│  Identity · Tasks · Goals · Rewards · Progress · Habits     │
│  Relationships · Timeline · Coach (AI) · Permissions          │
│  Notifications · Analytics                                   │
│                                                              │
│              Gemensam datamodell & API                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Layer 2)                      │
│    Navigation · språk · färger · animation · gamification    │
│                                                              │
│   CHILD    TEEN    YOUNG_ADULT    ADULT    (+ Parent, Educator) │
└─────────────────────────────────────────────────────────────┘
```

**Regel:** Presentation får **aldrig** äga affärslogik. Paket, capabilities och permissions lever i Layer 1.

---

## 4. Layer 1 — Core Platform

### 4.1 Engines (domänlogik)

Dessa är produkten — inte barn-UI:t.

| Engine | Ansvar | Befintlig kod / data (Generation 1) |
|--------|--------|-------------------------------------|
| **Task** | Skapa, planera, schemalägga, slutföra uppgifter | `activity_template`, `weekly_schedule`, `daily_log_item`, `sub_steps` |
| **Goal** | Kort- och långsiktiga mål | `reward` (stjärnkost), streak, familjeprojekt |
| **Reward** | Poäng, inlösen, unlocks | `daily_log_item.star_value`, `reward_redemption`, universe |
| **Progress** | Streaks, nivåer, historik, statistik | `streak`, museum, star history |
| **Habit** | Återkommande mönster, vanor | weekly schedule, completion patterns |
| **Relationship** | Grupper, roller, inbjudan, stödpersoner | `family`, `parent_child`, `pedagog_invite` |
| **Timeline** | NU / NÄSTA / SEN, tidslinje, kalender | `view_type`, `now_next_later`, calendar |
| **Coach (AI)** | Personliga förslag, nästa steg | För dig (förälder, Gen 1), framtida per profil |
| **Notification** | Push, påminnelser, systemmeddelanden | `push_subscriptions`, `notification_log` |
| **Permission** | Roller, integritet, åtkomst | `parent_child.role`, authz, PIN/parental gate |
| **Identity** | Person, konto, session | `parent`, `child` (→ `member`), JWT |

### 4.2 Tre motorer — generiska namn

Dagens barn-specifika namn mappas till **plattformsneutrala** engines. Barn-IA är en *presentation* av dem.

| Plattform (Layer 1) | Generation 1 (barn-UI) | Mental modell |
|---------------------|------------------------|---------------|
| **Execution Engine** | Today / Idag | *Vad ska jag göra nu?* |
| **Progress Engine** | Universe / Min värld | *Vad har jag byggt upp?* |
| **Relationship Engine** | Family / Mina personer | *Vem finns i mitt liv?* |

```
Execution Engine     →  tasks → complete → emit event
Progress Engine      →  points → unlocks → collections
Relationship Engine  →  groups → shared story → support network
```

**Viktigt:** Vi **ersätter inte** Today/Universe/Family i Generation 1-koden över natten. Vi **namnger dem konceptuellt** i nya specs och ser till att v2-implementationen inte låser oss till barnord i *ny* kod.

### 4.3 Domänspråk (mål)

| Idag (Generation 1) | Plattform (mål) | Barn ser | Vuxen ser |
|---------------------|-----------------|----------|-----------|
| `child` | `member` / `person` | "Astrid" | "Jag" |
| `family` | `group` | "Familjen" | "Mitt team" / "Hushållet" |
| `reward` + stars | `reward` + `progress_unit` | ⭐ Stjärnor | Progress / XP |
| Skattkammaren | `progress_surface` | 🏰 Min värld | Mål / Achievements |
| `parent` | `guardian` / `account` | Förälder | Stödperson / Själv |

**Migreringsprincip:** Tabellnamn `child` / `family` **behålls** tills explicit migration. Ny kod och nya API-fält använder neutrala begrepp där det är billigt (`member_id` i events, `presentation_profile` i config).

---

## 5. Layer 2 — Presentation Profiles

### 5.1 `PresentationProfile`

```ts
type PresentationProfile =
  | 'CHILD'        // 4–12
  | 'TEEN'         // 13–17
  | 'YOUNG_ADULT'  // 18–30
  | 'ADULT'        // 30+
  | 'PARENT'       // vårdnadshavare (Gen 1)
  | 'EDUCATOR'     // pedagog (finns)
  | 'THERAPIST'    // horisont
```

Varje profil styr **endast presentation:**

| Dimension | Styrs av profil |
|-----------|----------------|
| Navigation (etiketter, antal flikar) | ✅ |
| Färger, illustrationer, animation | ✅ |
| Språk och metaforer | ✅ |
| Gamification-nivå (stjärnor vs XP vs %) | ✅ |
| Coach-ton | ✅ |
| Ikoner | ✅ |
| Affärslogik, API, permissions | ❌ Layer 1 |

**Teknisk början (v2, ingen ny tabell nödvändig):**

```js
// Utöka befintlig config — inte ny backend
child_view_config.presentation_profile  // 'CHILD' | 'TEEN' | …
child_view_config.age_band              // härledd från birthday
```

### 5.2 Navigation per profil

Samma tre **engine-slots** — olika etiketter och visuell tyngd.

| Engine slot | CHILD (4–12) | TEEN (13–17) | YOUNG_ADULT | ADULT |
|-------------|--------------|--------------|-------------|-------|
| Execution | ☀️ Idag | Idag | Idag / Tasks | Idag / Tasks |
| Progress | 🏰 Min värld | Mitt space | Mål / Progress | Mål / Growth |
| Relationship | ❤️ Mina personer | Mina personer | Mitt nätverk | Network / People |

**v2 gör redan rätt:** Idag · Min värld · Mina personer är **översättningsbara** etiketter — inte hårdkodade barnbegrepp i motorerna.

### 5.3 Gamification per profil

Samma API-anrop — olika presentation:

| Händelse | CHILD | TEEN | YOUNG_ADULT / ADULT |
|----------|-------|------|---------------------|
| Slutför uppgift | +1 ⭐ → glass | +25 XP → achievement | Progress 73 % → månadsmål |
| API | `POST …/complete` → `{ progress_delta, unit: 'stars' }` | samma | samma — `unit` + profil styr UI |
| Progress-yta | Skattkammaren, hus, rum | Avatar, streak, stats | Grafer, mål, vanor |

### 5.4 Coach per profil

| Profil | Coach-roll | Generation 1-status |
|--------|------------|---------------------|
| PARENT | Lösningslager för vårdnadshavare | För dig — **levererat** |
| CHILD | Kort loop efter aktivitet | v2 coach-loop |
| TEEN | Självständighet + integritet | Ej byggt |
| YOUNG_ADULT / ADULT | AI-stöd, dagssammanfattning | Ej byggt |

Samma **Coach engine** — olika `tone` + `placement` per `PresentationProfile`.

---

## 6. Produkter & roller (horisont)

```
Product (byggda på Core Platform)

├── Child          Generation 1 — live
├── Parent         Generation 1 — live
├── Educator       Generation 1 — live (pedagog)
├── Teen           Generation 2
├── Young Adult    Generation 3
├── Adult          Generation 4
├── Therapist      Horisont
└── Organization   Horisont (skola, BUP, arbetsplats)
```

Paket (`basic_app`, `reporting`, `pedagog`, `teacch`) är **capabilities** ovanpå Core — inte separata produkter.

---

## 7. Relation till befintlig barnarkitektur

**Gör inte:** Slänga Today / Universe / Family — de fungerar för Generation 1.

**Gör:** Lyfta dem ett konceptuellt lager och behandla dem som **första presentation** av Execution / Progress / Relationship.

```
                    CORE PLATFORM
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Execution         Progress         Relationship
        │                 │                 │
        ▼                 ▼                 ▼
   CHILD preset      CHILD preset      CHILD preset
   "Idag"            "Min värld"       "Mina personer"
        │                 │                 │
        ▼                 ▼                 ▼
   TEEN preset       TEEN preset       TEEN preset
   "Idag"            "Mitt space"      "Mina personer"
```

| Befintligt dokument | Roll efter denna spec |
|--------------------|------------------------|
| `engineering-architecture-barnapp.md` | **Generation 1 implementation** av Core |
| `separation-contract-barnapp.md` | **Execution ⊥ Progress ⊥ Relationship** — fortfarande giltigt |
| `informationsarkitektur-barnapp.md` | CHILD presentation IA |
| `barnmeny-v2.md` / `vuxenmeny-v2.md` | Platform v1 nav-migration |
| `APP-V2-KRAVSPEC.md` | Platform v1 leveranskrav |

---

## 8. Vad v2 / Platform v1 ska förbereda (utan att bygga Gen 2)

| Åtgärd | Kostnad | Varför |
|--------|---------|--------|
| Åldersneutrala nav-etiketter (Idag, Min värld, Mina personer) | Pågår | Översättningsbar till teen/adult |
| `presentation_profile` / `age_band` i view-config | Låg | En källa för framtida UI |
| Capabilities med `domain` + `placement` (ej barnord i ny kod) | Pågår | `nav-config.js`, `child-worlds.js` |
| Events med neutrala namn (`activity_completed`, `progress_delta`) | Låg | `analytics_events` redan neutral |
| **Inte** byta tabell `child` → `member` nu | — | För tidigt; dokumentera mappning |
| **Inte** bygga teen/adult UI nu | — | Presentation Profiles är spec, inte sprint |

---

## 9. API-exempel (samma motor)

**Barn:**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 1, unit: 'stars', unlocks: [...] }

UI: "Bra jobbat! +1 ⭐" → glass i Skattkammaren
```

**Ung vuxen (samma endpoint, annan profil):**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 25, unit: 'xp', unlocks: [...] }

UI: "Uppgift klar. +25 XP" → veckomål 80 %
```

Backend returnerar **data** — `PresentationProfile` styr **hur** det renderas.

---

## 10. AI-lager (horisont)

```
Coach Engine (Layer 1)
├── Inputs: tasks, progress, goals, calendar, member context
├── Outputs: suggestion, next_step, activation_package
└── Presentation: tone + length per profile

PARENT  → "Prova kvällsrutinen för Astrid"     (För dig, Gen 1)
CHILD   → "Bra jobbat! Nästa: frukost"           (coach-loop, v2)
TEEN    → "Du har 2 kvar idag. Vill du se dem?"
ADULT   → "Morgonblock klart. Dags för fokuspass."
```

---

## 11. Plugin / capabilities (befintligt → plattform)

Nuvarande `component-feature-map.js` och `CAPABILITIES` är redan rätt modell:

```
Capability → feature gate → placement → visibility
```

Det skalar till nya produkter utan ny nav per paket. Se `paket-v1.2-spec.md`.

---

## 12. Öppna arkitekturbeslut

| # | Fråga | Rekommendation |
|---|-------|----------------|
| A1 | När byta `child` → `member` i API? | Generation 2 — alias i Gen 1 |
| A2 | En app eller flera App Store-listningar? | En motor; ev. separat branding senare |
| A3 | `PresentationProfile` i DB eller härledd? | `birthday` + `account_type` + override i config |
| A4 | Ersätta engine-namn i kod nu? | Nej — konceptuellt i docs; kod vid React-migration |
| A5 | För dig för teen/adult? | Nej — ny coach-yta, samma engine |

---

## 13. Dokumentstruktur (mål)

```
docs/
├── USE_CASES_PLATFORM.md             ← människans resa (UC01–UC12)
├── architecture-platform.md          ← Core Platform (engines, profiles)
├── APP-V2-KRAVSPEC.md              ← Platform v1 leverans
├── engineering-architecture-barnapp.md  ← Gen 1 implementation
├── informationsarkitektur-barnapp.md
├── separation-contract-barnapp.md
├── barnmeny-v2.md
├── vuxenmeny-v2.md
└── VISION-2030.md                  ← kort executive summary (valfritt)
```

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första utkast. Core Platform + Presentation Profiles. v2 = Platform v1. |

========================================================================
KÄLLA: APP-V2-KRAVSPEC.md
========================================================================

# App v2 — Kravspecifikation

**Skapad:** 2026-06-26  
**Version:** 0.3 (utkast)  
**Status:** Platform v1 leveranskrav — nav och presentation för Generation 1, med plattformsgrund för Gen 2–4  
**Ägare:** Produkt  
**Målgrupp v2:** Barn 4–12 år och deras vårdnadshavare (pedagoger som tillägg)

> Det här dokumentet är **taket** över v2. Detaljer per yta finns i länkade underspecar — de ska inte dupliceras här utan refereras.

---

## Relaterade dokument

| Dokument | Roll i v2 |
|----------|-----------|
| [`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md) | **Universella use cases** — människans resa (UC01–UC12) |
| [`architecture-platform.md`](./architecture-platform.md) | **Core Platform** — engines, Presentation Profiles, domänspråk |
| [`VISION-2030.md`](./VISION-2030.md) | Kort executive summary |
| [`barnmeny-v2.md`](./barnmeny-v2.md) | Barnsidans IA, tre världar, migration |
| [`vuxenmeny-v2.md`](./vuxenmeny-v2.md) | Föräldrasidans IA, hubbar, domänmodell |
| [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) | Acceptance + KX-rader (förälder) |
| [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) | Tre lager: Idag / Skattkammaren / Familj |
| [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) | Hårda gränser mellan lager |
| [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) | Implementation-grade systemdesign |
| [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md) | Fasplan tre-lager-refaktor |
| [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) | Paket, komponenter, pedagog, TEACCH |
| [`for-dig-spec.md`](./for-dig-spec.md) | För dig — **redan levererat** (underhåll; ej v2-bygge) |
| [`kravspec-app-webb.md`](./kravspec-app-webb.md) | Auth, roller, säkerhet, plattform |
| [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md) | KPI:er, aktivering, North Star |
| [`admin-v2/ADMIN-V2-DELIVERY.md`](./admin-v2/ADMIN-V2-DELIVERY.md) | Admin v2 (levererat) |
| [`magic-view-rollout.md`](./magic-view-rollout.md) | Magic-vy global rollout |
| [`config/component-feature-map.js`](../config/component-feature-map.js) | Feature → paket → placement |

---

## 0. Sammanfattning (TL;DR)

**App v2 = Platform v1** — inte en ny produkt, utan **konsekvent omorganisering** av kärnmotorn (planera → utföra → bekräfta → belöna) plus presentationslager som klarar framtida målgrupper.

**Beslutsgate (varje större ändring):** *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?* Se [`architecture-platform.md`](./architecture-platform.md).

| Dimension | v1 (idag) | v2 (mål) |
|-----------|-----------|----------|
| Föräldernav | Feature-lista, dubbla källor (LEGACY/ROLLOUT), Mer/Extra | Fem jobb-flikar: Hem · Planering · Belöningar · För dig · Familj |
| Barnnav | Classic/magic/rollout, 4+ parallella nav-system | Tre världar: Idag · Min värld · Mina personer |
| Ny funktion | Ofta ny flik eller gömd | Placement i befintlig domän |
| Paket | Synlig i menyn | Utökar **djup**, inte bredd |
| Backend | — | **Oförändrad affärslogik** — nya hubbar och routes som tunt lager |

**Strategiskt mål:** Gör det lättare att **aktivera** (första stjärnan), **använda dagligen** (Idag som OS) och **växa in i paket** utan navigationskaos.

**North Star (oförändrad):** Family Day 14-retention — familj aktiv dag 13–15 efter start. Se [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 1. Bakgrund & problem

### 1.1 Varför v2?

Produktens **kärnvärde** fungerar för aktiva familjer (särskilt NPF 4–12). Men informationsarkitekturen har vuxit organiskt:

| Symptom | Konsekvens |
|---------|------------|
| Förälder: Schema, Skatt, Mer, Extra, Familj, Inställningar i olika kombinationer | Användaren navigerar **funktioner**, inte **jobb** |
| Barn: classic vs magic vs package-nav (2–4 flikar) | Dubbel testyta, inkonsekvent startflik |
| `/skattkammaren` = demo + förälder + barn | Förvirrande URL-semantik |
| Barninställningar i drawer + `/child-settings` | Fragmenterad barnadministration |
| Paket synliga som menypunkter | Säljbarhet och UX konkurrerar |

Rotorsak i aktiveringsdata (2026-06): **43 % av familjer har aldrig någon aktivitetssignal** — produkten känns som "tom canvas" innan värdet syns. v2 adresserar detta genom tydligare **Hem** (readiness) och barnets **coach-loop** — inte genom nytt För dig-arbete (redan på plats).

### 1.2 Vad v2 inte är

| v2 är | v2 är inte |
|-------|------------|
| Ny navigation och presentation | Omskrivning av schedule/daily-log/rewards-API |
| Hub-sidor som länkar till befintliga routes | Flytt av affärslogik till nya filer |
| En källa för nav (`nav-config.js`, `child-worlds.js`) | React-rewrite (långsiktig target, ej v2-blocker) |
| Inkrementell migration med redirects | Big-bang-lansering |
| Konsekvent 4–12-upplevelse | Ungdoms-/vuxenprodukt (horisont, §3.3) |

---

## 2. Vision

> **Appen hjälper familjen att få vardagen att fungera — barnet vet vad som händer nu, vuxna planerar utan friktion, och belöningar ger mening utan att stjäla fokus från handlingen.**

### 2.1 Produktprinciper (låsta)

1. **Intent före feature** — navigation svarar på användarens fråga, inte systemets modulnamn.
2. **Idag är operativsystemet** — ~80 % av barnets tid ska landa i handling, inte utforskning.
3. **Tre lager, tre mentala modeller** — Idag (göra) · Min värld (bli) · Mina personer (höra till). Blanda aldrig på samma skärm. Se [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).
4. **Paket utökar djup** — TEACCH, rapporter och pedagog läggs som placements i befintliga domäner, inte som nya toppflikar.
5. **Samma data, adaptiv presentation** — stödnivå och ålder ändrar *hur* saker visas, inte *var* de bor.
6. **Coach, inte verktyg** — Hem (läge + nästa steg) och barnets coach-loop guidar till handling. För dig finns redan för 4–12-föräldrar; v2 bygger inte ut den.
7. **Backend-first stabilitet** — befintliga API:er och tabeller återanvänds; v2 är primärt frontend-IA.

### 2.2 Framgångsmått

| KPI | Baslinje | v2-mål (indikatorer) |
|-----|----------|----------------------|
| Aktivering (första stjärnan) | 17 % | ↑ via tydligare Hem/onboarding/barn-inloggning |
| Day 14-retention | ~26 % av aktiverade | ↑ via Idag-fokus + coach |
| Barn: tid till första avbockning | Ej mätt konsekvent | `child_today_first_complete` < 60 s efter login |
| Förälder: hub-adoption | — | `nav_hub_click` planning/rewards > direktlänkar |
| Barnprofil-adoption | — | `/family/child/:id` ≥ 80 % av barnsessioner (fas 3) |
| Supportärenden "var hittar jag…" | Kvalitativ | ↓ efter nav-enhetlighet |

Detaljerad KPI-plan: [`tillvaxt-retention-krav.md`](./tillvaxt-retention-krav.md).

---

## 3. Omfattning

### 3.1 In scope (v2)

| Område | Leverans |
|--------|----------|
| **Föräldernav v2** | `nav-config.js`, fem flikar, hubbar `/planning` + `/rewards` |
| **Barnnav v2** | `child-worlds.js`, tre världar, routes `/child/today` · `/child/world` · `/child/family` |
| **Barnprofil** | `/family/child/:id` samlar schema, framsteg, PIN, inställningar |
| **Settings-sanering** | Konto, GDPR, prenumeration i `/settings` — inte i Familj-fliken |
| **Hem som coach** | Readiness-kort med tydliga nästa steg (nytt v2-arbete) |
| **Barn coach-loop** | Kort bekräftelse efter aktivitet → pekar till NÄSTA |
| **Avveckla** | Classic/magic-nav-split, Mer/Extra-flikar, dubbla LEGACY/ROLLOUT-källor |
| **Redirects** | Permanent redirect-tabell (§11) |
| **Analytics** | Events vid varje UX-förändring (§10) |
| **Paket-placements** | `CAPABILITIES` / `CHILD_CAPABILITIES` när paket aktiveras |

### 3.2 Explicit out of scope (v2)

| Post | Varför | Var dokumenterat |
|------|--------|------------------|
| Omskrivning av `/schedule`, `/library`, `/reports` | Non-goal | `vuxenmeny-v2.md` §0 |
| Ny backend för befintliga flows | Non-goal | `vuxenmeny-v2.md` §0 |
| React SPA-migration | Långsiktig target | `engineering-architecture-barnapp.md` |
| AI-startschema (ACT-1) | Parallellt aktiveringsarbete | `act-1-ai-startschema-spec.md` |
| Referral, SEO-artiklar | Tillväxt, ej IA | `tillvaxt-retention-krav.md` |
| Admin v2 | **Redan levererat** | `admin-v2/ADMIN-V2-DELIVERY.md` |
| **För dig (ny funktionalitet)** | **Redan levererat** för nuvarande målgrupp | `for-dig-spec.md` — v2 behåller fliken, bygger inte ut |
| Stripe / webb-betalning | Borttaget; IAP only | `docs/app-store-iap.md` |

### 3.3 Horisont (ej v2 — framtida utvärdering)

Följande diskuterades som produktutvidgning men **ingår inte i v2-krav**:

| Segment | Krav på framtida version |
|---------|--------------------------|
| Tonåringar 13–17 | Eget konto, integritetsnivåer, dämpad gamification |
| Unga vuxna 18–25 | Självregistrering, NPF/ADHD-positionering, ingen "barnprofil"-UX |
| Vuxna 25+ | Hushållsläge, professionellt stöd (bygg på pedagog-mönstret) |

**För dig och nästa målgrupp:** För dig är utformat för vårdnadshavare till barn 4–12 (problemorienterade familjemål, åldersfiltrering via `child.birthday`). Det **ingår inte** i planen för ungdom/vuxen — där behövs annan coachning (egna mål, integritet, självstyrd planering), inte en vidareutveckling av För dig-fliken.

Teknisk förberedelse i v2 (låg kostnad): `child.birthday` + `child_view_config` kan senare utökas med `age_band` utan nav-refaktor.

---

## 4. Målgrupp & roller

### 4.1 Primär målgrupp

| Persona | Behov | v2-yta |
|---------|-------|--------|
| **Förälder (primary/shared)** | Överblick, planera, belöna, bjuda in | Fem flikar + barnprofil |
| **Barn 4–12** | Veta vad som händer nu, känna progression, trygghet | Tre världar |
| **Pedagog** | Följa tilldelade barn, anteckna, skolaktiviteter | Separat nav (`pedagog_view`) — oförändrat i v2 |
| **Medförälder delad vårdnad** | Se endast sina barn | `parent_child`-länk — oförändrat |

### 4.2 Kontotyper (`account_type`)

| Typ | v2-beteende |
|-----|-------------|
| `family` | Standard föräldravvy |
| `educator` | Redirect till pedagog-översikt; separat nav |
| `dual` | Växling via avatar-meny |

Säkerhetskrav oförändrade: [`kravspec-app-webb.md`](./kravspec-app-webb.md) §0–§2.

---

## 5. Systemarkitektur (v2)

### 5.1 Tre engines (barn)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  IDAG       │────▶│  MIN VÄRLD   │────▶│  MINA       │
│  (action)   │     │  (meaning)   │     │  PERSONER   │
└─────────────┘     └──────────────┘     └─────────────┘
  tasks→complete      stars→unlocks       relation→trygghet
```

**Hård regel:** Ingen skärm blandar engines. Detaljer: [`separation-contract-barnapp.md`](./separation-contract-barnapp.md).

### 5.2 Fyra domäner (vuxen)

| Domän | Parent intent | v2-nav |
|-------|---------------|--------|
| `home` | *Här är läget* | Hem |
| `planning` | *Jag vill planera* | Planering (hub) |
| `rewards` | *Stjärnor och belöningar* | Belöningar (hub) |
| `for_you` | *Vad rekommenderar ni?* | För dig *(befintlig flik — behåll i nav, ej v2-bygge)* |
| `family` | *Vilka är med?* | Familj |
| `child_profile` | *Allt om ett barn* | `/family/child/:id` |
| `settings` | *Mitt konto* | Avatar → Inställningar |
| `pedagog_view` | *Mina elever* | Separat universum |

### 5.3 Capabilities-modellen

Varje funktion deklareras med **obligatoriska fält**:

```js
{
  id: 'reports',              // stabil nyckel
  feature: 'reporting',       // access gate (null = basic)
  domain: 'child_progress',   // parent intent
  placements: ['child_profile', 'rewards_hub'],  // var UI kan visas
  label: 'Rapporter',
  href: '/reports',
}
```

**Access** (har familjen köpt?) och **visibility** (ska vi visa nu?) är separata lager. Se `vuxenmeny-v2.md` §3.

Barn motsvarighet: `CHILD_CAPABILITIES` med exakt **en** `primaryPlacement` per capability.

### 5.4 Tekniska källor (single source of truth)

| Fil | Äger |
|-----|------|
| `public/js/nav-config.js` | Förälder: `PRIMARY_NAV`, `CAPABILITIES`, hubbar |
| `public/js/child-worlds.js` | Barn: `CHILD_WORLDS`, etiketter, paths |
| `public/js/child-capabilities.js` | Barn: feature-placements |
| `public/js/child-placements.js` | Barn: visibility per placement |
| `config/component-feature-map.js` | Feature → paket → komponent |

**Konsumenter** (ska läsa config, inte hårdkoda):

- `native-tab-bar.js`
- `parent-magic-shell.js` / `parent-magic-auto.js`
- `mobile-nav.js`
- `child-shell.js` (mål)
- `child-layer-router.js` (hash-fallback under migration)

---

## 6. Funktionella krav

### 6.1 Föräldervy

#### FR-P-01 Primärnav

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-01.1 | Exakt fem bottenflikar: Hem, Planering, Belöningar, För dig, Familj | Samma på native, mobil webb, desktop sidebar |
| FR-P-01.2 | Ingen Mer- eller Extra-flik | `nav-config.js` är enda källan |
| FR-P-01.3 | Inställningar endast via avatar-meny | Inte i bottennav |
| FR-P-01.4 | Notiser via header-klocka | `placement: header_notifications` |

#### FR-P-02 Planeringshub (`/planning`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-02.1 | Tunn hub som länkar till befintliga routes | `/schedule`, `/calendar`, `/activities`, `/library`, `/assign-schedule` |
| FR-P-02.2 | TEACCH visas här när köpt + aktiverat | `feature: teacch`, `placement: planning_hub` |
| FR-P-02.3 | Ingen duplicerad schedule-logik | Hub = länkar + kort beskrivning |

#### FR-P-03 Belöningshub (`/rewards`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-03.1 | Tunn hub för stjärnor, belöningar, kista, museum | Länkar till befintliga vyer |
| FR-P-03.2 | Inloggad förälder: `/skattkammaren` → redirect `/rewards` | Aldrig loop |
| FR-P-03.3 | Publik demo: `/skattkammaren?demo=1` oförändrad | Barn/demo ej påverkad |

#### FR-P-04 Hem (coach-lager)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-04.1 | Statuskort per barn: Idag X/Y, ⭐, varningar (PIN saknas, etc.) | `home-readiness.js` |
| FR-P-04.2 | Kort leder till **handling** (inte bara info) | `readiness_action_click` event |
| FR-P-04.3 | Distinkt från För dig: Hem = läge, För dig = rekommendation | Produktcopy granskad |

#### FR-P-05 För dig (redan levererat — regressionskrav)

För dig är **på plats** för målgruppen 4–12. v2 ska **inte** planera ny funktionalitet här — bara behålla fliken i `PRIMARY_NAV` och säkerställa att nav-migrationen inte bryter befintlig route.

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-05.1 | Fliken kvar i femfliks-nav | `/for-dig` nåbar från alla plattformar |
| FR-P-05.2 | Ingen v2-scope för nya mål, Aktivera-flöden eller V3–V5 i `for-dig-spec.md` | Underhåll vid behov, separat spår |
| FR-P-05.3 | Ej relevant för nästa målgrupp (13+) | Horisont §3.3 — ersätts av annan modell, inte För dig v2 |

#### FR-P-06 Familj & barnprofil

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-06.1 | `/family` visar barn, vuxna, pedagoger — inte kontoinställningar | PIN/GDPR flyttat till settings |
| FR-P-06.2 | `/family/child/:id` samlar allt om ett barn | Schema, framsteg, PIN, vy, foto |
| FR-P-06.3 | Framsteg som domän: stjärnor, historik, rapporter, mål | Rapporter under Framsteg, inte Belöningar |
| FR-P-06.4 | `/child-settings` → redirect barnprofil | Permanent efter fas 7 |
| FR-P-06.5 | Barn-drawer avvecklas när analytics OK | ≥ 80 % adoption 14 dagar |

#### FR-P-07 Inställningar

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-P-07.1 | Grupperad meny: Profil, Notiser, Säkerhet, App, Data, Prenumeration | Magic settings-meny |
| FR-P-07.2 | `/upgrade` → `/settings#prenumeration` | Redirect |
| FR-P-07.3 | Pedagog-växling i avatar-meny (dual) | Inte i Familj-fliken |

### 6.2 Barnvy

#### FR-B-01 Primärvärldar (Barnregeln)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-01.1 | Exakt tre världar: Idag, Min värld, Mina personer | Ingen fjärde primärvärld |
| FR-B-01.2 | Ny funktion får **inte** skapa ny värld | Code review + §Barnregel i `barnmeny-v2.md` |
| FR-B-01.3 | Login → animation (max 2 s) → **Idag** | Aldrig Hem/Min värld som start |
| FR-B-01.4 | `CHILD_WORLDS` är enda IA-källa | Ingen classic/magic/rollout-nav-split |

#### FR-B-02 Idag (`/child/today`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-02.1 | NU / NÄSTA / SEN eller dagsektioner — max 5 synliga uppdrag | `child-today-focus.js`, `child-today-tasks.js` |
| FR-B-02.2 | Delsteg (sub_steps) inline eller expanderbara | Befintlig daily-log |
| FR-B-02.3 | Ingen kalender, statistik eller universum på Idag-skärmen | Separation contract |
| FR-B-02.4 | Kompakt mål (1 rad) tillåtet | `goal_preview` |
| FR-B-02.5 | CTA till Min värld sekundär — inte konkurrerande | QuestCTA längst ner |

#### FR-B-03 Min värld (`/child/world`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-03.1 | All progression: stjärnor, rum, avatar, samlingar, museum | Internt: Skattkammaren |
| FR-B-03.2 | Ingen task-checklist här | Route guard |
| FR-B-03.3 | Känns som belöning för handling — inte huvuddestination | Inte default efter login |

#### FR-B-04 Mina personer (`/child/family`)

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-04.1 | "De som hjälper mig" — personer först | Ingen social graph |
| FR-B-04.2 | Familjeprojekt / berättelse när live | `familjehallen_v0` |
| FR-B-04.3 | Barn kan inte skriva familjedata | Read-only child UI |

#### FR-B-05 Coach-loop

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-05.1 | Kort bekräftelse efter avklarad aktivitet | Ej chat-bot |
| FR-B-05.2 | Leder till NÄSTA steg — aldrig till meny | `today_coach_post_activity` |
| FR-B-05.3 | Valfritt att expandera; `aria-live` för a11y | WCAG-granskning |

#### FR-B-06 Adaptivt stöd

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-06.1 | Samma `daily_log` data, olika rendering per barn | `child_view_config` |
| FR-B-06.2 | Stöd ändrar upplevelse — aldrig informationsarkitektur | TEACCH = overlay på Idag |
| FR-B-06.3 | Personliga etiketter per ålder inom 4–12 | `labels.young` / `default` / `personal` |

#### FR-B-07 System & säkerhet

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-07.1 | Byt barn, logga ut bakom vuxenikon + Parental Gate | `parental-gate.js` |
| FR-B-07.2 | `session-gate.js` inkluderar `/child/*` | Förälder blockeras på barnroutes |
| FR-B-07.3 | Barn-session: endast child JWT | Ingen `/api/family/*` |

#### FR-B-08 Presentation

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-B-08.1 | `presentationMode`: mobile, tablet, desktop, native | Styr placering, inte antal världar |
| FR-B-08.2 | Tema/färger via `child_view_config` — inte separat app | Magic = utseende, inte IA |

### 6.3 Pedagogläge

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ED-01 | Separat nav-universum — inga föräldraflikar | `PEDAGOG_PRIMARY_NAV` |
| FR-ED-02 | Pedagog skapar endast `source='educator'` data | Konstitutionell regel i `paket-v1.2-spec.md` |
| FR-ED-03 | v2 ändrar inte pedagog-IA | Endast ev. deep-link-uppdateringar |

### 6.4 Onboarding & aktivering

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-ON-01 | Onboarding utanför v2-nav — engångsflöde | `magic-view-rollout.md` |
| FR-ON-02 | Efter onboarding: landa i Hem med readiness-kort | "Nästa steg" synligt |
| FR-ON-03 | Barn-inloggning tydlig från Hem | `dashboard-child-handoff.js` |
| FR-ON-04 | ACT-1 (AI-startschema) kompletterar v2 — ej blocker | Parallellt spår |

### 6.5 Paket & monetisering

| Paket | Komponent | v2-placering |
|-------|-----------|--------------|
| Basic | `basic_app` | Hela kärnnav |
| Familj Rapportering | `reporting` | Barnprofil → Framsteg |
| Familj Pedagog | `pedagog` | Familj + separat vy |
| Familj Extra stöd | `teacch` | Idag-overlay + Planeringshub |

| ID | Krav | Acceptans |
|----|------|-----------|
| FR-PK-01 | Köp ändrar inte antal nav-flikar | Placements only |
| FR-PK-02 | `GET /api/subscription/access` styr access-lager | Oförändrat API |
| FR-PK-03 | Prenumeration i settings — inte Extra-flik | Fas 4 |

---

## 7. Icke-funktionella krav

### 7.1 Säkerhet & behörighet

Oförändrade krav från [`kravspec-app-webb.md`](./kravspec-app-webb.md):

- `parent_child` + `revoked_at IS NULL` på alla child-scoped routes
- CSRF på muterande vuxen-requests
- Parental Gate på delad enhet
- `requirePrimaryParent` för känsliga operationer

### 7.2 Tillgänglighet (a11y)

| Krav | Detalj |
|------|--------|
| NFR-A11Y-01 | `aria-current` på aktiv nav/värld |
| NFR-A11Y-02 | Coach-loop: `aria-live="polite"` |
| NFR-A11Y-03 | Touch targets ≥ 44 px (native + mobil) |
| NFR-A11Y-04 | Fokusfälla i modaler och Parental Gate |

### 7.3 Prestanda

| Krav | Detalj |
|------|--------|
| NFR-PERF-01 | Idag ska vara interaktiv < 2 s efter child-login (P95) |
| NFR-PERF-02 | Hub-sidor < 50 KB extra JS (tunna) |
| NFR-PERF-03 | SW `CACHE_NAME` bump vid varje v2-release |

### 7.4 Plattform

| Plattform | Krav |
|-----------|------|
| iOS/Android native | Tab bar läser `nav-config.js`; safe-area |
| Mobil webb/PWA | Hamburger + samma fem flikar |
| Desktop | Sidebar = samma IA som tab bar |
| Offline | Befintlig daily-log-kö oförändrad |

Se [`plattform-webb-ios-android.md`](./plattform-webb-ios-android.md).

### 7.5 Analytics

| Event | När |
|-------|-----|
| `nav_hub_click` | Hub-flik klickad |
| `readiness_action_click` | Hem-kort → handling |
| `child_profile_section` | Sektion öppnad i barnprofil |
| `child_world_view` | Barn byter värld |
| `today_coach_shown` / `_dismissed` | Coach-loop |
| `page_view` | Route-migration (före/efter baseline) |

Ingen PII i `analytics_events`. Befintlig tabell återanvänds.

---

## 8. Datamodell & API (begränsningar)

v2 **introducerar inga obligatoriska nya tabeller** för kärnnav. Befintliga entiteter räcker:

| Entitet | v2-användning |
|---------|---------------|
| `child` | `birthday`, `view_type`, `child_view_config` |
| `child_view_config` | `view_mode`, element-flags, framtida `age_band` |
| `parent` | `account_type`, `preferred_view_mode` |
| `parent_child` | Roller, granular åtkomst |
| `family_subscriptions` | Paket-access |
| `daily_log` / `daily_log_item` | Idag-engine |
| `analytics_events` | v2-mätning |

**API:er som inte får brytas:** `/api/me/daily-log`, `/api/children`, `/api/subscription/access`, `/api/auth/*`.

Nya endpoints tillåtna för v2-stöd (tunna):

- `GET /api/family/readiness` (förslag — aggregering för Hem)
- Befintliga routes oförändrade i path och kontrakt

---

## 9. Design

### 9.1 Designtokens (oförändrade)

| Token | Värde |
|-------|-------|
| Navy | `#1B2340` |
| Gold | `#F5A623` |
| Lavender | `#EDE7F6` |
| Typsnitt | Outfit + Plus Jakarta Sans |

### 9.2 Visuell ton per yta

| Yta | Ton |
|-----|-----|
| Förälder | Ljus, professionell, lugn |
| Barn Idag | Tydlig, låg kognitiv belastning |
| Barn Min värld | Rikare, belönande — sekundär |
| För dig (befintlig) | Varm, handlingsorienterad — underhåll, ej v2-utveckling |
| Hem / barn coach | Tydlig, låg friktion |

### 9.3 Mockups & referenser

| Mockup | Fil |
|--------|-----|
| Föräldra-dashboard | `docs/mockups/foraldra.html` |
| Barnvy | `docs/mockups/barnvy.html` |
| Belöningar | `docs/mockups/beloningar.html` |

---

## 10. Leveransplan (samlad)

v2 levereras **inkrementellt**. Förälder och barn kan vara i olika faser kortvarigt — men `nav-config` + `child-worlds` ska vara synkade i principer före fas 3.

### Fas 0 — Lås arkitektur

| Leverans | Förälder | Barn |
|----------|----------|------|
| Config-filer | `nav-config.js` | `child-worlds.js`, `child-capabilities.js` |
| Konsumenter kopplade | tab-bar, magic-shell, mobile-nav | layer-router (läs config) |
| Beteende | Oförändrat synligt | Oförändrat synligt |

### Fas 1 — Synlig v2-nav

| Leverans | Förälder | Barn |
|----------|----------|------|
| Nytt primärnav | 5 flikar | 3 världar |
| Bort | Mer, Extra, dubbla källor | classic/magic nav-split |
| Start | Hem | Idag |

### Fas 2 — Hubbar & moduler

| Leverans | Förälder | Barn |
|----------|----------|------|
| Hubbar | `/planning`, `/rewards` | — |
| Modulsplit | — | `child-shell.js` ersätter orchestrator |
| Redirect | `/skattkammaren` → `/rewards` (förälder) | — |

### Fas 3 — Profiler & routes

| Leverans | Förälder | Barn |
|----------|----------|------|
| Barnprofil | `/family/child/:id` | — |
| Routes | — | `/child/today`, `/child/world`, `/child/family` |
| Analytics baseline | 2 veckor före/efter | `child_world_view` |

### Fas 4 — Coach & stöd

| Leverans | Förälder | Barn |
|----------|----------|------|
| Coach | `home-readiness.js` (förälder) | Coach-loop på Idag (barn) |
| Settings | Sanering | — |
| Adaptivt stöd | — | `child-support-layer` |

### Fas 5 — Paket-placements

Nya `CAPABILITIES` / `CHILD_CAPABILITIES` rader. Ingen nav-refaktor.

### Fas 6 — Städning

| Åtgärd |
|--------|
| Permanent redirects |
| Ta bort drawer, `/child-settings`, Extra/Mer |
| Avveckla `child-dashboard.js` som orchestrator (behåll shim) |

### Sprint-översikt (låst ordning)

| Sprint | Fokus | Detaljspec |
|--------|-------|------------|
| 0 | Config | `barnmeny-v2.md` §9, `vuxenmeny-v2.md` §8 |
| 1 | Synlig nav | Båda § Sprint 1 |
| 2 | Hubbar + moduler | Båda § Sprint 2 |
| 3 | Barnprofil + routes | `vuxenmeny-v2.md` § Sprint 3, `barnmeny-v2.md` § Sprint 3 |
| 4 | Settings + coach | Båda § Sprint 4 |
| 5 | Readiness + adaptivt stöd | Båda § Sprint 5 |
| 6+ | Paket + städ | Fas 6–7 |

---

## 11. Redirects (sammanfattning)

| Från | Till | Villkor |
|------|------|---------|
| `/skattkammaren` | `/rewards` | Inloggad förälder |
| `/skattkammaren` | *(oförändrad)* | `?demo=1` eller barnsession |
| `/child-settings` | `/family/child/:id` | Efter fas 3 |
| `/upgrade` | `/settings#prenumeration` | Alltid |
| `/child-dashboard` | `/child/today` | Efter fas 3 (shim under migration) |
| `#schedule` (hash) | `#today` / `/child/today` | Barn hash-fallback |
| `/family-week` | `/schedule?view=family` | Redan live |

Fullständig lista: `vuxenmeny-v2.md` §10, `barnmeny-v2.md` §11.

---

## 12. Acceptanskriterier (v2 klar)

v2 anses **produktionsklar** när alla punkter är uppfyllda:

### Navigation

- [ ] Förälder: en `PRIMARY_NAV`, fem flikar, alla plattformar
- [ ] Barn: en `CHILD_WORLDS`, tre världar, alla plattformar
- [ ] Ingen Mer/Extra/classic-magic-nav-split i produktion
- [ ] Alla redirects fungerar (§11)

### Kärnflöden (röktest)

- [ ] Ny familj: registrera → onboarding → Hem med nästa steg → barn login → Idag → avbocka → stjärna
- [ ] Förälder: Planeringshub → schema → ändring syns på barns Idag
- [ ] Förälder: Belöningshub → belöning → barn ser i Min värld
- [ ] Förälder: För dig fungerar oförändrat (regression — ej v2-leverans)
- [ ] Barn: Parental Gate blockerar vuxenåtgärder
- [ ] Pedagog: oförändrat flöde fungerar
- [ ] Native iOS/Android: tab bar + safe-area

### Mätning

- [ ] Analytics-baseline insamlad före fas 3
- [ ] Barnprofil ≥ 80 % adoption (14 dagar) innan drawer tas bort
- [ ] Inga regressions i Day 14-retention (veckovis kontroll)

### Tekniskt

- [ ] `npm test` grönt
- [ ] `npm run lint` utan nya errors
- [ ] SW version bumpad
- [ ] Inga nya errors i `route-inventory` check

---

## 13. Risker & öppna frågor

| Risk | Sannolikhet | Åtgärd |
|------|-------------|--------|
| `child-dashboard.js` monolit svår att migrera | Hög | `child-shell.js` tidigt (Sprint 2); shim, inte parallell IA |
| Förälder och barn i olika faser förvirrar QA | Medel | Feature-flagg per familj om nödvändigt; tydlig release notes |
| `/skattkammaren`-redirect bryter bokmärken/marknadsföring | Medel | 301 + uppdatera SEO/demo-länkar |
| Barnprofil URL: `slug` vs `id` | Medel | **Beslut krävs Sprint 3** — rekommendation: stabilt `child_id` i URL |
| Analytics otillräcklig för beslut | Medel | Baseline 2 veckor **före** fas 3 |
| Paket-kunder missar nya placements | Låg | Synliggör i hub + Hem, inte ny flik |

### Öppna beslut (kräver produktbeslut)

| # | Fråga | Alternativ | Rekommendation |
|---|-------|------------|----------------|
| D1 | Barnprofil-URL | `/family/child/:id` vs `:slug` | `:id` (stabilt) |
| D2 | Magic view-växlare kvar efter v2? | Behåll tema / ta bort | Behåll som **tema**, inte nav |
| D3 | `child-new.html` | Deprecera nu / senare | Efter barn-routes stabila (fas 3) |
| D4 | Feature-flagg för v2 per familj? | Alla / allowlist | Alla (som magic idag) med `V2_DISABLED` nödstopp |

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första samlade kravdokument. Syntes av barnmeny-v2, vuxenmeny-v2, IA, paket, tillväxt. |
| 0.2 | 2026-06-26 | För dig markerat som redan levererat; utanför scope för v2-bygge och nästa målgrupp. |
| 0.3 | 2026-06-26 | Platform v1-ramning; länk till `architecture-platform.md` + `VISION-2030.md`. |

---

## 15. Nästa steg (team)

1. **Granska utkast 0.3** — produkt + teknik: bekräfta scope, öppna beslut (§13).
2. **Lås D1–D4** — särskilt barnprofil-URL före Sprint 3.
3. **Skapa tickets** från Fas 0/Sprint 0 i befintliga sprint-planer.
4. **Baslinje analytics** — starta `page_view` för `/child-settings`, `/skattkammaren` innan nav-byte.
5. **Uppdatera detta dokument** till v0.2 efter beslut — inte efter implementation.

========================================================================
KÄLLA: barnmeny-v2.md
========================================================================

# Barnmeny v2 — nuläge & informationsarkitektur

> **Syfte:** Teamreferens för barnsidans navigation. Del 1 dokumenterar **hur det ser ut idag**. Del 2 är **låst målarkitektur** och inkrementell migration — parallellt med [`vuxenmeny-v2.md`](./vuxenmeny-v2.md).
>
> **Status:** Del 1 = nuläge · Del 2 = låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) (KX-rader, acceptance) · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21 (Del 2 låst; nit-fix: paths, PG, a11y)

---

# Del 1 — Hur det ser ut idag

## 1. Översikt: en sida, många navigationslager

Barnupplevelsen är i praktiken **en SPA** på `/child-dashboard` med tab-state — inte separata routes per flik (utom hash-alias via `child-layer-router.js`).

```
Inloggning                    Huvudapp                         Publika sidor
─────────                    ────────                         ─────────────
/child-login  ──────────►  /child-dashboard                  /skattkammaren (demo, ej inloggad)
     │                            │
     │                            ├── Klassisk vy (default)
     │                            └── Magic / ny design (feature-flaggad)
     │
DeviceMode=child + session-gate blockerar föräldraroutes
```

**Kärnfil:** `public/child-dashboard.html` + `public/js/child-dashboard.js` (~2 700 rader logik).

---

## 2. Inloggningsflöde

| Steg | Route | Vad som händer |
|------|-------|----------------|
| 1 | `/child-login` | Barnväljare (kända barn från `localStorage` + ev. `/api/auth/login-picker-children`) |
| 2 | PIN | `POST /api/auth/child-login` |
| 3 | Redirect | `/child-dashboard` |

**Övriga ingångar:**

- Förälder på dashboard → "Barnet loggar in" → `/child-login` (`dashboard-child-handoff.js`)
- `DeviceMode.enterChild()` + `session-gate.js` → föräldrasidor redirectar till `/child-login`
- `Auth.redirectToDashboard()` → `type === 'child'` → `/child-dashboard`

**Filer:** `public/js/child-login.js`, `public/js/session-gate.js`, `public/js/device-mode.js`

---

## 3. Två helt olika nav-upplevelser (klassisk vs magic)

Barnets UI styrs av `AppViewMode` (`public/js/app-view-mode.js`) — samma vyväxlare som föräldrar, men med `initChild()` och per-barn `view_mode` i DB (`classic` | `new` → magic).

| | **Klassisk vy** (default) | **Magic / ny design** |
|--|---------------------------|------------------------|
| Aktivering | `magic_view_enabled` + förälder/barn valt "Ny design" | |
| Primärnav | **Toppflikar** (`#childLayerNav`) | **Bottenflikar** (`#childBottomNav`) |
| Startflik | ☀️ **Idag** (`schedule`) | 🏠 **Hem** (`home`) |
| Bottennav | Dolt | Synligt |
| Hem-hub | Finns inte som flik | `homeView` + `ChildSkattHouse.mountHome()` |

```js
// child-dashboard.js — applyChildViewMode()
if (childUiMagic) {
  showTab('home');
} else {
  showTab('schedule');  // klassisk start
}
```

**Konsekvens:** Dokumentation och test måste täcka **båda** lägen. De flesta nya mockup-komponenter (Hem-flik, bottennav, universum-hub) är **magic-only**.

---

## 4. Navigationslager idag (överlappande)

Barnappen har **flera parallella nav-system** som delvis duplicerar varandra:

| System | Fil | När aktiv |
|--------|-----|-----------|
| **Bottennav (4 flikar)** | `child-dashboard.html` `#childBottomNav` | Magic vy |
| **Legacy toppnav (3 flikar)** | `#childLayerNav` | Klassisk vy |
| **Package nav (2 flikar)** | `child-package-nav.js` | `rollout_mode !== 'off'` — döljer Hem/Mer, byter etiketter |
| **Layer router (hash)** | `child-layer-router.js` | `#home`, `#today`, `#universe`, `#family`, `#more` |
| **Idag-fokus** | `child-today-focus.js` | Döljer veckonav/progress i Idag-läge |

### 4.1 Bottennav — magic (4 flikar)

```
🏠 Hem          → showTab('home')      → #homeView
📅 Schema       → showTab('schedule')  → #scheduleView  (+ todayFocusMount)
💎 Skattkammaren → showTab('rewards')   → #rewardsView
⋯ Mer           → showTab('more')       → #moreView
```

**Familj** har ingen egen flik — nås via Mer eller (klassisk) egen toppflik.

### 4.2 Legacy toppnav — klassisk (3 flikar)

```
☀️ Idag              → schedule
💎 Skattkammaren     → rewards
🏡 Familj            → family
```

Ingen Hem-flik. Ingen Mer-flik (logout/dark mode i header istället).

### 4.3 Package nav — vid rollout (2 flikar)

När `fetchPackageAccess().rollout_mode !== 'off'`:

```js
// child-package-nav.js
// Döljer: tabHome, tabMore, tabFamilyLegacy
// tabSchedule → etikett "Idag" ☀️
// tabRewards  → etikett "Skatt"
```

TEACCH **NU**-overlay döljer nav helt: `ChildPackageNav.setNavHidden(true)`.

### 4.4 Mer-menyn (magic only)

```
#moreView
├── 🏡 Familj        → showTab('family')
├── 👤 Byt barn      → switchChildMember()
├── 🌙 Mörkt läge
└── 🚪 Logga ut
```

**"Mer"** är skräplåda för familj + system — samma anti-mönster som förälderns gamla nav.

---

## 5. Vyer inuti `/child-dashboard` (tab → DOM)

Allt är `display: none/block` via `showTab()` — inte egna URL:er (hash är kosmetiskt).

| Tab-nyckel | DOM-container | Produktlager | Syfte idag |
|------------|---------------|--------------|------------|
| `home` | `#homeView` | Hem-hub (magic) | Teaser till skatt/universum via `ChildSkattHouse.mountHome` |
| `schedule` | `#scheduleView` | **Idag / handling** | Dagens aktiviteter, bocka av, veckonav (klassisk) |
| `rewards` | `#rewardsView` | **Skattkammaren / mening** | Stjärnor, mål, belöningar, universum |
| `family` | `#familyView` | **Familj / relation** | Familjehallen V0 (`child-family-hall.js`) |
| `more` | `#moreView` | System | Genvägar + logout |

### 5.1 Idag / Schema (`scheduleView`)

**Mental modell i kod:** `schedule` = Idag (inte veckoplanering som föräldern).

Innehåll:

- Aktivitetslista per dag (`view_type`: `day_sections` | `week_columns` | …)
- Veckoflikar / `weekNavDetails` (klassisk — doldes delvis av `child-today-focus.js`)
- Progress-ring i header (`childHeaderRing`) — dold i today-focus-läge
- Mood-rating modal efter aktivitet (`show_mood_rating` per barn)
- TEACCH: `child-seven-questions.js` **NU**-kort med döljd nav

**Filer:** `child-dashboard.js`, `child-today-focus.js`, `child-today-tasks.js`, `child-seven-questions.js`

### 5.2 Hem (`homeView`) — endast magic

- Laddar samma reward/universe-data som Skattkammaren
- `ChildSkattHouse.mountHome(homeHubMount, …)` — förenklad hub/ingress till universum
- Default vid magic-login (`applyChildViewMode`)

**Otydlighet:** Hem och Skattkammaren delar data och känsla — risk för "två hem" (noterat i `informationsarkitektur-barnapp.md` §8).

### 5.3 Skattkammaren (`rewardsView`)

Två renderingsvägar:

1. **Universum (magic + `ChildSkattHouse`):** rum-hub med unlocks (`child-skatt-house.js`)
2. **Klassisk banner-layout:** `renderSkattkammaren()` i `child-dashboard.js` (önskelista, historik, butik)

#### Rum i universum-hubben (`BASE_ROOMS`)

| Rum | ID | Unlock (typiskt) |
|-----|-----|------------------|
| Stjärnkistan | `chest` | Alltid |
| Drömvägg | `dreams` | Alltid |
| Troférum | `trophy` | 10⭐ livstid |
| Belöningshylla | `shelf` | 10⭐ |
| Samlingar | `collections` | 30⭐ |
| Historiebok | `story` | 30⭐ |
| Min avatar | `avatar` | 15⭐ |
| Husdjur | `pet` | 50⭐ |
| Museum | `museum` | 100⭐ |
| Butiken | `shop` | Alltid |

Navigation inuti skatt: **hub → rum → tillbaka** (`showRoom` / `showHub`) — ingen bottennav-ändring.

**Teman:** 🏰 Slott · 🌳 Trädkoja · 🚀 Rymden

**Filer:** `child-skatt-house.js`, `child-universe-client.js`, `child-avatar.js`, `child-collections.js`, `child-achievements.js`, `child-pet.js`, `child-museum.js`, `child-dashboard-warmth.js`

### 5.4 Familj (`familyView`) — Familjehallen V0

```
🏡 Familjehallen
├── ⭐ Familjeskista (aggregerade stjärnor)
├── 🎯 Familjeprojekt (tom om inga)
└── 📖 Familjens berättelse (event-feed)
```

Read-only från `GET /api/me/family`. Ingen checklista här (separation contract).

**Tillgång:**

- Klassisk: egen toppflik **Familj**
- Magic: via **Mer → Familj** (ingen bottenflik)

**Filer:** `child-family-hall.js`, `child-family-client.js`

---

## 6. Hash-routing (kosmetisk)

`child-layer-router.js` mappar hash → tab:

| Hash | Tab | Layer-namn |
|------|-----|------------|
| `#home` / `#hem` | `home` | home |
| `#today` / `#idag` / `#schedule` | `schedule` | today |
| `#universe` / `#skattkammaren` / `#rewards` | `rewards` | universe |
| `#family` / `#familj` | `family` | family |
| `#more` / `#mer` | `more` | more |

Sätter `data-child-layer` på `<html>`. **Ingen** server-side route per flik.

---

## 7. Header & system (utanför flikar)

I `#childHeader` (klassisk, alltid synlig):

| Element | Funktion |
|---------|----------|
| Barnnamn + datum | Identitet |
| Progress-ring | Dagens % (dold i today-focus) |
| Vyväxling | Dagsvy ↔ veckovy (`toggleViewType`) |
| Utskrift | `printBtn` |
| Mörkt läge | `toggleChildDarkMode` |
| Logga ut | `childLogout()` → `/child-login` eller förälder |

I **magic** ligger logout/dark mode även under **Mer**.

**Minimal UI** (`minimal_ui` / TEACCH): döljer print/dark/logout; Skattkammaren kan heta "Be om hjälp".

---

## 8. Feature-flaggor & paket (basic idag)

Barnens grundloop (`basic_app`) inkluderar:

- Idag/schema, stjärnor, belöningar, skattkammaruniversum, barninloggning

**Inte live för de flesta användare** (men kod finns):

| Paket | Barnsynlig kod | Nav-påverkan |
|-------|----------------|--------------|
| `teacch` | `child-seven-questions.js`, `child-read-aloud.js` | NU-overlay, dölj nav |
| `rollout_mode` | `child-package-nav.js` | 2-fliksnav |
| `parent_home_magic` / magic view | `AppViewMode` | Bottennav vs toppnav |

---

## 9. Mental karta vs faktisk navigation

`informationsarkitektur-barnapp.md` beskriver **tre lager**:

```
Idag (handling) → Skattkammaren (mening) → Familj (relation)
```

**Faktisk navigation idag:**

```
                    KLASSISK                    MAGIC
                    ────────                    ─────
Primär            Idag | Skatt | Familj     Hem | Schema | Skatt | Mer
                         │                      │       │
Idag/Handling      scheduleView              scheduleView (+ today-focus)
Mening             rewardsView               homeView + rewardsView  ← dubbel ingress
Relation           familyView                familyView (via Mer)
System             header-knappar            moreView
```

---

## 10. Kända friktioner (varför v2 behövs)

| Problem | Manifestation |
|---------|----------------|
| **Två nav-paradigm** | Toppflikar vs bottenflikar beroende på vy-flagga |
| **"Schema" för barn** | Fliken heter Schema men meningen är Idag/uppdrag |
| **Mer-flik** | Familj, byt barn, tema, logout — samma anti-mönster som förälder |
| **Två "hem"** | `homeView` och `rewardsView` konkurrerar i magic |
| **Familj gömd** | I magic bara under Mer — relationlagret svårt att hitta |
| **Rollout 2-flik** | Tredje nav-variant när paket-intresse är på |
| **Ingen barnprofil-route** | Allt på en HTML-sida; svårt att deep-linka "Astrids framsteg" |
| **Produkt vs barn-intent** | Namn som Schema, Skattkammaren, Mer är system/språk — inte barnets fråga |

**Mognad (uppskattning, team 2026-06 — ingen automatisk mätning):**

| Lager | Mognad | Nav-tydlighet |
|-------|--------|----------------|
| Skattkammaren / Min värld | ~85% | Många rum — intern hub fungerar |
| Idag | ~60% | today-focus hjälper men veckonav/header kvar i klassisk |
| Familj / Mina personer | ~5% | Live men svår att hitta i magic |

---

## 11. Filer — snabbreferens

| Område | Filer |
|--------|-------|
| Huvudsida | `public/child-dashboard.html`, `public/js/child-dashboard.js` |
| Tab/hash | `public/js/child-layer-router.js` |
| Bottennav rollout | `public/js/child-package-nav.js` |
| Idag-fokus | `public/js/child-today-focus.js` |
| Skatt/universum | `public/js/child-skatt-house.js`, `child-universe-client.js` |
| Familj | `public/js/child-family-hall.js` |
| Inloggning | `public/child-login.html`, `public/js/child-login.js` |
| Vyväxlare | `public/js/app-view-mode.js` |
| Mockup (ej prod) | `public/v2/child.html` |
| IA vision | `docs/informationsarkitektur-barnapp.md` |
| Separation | `docs/separation-contract-barnapp.md` |

---

## 12. Jämförelse med föräldarsidan (nuläge)

| | Förälder idag | Barn idag |
|--|---------------|-----------|
| Huvud-URL | Många (`/dashboard`, `/schedule`, …) | En (`/child-dashboard`) |
| Nav-källor | Sidebar + native-tab-bar + magic + Mer/Extra | Toppnav ELLER bottennav + Mer |
| Settings | `/settings` | Mer / header |
| Hubbar | Saknas (direkt till routes) | Saknas (tab-state) |
| Paket i nav | Extra/Mer (rollout) | 2-flik (rollout) + TEACCH döljer nav |

---

# Del 2 — Barnmeny v2 (låst arkitektur)

> **Kärninsikt:** Barnets app ska **inte** ärva vuxenappens informationsarkitektur. Den ska inte vara *"en förenklad version av förälderns app"* — den ska vara *"ett visuellt stödverktyg för att lyckas med nästa sak"*.
>
> **Skillnaden mot idag:** Idag navigerar barnet i en app. I v2 **guidar appen barnet genom dagen**. Det är den största produktdifferentieringen.

---

## Barnregel (kontrakt — gäller före allt annat)

> **En ny funktion får aldrig skapa en ny primär värld.**

Varje förslag måste först besvara tre frågor:

1. **Vilken barnfråga hjälper detta?** — *Vad gör jag nu?* / *Det jag bygger* / *Vem hjälper mig?*
2. **Vilken värld äger detta?** — `today` · `world` · `family` (**exakt en** owner, se §5 ownership-kontraktet)
3. **Vilket placement passar?** — ett befintligt placement i den världen

Om det enda ärliga svaret är *"egen flik"* krävs ett **produktbeslut** — inte en PR. Tre världar är låsta.

Detta kontrakt skyddar modellen flera år framåt: barnappen blir stark genom **begränsning**, inte genom fler ytor. Det viktigaste i hela v2 är att **inte lägga till mer**.

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, API:er och dataflöden återanvänds där möjligt.**

| Gör | Gör inte |
|-----|----------|
| Tre primärvärldar (`CHILD_WORLDS`) | Kopiera vuxenmodellen (jobb → domän → placement) rakt av |
| `child-worlds.js` som presentationslager | Ny backend för daily_log, rewards, family |
| Routes `/child/today`, `/child/world`, `/child/family` | Ta bort `/child-dashboard` innan redirects + analytics OK |
| Dela upp `child-dashboard.js` i moduler | Omskriva hela barn-SPA i ett svep |
| Hash som fallback under migration | Kräva att barn "navigerar funktioner" |

**Barnet är inte en användare som ska navigera funktioner** — barnet ska lyckas med en **vardagsloop**.

| Idag (7/10) | v2 (10/10) |
|-------------|------------|
| Barnet tänker: *"Vilken funktion behöver jag?"* | Barnet känner: *"Vad gör jag nu?"* |
| App-navigation | **Trygg väg** |
| Klassisk / magic / rollout-nav | **En modell** — tre världar, alltid samma |
| Komplexitet synlig i menyer | Komplexitet **bakom stöd** |

---

## 1. Produktprincip (en rad som styr allt)

### Vuxen vs barn — olika mentala modeller

| | Vuxen (v2) | Barn (v2) |
|--|------------|-----------|
| Navigerar efter | **Föräldrajobb** (*Parent Intent*) | **Vad jag ska göra nu** |
| Lager | jobb → domän → placement | situation → handling → mening → relation |
| Flikar | Fem jobb (Hem, Planering, …) | Tre världar (Idag, Min värld, Mina personer) |
| Paket | Utökar domän | Ger mer stöd i **samma flöde** |
| Feature | Läggs till på placement | Gör en del av världen rikare |
| Ny flik? | Endast nytt föräldrajobb | **Endast ny barnfråga** |

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar barnet efter? | **Vad jag ska göra nu** |
| Vad gör en feature? | Gör en del av världen rikare |
| Vad gör paket? | Ger mer stöd i samma flöde |
| Vad får skapa en flik? | **Endast en ny barnfråga** |

**Designregel:** Flikar = barnets världar. Paket = kapabiliteter i befintliga världar.

Fel: `feature → skapa barnflik`  
Rätt: `feature → lägg till innehåll i rätt placement`

Fel: *"Var ska TEACCH-fliken ligga?"*  
Rätt: *"Vilken barnfråga hjälper den?"* → Idag (NU-overlay, aktivitetsstöd).

### Barnets fyra lager (inte nav — produktlogik)

```
situation     →  Vad händer nu?
trygg handling →  Idag (☀️)        →  Handling + Stöd
mening        →  Min värld (🏰)   →  Motivation
relation      →  Mina personer (❤️) →  Trygghet
```

### Slutarkitektur (låst)

```
CHILD APP

             ☀️ Idag
                |
        ----------------
        |              |
     Handling       Stöd


             🏰 Min värld
                |
        ----------------
        |
     Motivation


             ❤️ Mina personer
                |
        ----------------
        |
     Trygghet
```

### Tio principer för NPF 3–12 (låsta)

| # | Princip | Konsekvens |
|---|---------|------------|
| 1 | **Trygg väg**, inte app-navigation | Tre världar. Ingen mode-switch. Ingen classic/magic. Ingen rollout-nav. |
| 2 | **Idag = operativsystem** | ~80 % av användningen. Barnet ska alltid kunna svara: *"Vad ska jag göra?"* |
| 3 | **Komplexitet bakom stöd** | Samma data (`activity → sub_steps → completion`), adaptiv rendering per barn. **Stöd ändrar upplevelsen, aldrig informationsarkitekturen** (§6) |
| 4 | **Skattkammaren borta från nav** | Implementation/internt namn. Barn-UI: *"Jag bygger min värld"* |
| 5 | **Relation, inte funktion** | Flik = *Mina personer* — vem hjälper mig? vilka finns nära? |
| 6 | **Coach-loop** | Idag → liten trygg guide efter aktivitet (inte chat-bot) |
| 7 | **Personlig navigation** | Samma `id`, olika etiketter per ålder/stödnivå (`Uppdrag` vs `Idag`) |
| 8 | **En enda sann källa** | `child-worlds.js` → mobil, surfplatta, native — `presentationMode` styr utseende, inte antal flikar |
| 9 | **Dela monoliten** | `child-shell.js` + världsmoduler + engines — utveckla utan regressioner |
| 10 | **Minsta möjliga val** | Undvik menyer med Schema/Belöningar/Profil/Inställningar — *"Vad händer nu? [Starta]"* |

### Vad skapar **inte** flik

| ❌ | Varför |
|----|--------|
| Schema | Barnet frågar inte "var är schemat?" — barnet frågar "vad händer nu?" |
| Mer | System (byt barn, tema, logout) konkurrerar inte med barnets värld |
| Inställningar | Förälder styr eller liten vuxenikon i header |
| Funktioner | Paket/feature = placement, inte menyitem |

---

## 2. Primärvärldar (basic)

**Tre världar. Inte fyra. Inte fem.**

För många barn 3–12 med NPF är navigation i sig en belastning.

> **Internt språk (låst):** vi säger **världar**, inte "nav" eller "flikar", i barnkod och produktsamtal. Konstanten heter `CHILD_WORLDS`, inte `CHILD_PRIMARY_NAV`. Annars frågar framtida utvecklare *"vi behöver en ny nav-item för X"* — fel fråga. Rätt fråga: *"vilken värld gör X barnet tryggare i?"*

| # | Värld (default) | Route | `id` | Barnets fråga |
|---|----------------|-------|------|---------------|
| 1 | ☀️ **Idag** | `/child/today` | `today` | *Vad gör jag nu?* |
| 2 | 🏰 **Min värld** | `/child/world` | `world` | *Det jag bygger upp* |
| 3 | ❤️ **Mina personer** | `/child/family` | `family` | *Vem hjälper mig?* |

**Tre världar. Alltid samma.** Ingen Mer-flik. Ingen Hem-flik. Ingen Schema-flik.

### Startflöde (låst) — Idag är alltid landningsplatsen

`Idag` är inte en av tre likvärdiga ytor. Det är **operativsystemet** (~80 % av tiden), och hela produkten ska peka dit.

```
Barn väljs
  ↓
Trygg animation (MAX 2 sek)
  ↓
☀️ Idag
  ↓
"Vad händer nu?"
```

**Alltid.** Aldrig "Hem" först, aldrig Min värld först. Animationen efter login är en *övergång till Idag* — inte en egen startsida. Två startsidor (Hem + Skattkammaren) är just det problem v2 tar bort (§4).

**Min värld får aldrig kännas som huvudsidan** även om den är visuellt rikast. Den ska kännas som:

> *"När jag är klar kan jag bygga vidare."*

inte:

> *"Här är appens coolaste del."*

Konkret: rewards/universum är en **belöning för handling**, inte en utforskningsdestination som konkurrerar med Idag. Visuell tyngd, default-flik, login-mål och coach-loop pekar alla mot Idag.

### Personliga etiketter (samma ID, olika språk)

Världs-`id` är stabilt. Etikett kan anpassas per barn (ålder, stödnivå, föräldraval):

```js
{
  id: 'today',
  icon: '☀️',
  href: '/child/today',
  labels: {
    young: 'Uppdrag',           // yngre barn
    default: 'Idag',            // standard
    personal: '{name}s dag',    // t.ex. "Astrids dag"
  },
}
```

**Regel:** personalisering ändrar **språk**, inte struktur. Tre världar förblir tre världar.

### Terminologi (låst)

| Vuxenspråk / kod (internt) | Barnspråk (UI) |
|----------------------------|----------------|
| Skattkammaren, `rewards`, `child-skatt-house` | **Min värld** — aldrig i nav |
| Schema, `schedule`-tab | **Idag** |
| Familjehallen, `family`-domän | **Mina personer** (❤️) |
| Hem-hub, `homeView` | **Inte nav** — intro → Idag |
| classic / magic / rollout-nav | **Bort** som produktbegrepp |
| `CHILD_PRIMARY_NAV` / "nav" / "flik" (kod) | `CHILD_WORLDS` / **"värld"** — undvik "nav" i barnkod |

### `presentationMode` — inte två appar

v2 **avskaffar** classic/magic/rollout som separata nav-modeller.

| Bort | Kvar |
|------|------|
| Toppnav vs bottennav som olika IA | `presentationMode`: `mobile` · `tablet` · `desktop` · `native` |
| `child-package-nav.js` 2-flik | Samma `CHILD_WORLDS` överallt |
| `AppViewMode` styr antal flikar | `AppViewMode` / tema styr **utseende** (färger, animation, botten vs topp *placering*) |

```
child-worlds.js
        |
        +-- mobile (bottennav)
        +-- tablet
        +-- native-tab-bar
        +-- desktop (om barn på stor skärm)
```

**Inte:** två appar. **Utan:** en IA, flera presentationslägen.

---

## 3. De tre världarna

### 3.1 ☀️ Idag — `/child/today` (barnets operativsystem)

**~80 % av användningen.** Inte en sida med schema — barnets **OS**.

**Mental modell:** Barnet ska alltid kunna svara *"Vad ska jag göra?"* utan att välja funktion.

```
Astrid ❤️

NU
🪥 Borsta tänder
[Visa steg]  eller  [✓]

NÄSTA
🥣 Frukost

SEN
🎒 Skola
```

| Kapabilitet | Befintlig kod / data |
|-------------|----------------------|
| `daily_log_item` | `child-dashboard.js`, `/api/me/daily-log` |
| NU / NÄSTA / SEN | `child-today-focus.js`, `child-seven-questions.js` (TEACCH) |
| Underaktiviteter (delsteg) | `daily_log_item_sub_step`, `toggleItem()` |
| Mood | `show_mood_rating` per barn |
| TEACCH-overlay | `child-seven-questions.js` — placement `today_overlay` |
| Coach-loop | **Ny** — se §3.2 |
| Veckonav (klassisk) | Dolt i default NPF-läge |

**Tab-nyckel idag:** `schedule` → **mappas till** `today` i v2.

**Undvik (NPF):**

```
❌ Vad vill du göra?
   Schema · Belöningar · Familj · Profil · Inställningar · Hjälp
```

**Bättre:**

```
✅ Vad händer nu?
   [Starta]
```

### 3.2 Coach-loop (barnets "För dig")

Vuxen har Hem → För dig. Barn behöver **Idag → liten coach**.

Inte chat-bot. En **trygg guide** som bekräftar och pekar framåt.

```
Efter avklarad aktivitet eller delmål:

🎉 Bra jobbat!

Du klarade morgonen.

Vill du se vad som händer sen?
[Nästa: Frukost →]
```

| Placering | `placement` | Trigger |
|-----------|-------------|---------|
| Efter aktivitet | `today_coach_post_activity` | Huvudaktivitet eller alla delsteg klara |
| Efter sektion | `today_coach_post_section` | FM/EM/kväll klar |
| Dagsavslut | `today_coach_day_done` | Alla dagens uppdrag klara |

**Regel:** coach är **kort**, **valfritt att expandera**, och leder alltid tillbaka till NU/NÄSTA — aldrig till en meny.

### 3.3 Adaptivt stöd — samma data, olika rendering

Datamodellen behålls:

```
activity
 └── sub_steps
       └── completion
```

Rendering är **adaptiv** per barn (`child_view_config`, stödnivå, ålder):

**Barn med mindre stöd:**

```
🪥 Borsta tänder
[✓]
```

**Barn med mer stöd:**

```
🪥 Borsta tänder
1/4

🚰 Hämta tandborste  ⬜
🪥 Borsta            ⬜
💧 Skölj             ⬜
✨ Klar
```

| Lager | Ansvar |
|-------|--------|
| `child-activity-engine.js` | Laddar `daily_log_item` + sub_steps |
| `child-support-layer.js` | Väljer renderingsläge (kompakt / expanderad / steg-för-steg) |
| `child-today.js` | Monterar vy, coach-loop, NU/NÄSTA/SEN |

**Oförändrat:** stjärna på **huvudaktivitet**; delsteg = stöd, inte prestation. `PUT …/sub-steps` + huvud-`toggleItem` auto-kompletterar delsteg.

**Detta är en stor del av 10/10** — samma backend, olika trygghetsnivå i UI.

### 3.4 🏰 Min värld — `/child/world`

**Skattkammaren är implementation** — barnets mentalmodell är *"Jag bygger min värld"*, inte *"Jag går till skattkammaren"*.

Gamification behålls. Den blir **begripligare**.

```
🏰 Min värld

⭐ Mina stjärnor
🎯 Mitt mål
🐾 Mitt husdjur
🏆 Mina saker
📖 Min historia
```

| Sektion | Befintlig kod |
|---------|---------------|
| Universum / rum | `child-skatt-house.js`, `universe-engine.js` |
| Stjärnor, mål, butik | `renderSkattkammaren()`, `/api/me/goal`, rewards API |
| Avatar, husdjur, museum, teman | `child-avatar.js`, `child-pet.js`, `child-museum.js` |
| Historik / reporting | `world_history` placement |

**Tab-nyckel idag:** `rewards` (+ `homeView` i magic) → **sammanslaget** till `world`.

`ChildSkattHouse.mountHome()` → **intro/animation efter login** → landar på Idag. Inte egen nav-flik.

### 3.5 ❤️ Mina personer — `/child/family`

**Relation, inte funktion.** Inte ett socialt nätverk, inte en family-graph — **trygghet**. Det här är idag den svagaste världen (~5 %), så var försiktig: led med **människor**, inte mekanik.

Den enda känsla barnet ska bära härifrån:

> **"Jag är inte ensam."**

Världens underrubrik är barnets fråga, inte en systemetikett:

```
❤️ Mina personer
   "De som hjälper mig"

👩 Mamma
👨 Pappa
🧑‍🏫 Min lärare
🧒 Min kompis
```

Barnet möter **personkort** — namn, ansikte/emoji, en varm rad ("Vi klarade kvällsrutinen"). Inte siffror, inte en feed.

**Tona ned (inte bort):** "Familjeskista", "Familjeprojekt" och "event-feed" är vuxen-/systemspråk. De får finnas *bakom* personerna som en lugn "Vi tillsammans ⭐"-rad — men barnet ska **aldrig behöva förstå en social graph** för att känna trygghet.

| Innehåll | Befintlig kod | Roll i barn-UI |
|----------|---------------|----------------|
| Personer (vuxna/syskon/pedagog) | `GET /api/me/family` | **Primärt** — personkort |
| Familjehallen V0 (skista/projekt/berättelse) | `child-family-hall.js` | **Sekundärt** — tyst "Vi tillsammans" |
| Pedagog (paket) | `family_hall` placement | Person bland personer — **inte** egen flik |

**Domän-id:** `family` (stabilt i kod). **Barnetikett:** *Mina personer* (❤️) — aldrig "Familj".

**Tab-nyckel idag:** `family` (klassisk / Mer i magic) → **primärvärld** i v2.

---

## 4. Vad händer med Hem och Mer?

### Hem — inte nav

| Roll idag (magic) | Roll i v2 |
|-------------------|-----------|
| Bottenflik `home` | **Bort** som flik |
| `homeView` + `mountHome()` | Intro efter login, dagens startsida, animation/ingång → landar på **Idag** |
| Dubbel ingress till skatt | **En** ingress: Min värld |

**Problem v2 löser:** *"Var är jag?"* när Hem och Skattkammaren båda känns som start.

### Mer — bort 100%

| Funktion idag | Placering i v2 |
|---------------|----------------|
| 🏡 Familj | Primärflik **Mina personer** |
| 👤 Byt barn | Header vuxenikon → **Parental Gate** (§4.2) |
| 🌙 Mörkt läge | Header vuxenikon → **Parental Gate** (§4.2) |
| 🚪 Logga ut | Header vuxenikon → **Parental Gate** (§4.2) |

Systemgrejer ska **inte konkurrera** med barnets tre världar.

### Gränsen barn ↔ vuxen (låst — escape hatch bara för vuxen)

Två separata universum. Ingen funktion får korsa gränsen utan **Parental Gate** (jfr `app2.md` §5).

| Barnvärlden (utan gate) | Vuxenvärlden (kräver gate) |
|-------------------------|----------------------------|
| ☀️ Idag | Inställningar |
| 🏰 Min värld | Byt barn |
| ❤️ Mina personer | Rapportering / utveckling |
| | Konfiguration, logga ut, mörkt läge |

**Regel:** `CHILD_SYSTEM_ACTIONS` (byt barn, mörkt läge, logga ut) bor bakom en liten **vuxenikon i header** — aldrig som en fjärde barnvärld. Nya vuxenfunktioner hamnar i vuxenvärlden, inte i barnmenyn.

### 4.2 System-ikon & Parental Gate (låst)

`CHILD_SYSTEM_ACTIONS` ligger i header — **inte** i primärvärldarna. På **delad barnenhet** (iPad, familjedator) får barnet **inte** nå dem utan föräldra-PIN.

| Åtgärd | Krav |
|--------|------|
| Visa vuxenikon | Diskret ikon i header (inte textmeny) |
| Öppna systemmeny | `ParentalGate.requireParentMode()` när `DeviceMode.isChildMode()` |
| Efter godkänd PIN | `DeviceMode.enterParent()` → visa `CHILD_SYSTEM_ACTIONS` |
| Feature flag | Respektera `parental_gate_enabled` från `/api/app-config` (`parental-gate.js`) |

```js
// child-shell.js — pseudokod
function onSystemIconClick() {
  ParentalGate.requireParentMode(() => openSystemMenu());
}
```

**Utan gate (endast om flagga av + medveten risk):** systemåtgärder dolda helt i barnläge — säkrare default än exponerad logout.

**Befintlig kod:** `public/js/parental-gate.js`, `device-mode.js`, `child-login.js` (PG vid nytt barn). v2 **utökar** PG till header-systemmenyn.

**Inte PG:** barnets tre världar, coach-loop, aktivitetsbockning — barnets egna flöden.


---

## 5. Domänmodell (barn)

Samma **fyra begrepp** som vuxen — men **andra domäner**:

| Begrepp | Betydelse | Barn-exempel |
|---------|-----------|--------------|
| **`feature`** | Paket-slug som styr åtkomst | `teacch`, `reporting` |
| **`domain`** | Barnfråga — *vilken värld?* (**obligatoriskt**) | `today`, `world`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `today_overlay`, `world_history`, `family_hall` |
| **`visibility`** | Ska det visas nu? | TEACCH köpt men ej aktiverat → dölj |

### Domäner (låsta)

| Domän | Barnfråga | Route |
|-------|-----------|-------|
| `today` | Vad händer nu? | `/child/today` |
| `world` | Det jag bygger upp | `/child/world` |
| `family` | Mina personer | `/child/family` |

**Ingen** `settings`-domän i barnnav. **Ingen** `more`-domän.

### Placements-register (`child-placements.js`)

Central lista över var innehåll **kan** renderas — separat från capabilities så nya placements inte kräver nav-ändring:

```js
// public/js/child-placements.js

export const CHILD_PLACEMENTS = {
  // Idag
  today_overlay:        { domain: 'today',  description: 'TEACCH NU-kort, fullskärmsstöd' },
  today_coach_post_activity: { domain: 'today', description: 'Coach efter aktivitet' },
  today_coach_post_section:  { domain: 'today', description: 'Coach efter FM/EM/kväll' },
  today_coach_day_done:      { domain: 'today', description: 'Coach när dagen är klar' },
  activity_support:     { domain: 'today',  description: 'Adaptiv delsteg-rendering' },
  // Min värld
  world_history:        { domain: 'world',  description: 'Min historia / reporting' },
  world_tools:          { domain: 'world',  description: 'TEACCH-verktyg i världen' },
  // Mina personer
  family_hall:          { domain: 'family', description: 'Familjehallen' },
  family_persons:       { domain: 'family', description: 'Personkort med relationstext' },
};
```

### Obligatoriska fält i `CHILD_CAPABILITIES` (ownership-kontrakt)

> **Varje capability bor i exakt EN värld.** Den får *synas* på flera platser, men *ägs* av en värld via `primaryPlacement`. Annars börjar funktioner flyta överallt igen — precis det vuxen- och barn-v2 är till för att stoppa.

```js
{
  id: 'teacch_now',                  // required — stabil nyckel
  feature: 'teacch',                 // required — access gate (null = basic)
  domain: 'today',                   // required — barnvärld (owner)
  primaryPlacement: 'today_overlay', // required — EN owner-placement
  secondaryPlacements: ['activity_support'], // valfritt — får synas, ägs ej
  label: 'NU-kort',
}
```

**Förbjudet:**

```js
// ❌ ingen owner — funktionen flyter över flera världar
{ id: 'x', domain: 'today', placements: ['today_overlay', 'family_hall', 'world_history'] }

// ❌ saknar domain + owner helt
{ label: 'TEACCH', href: '/teacch' }
```

**Regel:** `primaryPlacement` **måste** tillhöra capabilityns `domain`. `secondaryPlacements` får peka in i en annan värld endast för innehåll en användare *redan* ser där — de skapar aldrig en ny ägare. Code review / lint avvisar capabilities som saknar `primaryPlacement` eller som använder en platt `placements`-array.

---

## 6. Paket → placering (ingen navändring)

| Paket | Feature | Owner-värld (`domain`) | `primaryPlacement` | Får även synas (`secondary`) | Synligt som |
|-------|---------|------------------------|--------------------|------------------------------|-------------|
| **Basic** | — | `today` · `world` · `family` | tre världar | — | Tre världar |
| **TEACCH** | `teacch` | `today` | `today_overlay` | `activity_support` | NU-kort, adaptivt stöd — **inte** ny värld |
| **Pedagog** | `pedagog` | `family` | `family_hall` | `family_persons` | Extra innehåll i Mina personer |
| **Reporting** | `reporting` | `world` | `world_history` | — | Min historia — **inte** barnvärld |
| **Coach** | — (basic) | `today` | `today_coach_post_activity` | `today_coach_post_section`, `today_coach_day_done` | Trygg guide efter aktivitet/sektion/dag |

Varje rad har **exakt en** owner-värld. Ett paket kan fördjupa en värld — det får aldrig bli en fjärde värld.

### Reporting — dubbel entré (samma princip som vuxen Framsteg)

| Roll | Placering |
|------|-----------|
| Förälder | Barnprofil → Framsteg (`vuxenmeny-v2.md` §3) |
| Barn | Min värld → Historik |

Barn ser **inte** rapporter som egen flik.

### Stöd ändrar upplevelsen, aldrig informationsarkitekturen

> **Generell regel (större än TEACCH):** Stöd får ändra *hur* en värld känns och renderas — aldrig *vilka* världar som finns eller var något bor.

Samma värld, samma aktivitet, olika stöd:

```
Barn A                     Barn B
🪥 Borsta tänder           🪥 Borsta tänder
[✓]                        1. Hämta tandborste
                           2. Ta tandkräm
                           3. Borsta
                           4. Klar
```

Tre världar, samma routes, samma `daily_log_item` — bara olika trygghetsnivå i UI (`child-support-layer.js`, §3.3). Det är en av modellens starkaste idéer och gäller allt stöd, inte bara TEACCH.

**TEACCH som specialfall:** idag döljer `ChildPackageNav.setNavHidden(true)` nav under NU-overlay. v2 behåller principen — världarna döljs visuellt vid fullskärms-stöd, men **grundstrukturen är fortfarande tre världar** när overlay stängs. Overlayn ändrar upplevelsen, inte IA:n.

---

## 7. Teknisk källa — tre filer, en IA

```
child-worlds.js      ← tre världar, etiketter, routes
        |
child-capabilities.js    ← feature + domain + access/visibility
        |
child-placements.js      ← var innehåll kan renderas
```

**Mål:** en källa för all barnnavigation — ersätter duplicering i `child-dashboard.html`, `child-package-nav.js`, `child-layer-router.js`, classic/magic-split.

### Modularkitektur (mål efter Fas 2)

```
Nu (monolit):
child-dashboard.js
  ├── login
  ├── nav
  ├── rewards
  ├── family
  ├── schedule
  ├── mood
  └── TEACCH

V2:
child-shell.js              ← login, nav, routing, system (vuxenikon)
child-today.js              ← Idag-vy, coach-loop
child-world.js              ← Min värld
child-family.js             ← Mina personer
child-support-layer.js      ← adaptiv rendering (steg/kompakt)
child-activity-engine.js    ← daily_log + sub_steps
child-rewards-engine.js     ← stjärnor, mål, inlösen
```

**Mål:** utveckla utan regressioner. `child-dashboard.js` blir tunn orchestrator → ersätts av `child-shell.js` **så snabbt som möjligt**.

> **Risk att undvika — två arkitekturer samtidigt:**
>
> ```
> v2-UI
>   └── child-dashboard.js   ← gammal orchestrator
>         └── gamla showTab()
>               └── gammal hash-router
> ```
>
> Om `child-dashboard.js` lever kvar länge under det nya UI:t får ni i praktiken **två navigationsmodeller** som måste hållas i synk — samma fälla som classic/magic-spliten. Regel: `child-shell.js` ska ersätta orchestrator-rollen redan i Sprint 2 (inte Sprint 5), och `/child-dashboard` redirectas i Sprint 3. Gamla `showTab()`/hash får bara leva som **tunn shim som mappar till de nya routes:arna**, aldrig som en parallell källa.

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `child-dashboard.html` `#childBottomNav` / `#childLayerNav` | Hårdkodad HTML | Genererad från config |
| `child-package-nav.js` | 2-fliks rollout | **Avvecklas** |
| `AppViewMode` classic/magic nav | Olika antal flikar | **`presentationMode`** — samma tre flikar |
| `child-layer-router.js` | Hash → tab | Hash → route + tab fallback |
| `native-tab-bar.js` (barnläge) | Om separat | `child-worlds` → `worlds` |
| `session-gate.js` | `CHILD_PATHS` | Lägg till `/child/today`, `/child/world`, `/child/family` |

### Config-struktur (koncept)

```js
// public/js/child-worlds.js

export const CHILD_WORLDS = [
  {
    id: 'today',
    icon: '☀️',
    href: '/child/today',
    labels: { young: 'Uppdrag', default: 'Idag', personal: '{name}s dag' },
    paths: ['/child/today', '/child-dashboard'], // hash → today under migration
  },
  {
    id: 'world',
    icon: '🏰',
    href: '/child/world',
    labels: { default: 'Min värld' },
    paths: ['/child/world'],
  },
  {
    id: 'family',
    icon: '❤️',
    href: '/child/family',
    labels: { default: 'Mina personer' },
    paths: ['/child/family'],
  },
];

/** Aktiv värld — samma mönster som vuxen `activeNavItem()` (nav-config.js §6) */
export function activeChildNavItem(pathname, hash, nav = CHILD_WORLDS) {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  const h = (hash || '').replace(/^#/, '');
  // Hash-fallback under migration (child-layer-router.js)
  const hashToId = {
    today: 'today', idag: 'today', schedule: 'today', home: 'today', hem: 'today',
    universe: 'world', rewards: 'world', skattkammaren: 'world',
    family: 'family', familj: 'family',
  };
  if (p === '/child-dashboard' && h && hashToId[h]) {
    return nav.find((tab) => tab.id === hashToId[h]);
  }
  return nav.find((tab) =>
    tab.paths.some((tp) => {
      if (p === tp) return true;
      if (tp !== '/' && p.startsWith(tp + '/')) return true;
      return false;
    })
  );
}

// child-capabilities.js — se §5
// child-placements.js — se §5
```

`CHILD_CAPABILITIES` och `CHILD_SYSTEM_ACTIONS` lever i `child-capabilities.js`:

```js
export const CHILD_CAPABILITIES = [
  {
    id: 'today_coach',
    feature: null,  // basic
    domain: 'today',
    primaryPlacement: 'today_coach_post_activity',
    secondaryPlacements: ['today_coach_post_section', 'today_coach_day_done'],
    label: 'Coach',
  },
  {
    id: 'teacch_now',
    feature: 'teacch',
    domain: 'today',
    primaryPlacement: 'today_overlay',
    secondaryPlacements: ['activity_support'],
    label: 'NU-kort',
  },
  {
    id: 'adaptive_substeps',
    feature: null,  // basic — driven by child_view_config
    domain: 'today',
    primaryPlacement: 'activity_support',
    secondaryPlacements: [],
    label: 'Adaptivt stöd',
  },
  {
    id: 'reporting',
    feature: 'reporting',
    domain: 'world',
    primaryPlacement: 'world_history',
    secondaryPlacements: [],
    label: 'Min historia',
  },
  // … pedagog (domain: 'family', primaryPlacement: 'family_hall')
];

export const CHILD_SYSTEM_ACTIONS = [
  // Kräver ParentalGate i barnläge (§4.2) — aldrig en värld
  { id: 'switch_child', label: 'Byt barn',    action: 'switchChild', requiresParentalGate: true },
  { id: 'dark_mode',    label: 'Mörkt läge',  action: 'toggleDark', requiresParentalGate: true },
  { id: 'logout',       label: 'Logga ut',    action: 'logout', requiresParentalGate: true },
];
```

### Tillgänglighet (a11y) — krav på nav-render

| Krav | Detalj |
|------|--------|
| Aktiv värld | `aria-current="page"` på aktiv primärnav-länk |
| Bottennav | `role="navigation"` + `aria-label="Barnnavigering"` |
| NU/NÄSTA/SEN | Tydliga rubriker (`h2`/`h3`), inte bara färg |
| Delsteg | Varje steg fokuserbart; progress (`1 av 4`) läsbar för skärmläsare |
| Coach-loop | `aria-live="polite"` på bekräftelsetext |
| System-ikon | `aria-label="Förälder"` / `aria-haspopup="menu"`; meny med fokusfälla |
| TEACCH-overlay | Fokusfång i overlay; Escape → tillbaka till Idag |

**Referens:** samma nivå som `vuxenmeny-v2.md` §6 a11y; `mobile-nav.js` `role="dialog"` ska föras vidare till barn-header-meny.

### Filer att **inte** omskriva (initialt)

| Fil | Strategi |
|-----|----------|
| `src/routes/daily-logs.js` | Orörd |
| `src/routes/rewards.js` | Orörd |
| `src/routes/goals.js` | Orörd |
| `child-skatt-house.js` | Behåll; mountas från `child-world.js` |
| `child-family-hall.js` | Behåll; mountas från `child-family.js` |

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Monolit delas upp. Gamla entry points lever tills redirects + analytics OK.

### Fas 0 — Config (ingen UI-förändring)

| Leverans | Detalj |
|----------|--------|
| `public/js/child-worlds.js` | `CHILD_WORLDS` med personliga `labels` |
| `public/js/child-capabilities.js` | `CHILD_CAPABILITIES`, `CHILD_SYSTEM_ACTIONS`, access/visibility |
| `public/js/child-placements.js` | `CHILD_PLACEMENTS` register |
| Inga synliga ändringar | Config importeras men UI oförändrat |

### Fas 1 — Lås tre världar

| Från (magic) | Från (klassisk) | Till (alla) |
|--------------|-----------------|-------------|
| Hem · Schema · Skatt · Mer | Idag · Skatt · Familj | **Idag · Min värld · Mina personer** |

- Gamla `showTab()`-nycklar fungerar internt (`schedule` → `today`, `rewards` → `world`)
- `child-package-nav.js` och rollout 2-flik: **avvecklas**
- classic/magic nav-split: **bort** — endast `presentationMode`
- `public/sw.js` CACHE_NAME-bump

### Fas 2 — Separera komponenter

| Ny modul | Ansvar | Källa idag |
|----------|--------|------------|
| `child-shell.js` | Login, nav, routing, system | `child-dashboard.js` (orchestrator) |
| `child-today.js` | Idag-vy, NU/NÄSTA/SEN, coach-loop | `child-dashboard.js` |
| `child-world.js` | Min värld, universum | `child-dashboard.js` + `child-skatt-house.js` |
| `child-family.js` | Mina personer | `child-family-hall.js` |
| `child-activity-engine.js` | daily_log + sub_steps | `child-dashboard.js` |
| `child-support-layer.js` | Adaptiv rendering | Ny (extrahera från delsteg-UI) |
| `child-rewards-engine.js` | Stjärnor, mål, inlösen | `child-dashboard.js` rewards-del |

**Mål:** inte ~2 700 rader i en fil. Utveckla utan regressioner.

### Fas 3 — Route-riktig struktur

| Route | Innehåll |
|-------|----------|
| `/child/today` | Idag |
| `/child/world` | Min värld |
| `/child/family` | Mina personer |

- Server: tunna HTML eller Express-routes som servar samma shell
- Hash (`#today`, `#universe`, …) lever som **fallback** under migration
- `child-layer-router.js` mappar gamla hash → nya routes

### Fas 4 — NPF & coach (10/10-polish)

| Leverans | Detalj |
|----------|--------|
| Adaptivt stöd | `child-support-layer.js` — kompakt vs steg-för-steg (§3.3) |
| Coach-loop | `today_coach_*` placements (§3.2) |
| Minsta val | Dölj veckonav, print, funktionsmenyer |
| Personliga etiketter | `labels.young` / `labels.personal` i nav |
| Login-intro | Animation → Idag, inte Hem-flik |

---

## 9. Sprint-plan (låst ordning)

### Sprint 0 — Config
- [ ] `child-worlds.js` (världar + personliga labels + **paths** + `activeChildNavItem()`)
- [ ] `child-capabilities.js` (access + visibility)
- [ ] `child-placements.js` (placement-register)
- [ ] Inga UI-ändringar

### Sprint 1 — Synlig v2 (trygg väg)
- [ ] Ersätt magic 4-flik + klassisk 3-flik + rollout 2-flik med **en** tre-världsmodell
- [ ] Etiketter: Idag · Min värld · Mina personer (❤️)
- [ ] Mina personer upp från Mer
- [ ] Hem bort som flik; Mer bort; rollout-nav bort
- [ ] `presentationMode` — samma IA på mobil/tablet/native
- [ ] System i header (vuxenikon) + **Parental Gate** i barnläge
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` bump

*Leverans:* barn ser tre världar. Appen guidar — barnet navigerar inte funktioner.

### Sprint 2 — Moduluppdelning
- [ ] `child-shell.js` (ersätter orchestrator-delen)
- [ ] `child-today.js` + `child-activity-engine.js`
- [ ] `child-world.js` + `child-rewards-engine.js`
- [ ] `child-family.js` wired
- [ ] `child-support-layer.js` (skelett)

### Sprint 3 — Routes
- [ ] `/child/today`, `/child/world`, `/child/family`
- [ ] Redirect `/child-dashboard` → `/child/today`
- [ ] Hash-fallback
- [ ] `page_view` analytics per värld

### Sprint 4 — Adaptivt stöd & coach
- [ ] Adaptiv delsteg-rendering (§3.3)
- [ ] Coach-loop efter aktivitet (§3.2)
- [ ] Personliga nav-etiketter
- [ ] TEACCH via placements (inte `child-package-nav.js`)

### Sprint 5+ — Städning
- [ ] Avveckla `child-package-nav.js`, classic/magic nav-split
- [ ] `CHILD_CAPABILITIES` för teacch, reporting, pedagog
- [ ] `child-dashboard.js` bort eller minimal legacy-shim

---

## 10. Mätning — rätt saker

Mät om barnet **lyckas**, inte hur mycket det klickar. Vanity-metrics (klick, tid-i-skatt) lurar oss att tro att utforskning = värde.

| ❌ Mät inte | ✅ Mät i stället |
|------------|------------------|
| Antal klick till feature | Kom barnet igång idag? |
| Tid i Skattkammaren / Min värld | Klarades första aktiviteten? |
| Sidvisningar per flik | Behövdes stöd — och hjälpte det? |

### Per värld

| Värld | Vad vi mäter |
|-------|--------------|
| ☀️ **Idag** | Kom barnet igång? Klarades första aktiviteten? Behövdes stöd? |
| **Coach** | Hjälpte nästa-steg-loopen — ledde den vidare till NU/NÄSTA? |
| ❤️ **Mina personer** | Sker faktisk interaktion med relationer (inte bara visning)? |
| 🏰 **Min värld** | Finns motivation **efter** handling — inte i stället för? |

Använd befintlig `analytics_events` (`event_type` + `metadata`, ingen PII). Lägg events vid route-migration (Sprint 3) och vid coach/stöd-trigger (Sprint 4). Inga nya tabeller krävs.

---

## 11. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/child-dashboard` | `/child/today` |
| `/child-dashboard#schedule` / `#today` / `#idag` | `/child/today` |
| `/child-dashboard#rewards` / `#universe` / `#skattkammaren` | `/child/world` |
| `/child-dashboard#family` / `#familj` | `/child/family` |
| `/child-dashboard#home` / `#hem` | `/child/today` (efter intro) |
| `/child-dashboard#more` / `#mer` | `/child/today` + system i header |

Befintliga API:er (`/api/me/daily-log`, `/api/me/goal`, …) **oförändrade**.

---

## 12. Relation till vuxenmeny v2

| Vuxen | Barn | Gemensam princip |
|-------|------|------------------|
| Parent Intent (jobb) | Barnfråga (värld) | Flik = mental modell, inte feature |
| `nav-config.js` | `child-worlds.js` | En källa (vuxen: "nav" · barn: "världar") |
| `CAPABILITIES` + placements | `CHILD_CAPABILITIES` | Paket utökar djup, inte bredd |
| Barnprofil → Framsteg | Min värld → Historik | Reporting dubbel entré |
| Avatar → inställningar | Vuxenikon + gate / förälder | System utanför världarna/flikarna |
| `informationsarkitektur-barnapp.md` tre lager | Tre världar | Idag → Min värld → Mina personer |
| Hem → För dig (vuxen) | Idag → coach-loop (barn) | Coach-lager per målgrupp |
| Förälder **Familj** (personer) | Barn **Mina personer** (relation) | Samma domän-id `family` i kod — **olika** barnspråk |
| `/skattkammaren` → `/rewards` (inloggad **förälder**) | Barn: `/child/world`; publik demo kvar | Redirect **aldrig** för barn eller `?demo=1` |

**Slutsats:** För att nå 10/10 behöver ni inte lägga till mer — ni behöver göra barnmenyn **mer konsekvent med barnets faktiska behov**. Appen guidar barnet genom dagen; barnet navigerar inte funktioner.

---

## 13. Checklista innan merge (per sprint)

- [ ] Barnregeln respekterad: ingen ny funktion skapar en ny primärvärld (§Barnregel)
- [ ] `CHILD_WORLDS` har `paths` + `activeChildNavItem()` (inkl. hash-fallback)
- [ ] Alla barnvärld-konsumenter läser `child-worlds.js` (källan heter `CHILD_WORLDS`, inte `*_NAV`)
- [ ] Systemåtgärder bakom **Parental Gate** i barnläge (`parental-gate.js`, §4.2)
- [ ] a11y: `aria-current` på aktiv värld, coach `aria-live`, overlay-fokus
- [ ] `child-placements.js` + `child-capabilities.js` på plats
- [ ] Varje `CHILD_CAPABILITY` har `id`, `feature`, `domain`, `primaryPlacement` (**exakt en owner**) — inga platta `placements`-arrayer
- [ ] Exakt **tre** primärvärldar — inga Hem/Mer/Schema/Skattkammaren-flikar
- [ ] Startflöde: login → trygg animation (max 2 s) → **Idag**; aldrig Hem/Min värld som start (§Startflöde)
- [ ] Barnetikett *Mina personer* (❤️) = "De som hjälper mig" — personer först, ingen synlig social graph
- [ ] Ingen classic/magic/rollout **nav-split** — endast `presentationMode`
- [ ] Coach-loop testad (ej chat-bot, leder till NU/NÄSTA)
- [ ] Adaptivt stöd: samma data, två renderingslägen — stöd ändrar upplevelse, aldrig IA (§6)
- [ ] System (byt barn, logga ut) bakom vuxenikon + **Parental Gate** (§4); barn kan inte korsa gränsen
- [ ] `session-gate.js` inkluderar `/child/*` paths
- [ ] Deep links / push uppdaterade vid behov
- [ ] Mätning enligt §10 (lyckas-metrics, inte klick/tid-i-skatt) vid route-/coach-migration
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Smoke: klassisk vy, magic vy, TEACCH overlay, native shell
- [ ] Ingen omskrivning av rewards/daily-log API (non-goal §0)

---

## 14. Ägarskap efter migration

| Barnfråga | Äger |
|-----------|------|
| Vad ska jag göra nu? | **Idag** (~80 % av tiden) |
| Det jag bygger upp | **Min värld** |
| Mina personer / trygghet | **Mina personer** |
| Coach efter handling | **Idag** → coach-loop |
| Adaptivt stöd | **Idag** → `child-support-layer` |
| System (byt barn, tema, logout) | Header vuxenikon + **Parental Gate** / förälder — **inte** värld (§4.2) |
| Intro efter login | Animation → landar på Idag |
| Paket (TEACCH, reporting, …) | Placements i befintliga världar |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Idag är operativsystemet. Min värld är motivation. Mina personer är trygghet. Appen guidar — barnet lyckas med nästa sak.

### Slutbild (10/10)

```
LOGIN
   ↓
☀️ IDAG
"Vad händer nu?"
        |
        + stöd
        + coach
        + nästa steg


🏰 MIN VÄRLD
"Det jag bygger"
        |
        + stjärnor
        + mål
        + avatar
        + historia


❤️ MINA PERSONER
"De som hjälper mig"
        |
        + relation
        + trygghet


SYSTEM
(vuxenikon + gate)
```

**Det viktigaste: lägg inte till mer.** Arkitekturen blir stark genom begränsning. Tre förändringar lyfter den från "snyggare meny" till **barnplattform med tydlig produktfilosofi**: (1) mentalt skifte nav → världar, (2) hårt capability-owner-kontrakt, (3) Idag ännu mer dominant visuellt och tekniskt.

---

# Bilaga A — Schema & delsteg (teknisk kedja)

> Djupdykning för implementatörer. Produktbeteende oförändrat i v2 — bara UX och placering.

### Datakedja

```
activity_template
  └── activity_sub_step
weekly_schedule_item
  └── daily_log_item          ← stjärna här (star_value, vanligtvis 1⭐)
        └── daily_log_item_sub_step   ← checklista, ingen egen stjärna
```

Generator: `src/lib/daily-log-generator.js`

### Barn-API

| Endpoint | Syfte |
|----------|-------|
| `GET /api/me/daily-log` | Dagens items |
| `PUT /api/me/daily-log-items/:id` | Bocka av huvudaktivitet |
| `GET/PUT …/sub-steps` | Delsteg |

Huvud-`toggleItem` i `child-dashboard.js` auto-kompletterar alla delsteg när huvudaktiviteten bockas.

---

# Bilaga B — Min värld / stjärnekonomi

### Saldo

`getStarBalance()` i `src/routes/rewards.js`:

```
intjänade (completed daily_log_items)
+ manuella tilldelningar
− spenderade (godkända/auto redemptioner)
```

### Inlösen

Barn → `pending` → förälder godkänner.

### Mål

`child_reward_goal` / `GET /api/me/goal`

### Universum

`child-skatt-house.js` + `universe-engine.js` — rum, unlocks, teman (🏰 🌳 🚀). I v2: allt under **Min värld**, inte Skattkammaren i barn-UI.

---

*Uppdatera Del 1 när nav ändras. Del 2 ändras endast via teambeslut — samma process som `vuxenmeny-v2.md`.*

========================================================================
KÄLLA: vuxenmeny-v2.md
========================================================================

# Vuxenmeny v2 — informationsarkitektur & inkrementell migration

> **Syfte:** Teamreferens för design, frontend och test. Styr var föräldrfunktioner *bor* i navigationen — inte bara var routes *finns*.
>
> **Status:** Låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`vuxenmeny-v2-operations-checklist.md`](./vuxenmeny-v2-operations-checklist.md) (operations + acceptance) · [`for-dig-spec.md`](./for-dig-spec.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §6 · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21 (granskningsrunda: kodbasavstämning)

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, routes och dataflöden återanvänds där möjligt.**

Detta innebär konkret:

| Gör | Gör inte |
|-----|----------|
| Nya hub-sidor som länkar till befintliga routes | Flytta eller omskriva `/schedule`, `/library`, `/reports` |
| Ny barnprofil-sida som samlar befintlig UI | Duplicera affärslogik i nya filer |
| Redirects från gamla entry points | Ta bort gamla routes innan analytics visar adoption |
| `nav-config.js` som presentationslager | Ny backend för befintliga flows |

Om någon föreslår "vi flyttar hela schedule-modulen till planning" — det är **utanför scope** för v2.

---

## 1. Produktprincip (en rad som styr allt)

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar föräldern efter? | **Föräldrajobb** (*Parent Intent*) — inte features eller paket |
| Vad gör ett paket? | **Utökar innehåll** i en befintlig domän |
| Vad gör en feature? | **Läggs till** på rätt `placement` — skapar inte menyitem |

**Designregel:** Flikar = förälderns jobb. Paket = kapabiliteter.

Fel: `feature → skapa menyitem`  
Rätt: `feature → lägg till innehåll i rätt domän`

Fel: *"Var ska den nya TEACCH-sidan ligga?"*  
Rätt: *"Vilket parent intent hjälper den?"* → Planering.

Om en ny funktion kräver ny bottenflik har den troligen fel hemvist.

**Terminologi:** *Föräldrajobb* internt · *Parent Intent* i produktteam och vid feature-review.

---

## 2. Primärnav (basic, idag)

Fem flikar. Ingen **Mer**. Ingen **Extra**. Inställningar i avatar — inte i bottennav.

| # | Flik | Route (hub) | Förälderns jobb |
|---|------|-------------|-----------------|
| 1 | 🏠 **Hem** | `/dashboard` | *Här är läget* — status, nästa steg, daglig överblick |
| 2 | 📅 **Planering** | `/planning` | *Jag vill planera* — schema, kalender, aktiviteter, bibliotek |
| 3 | 🎁 **Belöningar** | `/rewards` | *Stjärnor och belöningar* — kista, museum, historik |
| 4 | ✨ **För dig** | `/for-dig` | *Här är vad jag rekommenderar* — mål, tips, nästa bästa steg |
| 5 | 👨‍👩‍👧 **Familj** | `/family` | *Vilka är med?* — barn, vuxna, pedagoger |

### Hem vs För dig (produktprincip, inte bara routes)

| | Hem | För dig |
|--|-----|---------|
| Roll | *Här är läget* | *Här är vad jag rekommenderar* |
| Ton | Status, varningar, överblick | Guidning, mål, handlingar |
| Exempel | Astrid ⭐⭐⭐☆☆ · PIN saknas | Testa kvällsrutin → [Skapa schema] |
| Data | Samma readiness-/intelligenslager | Samma lager, mer coachande presentation |

`/for-dig` ska **inte** degenerera till en glömd tips-sida. Den är appens **coach-lager** och ingår i basic (`for_dig` → `basic_app` i `component-feature-map.js`).

### Desktop-sidebar

Samma fem som primärnav. Inställningar under avdelare — konkurrerar inte med kärnflöden.

```
Hem
Planering
Belöningar
För dig
Familj
────────
Inställningar
```

Framtida paketinnehåll syns i **hubbar** och **barnprofil** — inte som nya toppnivålänkar (se §5).

**Ikonkonvention:** 🎁 = Belöningar-fliken i nav. ⭐ = stjärnsaldo i innehåll (Hem-kort, barnprofil) — **inte** nav-ikon.

### Notis-inkorg (header, ej flik)

`/notifications` (kopplad till `notification_log`) har **ingen** bottenflik. Entré:

| Placering | `placement` | Implementation idag |
|-----------|-------------|---------------------|
| Header-klocka på alla förälderytor | `header_notifications` | `dashboard-home-hub.js` → `/notifications` |

Kräv synlig 🔔 på **desktop, mobil webb och native** — samma mönster som avatar-menyn (§4).

---

## 3. Domänmodell

Fyra begrepp styr synlighet och placering:

| Begrepp | Betydelse | Exempel |
|---------|-----------|---------|
| **`feature`** | Paket-/feature-slug som styr **åtkomst** | `reporting`, `pedagog`, `teacch`, `for_dig` |
| **`domain`** | Parent intent — *vilket jobb hjälper funktionen?* (**obligatoriskt**) | `child_progress`, `planning`, `rewards`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `planning_hub`, `child_profile`, `home_card` |
| **`visibility`** | Om innehållet **ska** visas just nu på en placement | Per placement, oberoende av köp |

**Viktigt:** Navigationen *äger inte* funktionen. Samma feature kan ha flera placements.

### Obligatoriska fält i `CAPABILITIES`

Varje capability **måste** ha alla fyra — inga undantag:

```js
{
  id: 'reports',           // required — stabil nyckel
  feature: 'reporting',    // required — access gate (null = basic, alltid tillgänglig)
  domain: 'child_progress', // required — parent intent
  placements: ['child_profile', 'rewards_hub', 'home_card'], // required — minst en
  label: 'Rapporter',
  href: '/reports',
}
```

**Förbjudet** (återinför gamla problemet):

```js
{ label: 'Ny grej', href: '/new-feature' }  // ❌ saknar id, feature, domain, placements
```

Code review / lint: avvisa capabilities utan `domain`.

### Access vs visibility (separata lager)

| Lager | Fråga | Källa |
|-------|-------|-------|
| **Access** | Har familjen rätt att använda funktionen? | `/api/subscription/access` → `components`, `features` |
| **Visibility** | Ska vi visa den på denna placement nu? | `nav-config` + ev. rollout / aktiveringsstatus |

Exempel: TEACCH kan vara **köpt** (`access.teacch: true`) men **inte aktiverat** av föräldern → dölj i `planning_hub` tills aktivering.

```js
function shouldShow(capability, access, visibility) {
  if (!hasFeatureAccess(access, capability.feature)) return false;
  return capability.placements.every((p) => visibility[p] !== false);
}
```

Detta förhindrar att feature-flaggning och UI-beslut blandas i samma boolean.

### Domäner (låsta)

| Domän | Beskrivning |
|-------|-------------|
| `home` | Daglig överblick, readiness, snabbstatus |
| `for_you` | Coach, rekommendationer, mål, personliga tips |
| `planning` | Schema, kalender, aktiviteter, bibliotek |
| `rewards` | Stjärnor, belöningar, kista, museum |
| `child_progress` | **Framsteg** — stjärnor över tid, historik, rapporter, mål |
| `family` | Barn, vuxna, pedagoger, inbjudan |
| `child_profile` | En barns hela värld (per barn) |
| `settings` | Konto, säkerhet, notiser, app, data, **prenumeration** |
| `billing` | Paket, trial, köp, betalningsstatus |
| `pedagog_view` | Separat UI-universum (ej föräldraflik) |

### Framsteg som gemensam domän

Rapporter är **inte** en belöningssak — det är uppföljning/utveckling.

```
/family/child/astrid
└── Framsteg
    ├── Stjärnor
    ├── Historik
    ├── Rapporter      ← feature: reporting
    └── Mål
```

Belöningar kan **länka** dit utan att äga innehållet:

```
⭐ Belöningar
500 stjärnor totalt
Se Astrids utveckling →
```

---

## 4. Hubbar & undersidor

### `/planning` — Planeringshub

| Ingång | Befintlig route | Feature (basic) |
|--------|-----------------|-----------------|
| Schema | `/schedule` | `basic_app` |
| Kalender | `/calendar` | `basic_app` |
| Aktiviteter | `/activities` eller `/library` (aktiviteter) | `basic_app` |
| Bibliotek | `/library` | `basic_app` |
| Kopiera schema | `/assign-schedule` | `basic_app` |
| Stöd & verktyg | `/barn-stod` | `teacch` (framtida) |

### `/rewards` — Belöningshub

| Ingång | Befintlig route | Feature |
|--------|-----------------|---------|
| Stjärnor | `/rewards#stars` eller inbäddat | `basic_app` |
| Hantera belöningar | `/library` (flik Belöningar) | `basic_app` |
| Familjekista | `/rewards#chest` | `basic_app` |
| Familjemuseum | `/rewards#museum` | `basic_app` |
| Utveckling | länk → barnprofil → Framsteg | `basic_app` (basic-statistik) / `reporting` (rapporter) |

> **⚠️ Hub-regel:** Länka **aldrig** till `/skattkammaren` från hubben. Den URL:en är idag antingen publik demo eller (v2) redirect för inloggad förälder → loop om hubben pekar dit.

**Tomt state (basic):** Raden *Utveckling* pekar på barnprofil → Framsteg → **Stjärnor/Historik** (basic). Länk till `/reports` döljs tills `feature: reporting`. Ingen disabled-rad — dölj eller visa basic-alternativ.

**Redirect (v2, inloggad förälder):** gamla bokmärken `/skattkammaren` → `/rewards`. Publik demo oförändrad: `GET /skattkammaren` utan session eller `?demo=1` (`public-pages.js`).

**Barn:** inloggat barn på `/skattkammaren` redirectas redan till `/child-dashboard#rewards` — påverkas av barnmeny v2 (`/child/world`).

### `/family` — Familjehub (ren)

```
Familj

Barn
──────
🌟 Astrid
👶 Olle

Vuxna
──────
Pontus
Anna

Pedagoger          ← feature: pedagog (dold tills live)
──────
Lisa
```

**Flytta bort från `/family`:** push, PWA-installation, föräldralås, GDPR, dataexport, radera konto → `/settings` eller avatar.

**`/samarbete` (pedagogsamarbete):** idag i Extra/Mer (`native-tab-bar.js` ROLLOUT). v2-placering:

| Placering | `placement` | Route |
|-----------|-------------|-------|
| Familj-hub → Pedagoger (intresse/info) | `family_pedagog_interest` | `/samarbete` |
| För dig (paketcoach) | `for_you_card` | `/samarbete` eller `/pricing-info#pedagog` |

Inte egen flik. Capability med `feature: pedagog` när live; intresse-läge via `rollout_mode` som idag.

### `/family/child/:slug` — Barnprofil (navets viktigaste objekt)

Största UX-lyftet. Ersätter drawer + `/child-settings`.

> **Regel:** Alla barnrelaterade funktioner ska kunna nås via barnprofilen — även om de också finns i andra domäner (hubbar, Hem, För dig).

Samma funktion, olika entréer:

| Funktion | Barnprofil | Annan entré |
|----------|------------|-------------|
| Rapporter | Framsteg → Rapporter | Hem: "Se utveckling →" |
| Schema | Schema | Planering-hub |
| Kvällsrutin | (via rekommendation) | För dig: "Bygg kvällsrutin för Astrid" |
| PIN | PIN-kod | Hem: readiness-kort |

```
🌟 Astrid · 7 år

Idag
⭐⭐⭐☆☆

Översikt
Schema
Belöningar
Framsteg
Barnvy
PIN-kod
```

**Redirect:** `/child-settings?id=…` → `/family/child/:slug`

#### Slug-strategi (låst)

| Regel | Detalj |
|-------|--------|
| **Kanonisk URL** | `/family/child/:slug` där `slug` = normaliserat barnnamn |
| **Normalisering** | Unicode NFC → gemener → å/ä/ö → `a`/`a`/`o` → mellanslag/emoji bort → `[a-z0-9-]` → max 40 tecken |
| **Kollision** | suffix `-2`, `-3`, … eller fallback till kort `child_id` (8 tecken) |
| **Namnbyte** | Slug **ändras inte** automatiskt — stabilitet för bokmärken, push och analytics. Ny slug endast via förälder "Uppdatera länk" i barnprofil (valfritt) eller alltid `child_id` om teamet prioriterar enkelhet |
| **API** | `GET /api/children/:id` returnerar `slug`; `GET /api/children/by-slug/:slug` för uppslag |
| **Analytics** | `page_view` ska logga **både** `slug` och `child_id` i metadata — kontinuitet vid ev. slug-byte |

> **Rekommendation:** använd **stabilt `child_id` i URL** (`/family/child/:id`) om slug-byten blir för komplexa i v1; `slug` som visningsalias i UI. Team väljer en strategi i Sprint 3 — men **blanda inte** id- och slug-URL:er utan explicit redirect-tabell.

#### Deep links & push (`child_id` → kanonisk URL)

Idag: push/deep links kan bära `child_id` (t.ex. `stjarndag://child/{id}`). `deep-link-router.js` känner inte barnprofil-routes ännu.

| Inkommande | v2-mål |
|------------|--------|
| `/child-settings?id=:uuid` | 302 → `/family/child/:canonical` |
| push `metadata.child_id` | resolve via API → `/family/child/:canonical` |
| gammal drawer-deep-link | samma resolve |

**Sprint 3-krav:** uppdatera `deep-link-router.js` `mapDeepPath` + push-handler med id→canonical-resolve — inte bara "vid behov".

### `/settings` — Minimal

```
⚙️ Inställningar

👤 Konto              (profil, e-post)
📦 Prenumeration      (trial, paket, köp — se §4 billing)
🔒 Säkerhet           (PIN-kod — inte "föräldralås" i föräldratext)
🔔 Notiser            (vad som skickas: påminnelser, veckosammanfattning, nyhetsbrev)
📱 App                (push-aktivering, PWA-installation, enhetsbehörigheter)
📦 Data & integritet  (GDPR, export, radering)
```

**Notiser vs App (ägarskap):**

| Sektion | Äger |
|---------|------|
| 🔔 **Notiser** | *Vilka händelser* ska meddelas (preferenser per typ) |
| 📱 **App** | *Hur* enheten tar emot (push-token, PWA, native-behörigheter) |

Undvik dubbel push-UI — en toggle per kanal under Notiser, enhetsaktivering under App.

#### Billing / prenumeration (`billing`-domän)

Var trialande/köpande förälder ser status och kan uppgradera — **ersätter** Extra-fliken (`/upgrade`) i nav.

| Ingång | Route | Syfte |
|--------|-------|-------|
| Min prenumeration | `/settings#prenumeration` | Status: `lifetime_free` · `trial` · `paid` · `grace_period` (från `family_subscriptions` / `subscription_status`) |
| Välj paket | `/upgrade` → redirect `/settings#prenumeration` eller inbäddat | Ersätter dagens Extra-flik |
| Prisinfo | `/pricing-info` | Länk från settings (info, inte nav) |
| Efter köp | `/payment-success` | Redirect till `/settings#prenumeration` |

**Placements (inte flikar):**

| Placering | Innehåll |
|-----------|----------|
| `settings_subscription` | Huvudentré — status + hantera |
| `home_card` | Trial-banner: "X dagar kvar" → settings |
| `for_you_card` | Paketcoach / intresse (kopplat till `rollout_mode`) |
| `avatar_action` | "Prenumeration" när trial < 7 dagar |

Befintliga sidor behålls; v2 **flyttar ägarskap** från Extra/Mer till settings + coach-kort.

### Avatar-meny (sekundärnav)

```
[Pontus ▾]
──────────────
Byt till pedagogvy    ← dual eller educator (se §4.1)
Prenumeration         ← vid trial / grace (billing placement)
Inställningar
Logga ut
```

**Native-krav:** Inställningar och Logga ut finns **inte** i bottennav. Header-avataren **måste** öppna denna meny på **alla** ytor (native tab bar, magic shell, desktop). Smoke-test: native utan sidebar → kan logga ut.

Pedagogvy = byte av **hela UI** (`pedagog-nav.js`), inte sjätte föräldraflik.

### 4.1 Roller — ren pedagog (`account_type = 'educator'`)

| Roll | Default efter login | Ser fem föräldraflikar? |
|------|---------------------|-------------------------|
| `family` | `/dashboard` | Ja |
| `dual` | `/dashboard` (eller senast vald vy) | Ja — avatar → pedagogvy |
| `educator` | **`/pedagog-oversikt`** (`dashboard.js` redirect) | **Nej** — pedagog-nav: Översikt · Idag · Historik · Inställningar |

v2 föräldranav (`PRIMARY_NAV`) gäller **inte** ren pedagog. `nav-config.js` ska exportera separat `PEDAGOG_PRIMARY_NAV` eller pedagogläget läser befintlig `pedagog-nav.js` — **ingen** merge av de två universen.

`switch_pedagog` i avatar: `role: 'dual_or_educator'` — dold för ren `family` utan pedagog-länk.

---

## 5. Paket → placering (framtida, ingen navändring)

| Paket | Feature-slug | Domän | Placements | Synligt som |
|-------|--------------|-------|------------|-------------|
| **Basic** | `for_dig`, m.fl. | diverse | `primary`, hubbar | Fem flikar idag |
| **Billing** | — | `billing` | `settings_subscription`, `home_card`, `avatar_action` | Prenumeration under Inställningar |
| **Reporting** | `reporting` | `child_progress` | `child_profile`, `rewards_hub`, `home_card` | Framsteg → Rapporter |
| **Pedagog** | `pedagog` | `family` | `family` (Pedagoger), `avatar` (vyväxling) | Sektion + pedagog-UI |
| **TEACCH** | `teacch` | `planning` | `planning_hub` | Stöd & verktyg |

**Regel vid lansering:** lägg till rader i `nav-config.js` — refaktorera inte bottennav.

### Pedagogläge (separat universum)

När `pedagog` är live för dual-roll:

- **Inte** ny föräldraflik
- Familj → Pedagoger-sektion
- Avatar → Byt till pedagogvy
- Befintligt pedagog-nav: Översikt · Idag · Historik · Inställningar

---

## 6. Teknisk källa: `nav-config.js`

**Mål:** en källa för all föräldranavigation.

### Nuläge idag — två osynkade källor (måste förenas)

Det finns **två** nav-implementationer med varsin LEGACY + ROLLOUT:

| Källa | LEGACY (default) | ROLLOUT (`rollout_mode !== 'off'`) |
|-------|------------------|-------------------------------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · **Mer** (5) | + **Extra** (`/upgrade`, `/samarbete`, …) · Mer (6) |
| `parent-magic-shell.js` | Hem · Schema · För dig · **Familj** · Inställn. (5) | Hem · Schema · För dig · Skatt · **Extra** · Mer (6) |

**Problem idag:** LEGACY skiljer redan (Skatt+Mer vs Familj+Inställn.). Fas 1 i v2 måste **förena båda** till samma `PRIMARY_NAV` — inte bara byta namn på en av dem.

`/samarbete`, `/upgrade`, `/notifications` ligger idag under Mer/Extra-paths i `native-tab-bar.js` — v2 flyttar dem till placements (§4).

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `public/js/native-tab-bar.js` | `LEGACY_TABS` / `ROLLOUT_TABS` | `nav-config` → `primary` |
| `public/js/parent-magic-shell.js` | `LEGACY_NAV` / `ROLLOUT_NAV` | `nav-config` → `primary` |
| `public/js/mobile-nav.js` | Parsar sidebar DOM | Sidebar genererad från config |
| Sidebar i `*.html` | Duplicerad per sida | Config eller delad partial |
| Hub-sidor | — | `planning_hub`, `rewards_hub` placements |
| `public/js/session-gate.js` | `PARENT_ONLY_PATHS` | Lägg till `/planning`, `/rewards`, `/family/child/*` |

### Config-struktur (koncept)

```js
// public/js/nav-config.js

/** Primärnav: INTE feature-gatat. Fail-closed på access får inte ta bort kärnflikar. */
export const PRIMARY_NAV = [
  {
    id: 'home',
    href: '/dashboard',
    label: 'Hem',
    icon: '🏠',
    paths: ['/dashboard', '/daily-log', '/'],
  },
  {
    id: 'planning',
    href: '/planning',
    label: 'Planering',
    icon: '📅',
    paths: ['/planning', '/schedule', '/calendar', '/activities', '/library', '/assign-schedule', '/barn-stod'],
  },
  {
    id: 'rewards',
    href: '/rewards',
    label: 'Belöningar',
    icon: '🎁',
    paths: ['/rewards', '/library'], // library belöningsflik — inte /skattkammaren
  },
  {
    id: 'for_you',
    href: '/for-dig',
    label: 'För dig',
    icon: '✨',
    paths: ['/for-dig'],
    // feature: null — basic_app, alltid synlig (§1: feature skapar inte menyitem)
  },
  {
    id: 'family',
    href: '/family',
    label: 'Familj',
    icon: '👨‍👩‍👧',
    paths: ['/family', '/family/child'],
  },
];

/** Aktiv flik — samma logik som native-tab-bar.js isActive() */
export function activeNavItem(pathname, nav = PRIMARY_NAV) {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  return nav.find((tab) =>
    tab.paths.some((tp) => {
      if (p === tp) return true;
      if (tp === '/dashboard' && p.startsWith('/daily')) return true;
      if (tp !== '/' && p.startsWith(tp + '/')) return true;
      return false;
    })
  );
}

export const CAPABILITIES = [
  {
    id: 'subscription',
    label: 'Prenumeration',
    feature: null,
    domain: 'billing',
    href: '/settings#prenumeration',
    placements: ['settings_subscription', 'home_card', 'avatar_action'],
  },
  {
    id: 'reports',
    label: 'Rapporter',
    feature: 'reporting',
    domain: 'child_progress',
    href: '/reports',
    placements: ['child_profile', 'rewards_hub', 'home_card'],
  },
  {
    id: 'samarbete',
    label: 'Pedagogsamarbete',
    feature: 'pedagog',
    domain: 'family',
    href: '/samarbete',
    placements: ['family_pedagog_interest', 'for_you_card'],
  },
  // … pedagog_invite, teacch_tools
];

export const HEADER_ACTIONS = [
  { id: 'notifications', href: '/notifications', icon: '🔔', placement: 'header_notifications' },
];

export const AVATAR_ACTIONS = [
  { id: 'switch_pedagog', label: 'Byt till pedagogvy', feature: 'pedagog', role: 'dual_or_educator' },
  { id: 'subscription',   label: 'Prenumeration', href: '/settings#prenumeration', placement: 'avatar_action' },
  { id: 'settings',       href: '/settings', label: 'Inställningar' },
  { id: 'logout',         action: 'logout', label: 'Logga ut' },
];
```

### Primärnav vs capabilities — feature-gating

| Lager | Feature-gating? | Vid access-fel |
|-------|-----------------|----------------|
| `PRIMARY_NAV` | **Nej** — alla fem alltid | Visa alla flikar; innehåll i hub kan vara tomt |
| `CAPABILITIES` | **Ja** — per `feature` | Dölj placement, inte flik |
| `HEADER_ACTIONS` | Nej (notiser) | Alltid synlig klocka |

**Motivering:** `for_dig` i `component-feature-map.js` mappar till `basic_app`, men dagens `native-tab-bar.js` feature-gatar För dig med fail-closed → flik försvinner vid nätverksfel. v2 korrigerar detta.

### Filtrering (access + visibility)

```js
function visibleAtPlacement(capability, access, visibility, placement) {
  if (!capability.placements.includes(placement)) return false;
  if (!hasFeatureAccess(access, capability.feature)) return false;
  if (visibility[placement] === false) return false;
  return true;
}

function capabilitiesForPlacement(access, visibility, placement) {
  return CAPABILITIES.filter((c) => visibleAtPlacement(c, access, visibility, placement));
}
```

`access` från befintlig `/api/subscription/access`. `visibility` kan börja som `{}` (allt synligt om access finns) och utökas vid behov (t.ex. TEACCH aktivering).

### Tillgänglighet (a11y) — krav på nav-render

Befintlig `mobile-nav.js` har `role="dialog"` / `aria-expanded`. v2 ska föra vidare:

| Krav | Detalj |
|------|--------|
| Aktiv flik | `aria-current="page"` på aktiv primärnav-länk |
| Bottennav | `role="navigation"` + `aria-label="Huvudnavigering"` |
| Avatar-meny | `aria-haspopup="menu"`, fokusfälla, Escape stänger |
| Hubbar | Rubrik = `h1`, kort = fokuserbara länkar med beskrivande text |
| Tangentbord | Tab-ordning: header (notis, avatar) → innehåll → bottennav |

### Filer att **inte** omskriva

| Fil | Strategi |
|-----|----------|
| `public/js/dashboard.js` | Behåll; lägg readiness i ny `home-readiness.js` |
| `public/js/family.js` | Behåll; barnprofil i ny `child-profile.js` |
| `public/js/schedule.js` | Orörd; hub länkar in |
| `src/routes/*` | Orörd; nya sidor är tunna HTML + hub-JS |

---

## 7. Readiness / Home cards (fas 5)

Delat intelligenslager för Hem, För dig och barnprofil.

### Exempel-kort på Hem

```
⚠️ Astrid saknar PIN
[Sätt PIN]                    → /family/child/astrid#pin

⭐ 2 dagar kvar till belöning
[Visa]                        → /rewards

✨ Rekommenderat: Kvällsrutin
[Skapa]                       → /for-dig eller /planning
```

### Data (klient eller ny endpoint)

```js
// Per barn — pseudostruktur
{
  child_id,
  slug,
  stars_today: 3,
  stars_possible: 5,
  pin_set: false,
  schema_ok: true,
  rewards_ok: true,
  next_action: { label: 'Sätt PIN', href: '/family/child/astrid#pin' },
  for_you_tip: { label: 'Kvällsrutin', href: '/for-dig?intent=evening' },
}
```

Aggregering kan ske i `GET /api/family/readiness` (ny) eller via befintliga endpoints på dashboard-init.

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Gamla routes lever tills de fasas ut (redirects).

### Fas 0 — Lås arkitekturen (1–2 dagar)

| Leverans | Detalj |
|----------|--------|
| `public/js/nav-config.js` | `PRIMARY_NAV`, `CAPABILITIES`, `AVATAR_ACTIONS`, hub-definitioner |
| Koppla konsumenter | `native-tab-bar`, `parent-magic-shell`, `mobile-nav` läser config |
| **Inte** bygga om UI ännu | Bara en källa — beteende kan vara oförändrat tills fas 1 |

### Fas 1 — Nytt nav (snabb vinst)

**Från (två källor, båda måste uppdateras):**

| Källa | LEGACY idag | ROLLOUT idag |
|-------|-------------|--------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · Mer | + Extra · Mer |
| `parent-magic-shell.js` | Hem · Schema · För dig · Familj · Inställn. | + Skatt · Extra · Mer |

**Till (en `PRIMARY_NAV` för alla):**

Hem · Planering · Belöningar · För dig · Familj

Gamla routes fungerar: `/schedule`, `/library`, `/upgrade`, `/samarbete`, `/notifications`.

### Fas 2 — Hubbar

| Route | Innehåll | Strategi |
|-------|----------|----------|
| `/planning` | Tunn hub-sida | Länkar till befintliga sidor |
| `/rewards` | Tunn hub-sida | Redirect `/skattkammaren` → `/rewards` |

Ingen affärslogik flyttas.

### Fas 3 — Familj + barnprofil (största UX-lyftet)

| Leverans | Detalj |
|----------|--------|
| `/family/child/:slug` | Ny barnprofil-sida |
| Rensa `/family` | Endast barn, vuxna, pedagoger |
| Redirect | `/child-settings` → barnprofil |
| Drawer | Avvecklas till förmån för barnprofil (behåll fallback tills analytics OK) |

#### Analytics (krav i fas 3)

Stor UX-förändring — mät adoption, inte bara känsla.

**Baseline före (2 veckor eller retrospektivt):**

| Event | Syfte |
|-------|-------|
| `page_view` `/child-settings` | Gammal barninställningsväg |
| `page_view` `/skattkammaren` | Gammal belöningsväg |
| `family_drawer_open` | Drawer-användning |

**Efter lansering:**

| Event | Syfte |
|-------|-------|
| `page_view` `/family/child/:slug` | Barnprofil-adoption |
| `nav_hub_click` `planning` / `rewards` | Hub-användning vs direktlänkar |
| `readiness_action_click` | Hem-kort leder till handling |
| `child_profile_section` `schema` / `framsteg` / `pin` | Vilka sektioner används |

**Beslutskriterium:** drawer och `/child-settings` kan tas bort när barnprofil ≥ 80% av barnrelaterade sessioner i 14 dagar.

Använd befintlig `analytics_events` (`event_type` + `metadata`) — inga nya tabeller krävs för v1-mätning.

### Fas 4 — Settings-sanering

| Flytta från `/family` | Till |
|-----------------------|------|
| PIN, notiser, GDPR, data, radering | `/settings` |
| Prenumeration / köp (idag `/upgrade` Extra-flik) | `/settings#prenumeration` |
| Pedagog-växling | Avatar-meny |

### Fas 5 — Hem som coach

| Leverans | Detalj |
|----------|--------|
| `home-readiness.js` | Kort på Hem |
| Delad data | Hem + För dig + barnprofil |

### Fas 6 — Paket-placements

Lägg till `CAPABILITIES`-rader när paket går live. Ingen nav-refaktor.

### Fas 7 — Städa gammalt

| Route / mönster | Åtgärd |
|-----------------|--------|
| Extra / Mer-flikar | Ta bort från nav-config |
| `/upgrade` (direktnav) | Redirect → `/settings#prenumeration` |
| `/child-settings` | Permanent redirect |
| `/skattkammaren` (inloggad förälder) | Permanent redirect → `/rewards` (publik demo kvar) |
| Preview-shells i huvudnav | Behåll endast som intresse-banner om `rollout_mode !== off` |

---

## 9. Sprint-plan (låst ordning)

Varje sprint ska lämna appen **användbar** — inte halvfärdig nav med gamla sidor under.

### Sprint 1 — Synlig v2
- [ ] `nav-config.js` med `paths` + `activeNavItem()` + obligatoriska capability-fält
- [ ] **Båda** konsumenter förenade: `native-tab-bar` + `parent-magic-shell` + `mobile-nav` + sidebar
- [ ] Fem flikar live: Hem · Planering · Belöningar · För dig · Familj
- [ ] Header 🔔 → `/notifications` på alla ytor
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` CACHE_NAME-bump

*Leverans:* användaren ser ny mental modell direkt. Gamla routes fungerar fortfarande.

### Sprint 2 — Hubbar
- [ ] `/planning` tunn hub
- [ ] `/rewards` tunn hub
- [ ] Redirect `/skattkammaren` → `/rewards`
- [ ] `nav_hub_click` analytics

*Leverans:* slut på route-navigation som huvudmodell.

### Sprint 3 — Barnprofil (största kvalitetslyftet)
- [ ] `/family/child/:slug`
- [ ] `/family` rensad (barn, vuxna, pedagoger only)
- [ ] Redirect `/child-settings` → barnprofil
- [ ] Analytics baseline + post-launch events (§8 Fas 3)
- [ ] Drawer kvar som fallback tills mätvärden OK

### Sprint 4 — Settings & avatar
- [ ] `/settings` minimal inkl. **Prenumeration** (`billing`)
- [ ] Flytta operativt från `/family`; `/upgrade` → settings-redirect
- [ ] Avatar-meny (inställningar, logout, pedagog, prenumeration) — **native smoke**
- [ ] Språk: "PIN-kod" / "Säkerhet" — inte "föräldralås" i föräldratext
- [ ] Notiser vs App ägarskap tydliggjort (§4)

### Sprint 5 — Readiness-lager
- [ ] `home-readiness.js` (eller `/api/family/readiness`)
- [ ] Hem-kort: saknas-status, nästa steg
- [ ] För dig kopplat till samma intelligenslager
- [ ] Entréer till barnprofil från Hem och För dig

### Sprint 6+ — Paket-placements
- [ ] `CAPABILITIES` för reporting, pedagog, teacch (dolda tills live)
- [ ] Access + visibility separerat i nav-render
- [ ] Fas 7-städning (Extra/Mer borta, permanenta redirects)

---

## 10. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/skattkammaren` (inloggad förälder) | `/rewards` |
| `/skattkammaren` (utloggad / `?demo=1`) | **Oförändrad** publik demo |
| `/upgrade` | `/settings#prenumeration` |
| `/payment-success` | `/settings#prenumeration` |
| `/child-settings?id=:id` | `/family/child/:canonical` |
| `/home` (om skapad) | `/dashboard` |

Befintliga sidor (`/schedule`, `/library`, `/calendar`, `/assign-schedule`, `/for-dig`, `/reports`, `/samarbete`, `/notifications`, `/pricing-info`) behålls som **mål** för hub-länkar och capabilities.

---

## 11. Relation till befintliga specs

| Dokument | Relation |
|----------|----------|
| `paket-v1.2-spec.md` §6 | v2 **ersätter** fem-fliks-förslaget Idag/Rutiner/Utveckling/Samarbete med domänmodell + placements; pedagog-nav oförändrat |
| `for-dig-spec.md` | För dig förblir `/for-dig` men rollen utökas till coach-lager (§2) |
| `informationsarkitektur-barnapp.md` | Parallell doc för barnsidan; vuxenmeny v2 är föräldrarnas spegel |

---

## 12. Checklista innan merge (per sprint)

- [ ] Alla nav-konsumenter läser `nav-config.js` (inkl. **båda** native + magic)
- [ ] `PRIMARY_NAV` har `paths`; `activeNavItem()` testad på undersidor
- [ ] Inga kärnflikar feature-gatade (`for_dig` utan `feature` på primärnav)
- [ ] Varje `CAPABILITY` har `id`, `feature`, `domain`, `placements`
- [ ] Billing: `/settings#prenumeration` + redirect `/upgrade`
- [ ] `/notifications` via header; `/samarbete` via capability — inte Mer/Extra
- [ ] Rewards-hub: **ingen** länk till `/skattkammaren`; basic tom-state definierad
- [ ] Barnprofil: slug/id-strategi beslutad; `deep-link-router.js` id→canonical
- [ ] Ren `educator` ser inte föräldraflikar; `PEDAGOG_PRIMARY_NAV` separat
- [ ] Avatar-meny nåbar på **native** (logout/settings)
- [ ] a11y: `aria-current` på aktiv flik, avatar-meny tangentbord
- [ ] Access och visibility inte sammanslagna i en boolean
- [ ] Inga tomma hub-ytor för basic-användare (gated items dolda, inte disabled)
- [ ] Barnrelaterade flows nåbara via barnprofil
- [ ] `session-gate.js` inkluderar nya parent-only paths
- [ ] Analytics-events tillagda vid UX-förändring (Sprint 3+)
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Manuell smoke: desktop sidebar, mobil webb, native tab bar, magic view
- [ ] Ingen omskrivning av `/schedule`, `/library`, `/reports` (non-goal §0)

---

## 13. Ägarskap efter migration

| Parent intent | Äger |
|---------------|------|
| Daglig överblick | Hem |
| Planera vardag | Planering |
| Stjärnor & belöningar | Belöningar |
| Coach & rekommendationer | För dig |
| Personer i hushållet | Familj |
| **Ett barns hela värld** | **Barnprofil** (kanonisk väg för allt barnrelaterat) |
| Utveckling över tid | Framsteg (domän under barnprofil) |
| Konto & säkerhet | Inställningar / avatar |
| Prenumeration & köp | Inställningar → Prenumeration (`billing`) |
| Notis-inkorg | Header 🔔 → `/notifications` |
| Pedagogsamarbete (info) | Familj / För dig capability → `/samarbete` |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Barnprofilen är navets viktigaste objekt; hubbar och Hem är entréer, inte ägare.

---

## 14. Granskningslogg (2026-06-21)

Kodbasavstämning mot `origin/main`. Åtgärdade brister:

| # | Brist | Åtgärd i detta doc |
|---|-------|-------------------|
| A1 | Ingen billing-hemvist | `billing`-domän, `/settings#prenumeration`, redirects `/upgrade` |
| A2 | `/samarbete`, `/notifications` utan placering | Capabilities + header 🔔 |
| A3 | Rewards-hub loop via `/skattkammaren` | Hub pekar på `/library`; redirect endast för gamla bokmärken |
| B4 | `PRIMARY_NAV` saknar `paths` | `paths` + `activeNavItem()` i §6 |
| B5 | `for_dig` feature-gatad på primärnav | `feature: null` på kärnflikar |
| B6 | Felaktig "Från"-beskrivning i Fas 1 | Två källor LEGACY/ROLLOUT tabell |
| C7–8 | Slug + deep links underspecificerade | §4 barnprofil + Sprint 3-krav |
| D9 | Ren educator ospecificerad | §4.1 — `/pedagog-oversikt`, separat nav |
| E10–14 | Avatar native, push-dubbel, a11y, ikon, tomma states | §4, §6, §12 |

========================================================================
KÄLLA: vuxenmeny-v2-operations-checklist.md
========================================================================

# Vuxenmeny v2 — Operations-checklist (implementation blueprint v2.1)

> **Syfte:** Komplett operationskarta kopplad till v2-menyn — vad användaren ska kunna göra, var det bor, hur det byggs, och vad som är must-have vs senare.
>
> **Relaterat:** [`vuxenmeny-v2.md`](./vuxenmeny-v2.md) · [`barnmeny-v2.md`](./barnmeny-v2.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Status:** Implementation blueprint v2.1 · 2026-06-21
>
> **Princip (oförändrad):** v2 flyttar **placering och ägarskap** — inte affärslogik. Befintliga routes och API:er återanvänds. Inga omskrivningar av `daily-log.js`, `schedule.js`, rewards-API (non-goal).

---

## Kolumnförklaring

| Kolumn | Betydelse |
|--------|-----------|
| **Pri** | `P0` = måste finnas i första användbara v2-leveransen · `P1` = bör finnas i första releasen · `P2` = efter launch / fallback OK · `Later` = placement reserverad, ej första implementation |
| **Mode** | `move` = flytta/länka/redirect · `compose` = ny hub/wrapper runt befintlig funktion · `build` = ny UI-komponent · `api` = backend krävs · kombinationer t.ex. `compose+build` |
| **Primary** | Source of truth / primär operativ yta |
| **Secondary** | Övriga godkända entréer (minsta antal enligt v2-regel) |
| **Sprint** | Första sprint där raden ska vara klar (enligt [`vuxenmeny-v2.md` §9](./vuxenmeny-v2.md)) |

---

## Menyöversikt v2

```
HEADER:  🔔 Notiser                    👤 Avatar → Inställningar / Logga ut
─────────────────────────────────────────────────────────────────────────
BOTTON/SIDEBAR (alltid samma fem):
  🏠 Hem  |  📅 Planering  |  🎁 Belöningar  |  ✨ För dig  |  👨‍👩‍👧 Familj
─────────────────────────────────────────────────────────────────────────
DJUP:    /family/child/:id  (barnprofil — kanonisk väg för allt barnrelaterat)
SIDOR:   /daily-log, /schedule, /library … (oförändrade, nås via hub eller direkt)
```

---

## Informationsmodeller (låsta beslut som saknades i v2.0)

### A. Förälderns "Att hantera" (action center)

**Inte en ny flik** — en informationsmodell som samma items kan renderas på flera placements.

| Item-typ | Trigger | Primary placement | Secondary |
|----------|---------|-------------------|-----------|
| Väntande inlösning | `pending redemptions` | Hem → Kräver åtgärd | Belöningar-hub, barnprofil → Belöningar |
| Väntande måländring | `pending goal change` | Hem → Kräver åtgärd | Belöningar-hub, barnprofil → Belöningar |
| Barn pausat idag | `today_is_paused` | Hem barnkort | Daglig logg, barnprofil → Översikt |
| Saknar schema idag | `no daily_log` | Hem readiness (P2) | Barnprofil → Schema |
| Saknar PIN | `pin_set === false` | Hem readiness (P2) | Barnprofil → Setup |
| Backfill-behov | `incomplete past days` (P2) | Hem readiness | För dig coach, notis |
| Väntande medförälder-inbjudan | `pending invite` | Familj → Vuxna | Hem CTA |
| Systemmeddelande | admin message | Hem banner | Notiser |

**Implementation:** `home-action-center.js` (ny, P2) läser befintliga API:er — ingen ny domänlogik.

### B. Live parenting vs admin/editing

| Kategori | Exempel | Primary yta |
|----------|---------|-------------|
| **Live parenting** (mitt i dagen, 1–2 tryck) | Pausa dag, bocka av, ge extra stjärnor, bump-tid, dela schema | Hem snabbåtgärder, daglig logg |
| **Editing** (planera veckan) | Lägg till aktivitet, kopiera dag, mallar | `/schedule`, bibliotek |
| **Setup** (sällan) | PIN, vy-läge, reward visibility, foto | Barnprofil → Setup |
| **Historik** (bakåtblick) | Stjärnhistorik, rapporter, vecka | Barnprofil → Framsteg |

**Hem ska alltid exponera live parenting-kontroller** (P0). Schema-redigering ska **inte** dupliceras inline på Hem (deprecated: inbäddad editor → länk).

### C. Progress stack (historik/framsteg)

| Lager | Äger | Innehåll |
|-------|------|----------|
| **Hem** | Teaser | Senaste veckan, varningar, "Se utveckling →" |
| **Belöningar-hub** | Reward-historik | Stjärnor, inlösen, familjekista, museum |
| **Barnprofil → Framsteg** | **Primär** per barn | Stjärnor över tid, pauser, manuella stjärnor, mål, basic historik |
| **Rapporter** | Export/delning | Professionell rapport, aktivitetsvy, observationer |

### D. Setup state machine (förälder, ofullständig familj)

| State | Hem visar | Primary CTA |
|-------|-----------|---------------|
| Inga barn | Tom-state | Lägg till barn |
| Barn, inget schema | Readiness | Skapa schema (Planering / För dig) |
| Schema, inga belöningar | Readiness | Skapa belöning (Belöningar-hub) |
| Belöningar, ingen PIN | Readiness | Sätt PIN (barnprofil Setup) |
| Barnvy ej testad | Aktiveringsprogram | Öppna barnvy |
| Ingen medförälder | CTA (valfritt) | Bjud in |
| Notiser av | Readiness (P2) | Aktivera i Inställningar |

---

## Barnprofil — routing & ownership (låst)

### URL-strategi

| Beslut | Val |
|--------|-----|
| **Kanonisk URL** | `/family/child/:id` (`child_id` UUID — stabilt för push/deep links) |
| **Visningsalias** | Barnnamn som rubrik; slug som valfritt alias i UI (ej i URL v1) |
| **Sektioner** | Query param `?tab=` — **inte** subroutes i v1 |
| **Deep links** | `/child-settings?id=` → `/family/child/:id?tab=setup` |

### Tillåtna `?tab=`-värden

| `tab` | Rubrik | Ownership | Innehållstyp |
|-------|--------|-----------|--------------|
| `overview` | Översikt | **inline** | Status idag, paus, stjärnor, snabbåtgärder (B9), senaste aktivitet |
| `log` | Daglig logg | **link** | CTA → `/daily-log?childId=&date=` (sidan oförändrad) |
| `schema` | Schema | **hybrid** | Veckosammanfattning inline + CTA → `/schedule?child=` |
| `rewards` | Belöningar | **inline** | Extra stjärnor, mål, pending approvals, synlighet — modaler återanvänder `family.js`/`dashboard.js` |
| `progress` | Framsteg | **hybrid** | Stjärnhistorik inline (basic) + länk → `/reports` (gated) |
| `setup` | Barnets inställningar | **inline** | PIN, vy, mood, minimal UI, foto, reward visibility — migrerar från `child-settings.js` |
| `child-view` | Barnvy | **link** | Handoff → barnläge |

**Regel:** Inline = data/actions utan sidbyte. Link = befintlig route. Hybrid = summary + CTA.

### Barnprofil — tre nivåer (informationsmodell)

```
A. Operativt idag     → tab overview + snabbåtgärder + länk log
B. Belöningar & framsteg → tab rewards + tab progress
C. Barnets setup      → tab setup + tab child-view
```

---

## Legacy / fallback / deprecation

| Legacy-yta | Status i v2 | Regel | Sprint |
|------------|-------------|-------|--------|
| Family drawer | **Fallback** | Kvar tills barnprofil parity ≥ 80 % sessioner i 14 dagar | 3→7 |
| `/child-settings` | **Redirect** | → `/family/child/:id?tab=setup` | 3 |
| `/skattkammaren` (inloggad förälder) | **Redirect** | → `/rewards` | 2 |
| `/skattkammaren` (publik/demo) | **Oförändrad** | `?demo=1` / utloggad | — |
| `/upgrade` | **Redirect** | → `/settings#prenumeration` | 4 |
| Family: GDPR/push/delete | **Removed** | Endast `/settings` — får ej återintroduceras på `/family` | 4 |
| Dashboard inbäddad schemaeditor | **Deprecated** | Ersätts av länk → `/schedule?child=` | 3 |
| Magic vs native olika nav | **Removed** | En `nav-config.js` | 1 |
| Mer / Extra bottenflikar | **Removed** | Capabilities + avatar | 6+ |
| `child-package-nav` 2-flik (barn) | **Removed** | `child-worlds.js` (barnmeny v2) | barn sprint |

---

# Föräldraoperationer

## 🏠 Hem

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| H1 | Översikt per barn (status, paus, stjärnor) | P0 | compose | Hem barnkort | Barnprofil → overview | 1 | `GET /api/family/dashboard-stats` |
| H2 | Markera aktivitet klar/ångra (åt barnet) | P0 | move | Daglig logg | Hem expand, barnprofil → log-länk | 1 | `PUT …/complete\|uncomplete` |
| H3 | Pausa dag / återuppta | P0 | move | Daglig logg | Hem snabbknapp, barnprofil overview | 1 | `PUT …/pause\|unpause` |
| H4 | Ge extra stjärnor | P0 | move | Barnprofil → rewards | Hem snabbknapp, Belöningar-hub | 3 | `POST /api/rewards/manual-stars` |
| H5 | Fyll i i efterhand (backfill) | P0 | move | Daglig logg (datumväljare) | Hem snabbknapp, Planering-hub | 1 | navigering |
| H6 | Engångsaktivitet | P0 | move | `/schedule` once-task | Hem snabbknapp, barnprofil overview | 1 | `POST …/once-tasks` |
| H7 | Godkänn/neka inlösning | P0 | move | Belöningar-hub | Hem "Kräver åtgärd", barnprofil rewards | 2 | `PUT …/redemptions/…` |
| H8 | Godkänn/neka måländring | P0 | move | Belöningar-hub | Hem "Kräver åtgärd", barnprofil rewards | 2 | `PUT …/goal-change-requests/…` |
| H9 | Stjärnhistorik (vecka) | P1 | move | Barnprofil → progress | Hem sektion (teaser) | 3 | `GET /api/family/star-history` |
| H10 | Dela dagens schema | P1 | move | Hem expand | Daglig logg | 2 | `Platform.share` |
| H11 | Barnet loggar in (handoff) | P0 | move | Hem handoff-kort | Barnprofil → child-view | 1 | auth childFlow |
| H12 | Lägg till barn | P0 | move | Familj | Hem tom-state | 1 | `POST /api/children` |
| H13 | Bjud in medförälder | P1 | move | Familj → Vuxna | Hem CTA, För dig | 3 | `POST /api/family/invite` |
| H14 | Readiness-varningar (PIN, schema, …) | P2 | api+build | Hem "Kräver åtgärd" | För dig coach | 5 | `GET /api/family/readiness` (ny) |
| H15 | Aktiveringsprogram (dag 1–7) | P1 | move | Hem banner | För dig | 1 | activation-program API |
| H16 | Systemmeddelanden | P1 | move | Hem banner | Notiser | 1 | `/api/messages/*` |
| H17 | Dagens nyhet | P2 | move | Hem banner | — | 2 | dagens-nyhet API |
| H18 | Inbäddad schemaeditor | P0 | **deprecate** | `/schedule?child=` | — | 3 | schedule APIs |
| H19 | Veckans framsteg / statistik | P1 | compose | Hem diagram | Barnprofil progress | 2 | dashboard-stats |
| H20 | Aktiv delningsrapport | P2 | move | Hem banner | Rapporter | 2 | reports |
| **PX1** | **"Kräver åtgärd"-sektion** (aggregerad action center) | P2 | build | Hem topp | Notiser, hubs | 5 | befintliga APIs |
| **PX2** | **Bump-tid +15/+30** (live parenting) | P1 | move | Daglig logg | Hem snabbknapp (P2) | 2 | bump-time API |
| **PX3** | **"Vem behöver mig nu?"** (flerbarns-prioritering) | P2 | compose | Hem sortering | — | 5 | dashboard-stats |
| **PX4** | **Filter: bara barn med varningar** | P2 | build | Hem | — | 5 | readiness |

---

## 📅 Planering

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| P1 | Daglig logg (hela sidan) | P0 | move | `/daily-log` | Planering-hub, Hem H5 | 2 | daily-log |
| P2 | Välj barn i logg | P0 | move | Daglig logg | — | 1 | children |
| P3 | Navigera datum | P0 | move | Daglig logg | — | 1 | `?date=` |
| P4 | Markera klar / ångra | P0 | move | Daglig logg | Hem H2 | 1 | complete |
| P5 | Markera hel sektion klar | P1 | move | Daglig logg | — | 1 | bulk toggle |
| P6 | Pausa/återaktivera dag | P0 | move | Daglig logg | Hem H3, barnprofil | 1 | pause |
| P7 | Justera tid (+15/+30) | P1 | move | Daglig logg | Hem PX2 | 1 | bump-time |
| P8 | Flytta/ordna om aktivitet | P1 | move | Daglig logg | Schema | 1 | reorder |
| P9 | Föräldrabetyg | P1 | move | Daglig logg | Barnprofil progress | 1 | rate |
| P10 | Skriv ut dag/vecka | P2 | move | Daglig logg | — | 2 | print |
| P11 | Veckoschema (editor) | P0 | move | `/schedule` | Planering-hub, barnprofil schema | 2 | schedule |
| P12 | Lägg till/redigera/radera aktivitet | P0 | move | `/schedule` | Bibliotek | 1 | activities |
| P13 | Engångsaktivitet | P0 | move | `/schedule` | Hem H6 | 1 | once-tasks |
| P14 | Återkommande / flera dagar | P0 | move | Schema modal | — | 1 | schedule items |
| P15 | Kopiera dag | P1 | move | Schema | — | 1 | copy-day |
| P16 | Kopiera till syskon | P1 | move | Schema | — | 2 | copy-to-child |
| P17 | Byt dag (swap) | P2 | move | Schema | — | 2 | swap-day |
| P18 | Ta bort hel dag | P1 | move | Schema | — | 1 | DELETE schedule |
| P19 | Infoga schema-mall | P1 | move | Schema | Barnprofil schema | 1 | templates |
| P20 | Familjescheman | P1 | move | Schema + bibliotek | — | 2 | schedule-templates |
| P21 | Specialdagar | P1 | move | Schema | — | 2 | special-days |
| P22 | Tilldela schema | P1 | move | `/assign-schedule` | Planering-hub | 2 | assign |
| P23 | Kalender | P1 | move | `/calendar` | Planering-hub | 2 | calendar |
| P24 | Aktiviteter CRUD | P0 | move | `/library` | Planering-hub | 2 | activities |
| P25 | Kategorier | P1 | move | Bibliotek | — | 2 | categories |
| P26 | Delsteg | P0 | move | Bibliotek modal | — | 1 | sub-steps |
| P27 | 7 frågor / TEACCH-redigering | Later | move | Bibliotek | `/barn-stod` | 6+ | teacch |
| P28 | Kopiera standardbibliotek | P1 | move | Bibliotek Standard | — | 2 | standard-library |
| P29 | TEACCH / Extra stöd (info) | Later | move | Planering-hub (gated) | För dig | 6+ | subscription |
| **PX5** | **Engångsaktivitet till flera barn** | P2 | build | Schema | — | 6+ | once-tasks × N |
| **PX6** | **Pausa alla barns dag** | P2 | api+build | Hem | Familj | 6+ | batch pause |
| **PX7** | **Hoppa över aktivitet idag** (live) | P2 | build | Daglig logg | Hem | 5 | daily-log item |

---

## 🎁 Belöningar

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| R1 | Belöningshub | P0 | compose | `/rewards` hub | — | 2 | — |
| R2 | Hantera belöningar CRUD | P0 | move | `/library` Belöningar | Belöningar-hub | 2 | rewards |
| R3 | Ordna/favoritmarkera | P1 | move | Bibliotek | — | 2 | reorder |
| R4 | Kopiera standardbelöningar | P1 | move | Bibliotek | — | 2 | standard-library |
| R5 | Visa/dölj per barn | P0 | move | Barnprofil → setup/rewards | Bibliotek | 3 | visibility |
| R6 | Sätt målbelöning | P0 | move | Barnprofil → rewards | Family drawer (fallback) | 3 | goals |
| R7 | Ge extra stjärnor | P0 | move | Barnprofil → rewards | Hem H4, hub | 3 | manual-stars |
| R8 | Godkänn inlösning / måländring | P0 | move | Belöningar-hub | Hem H7/H8, barnprofil | 2 | redemptions |
| R9 | Familjekista på/av | P1 | move | Inställningar / hub | — | 4 | family settings |
| R10 | Familjemuseum | P2 | move | Belöningar-hub | Familj (tills rensad) | 3 | museum |
| R11 | Föräldervy skattkammaren | P1 | move | Belöningar-hub | `/skattkammaren-parent` | 2 | child-view |
| R12 | Utveckling över tid | P1 | move | Barnprofil → progress | Belöningar-hub länk | 3 | reports/basic |
| R13 | Stjärnhistorik | P1 | move | Barnprofil → progress | Hem teaser | 3 | star-history |
| **PX8** | **Pending redemptions alla barn** | P1 | compose | Belöningar-hub topp | Hem action center | 2 | pending-requests |
| **PX9** | **Ge bonus till flera barn** | P2 | build | Hem / Familj | — | 6+ | manual-stars × N |
| **PX10** | **Dölj belöning för flera barn** | P2 | build | Bibliotek | — | 6+ | rewards bulk |

---

## ✨ För dig

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| F1 | Bläddra mål/rekommendationer | P0 | move | `/for-dig` | — | 1 | for-dig goals |
| F2 | Aktivera mål | P1 | move | För dig | Hem/För dig-kort | 1 | activate |
| F3 | Favoritmarkera mål | P2 | move | För dig | — | 2 | favorites |
| F4 | Feedback / förslag | P2 | move | För dig | — | 2 | feedback |
| F5 | Utfallsbanner | P2 | move | Global | För dig | 2 | feedback |
| F6 | Paketcoach (pedagog, TEACCH, rapporter) | P1 | move | För dig-kort | Hubs (gated) | 2 | subscription |
| F7 | Bjud in medförälder (coach) | P1 | move | Familj | Hem H13 | 3 | invite |
| F8 | Bygg schema (rekommendation) | P1 | move | För dig → Planering | Barnprofil schema | 2 | navigering |

---

## 👨‍👩‍👧 Familj

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint | API |
|----|-----------|-----|------|---------|-----------|--------|-----|
| M1 | Lista barn → profil | P0 | compose | Familj → barnprofil | Hem kort | 3 | children |
| M2 | Lägg till barn | P0 | move | Familj | Hem H12 | 1 | POST children |
| M3 | Omsortera barn | P2 | move | Familj | — | 3 | reorder |
| M4 | Lista vuxna | P0 | move | Familj | — | 3 | members |
| M5 | Bjud in medförälder | P1 | move | Familj | Hem | 3 | invite |
| M6 | Skanna QR | P2 | move | Familj | — | 4 | invite |
| M7 | Återkalla inbjudan | P1 | move | Familj | — | 3 | DELETE invite |
| M8 | Medlemsroll / barnkoppling | P1 | move | Familj | — | 3 | members |
| M9 | Ta bort barn/vuxen | P1 | move | Familj | — | 3 | DELETE |
| M10 | Spara familjenamn | P2 | move | Familj | — | 3 | PUT family |
| M11 | Pedagoger (intresse) | Later | move | Familj-sektion | För dig, `/samarbete` | 6+ | pedagog |
| M12 | Familjemuseum widget | P2 | move | Belöningar-hub | Familj (tills flytt) | 3 | museum |

---

## 🌟 Barnprofil `/family/child/:id`

| ID | Sektion (`?tab=`) | Pri | Mode | Ownership | Primary actions inline | Sprint |
|----|-------------------|-----|------|-----------|------------------------|--------|
| B1 | `overview` | P0 | compose+build | inline | Status, paus, stjärnor idag | 3 |
| B2 | `schema` | P0 | hybrid | summary + link | Veckodagsöversikt → `/schedule?child=` | 3 |
| B3 | `log` | P0 | link | link | CTA → `/daily-log?childId=` | 3 |
| B4 | `rewards` | P0 | inline | inline | Extra stjärnor, mål, approve/deny, synlighet | 3 |
| B5 | `progress` | P1 | hybrid | inline + link | Veckodiagram + länk `/reports` | 3 |
| B6 | `child-view` | P0 | link | link | Handoff barnläge | 3 |
| B7 | `setup` (PIN) | P0 | inline | inline | Sätt/ändra/lås upp PIN | 3 |
| B8 | `setup` (övrigt) | P0 | inline | inline | Vy, mood, minimal UI, foto, visibility | 3 |
| **B9** | **Snabbåtgärder på overview** | **P0** | **build** | **inline** | Pausa · Extra stjärnor · Backfill · Engångsaktivitet | **3** |

---

## 👤 Inställningar / 🔔 Header

| ID | Operation | Pri | Mode | Primary | Secondary | Sprint |
|----|-----------|-----|------|---------|-----------|--------|
| S1 | Inställningar | P0 | move | Avatar | — | 4 |
| S2 | Prenumeration | P1 | move | Inställningar | Avatar | 4 |
| S3 | Förälder-PIN | P1 | move | Inställningar | — | 4 |
| S4 | Konto | P0 | move | Inställningar | — | 4 |
| S5 | Notiser (preferenser) | P1 | move | Inställningar | — | 4 |
| S6 | App (push/PWA) | P1 | move | Inställningar | — | 4 |
| S7 | Veckopåminnelse | P2 | move | Inställningar | — | 4 |
| S8 | Nyhetsbrev | P2 | move | Inställningar | — | 4 |
| S9 | Mörkt läge | P1 | move | Inställningar | — | 4 |
| S10 | Exportera data | P1 | move | Inställningar | — | 4 |
| S11 | Radera konto | P1 | move | Inställningar | — | 4 |
| S12 | Byt pedagogvy | Later | move | Avatar | — | 6+ |
| S13 | Logga ut | P0 | move | Avatar | Sidebar (desktop) | 1 |
| N1 | Notislista | P0 | move | Header 🔔 | `/notifications` | 1 |
| N2 | Markera läst | P1 | move | Notiser | — | 1 |

---

## Capabilities (ej primärflik)

| ID | Operation | Pri | Feature | Placement | Route | Sprint |
|----|-----------|-----|---------|-----------|-------|--------|
| C1 | Rapporter | P1 | `reporting` | barnprofil progress, rewards_hub, home_card | `/reports` | 3+ |
| C2 | Pedagoganteckningar | Later | `pedagoganteckningar` | barnprofil (framtida) | `/pedagog-note` | 6+ |
| C3 | Samarbete (läsa) | Later | `pedagog` | family, for_you_card | `/samarbete` | 6+ |
| C4 | TEACCH / barn-stöd | Later | `teacch` | planning_hub | `/barn-stod` | 6+ |
| C5 | Paketpreview / intresse | P1 | rollout | for_you_card, hub tom-states | `/upgrade` → settings | 2 |
| C6 | Prisinfo | P2 | — | for_you_card | `/pricing-info` | 2 |

---

# Barnoperationer (barnmeny v2)

Kopplat till [`barnmeny-v2.md`](./barnmeny-v2.md). API oförändrat.

## Befintliga (låsta i v2)

| ID | Operation | Pri | Värld | Mode | Primary | Sprint |
|----|-----------|-----|-------|------|---------|--------|
| K1 | Bocka av aktivitet | P0 | ☀️ Idag | move | Idag NU-kort | barn S2 |
| K2 | Delsteg (visa steg) | P0 | ☀️ Idag | move | Idag (adaptivt stöd) | barn S2 |
| K3 | Mood-rating | P0 | ☀️ Idag | move | Efter aktivitet | barn S2 |
| K4 | TEACCH NU-overlay | P1 | ☀️ Idag | move | Fullskärm overlay | barn S3 |
| K5 | Se stjärnor / mål | P0 | 🏰 Min värld | move | Min värld | barn S2 |
| K6 | Universum / rum / husdjur | P1 | 🏰 Min värld | move | Min värld | barn S2 |
| K7 | Lösa in belöning | P0 | 🏰 Min värld | move | Min värld | barn S2 |
| K8 | Se manuella stjärnor | P0 | 🏰 Min värld | move | Min värld (Stjärnfronten) | barn S2 |
| K9 | Se personer (familj) | P0 | ❤️ Mina personer | compose | Personkort | barn S3 |
| K10 | System (byt barn, logout, tema) | P0 | 🔒 Vuxenikon | build | Parental Gate | barn S2 |
| K11 | Presentation (classic/magic tema) | P1 | alla | move | Förälder styr i setup | barn S3 |

## Saknade / ska förtydligas (nya rader)

| ID | Operation | Pri | Värld | Beskrivning | Sprint |
|----|-----------|-----|-------|-------------|--------|
| **KX1** | **Idag: NU vs hela dagen** | P0 | Idag | Default = NU/NÄSTA/SEN; expandera "visa hela dagen" | barn S2 |
| **KX2** | **Visa pausad dag** | P0 | Idag | Tydlig "Ledig idag"-state när förälder pausat | barn S2 |
| **KX3** | **Visa ny/flyttad aktivitet** | P1 | Idag | Toast/badge när förälder lagt till eller bumpat | barn S3 |
| **KX4** | **Feedback: extra stjärnor** | P0 | Min värld | Stjärnfronten + kort animation | barn S2 |
| **KX5** | **Målprogress** | P0 | Min värld | "X av Y stjärnor till [mål]" alltid synlig | barn S2 |
| **KX6** | **Pending inlösning** | P1 | Min värld | "Väntar på godkännande" — inte dold | barn S3 |
| **KX7** | **Avslaget mål/inlösning** | P2 | Min värld | Barnvänlig förklaring (förälder nekat) | barn S4 |
| **KX8** | **Be om belöning / måländring** | P1 | Min värld | Befintlig flow, tydlig CTA | barn S2 |
| **KX9** | **Coach-loop efter aktivitet** | P1 | Idag | Kort "Bra jobbat!" → nästa steg | barn S3 |
| **KX10** | **Adaptivt stöd (sammanhållet)** | P1 | Idag | NU/NÄSTA, delsteg, minimal UI, TEACCH — en `child-support-layer` | barn S3 |
| **KX11** | **Mina personer: vad kan jag göra?** | P1 | Mina personer | Se personer; ev. "vem hjälpte idag" (P2) | barn S3 |
| **KX12** | **Byt barn på delad enhet** | P0 | Vuxenikon | Parental Gate — aldrig fri i nav | barn S2 |

### Barnets agency (vad barnet får påverka)

| Tillåtet | Ej tillåtet |
|----------|---------------|
| Bocka av, delsteg, mood | Pausa dag, backfill, extra stjärnor |
| Be om belöning/måländring | Schema-redigering |
| Välja avatar/rum/husdjur (unlock) | Byt barn utan gate |
| (P2) "Behöver hjälp" / "Gör senare" | Inställningar, logout utan gate |

---

## Sprintordning (sammanfattning)

| Sprint | Förälder — must deliver (P0) | Barn (parallellt) |
|--------|------------------------------|-------------------|
| **1** | Fem flikar, `nav-config.js`, Hem kort, daglig logg/schema routes, avatar logout, notiser | — |
| **2** | Planering-hub, Belöningar-hub, `/skattkammaren` redirect, pending approvals i hub | — |
| **3** | Barnprofil alla P0-tabs + **B9 snabbåtgärder**, family rensad, child-settings redirect | `child-worlds.js`, tre världar, Idag default |
| **4** | Settings/avatar komplett, family GDPR bort | Parental Gate |
| **5** | Readiness H14, action center PX1, Hem live parenting PX2 | Coach-loop KX9, ändringsfeedback KX3 |
| **6+** | Capabilities Later, Mer/Extra borta, flerbarn PX5–PX10 | Min värld polish, KX6–KX7 |

---

## PR-granskningschecklista

```
□ Pri P0-rad utan implementation → blockerande
□ Varje P0 har Primary entry implementerad
□ Varje P0 med Secondary har minst en sekundär entré (utom deprecate-rader)
□ Ingen ny affärslogik i hub-filer (endast länkar + compose)
□ Barnprofil B9 snabbåtgärder finns (P0 Sprint 3)
□ /child-settings → /family/child/:id?tab=setup
□ /skattkammaren (förälder) → /rewards
□ Family utan GDPR/push/delete
□ Drawer fallback tills 80 % barnprofil-adoption
□ nav-config: native-tab-bar + parent-magic-shell + sidebar + mobile-nav
□ Header 🔔 + avatar på native (logout smoke)
□ Inga capabilities som nya primärflikar
□ daily-log.js, schedule.js, rewards-API orörda (non-goal)
□ CACHE_NAME bump i sw.js
□ Analytics: nav_hub_click, child_profile_section, readiness_action_click (Sprint 3+)
```

---

## Relation till andra dokument

| Dokument | Denna checklist |
|----------|-----------------|
| `vuxenmeny-v2.md` | Arkitektur + sprint — denna fil är **operations + acceptance** |
| `barnmeny-v2.md` | Barn-K/KX-rader kompletterar barn-världar |
| `component-feature-map.js` | Feature-gating för C-rader |

*Uppdatera denna fil när nya operationer läggs till — lägg alltid Pri, Mode, Primary/Secondary.*

========================================================================
KÄLLA: informationsarkitektur-barnapp.md
========================================================================

# Informationsarkitektur — barnapp

> **Syfte:** Teamreferens för design, backend och test. Styr var funktioner *bor*, inte bara var de *finns*.
>
> **Engineering:** [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md)
>
> **Senast uppdaterad:** 2026-06-10 · **Branch:** `main`

---

## 1. Produktprincip (en rad som styr allt)

| Lager | Roll | Fråga det svarar på |
|-------|------|---------------------|
| **Idag** | Handling | *Vad gör jag nu?* |
| **Skattkammaren** | Mening | *Varför gör jag det?* |
| **Familj** | Relation | *Vad gör vi tillsammans?* |

**Designregel:** Idag skapar handling. Skattkammaren skapar känsla. Familj skapar samarbete.

Om Idag börjar skapa känsla → den blir rörig.  
Om Skattkammaren börjar kräva handling → den blir svag.

---

## 2. Systemöversikt (nu vs vision)

### LIVE på `main`

| Komponent | Status | Kod / API |
|-----------|--------|-----------|
| 🟡 **Idag** (quest layer) | ⚠️ Delvis | `child-today-focus.js`, `child-dashboard-warmth.js` |
| 🌈 **Skattkammaren** (game loop) | ✅ Klar | `child-skatt-house.js` + universe-moduler |
| 👤 **Barnprofil** | ✅ Klar | `child`, `avatar_url`, `avatar_config` |
| 🏛️ **Museum** (bakåtblick) | ✅ Grund | `GET /api/family/museum`, `child-museum.js` |
| 🎮 **Avatar / husdjur / samlingar** | ✅ Delvis | `child_universe` migration, `/api/me/universe` |
| ⚙️ **Profil / system** | ✅ Klar | Inställningar, notiser, familj |

### VISION (ej byggd)

| Komponent | Status | Notering |
|-----------|--------|----------|
| 🏡 **Familjehallen** (nav) | ✅ Live | `child-family-hall.js`, `GET /api/me/family` |
| 🎯 **Familjeprojekt** | ❌ | Delmål från alla medlemmar |
| ⭐ **Familjestjärnor** | ❌ | Auto-aggregat från barnaktivitet |
| 📖 **Familjens berättelse** | ❌ | Gemensam narrativ historik |
| 🧭 **Vuxenbidrag** | ❌ | Middag, saga, utflykt — inte jobb |

---

## 3. Mental karta (hela appen)

```
🏠 APPEN
│
├── 🟡 IDAG (HANDLING)
│   ├── 🎯 Dagens uppdrag          [PRIMÄR]
│   ├── 🎁 Dagens belöning/⭐      [sekundär, per aktivitet]
│   ├── 🎯 Långsiktigt mål        [kompakt teaser]
│   └── 🚪 CTA → Skattkammaren     [sekundär]
│
├── 🌈 SKATTKAMMAREN (MENING)
│   ├── 🏰 Universum (hus + rum)
│   ├── ⭐ Stjärnkista
│   ├── 🏆 Troférum
│   ├── 🎁 Belöningshylla + Butik
│   ├── 📚 Historiebok
│   ├── 🧸 Samlingar
│   ├── 🐾 Husdjur
│   ├── 🧑 Avatar
│   └── 🏛️ Museum
│
├── 👨‍👩‍👧 FAMILJ (FRAMTID)
│   ├── 🏡 Familjehallen (nav)
│   ├── 🎯 Familjeprojekt
│   ├── ⭐ Familjeskista
│   ├── 📖 Familjens berättelse
│   └── 🧭 Vuxenbidrag
│
├── ⚙️ PROFIL / SYSTEM
│   ├── 👤 Barnprofil
│   ├── 👨‍👩‍👧 Familjekoppling
│   ├── 🔔 Notiser
│   └── ⚙️ Inställningar
│
└── 🔄 DATAFLÖDE
    ├── aktivitet klar → +⭐ barn
    ├── stjärnor → unlocks → universum
    ├── historik → museum + berättelse
    └── (framtid) aktivitet → +⭐ familj → familjeprojekt
```

---

## 4. 🟡 IDAG — specifikation (action layer)

### Syfte

Barnet ska veta **exakt vad de ska göra nu** — inom 3 sekunder.

### Ska innehålla

| Element | Prioritet | Live? |
|---------|-----------|-------|
| Max 3–5 aktiviteter (checklist) | Primär | ⚠️ Hela schemat visas |
| Tydlig dagprogress (`3 av 5 klara`) | Primär | ✅ |
| Liten belöning per aktivitet (`+3 ⭐`) | Sekundär | ❌ |
| Kompakt långsiktigt mål (`47/150`) | Sekundär | ✅ |
| CTA "Gå till Skattkammaren" | Sekundär | ✅ |

### Ska INTE innehålla

| Element | Live? | Åtgärd |
|---------|-------|--------|
| Veckokalender | ⚠️ Dold i DOM | Ta bort eller flytta till "Andra dagar" |
| Full historik | ✅ Borta från Idag | — |
| Detaljerad statistik / saldo-box | ✅ Dolt | — |
| Stora dashboards / progressring i header | ⚠️ Synlig | **Minimera header** |
| Konkurrerande UI-sektioner | ⚠️ Delvis | Fortsätt förenkla |

### UI-regel

> **En skärm = en primär handling.**

Primär handling = bocka av nästa uppdrag.  
Allt annat är sekundärt eller borta.

### Filer

- `public/js/child-today-focus.js`
- `public/css/child-today-focus.css`
- `public/js/child-dashboard-warmth.js` (narrativ historik → hör hemma i Skattkammaren)

---

## 5. 🌈 SKATTKAMMAREN — spec (meaning layer)

### Syfte

Barnet ska förstå **varför** de gör saker och känna progression över tid.

### Innehåller (live)

| Rum | Fil / API | Unlock-villkor |
|-----|-----------|----------------|
| 🏰 Universum (hubb) | `child-skatt-house.js` | Alltid |
| ⭐ Stjärnkista | `child-skatt-house.js` | Alltid |
| 🎯 Drömvägg (mål) | `renderSkattkammaren` | Alltid |
| 🛍️ Butiken | `renderSkattkammaren` | Alltid |
| 🏆 Troférum | `child-achievements.js` | 10⭐ livstid |
| 🎁 Belöningshylla | `child-skatt-house.js` | 10⭐ livstid |
| 🧑 Avatar | `child-avatar.js` | 15⭐ livstid |
| 🗂️ Samlingar | `child-collections.js` | 30⭐ livstid |
| 📖 Historiebok | `child-dashboard-warmth.js` | 30⭐ livstid |
| 🐾 Husdjur | `child-pet.js` | 50⭐ livstid |
| 🏛️ Museum | `child-museum.js` | 100⭐ livstid |

**Teman:** 🏰 Slott (0⭐) · 🌳 Trädkoja (75⭐) · 🚀 Rymden (150⭐)

### Regler

- Ingen *"vad ska jag göra nu"*
- Ingen checklist-fokus
- Ingen primär CTA
- Allt är explorativt

### Filer

- `public/js/child-skatt-house.js` — hubb + navigation
- `public/js/child-universe-client.js` — API-klient
- `src/lib/universe-engine.js` — unlocks + progression
- `src/routes/child-universe.js` — `/api/me/universe`
- `migrations/1800000000000_child_universe.js`

---

## 6. 👨‍👩‍👧 FAMILY LAYER (ej byggd)

### Syfte

Göra individuell motivation till **gemensam riktning**.

### Komponenter (plan)

| Komponent | Beskrivning |
|-----------|-------------|
| 🏡 **Familjehallen** | Appens framtida nav — det enda rum alla går in i |
| 🎯 **Familjeprojekt** | t.ex. "Liseberg" med delmål per familjemedlem |
| ⭐ **Familjeskista** | Auto-aggregat: barnaktivitet → `+1` familj (barnet gör inget extra) |
| 📖 **Familjens berättelse** | Gemensam narrativ historik (inte statistik) |
| 🧭 **Vuxenbidrag** | Middag, saga, planerad utflykt — **inte** jobb |

### Viktig regel

> **Familj = berättelse, inte ekonomi.**

Testa med prototyp innan migration. Se testprinciper §8.

### Vad som finns idag (inte Familjehallen)

- `GET /api/family/museum` — livstidsstatistik (aktiviteter, belöningar, stjärnor)
- `public/js/family-museum.js` — kort på `/family`
- Barnets museum-rum — per-barn statistik + årsberättelse

Detta är **bakåtblick**, inte *"vi sparar tillsammans"*.

---

## 7. 🔄 Dataflöde (source of truth)

### Live

```
aktivitet klar (daily_log_item.completed)
    → +⭐ barn (star_value)
    → stjärnsaldo (getStarBalance)
    → unlocks (universe-engine.syncUnlocks)
        → rum låses upp (house_config.unlocked_rooms)
        → prestationer (child_achievement)
        → samlarföremål (child_collectible)
    → historik (reward_redemption)
        → historiebok (narrativ)
        → museum (statistik)
```

### Planerat (Familj-lager)

```
aktivitet klar
    → +⭐ barn (oförändrat)
    → +1 ⭐ familj (auto, ingen UI för barnet)

vuxenbidrag (middag, saga, utflykt)
    → +⭐ familj (endast familj, inte personligt)

familjestjärnor
    → driver familjeprojekt-progress
    → INTE separat "ekonomi" i barnets UI
```

---

## 8. Design-konflikter att undvika

### ❌ Fel

| Konflikt | Varför det skadar |
|----------|-------------------|
| Idag + Skattkammaren båda känns som "hem" | Barn vet inte var de ska börja |
| För många siffror i Idag | Systemkänsla, inte quest |
| Progression på 3 ställen | Samma info, olika vikt = förvirring |
| Kalender konkurrerar med uppdrag | Vuxenlogik i barnyta |

### ✅ Rätt

| Princip | Implementation |
|---------|----------------|
| Idag = startpunkt | Default-flik, quest först |
| Skattkammaren = destination | Utforskning, belöning efter handling |
| Familj = relation (overlay) | Framtida nav ovanpå, inte ny flik |

---

## 9. Testprinciper

### 5-sekundersregeln

Visa **Idag**-skärmen i 5 sekunder. Fråga:

> *"Vad ska du göra här?"*

**Utan** att barnet sett Skattkammaren.

| Svar | Tolkning |
|------|----------|
| "Göra uppdrag" / "Bocka av" / pekar på aktivitet | ✅ Bra |
| "Klicka på saker" | ⚠️ Okej |
| "Titta på stjärnor" | ❌ För mycket progression i Idag |
| "Gå till skattkammaren" | ❌ Idag är inte tydlig nog |
| "Vet inte" / "många saker" | ❌ För komplex |

### Framgångskriterier

- *"Göra uppdrag"* > *"titta runt"*
- Ingen scroll innan förståelse
- Uppdrag klickas inom 10 sekunder

### Familjehallen (innan bygg)

Testa prototyp med frågor:

- *Vems stjärnor är detta?*
- *Hur får familjen fler stjärnor?*
- *Känns det som samarbete?* (förälder)
- *Förstår barnet skillnaden?* (förälder)

---

## 10. Roadmap (prioriterad)

```
✅ 1. Skattkammaruniversum (per barn)          — LIVE
✅ 2. Förenklad Idag-vy (PR #107)              — LIVE, ej färdig quest layer
⏳ 3. 5-sekunderstest (3–5 barn)
⏳ 4. Idag v2 (header bort, 3–5 uppdrag, +⭐ per rad)
⏳ 5. Prototyp Familjehallen (Figma, ingen backend)
⏳ 6. Familjetest (5–10 familjer)
⏳ 7. Familjelager (migration + UX)
```

**Bygg INTE före test:** Familjehallen, dubbel valuta, fler samlingar, husdjursfeatures.

---

## 11. Viktigaste insikt

Ni bygger inte en barnapp med belöningar.

Ni bygger ett system där:

```
handling  →  mening  →  relation
  (Idag)    (Skattkammaren)   (Familj)
```

**Live idag:**

| Lager | Mognad |
|-------|--------|
| Mening (Skattkammaren) | ~85 % |
| Handling (Idag) | ~60 % |
| Relation (Familj) | ~5 % |

Problemet är inte för få features — det är **otydliga hem** för det ni redan har.

---

## 12. Referenser i kodbasen

| Område | Filer |
|--------|-------|
| Idag-fokus | `public/js/child-today-focus.js` |
| Skattkammare | `public/js/child-skatt-house.js` |
| Universe API | `src/routes/child-universe.js`, `db/child-universe.js` |
| Museum (förälder) | `public/js/family-museum.js` |
| Feature flag | `skattkammar_universum` i `scripts/seed-features.js` |
| Barnvy warmth | `public/js/child-dashboard-warmth.js` |

---

*Detta dokument ska uppdateras när Idag v2 eller Familjelagret byggs — inte vid varje liten UI-tweak.*

========================================================================
KÄLLA: separation-contract-barnapp.md
========================================================================

# Separation contract — barnapp (Today / Universe / Family)

> **Syfte:** Hårda gränser för UI, routing och dataägande. Varje system äger exakt en mental modell. Ingen skärm får blanda modeller.
>
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) (produkt) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) (implementation)
>
> **Senast uppdaterad:** 2026-06-10

---

## 1. Kärnprincip (HARD RULE)

Varje system äger **exakt en mental modell**. Ingen skärm får blanda modeller.

| System | Mental modell | En rad |
|--------|---------------|--------|
| **Today** | *Vad ska jag göra nu?* | **Doing** |
| **Universe** | *Vad har jag blivit / samlat / låst upp?* | **Becoming** |
| **Family** | *Vad bygger vi tillsammans?* | **Belonging** |

---

## 2. UI-separation (visuellt kontrakt)

### 🟡 TODAY — Action UI

**Mental modell:** *"Vad ska jag göra nu?"*

**UI-ägande:**
- Tasks (enda primära ytan)
- Minimal progress
- Minimal målvisning
- 1 CTA till Skattkammaren

**❌ FÅR INTE FINNAS I TODAY:**
- stjärnrum
- samlingar
- avatar
- hus
- historik
- kalender
- statistik dashboards
- familjelogik

**✅ ENDA DATA SOM FÅR SYNAS:**
- `today.tasks[]`
- `today.progress`
- `today.goal_preview` (1 rad)

**UI-struktur:**

```
[Header: minimal]
Hej Astrid

[Goal]
🎯 47 / 150 ⭐

[Primary action zone]
☐ Task 1
☐ Task 2
☐ Task 3

[Secondary]
💎 Skattkammaren
```

### 🌈 SKATTKAMMAREN — Meaning UI

**Mental modell:** *"Vad har jag blivit / samlat / låst upp?"*

**UI-ägande:**
- alla progression system
- alla belöningar
- alla rum
- avatar + pet
- samlingar
- historik
- museum

**❌ FÅR INTE FINNAS:**
- tasks
- deadlines
- "vad ska jag göra idag"
- checklist UI

**Struktur:**

```
🏠 House (hub)
 ├── ⭐ Star Chest
 ├── 🏆 Trophy Room
 ├── 🧸 Collections
 ├── 🧑 Avatar Room
 ├── 🐾 Pet Room
 ├── 📖 Story Book
 └── 🏛 Museum
```

**Regel:** Allt är retrospektivt eller kosmetisk progression — **inte** actionable.

### 🏡 FAMILY — Relationship UI (V0)

**Mental modell:** *"Vad bygger vi tillsammans?"*

**UI-ägande:**
- familjeprojekt
- familjeberättelse
- familjesamling (skattkista)
- gemensamma mål

**❌ FÅR INTE FINNAS:**
- individuella stjärnor UI
- barn vs vuxen XP-jämförelse
- daily tasks
- universe rooms
- gamified grind

**Struktur:**

```
🏡 Family Hall
 ├── 🎯 Family Projects
 ├── ⭐ Family Chest (auto-aggregate)
 └── 📖 Family Story
```

---

## 3. Routing-separation (EXTREM VIKTIG)

### Routes (HARD BOUNDARIES)

```
/
 ├── /today        → ACTION SYSTEM
 ├── /universe     → PROGRESSION SYSTEM
 ├── /family       → RELATIONSHIP SYSTEM
 └── /profile      → SETTINGS
```

**Nuvarande implementation (interim):** `child-dashboard.html` med tab-state (`schedule` = Today, `rewards` = Universe). Mål: React Router med ovanstående paths.

### 🚫 Cross-routing forbidden

| Förbjudet | Exempel |
|-----------|---------|
| Today visar universe-data | Rum, samlingar, avatar i Idag-vyn |
| Universe visar tasks | Checklista i Skattkammaren |
| Family visar daily checklist | Uppdrag i Familjehallen |

### ✅ Endast tillåtet flöde

```
TODAY → (action completes) → EVENT → UNIVERSE UPDATE

UNIVERSE → no influence on TODAY UI

FAMILY → only aggregates from events
```

---

## 4. Ownership model (data authority)

### 🟡 TODAY OWNER

**Source of truth:**
- `daily_tasks` / `daily_log_item`
- completion state
- daily progress

**ONLY writes:**
- activity completion
- daily logs

### 🌈 UNIVERSE OWNER

**Source of truth:**
- stars (child)
- unlocks
- rooms
- collectibles
- avatar
- pets

**ONLY writes:**
- progression state
- unlock events
- cosmetic state

### 🏡 FAMILY OWNER

**Source of truth:**
- aggregated contributions
- family projects
- story events

**ONLY writes:**
- family events (derived)
- project progress (aggregated)

---

## 5. Event flow (enforced architecture)

### Single source event model

```typescript
interface ActivityCompletedEvent {
  type: 'ActivityCompleted';
  itemId: string;
  childId: string;
  starValue: number;
  completedAt: string;
  unlockEvents?: UnlockEvent[];  // from server, future
}
```

**Triggers:**
- Today updates (task state) — via `loadDay` refresh
- Universe updates (+stars, unlocks) — via `ChildUniverse.invalidate()`
- Family updates (future aggregation)

### 🚫 Rule

**No system may directly mutate another system's state. Only events.**

Implementation (vanilla JS interim): `ChildEventBus.emit('ActivityCompleted', payload)` in `child-event-bus.js`. Listeners subscribe per layer.

---

## 6. Component ownership matrix

| Component | Owns | Cannot touch |
|-----------|------|--------------|
| `TodayPage` / `ChildTodayFocus` + `ChildTodayTasks` | tasks, progress, goal teaser | universe, family |
| `UniversePage` / `ChildSkattHouse` | progression, rooms, avatar | tasks, family |
| `FamilyPage` / `FamilyMuseum` | shared narrative, aggregates | tasks, progression grind |

---

## 7. Review checklist (PR / lint)

```diff
+ Today shows ≤5 actionable tasks in focus mode
+ Today has RewardTeaser (+N ⭐) per incomplete task
+ Today hides header progress ring, calendar, history
+ Completion emits ActivityCompletedEvent
+ Universe listens to event (invalidate cache)
- Today imports or renders universe rooms
- Universe renders task checklist
- Family shows per-child star leaderboard
- Direct cross-store mutation without event
```

---

## 8. Implementation status (`main`)

| Contract item | Status | Kod |
|---------------|--------|-----|
| Today focus header | ✅ | `child-today-focus.js` |
| Task cap 3–5 | ✅ | `child-today-tasks.js` |
| RewardTeaser | ✅ | `child-today-tasks.js` |
| Hide header ring | ✅ | `child-today-focus.css` |
| ActivityCompletedEvent | ✅ | `child-event-bus.js` |
| 3-root bottom nav | ⚠️ | 2 tabs idag; Family V0 ej live |
| `/today` `/universe` routes | ⚠️ | Tab-state; React Phase 5 |
| Family Hall V0 (event-sourced, live) | ✅ | `family_event` + `GET /api/me/family` (all families) |

---

## 9. One-line summary

**3 system, 3 UI:s, 3 hjärnor:**

| Today | Universe | Family |
|-------|----------|--------|
| Doing | Becoming | Belonging |

---

*Detta dokument är det formella kontraktet. Produktkontext: [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md). Implementation: [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md).*

========================================================================
KÄLLA: engineering-architecture-barnapp.md
========================================================================

# Engineering architecture — barnapp (Today / Universe / Family)

> **Syfte:** Implementation-grade system design. Styr frontend ownership, API-gränser, dataflöde och migration.
>
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) (produkt) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) (hårda gränser) · [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md) (fasplan) · **[`architecture-platform.md`](./architecture-platform.md)** (Core Platform — övergripande)
>
> **Senast uppdaterad:** 2026-06-10

---

## 0. Stack reality vs target

| | **Nu (`main`)** | **Target** |
|--|-----------------|------------|
| Frontend | Express static HTML + vanilla JS modules (`public/js/`) | React SPA (Capacitor shell) |
| Routing | Multi-page + tab state in `child-dashboard.js` | React Router, 3 root routes |
| State | Module globals + `ChildUniverse` cache | Zustand stores + TanStack Query |
| Backend | Express route modules (`src/routes/`) | Same Express API, realigned namespaces |

**Regel:** All ny barn-logik i **små moduler** tills React-migration. Ingen ny logik i `child-dashboard.js` (>25k tokens).

---

## 1. System model (3 engines)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TODAY          │     │  UNIVERSE        │     │  FAMILY         │
│  behavior       │────▶│  reward          │────▶│  memory         │
│  engine         │     │  engine          │     │  engine         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
   tasks → complete       stars → unlocks          aggregates → story
```

| Engine | Layer | Owns | Must NOT own |
|--------|-------|------|--------------|
| **Today** | Action | Tasks, daily progress, quest CTA | Universe rooms, collectibles, family projects |
| **Universe** | Meaning | Stars, rooms, avatar, pet, history | Task checklist, family aggregation |
| **Family** | Relation | Projects, family chest, shared story | Individual XP comparison, task execution |

---

## 2. Target frontend structure (React)

```
src/app/
├── layout/
│   ├── AppShell.tsx
│   └── Navigation.tsx          # 3 roots only
│
├── today/                      # 🟡 ACTION LAYER
│   ├── TodayPage.tsx
│   └── components/
│       ├── TodayHeader.tsx
│       ├── TaskList.tsx
│       ├── TaskItem.tsx
│       ├── GoalSummary.tsx     # compact teaser only
│       ├── RewardTeaser.tsx    # "+3 ⭐ when done"
│       └── QuestCTA.tsx        # → /universe
│
├── universe/                   # 🌈 MEANING LAYER
│   ├── UniversePage.tsx
│   ├── house/
│   │   ├── HouseView.tsx
│   │   └── RoomRouter.tsx
│   └── rooms/
│       ├── StarChest.tsx
│       ├── TrophyRoom.tsx
│       ├── CollectionRoom.tsx
│       ├── AvatarRoom.tsx
│       ├── PetRoom.tsx
│       ├── StoryBook.tsx
│       ├── MuseumRoom.tsx
│       ├── DreamWall.tsx       # goals
│       └── ShopRoom.tsx
│
├── family/                     # 🏡 RELATION LAYER (V0)
│   ├── FamilyPage.tsx
│   ├── FamilyHall.tsx
│   ├── FamilyProjects.tsx      # mock / read-only V0
│   ├── FamilyChest.tsx
│   └── FamilyStory.tsx
│
├── profile/
│   └── ProfilePage.tsx
│
└── shared/
    ├── components/
    ├── hooks/
    └── lib/
```

### Navigation model (non-negotiable)

```
BOTTOM NAV — exactly 3 roots:

  🟡 Idag          →  /today
  🌈 Skattkammaren →  /universe
  🏡 Familj        →  /family
```

**Forbidden entry points:** calendar as root, dashboard shortcuts to universe stats, duplicate "home" screens.

---

## 3. Current codebase mapping (vanilla JS → target)

### Today layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `TodayPage` | `public/child-dashboard.html` + `child-dashboard.js` | ⚠️ Monolith — split ongoing |
| `TodayHeader` / `GoalSummary` | `child-today-focus.js` | ✅ |
| `TaskList` / `TaskItem` | `child-dashboard.js` → `renderActivities()` | ⚠️ In monolith |
| `RewardTeaser` | — | ❌ Not built |
| `QuestCTA` | `child-today-focus.js` → `#ctfSkattBtn` | ✅ |
| Warmth / narrative | `child-dashboard-warmth.js` | ✅ → belongs in Universe `StoryBook` |

### Universe layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `UniversePage` / `HouseView` | `child-skatt-house.js` | ✅ |
| `RoomRouter` | `ChildSkattHouse.showRoom()` | ✅ |
| `StarChest` | `renderChestRoom()` | ✅ |
| `TrophyRoom` | `child-achievements.js` | ✅ |
| `CollectionRoom` | `child-collections.js` | ✅ |
| `AvatarRoom` | `child-avatar.js` | ✅ |
| `PetRoom` | `child-pet.js` | ✅ |
| `StoryBook` | `child-dashboard-warmth.js` (historik) | ✅ |
| `MuseumRoom` | `child-museum.js` | ✅ |
| `DreamWall` / `ShopRoom` | `child-dashboard.js` → `renderSkattkammaren()` | ⚠️ Legacy HTML in monolith |
| API client | `child-universe-client.js` | ✅ |

### Family layer

| Target (React) | Current file | Status |
|----------------|--------------|--------|
| `FamilyPage` | — | ❌ |
| `FamilyHall` | — | ❌ Prototype only |
| `FamilyChest` / `FamilyProjects` | — | ❌ |
| `FamilyStory` | `family-museum.js` (parent `/family`) | ⚠️ Stats only, not narrative |
| API | `GET /api/family/museum` | ✅ Read-only |

### Profile / system

| Target | Current |
|--------|---------|
| `ProfilePage` | `child-settings.html`, `settings.html`, `family.html` |
| SSE sync | `child-dashboard-sse.js` |
| Auth | `auth.js`, `child-login.js` |

---

## 4. React component tree (runtime)

```
<App />
 └── <AppShell />
      ├── <Navigation />           # Today | Universe | Family
      └── <Routes />
           │
           ├── /today
           │    └── <TodayPage>
           │         ├── <TodayHeader />
           │         ├── <GoalSummary />      # max 1 line goal
           │         ├── <TaskList>
           │         │    └── <TaskItem />*   # max 3–5 visible
           │         ├── <RewardTeaser />     # per-task ⭐ hint
           │         └── <QuestCTA />         # secondary only
           │
           ├── /universe
           │    └── <UniversePage>
           │         └── <HouseView>
           │              └── <RoomRouter>
           │                   ├── <StarChest />
           │                   ├── <TrophyRoom />
           │                   ├── <CollectionRoom />
           │                   ├── <AvatarRoom />
           │                   ├── <PetRoom />
           │                   ├── <StoryBook />
           │                   ├── <MuseumRoom />
           │                   ├── <DreamWall />
           │                   └── <ShopRoom />
           │
           ├── /family
           │    └── <FamilyPage>
           │         └── <FamilyHall>
           │              ├── <FamilyProjects />   # V0: mock
           │              ├── <FamilyChest />       # V0: read-only aggregate
           │              └── <FamilyStory />
           │
           └── /profile
                └── <ProfilePage />
```

### Component responsibility rules

#### `TodayPage`

```typescript
// ALLOWED imports
import { useTodayStore } from '@/stores/todayStore';
import { completeTask } from '@/api/today';

// FORBIDDEN imports
// ❌ useUniverseStore
// ❌ useFamilyStore
// ❌ room unlock UI
```

- **Only:** what to do NOW
- **State:** `tasks`, `progress`, `minimalGoal`
- **Forbidden:** universe data, family data, collectibles, history

#### `UniversePage`

- **Only:** progression over time
- **State:** stars, rooms, collectibles, avatar, pet, history
- **Forbidden:** tasks, daily checklist, family projects

#### `FamilyPage`

- **Only:** shared narrative
- **State:** projects, story, family chest (aggregate)
- **Forbidden:** individual XP comparison, task execution, daily flow

---

## 5. State ownership

### Target (React)

```typescript
// stores/todayStore.ts
interface TodayStore {
  tasks: Task[];
  completed: number;
  total: number;
  minimalGoal: GoalTeaser | null;
  completeTask: (id: string) => Promise<CompleteResult>;
}

// stores/universeStore.ts
interface UniverseStore {
  house: HouseConfig;
  rooms: RoomId[];
  avatar: AvatarConfig;
  pet: Pet | null;
  collectibles: Collectible[];
  achievements: Achievement[];
  refresh: () => Promise<void>;
}

// stores/familyStore.ts  (V0: read-only)
interface FamilyStore {
  museum: FamilyMuseumStats | null;
  projects: FamilyProject[];  // mock until Phase 4
  chestTotal: number;         // 0 until Phase 3 backend
}
```

**TanStack Query** for server state; Zustand for UI-local + optimistic updates.

### Current (vanilla JS interim)

| Store (target) | Current equivalent |
|----------------|-------------------|
| `todayStore` | `child-dashboard.js` globals + `ChildTodayFocus` |
| `universeStore` | `ChildUniverse` cache (`child-universe-client.js`) |
| `familyStore` | `FamilyMuseum.mount()` one-shot fetch |

**Rule:** `ChildUniverse.invalidate()` after task complete; never read universe in Today render path.

---

## 6. Data flow

### Core loop (target contract)

```
TaskItem.onComplete()
    │
    ▼
POST /api/today/activity/:id/complete    ← target namespace
    │  (today: PUT /api/me/daily-log-items/:id/complete)
    ▼
Response {
  childStarsDelta: number;
  familyStarsDelta?: number;      // Phase 3+, omitted in V0
  unlockEvents?: UnlockEvent[];   // Phase 1+
  today: { completed, total };
  universe?: UniversePatch;       // optional inline refresh
}
    │
    ├──▶ todayStore.apply(result)
    ├──▶ universeStore.applyUnlocks(result.unlockEvents)
    └──▶ familyStore.applyAggregate(result.familyStarsDelta)  // future
```

### Architectural rules

| Rule | Meaning |
|------|---------|
| **No cross-layer UI mixing** | Today never shows room unlock modals |
| **Data flows upward only** | `tasks → universe`; universe does not drive Today layout |
| **Family aggregates only** | Family never shows per-child leaderboards |
| **One screen = one mental model** | See informationsarkitektur §8 |

---

## 7. Backend structure

### Target API namespaces

```
/api/today/                         # ACTION (child)
  GET  /today                       # tasks + progress + minimal goal
  POST /activity/:id/complete       # single completion endpoint

/api/universe/                      # MEANING (child) — alias of /api/me today
  GET  /me/universe
  PATCH /me/avatar
  PATCH /me/house
  POST /me/pet

/api/family/                        # RELATION (parent + child read)
  GET  /family
  GET  /family/museum
  GET  /family/projects             # Phase 4
  POST /family/event                # Phase 4 — disabled V0
```

### Current API (live mapping)

| Target | Current endpoint | File |
|--------|------------------|------|
| `GET /today` | `GET /api/me/daily-log?date=` | `daily-logs.js` |
| `POST /activity/complete` | `PUT /api/me/daily-log-items/:id/complete` | `daily-logs.js` |
| `GET /universe` | `GET /api/me/universe` | `child-universe.js` |
| `PATCH /avatar` | `PATCH /api/me/avatar` | `child-universe.js` |
| `PATCH /house` | `PATCH /api/me/house` | `child-universe.js` |
| `POST /pet` | `POST /api/me/pet` | `child-universe.js` |
| `GET /family/museum` | `GET /api/family/museum` | `child-universe.js` |
| Goals | `GET /api/me/goal` | `goals.js` |
| Rewards shop | `GET /api/me/rewards` | `rewards.js` |

### Refactor plan (backend)

1. **Phase 1:** Add `GET /api/today` aggregator (wraps daily-log + goal teaser) — no breaking change
2. **Phase 2:** Add `unlockEvents[]` to completion response (from `universe-engine.syncUnlocks`)
3. **Phase 3:** Add `family_stars` column + delta in completion response (feature-flagged)
4. **Phase 4:** `family_projects`, `family_contributions` tables + CRUD

---

## 8. Domain model (database)

### Live tables

```sql
-- ACTION
child
daily_log / daily_log_item
child_reward_goal
manual_star_grant

-- MEANING
child.avatar_config JSONB
child.house_config JSONB
achievement_definition / child_achievement
collectible_catalog / child_collectible
child_pet

-- RELATION (minimal)
family
-- GET /api/family/museum computes aggregates from daily_log_item + reward_redemption
```

### Future tables (Phase 3–4)

```sql
-- family_star_balance on family (aggregate, not per-child economy)
ALTER TABLE family ADD COLUMN family_star_balance INTEGER DEFAULT 0;

family_project (
  id, family_id, title, icon, target_stars,
  status, created_at
);

family_project_milestone (
  id, project_id, label, assignee_type,  -- 'child'|'parent'
  assignee_id, completed_at
);

family_contribution (
  id, family_id, parent_id, type,       -- 'dinner'|'story'|'outing'
  stars_granted, created_at
);

family_event (           -- narrative log
  id, family_id, event_type, payload JSONB, created_at
);
```

### Source of truth

| Data | Owner table | Read by |
|------|-------------|---------|
| Task completion | `daily_log_item.completed` | Today |
| Child star balance | computed (`getStarBalance`) | Universe |
| Room unlocks | `child.house_config` + `universe-engine` | Universe |
| Achievements | `child_achievement` | Universe |
| Family stats | computed aggregate | Family museum |

---

## 9. Feature flags

Registered in `features` + gated via `family_features` / `featureAccess()`.

| Slug | Default | Phase | Meaning |
|------|---------|-------|---------|
| `skattkammar_universum` | `live` | — | Universe layer enabled |
| `familjehallen_v0` | `live` | 2 | Family tab + read-only hall UI (all families) |
| `familjeprojekt` | `off` | 4 | Family projects gameplay |
| `dual_currency` | `off` | 3 | Family stars in completion response |
| `vuxenbidrag` | `off` | 4 | Parent contribution events |

**V0 rule:** Familjehallen V0 is `live` for all families. Child UI is read-only; parent creates projects via API.

---

## 10. Migration plan (safe deployment)

### Phase 1 — NOW (vanilla JS)

- [x] Universe modularized (`child-skatt-house.js` + rooms)
- [x] Today focus header (`child-today-focus.js`)
- [x] Extract `TaskList` hooks → `child-today-tasks.js`
- [x] Add `RewardTeaser` per task (`+N ⭐`)
- [x] Hide header progress ring on Today
- [x] Cap visible tasks to 5 (quest log mode)
- [x] Event bus (`child-event-bus.js`) + `ActivityCompletedEvent`
- [x] Layer router (`child-layer-router.js`) + `/today` `/universe` `/family`
- [x] Family shell V0 (`child-family-hall.js`, flag `familjehallen_v0`)
- [ ] 5-second user test

### Phase 2 — Family read-only

- [ ] `FamilyPage` shell (parent: extend `family-museum.js`; child: new tab or gated)
- [ ] `FamilyHall` static mock (projects UI, no backend)
- [x] Familjehallen `live` for all families

### Phase 3 — Family aggregation (backend only)

- [ ] `family_star_balance` + trigger on child completion
- [ ] Flag `dual_currency` — response field only, no child UI
- [ ] Monitor in admin/analytics

### Phase 4 — Family Hall V0 UI

- [ ] Enable after family user tests pass
- [ ] `family_projects` migration
- [ ] Family chest visible to children (single number, no dual-currency explanation)

### Phase 5 — React migration (optional, parallel)

- [ ] Scaffold `src/app/` with Capacitor
- [ ] Port `child-skatt-house` → `UniversePage` first (strongest layer)
- [ ] Port `child-today-focus` → `TodayPage`
- [ ] Deprecate `child-dashboard.js` monolith last

---

## 11. Forbidden patterns (lint / review checklist)

```diff
- TodayPage imports universeStore
- UniversePage renders TaskList
- FamilyPage shows child star balances side-by-side
- completion handler updates only todayStore (must invalidate universe)
- new feature logic added to child-dashboard.js (>50 lines)
- calendar widget on Today default view
- third "home" tab or duplicate Skattkammaren entry
```

---

## 12. File ownership (who edits what)

| Change type | Allowed files |
|-------------|---------------|
| Today UX | `child-today-*.js`, `child-today-focus.css` |
| Universe room | `child-{room}.js`, `child-skatt-house.js` |
| Universe API | `src/routes/child-universe.js`, `src/lib/universe-engine.js` |
| Family V0 | `family-museum.js`, `src/routes/family*.js` |
| **Do not touch** | `child-dashboard.js` except 1-line hooks |
| SW cache bump | `public/sw.js` on any frontend change |

---

## 13. Success metrics (engineering)

| Metric | Target |
|--------|--------|
| Today bundle hooks in monolith | ≤ 10 call sites |
| Cross-layer imports (when React) | 0 |
| Task complete → universe refresh | < 500ms p95 |
| Feature flag coverage (family) | 100% of new family UI |
| 5-second test pass rate | > 80% children answer "göra uppdrag" |

---

*Detta dokument uppdateras vid Phase-övergångar. Produktregler: [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md).*

========================================================================
KÄLLA: implementation-plan-3-layers.md
========================================================================

# Implementation plan — 3-layers architecture refactor

> **Syfte:** Cursor execution plan för Today / Universe / Family separation.
>
> **Kontrakt:** [`separation-contract-barnapp.md`](./separation-contract-barnapp.md)
>
> **Senast uppdaterad:** 2026-06-10

---

## Global rules (alla faser)

- Never mix Today (Action), Universe (Progression), Family (Relationship)
- No cross-imports between layers
- Routes: `/today` · `/universe` · `/family` (→ `child-dashboard#layer`)
- If unsure → **disable UI, not delete logic**

---

## Fas 1 — Clean Today layer ✅

**Goal:** Today = pure action screen.

| Task | Status | Kod |
|------|--------|-----|
| Hide calendar, progress ring, stats | ✅ | `child-today-focus.js`, `.today-focus-mode` CSS |
| TodayHeader + GoalSummary (1 line) | ✅ | `child-today-focus.js` |
| TaskList max 5 | ✅ | `child-today-tasks.js` |
| RewardTeaser (+N ⭐) | ✅ | `child-today-tasks.js` |
| QuestCTA (bottom) | ✅ | `child-today-tasks.js` |

**Test checklist:**
- [x] Automated: `test/three-layer-separation.test.js` (Phase 1 suite)
- [ ] Manual: User sees ONLY tasks + minimal goal
- [ ] Manual: 5-sec test: "What do you do here?" → "do tasks"

---

## Fas 2 — Universe isolation ✅ (interim)

**Goal:** Skattkammaren self-contained.

| Task | Status | Kod |
|------|--------|-----|
| Route isolation | ✅ | `child-layer-router.js`, `#universe` hash |
| House + rooms structure | ✅ | `child-skatt-house.js` + room modules |
| Progression UI in universe only | ✅ | `renderSkattkammaren`, universe tab |
| No tasks in universe | ✅ | Route guards hide `#scheduleView` |

**Test checklist:**
- [x] Automated: `test/three-layer-separation.test.js` (Phase 2 suite)
- [ ] Manual: Star balance only visible in universe tab

---

## Fas 3 — Family V0 (event-sourced, real) ✅

**Goal:** Event-sourced family memory — real persistence, zero child UI writes.

| Task | Status | Kod |
|------|--------|-----|
| `/family` route | ✅ | `index.js` redirect + `#family` hash |
| DB tables | ✅ | `family_project`, `family_event`, `family_chest` |
| GET `/api/me/family` | ✅ | `src/routes/family-hall.js` |
| Event-driven writes | ✅ | `family-event-engine.js` ← activity completion |
| UI from API only | ✅ | `child-family-client.js` + `child-family-hall.js` |
| Parent project create | ✅ | `POST /api/family/projects` (parent only) |
| Live for all families | ✅ | `familjehallen_v0` status `live`, no per-family assign |

**Test checklist:**
- [x] Automated: `test/three-layer-separation.test.js` + `test/family-hall.test.js`
- [ ] Manual: Complete task → story + chest update (all families)

---

## Fas 4 — Event pipe ✅ (client interim)

**Goal:** Single event coupling point.

| Task | Status | Kod |
|------|--------|-----|
| `ActivityCompletedEvent` model | ✅ | `child-event-bus.js` |
| Emit on task complete | ✅ | `child-dashboard.js` hook |
| Universe handler (invalidate) | ✅ | `child-event-bus.js` listener |
| No direct cross-writes | ✅ | Today → event → Universe cache |

**Future:** Server-side event handler returning `unlockEvents[]` in completion response.

---

## Fas 5 — Navigation hardening ✅ (interim)

**Goal:** Lock mental model in UI.

| Task | Status | Kod |
|------|--------|-----|
| 3-tab bottom nav | ✅ | Idag · Skattkammaren · Familj |
| Route guards | ✅ | `child-layer-router.js`, CSS `[data-child-layer]` |
| Path aliases | ✅ | `/today`, `/universe`, `/family` |

**Remaining (React Phase 5):** True React Router, remove tab-state monolith.

---

## Final acceptance criteria

| Criterion | Status |
|-----------|--------|
| Each screen explainable in one sentence | ⚠️ User test pending |
| No UI element in more than one layer | ✅ Enforced via guards |
| Removing Family does not break Today/Universe | ✅ |
| Removing Universe does not break Today | ✅ |
| Event bus is only coupling point | ✅ Client-side |

---

## File map (new modules)

| Layer | Files |
|-------|-------|
| Contract | `docs/separation-contract-barnapp.md` |
| Router | `child-layer-router.js` |
| Today | `child-today-focus.js`, `child-today-tasks.js` |
| Universe | `child-skatt-house.js`, room modules |
| Family | `child-family-hall.js` |
| Events | `child-event-bus.js` |

---

*One line: **Doing / Becoming / Belonging** — coupled only by events.*

========================================================================
KÄLLA: magic-view-rollout.md
========================================================================

# Magic view — sidkartläggning och rollout

Senast uppdaterad: 2026-06-19

## Prod-status

Magic-växlare (Klassisk / Ny design) är **globalt aktiverad** för alla familjer via `magic_view_enabled` i `/api/auth/me`.

| Env | Effekt |
|-----|--------|
| *(standard)* | Alla familjer ser växlaren |
| `MAGIC_VIEW_DISABLED=true` | Nödstopp — ingen magic |
| `MAGIC_VIEW_PREVIEW_ONLY=true` | Begränsa till `MAGIC_VIEW_ALLOWLIST` |

Feature-flaggor i admin (`parent_home_magic`, `ny_barnvy`) är satta till `live` i seed.

---

## Föräldrasidor — magic-täckning

### ✅ Magic på alla live-sidor

| Sida | Route | Hur |
|------|-------|-----|
| Dashboard | `/dashboard` | `ParentMagicShell` + home-hub |
| Daglig logg | `/daily-log` | bootstrap + hero |
| Veckoschema | `/schedule` | shell + hero |
| Kalender | `/calendar` | platform-inject + auto |
| Aktiviteter | `/activities` | platform-inject + auto |
| Tilldela schema | `/assign-schedule` | platform-inject + auto |
| För dig | `/for-dig` | bootstrap + hero |
| Familj | `/family` | shell + hero |
| Inställningar | `/settings` | grupperad magic-meny |
| Bibliotek | `/library` | `LibraryMagicHub` |
| Skattkammaren | `/skattkammaren` | bootstrap + hero |
| Barninställningar | `/child-settings` | platform-inject + auto |
| Notiser | `/notifications` | platform-inject + auto |

`/family-week` redirectar 301 → `/schedule?view=family` (magic via schema-sidan).

`platform-html.js` injicerar magic-CSS/JS automatiskt på parent-shell-sidor. `parent-magic-auto.js` skapar toggle-mount, hero-mount och döljer legacy-sidebar.

### ❌ Medvetet utan magic

| Sida | Varför |
|------|--------|
| Rapporter | Dev, 1 familj — ej prioriterad |
| Pedagog-anteckning | Dev, 1 familj |
| Onboarding, login, upgrade | Engångsflöden |

---

## Barnvy — sammankopplat system

| `child_view_config.view_mode` | Effekt |
|-------------------------------|--------|
| `classic` | child-dashboard klassisk |
| `new` | child-dashboard magic |

DB = sanning. Barnets UI-växlare sparar via `PATCH /view-config/self`.

---

## Nästa steg

1. Förbättra innehålls-UX i magic (inte bara hero/shell) på schema-undersidor
2. Deprecera `child-new.html` när magic är stabilt globalt
3. Magic på rapporter/pedagog när dev-features går live
