# Plattform — Use cases (arkiv / volym 2-referens)

> **⚠️ Primär spec:** [`PRODUCT_BEHAVIOR_SPEC.md`](./PRODUCT_BEHAVIOR_SPEC.md) (PBS)  
> Det här dokumentet = äldre UC01–UC12-utkast för PBS06–PBS12. Se mapping i PBS bilaga A.

---

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
