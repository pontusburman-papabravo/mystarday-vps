# Prod stability model — multi-authority UX

> **Inte en PR. Inte migration.**  
> Operativ modell för att hålla *upplevd beslutssingularitet* stabil i drift.

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md), [CHANGE-SURFACE-CONTRACT.md](CHANGE-SURFACE-CONTRACT.md), [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md).

---

## Decision observability stack (fyra lager)

| # | Lager | Dokument / kod |
|---|-------|----------------|
| 1 | **Authority** | A/B/C/D, `#engineCoachMount`, `AUTHORITY-PRECEDENCE.md` |
| 2 | **Contract** | `CHANGE-SURFACE-CONTRACT.md`, `engine-coach-change.js` |
| 3 | **Operational envelope** | Kill switches, `PROD-OPERATING-ENVELOPE.md` |
| 4 | **Stability** | Detta dokument — LEARNING / STABLE / DRIFT |

Det som **inte** är automatiskt stabilt: kalibrering mellan **systembeteende** och **upplevd singularitet**.

---

## Två sanningar (måste hållas isär)

| | System truth | Perceived truth (PDS) |
|---|--------------|------------------------|
| **Fråga** | Överlappar beslutsmotorer tekniskt? | Känns det som *ett* beslut eller flera? |
| **Källor idag** | `engine_authority_conflict`, click paths, CTA splits | Indirekt approximerad |
| **Risk** | Falskt lugn — conflict ↓ men UX splittrad | Falskt alarm — hög conflict, användaren upplever ingen förvirring |

**Regel:** STABLE får **inte** deklareras enbart på system truth. Varje state-transition kräver minst en korsvaliderad perceptions-proxy (se nedan).

---

## Decision event vs decision perception signal

### Decision event (system truth)

Något **hände** i UI — mätbart, entydigt:

| Typ | Exempel |
|-----|---------|
| Exposure | Coach impression, readiness render, CTA shown |
| Resolution | `engine_coach_cta_click`, `readiness_action_click`, `cta_invite_co_parent_clicked` |
| Conflict | `engine_authority_conflict` |

Decision events beskriver **reaktion på UI**, inte kognitiv klarhet.

### Decision perception signal (PDS)

Indikator att användarens **mental modell** divergerar från singular narrativ:

| Signal | Betydelse | Hur det approximeras idag |
|--------|-----------|---------------------------|
| **Ambiguity window** | A exponerar "ett nästa steg" men B/C erbjuder alternativ inom kort tid | Exposure + resolution på *olika* authorities inom 5–10s |
| **Path oscillation** | Användaren byter beslutskälla utan att resolva | Coach click → tillbaka → readiness click (samma session) |
| **Authority bypass** | Intent som coach uttrycker löses via annan auktoritet | `missing_pin` click när policy = `SHOW_CHILD` |
| **Narrative rejection** | Intro/coach ignoreras systematiskt | Impression utan resolution, readiness-only flow |
| **Authority non-adoption** | A exponerad men deltar inte i beslutsgrafen | Se avsnitt nedan — inte conflict, inte ambiguity |
| **Qualitative PDS** | Uttryckt förvirring eller devalvering | Support, feedback, enkät |

**Kritisk punkt (proxy-collapse):** Klick, invite och CTA-interaktion är **resolution events** — de bevisar att *något* valdes, inte att användaren upplevde *ett* val.

**Kritisk punkt (model completeness illusion):** Heatmaps, windows och proxy-regler gör modellen **körbar** — inte **uttömmande**. Om allt är mätt betyder det inte att allt är förstått. Modellen svarar primärt på *"när konkurrerar beslutsmotorer?"* — inte fullt ut på *"när är vi inte ens med i beslutet?"*

---

## Tre lägen i beslutsgrafen

Användaren kan reagera på multi-authority Hem på tre sätt — endast två fångas väl av ambiguity/bypass:

| Läge | Vad som händer | Signaltyp | Fångas av |
|------|----------------|-----------|-----------|
| **Competition** | Användaren väljer aktivt mellan A och B/C | Resolution på fel auktoritet | Ambiguity, bypass |
| **Ambiguity** | Flera paths känns jämbördiga i samma ögonblick | Temporal overlap | Ambiguity window |
| **Non-adoption** | A exponerad men **strukturellt ignorerad** — beslut sker utanför A:s graf | Non-participation | Delvis (se nedan) |

```
Competition:   A ──exposure──► användaren ──resolution──► B/C
Ambiguity:     A + B/C synliga ──► resolution B/C inom 10s
Non-adoption:  A ──exposure──► användaren ──► (ingen resolution via A eller konkurrens)
                              └── egen väg: quick actions, hub, vanemässig navigering
```

Non-adoption är **inte** låg CTR. Låg CTR kan betyda "tydligt val" eller "irrelevant coach". Skillnaden avgörs av om intent ändå löses **utan** A och **utan** synlig konkurrens med B/C.

---

## Authority salience vs authority absence

| | Salience | Absence |
|---|----------|---------|
| **Fråga** | Märker användaren att A föreslår något? | Är A del av beslutsytan alls? |
| **Proxies** | Impressions, intro dismiss, scroll past | Non-adoption signal (nedan) |
| **Risk** | Ambiguity / competition | **Silent drift** — systemet ser lugnt ut, A är dekor |

**Authority absence** = användaren devalverar hela beslutsarkitekturen till bakgrundsinfo och bygger egen strategi (vanor, sidomeny, quick actions, magic hub).

Det syns inte i:

- clicks på coach (inga)
- conflicts (inga — B/C är inte "mot" A i systemets ögon)
- resolution windows (ingen resolution i A:s graf)

Det kan synas i:

- readiness/hub/quick-action resolution **utan** föregående coach-engagemang
- upprepad coach exposure, noll coach resolution, intent ändå uppfyllt (server-side milestone)
- qualitative: "jag använder inte det där kortet"

---

## Authority non-adoption signal

**Definition:** A är exponerad (`coach` impression, policy satt), men användaren går **inte** in i konkurrens med B/C — A ignoreras strukturellt och beslutet löses via annan väg eller uteblir.

| Egenskap | Authority bypass | Authority non-adoption |
|----------|------------------|------------------------|
| A deltar i grafen? | Ja — coach intent erkänd, annan auktoritet vald | Nej — A behandlas som bakgrund |
| Konflikt loggas? | Ofta ja | Ofta **nej** |
| Ambiguity window? | Ofta ja | Ofta **nej** (ingen temporal konkurrens) |
| STABLE-fälla | Missad om endast conflict mäts | Missad om endast CTR/ambiguity mäts |

### Non-action perception drift

När användaren **inte** klickar och **inte** resolverar inom window, men mental modellen ändå flyttas:

- ignorerar coach, följer readiness som vanemässig checklista
- använder quick actions / `#parentHomeHubMount` / sidomeny
- bygger egen rutin utan att tolka "nästa steg"-kortet som beslut

Detta är **non-action perception drift** — osynlig i click/conflict/window, synlig i adoption + outcome-gap.

### Proxies för non-adoption (fas 1, befintliga events)

| Proxy | Indikator | Tolkning |
|-------|-----------|----------|
| **Structural ignore** | ≥2 coach impressions/7d, 0 coach clicks, ≥1 `readiness_action_click` eller `nav_hub_click` | B/hub ersätter A utan konkurrens |
| **Outcome without A** | `child_access_completed` / milestone utan `engine_coach_cta_click` i samma familj-period | A irrelevant för faktiskt beteende |
| **Intro dismiss + no follow** | Change notice dismissed, ingen coach click inom session | Narrativ accepterat, A devalverat |
| **Hub-only path** | Session med magic hub interaction, coach synlig, ingen coach click | Architecture bypass |

**Validering:** structural ignore **+** (outcome without A **eller** qualitative) → non-adoption bekräftad. Ensam låg CTR räcker inte.

### Vad non-adoption betyder för STABLE

| Mönster | Tolkning |
|---------|----------|
| Låg ambiguity + låg bypass + **hög non-adoption** | A är inte farlig — den är **irrelevant**. STABLE på competition-metrics är missvisande. |
| Hög non-adoption + intent uppfyllt | Användaren klarar sig utan A — fråga är copy/salience, inte conflict |
| Hög non-adoption + intent ej uppfyllt | A misslyckas tyst — värre än DRIFT (ingen synlig friktion) |

**LEARNING ska mäta non-adoption parallellt med ambiguity** — annars fångar den konkurrens men inte frånvaro av konkurrens där A borde ha haft effekt.

---

## Decision exposure vs decision resolution

| Fas | Vad som händer | Mät |
|-----|----------------|-----|
| **Exposure** | Användaren *ser* beslutsmaterial | Coach impression, readiness visible, CTA shown |
| **Resolution** | Användaren *väljer* en path | Clicks, navigering |

**PDS-relevant drift** uppstår i gapet:

```
Exposure (A: "nästa steg") + Exposure (B/C: alternativ)
        ↓
Resolution på B/C inom ambiguity window
        = perceived multi-authority (även om conflict redan loggats)
```

Singular narrativ reducerar perceived conflict **först** när exposure → resolution konvergerar på samma auktoritet (coach) eller när B/C är uppenbart operativa (inte coach-semantik).

---

## Ambiguity detection window

**Definition:** Tidsfönster efter coach exposure där alternativa beslutspaths fortfarande är synliga och klickbara.

| Parameter | Värde (start) | Justeras efter LEARNING |
|-----------|---------------|-------------------------|
| Window | **5–10 sekunder** efter coach impression | L1 |
| Trigger | Coach synlig + `policy.name` satt | — |
| Ambiguity event | Resolution på B eller C med coach-semantik intent inom window | — |

### Ambiguity event (konceptuell)

```
coach_impression_at = T
readiness_click (missing_pin) at T+7s  →  ambiguity: SHOW_CHILD vs missing_pin
cta_invite_click at T+4s               →  ambiguity: INVITE_CO_PARENT vs C banner
```

Idag: approximera via session-timestamp på befintliga events (samma `family_id`, samma dag, Δt < 10s). Framtida: explicit `session_id` på coach events (valfritt, ej krav för modellen).

---

## Ambiguity heatmap — Hem (A vs B/C)

Var **perception** och **system truth** sannolikt divergerar mest:

| Zon | DOM | A intent | B/C alternativ | Ambiguity-risk |
|-----|-----|----------|----------------|----------------|
| **Z1 Child access** | Coach + readiness `missing_pin` | `SHOW_CHILD` | "Sätt PIN" | 🔴 Hög |
| **Z2 Invite** | Coach + `#medforalderCtaBanner` + magic hub coparent | `INVITE_CO_PARENT` | CTA ×2–3 | 🔴 Hög |
| **Z3 Narrative** | Coach + `encouragementCopy` | Coach tone | "Fortsätt så!" / "Bra jobbat!" | 🟡 Medium (ton, inte CTA) |
| **Z4 Operativ** | Coach + `pending_approval` | Valfri policy | Godkänn belöning | 🟢 Låg (olika fråga) |
| **Z5 Celebration** | Coach milestone + `#activationAhaModal` | `TRIGGER_CELEBRATION` | D modal | 🟡 Medium |

**LEARNING-fas:** prioritera Z1 + Z2 i veckoreview. De driver semantisk drift även när conflict-rate är acceptabel.

---

## PDS: proxy vs true signal

### Proxies (fas 1 — nu)

Beteendebaserade indikatorer. **Tillräckliga för DRIFT-alarm, otillräckliga för STABLE-bekräftelse ensamma.**

| Proxy | Typ | Mäter |
|-------|-----|-------|
| Intent bypass | Resolution | Bypass av coach intent |
| Invite split | Resolution | C vs A invite |
| Dual-path 60s | Resolution | Flera resolutions nära varandra |
| Coach ignore | Exposure→∅ | Narrative rejection |
| Conflict rate | Exposure | System truth only |

### True PDS signal (fas 2 — definition, ej implementerad)

En perception signal är **sann** PDS endast om den uppfyller **proxy validation rule**:

> **Varje PDS-slutsats måste korsvalideras med minst två oberoende beteende-paths som pekar samma håll.**

| Slutsats | Path 1 | Path 2 | Kvalitativ (path 3, valfri) |
|----------|--------|--------|----------------------------|
| "Ambiguity i Z1" | `missing_pin` click, coach synlig | Ambiguity window < 10s | Feedback nämner PIN vs barn |
| "Invite split" | `engine_invite_vs_cta_banner` | `cta_invite` click, policy = invite | — |
| "STABLE" | Bypass flat 2v | Conflict flat 2v | Ingen qualitative drift |
| "DRIFT" | Bypass ↑ 2v | Ambiguity events ↑ | Feedback om förvirring |

**STABLE utan dubbel path = proxy-collapse risk** — systemet kan se grönt medan mental modell fortfarande är splittrad.

### Kognitiv convergence (fas 3 — framtida, ej scope nu)

Direkta perception events — t.ex. enkel mikro-enkät i coach-slotten efter dismiss ("Var det tydligt vad du skulle göra?"), eller strukturerad support-taggning. **Kräver produktbeslut** — inte del av nuvarande kod.

---

## Kärnmetrik: perceived decision singularity (PDS)

**Definition (reviderad):** Andelen Hem-sessioner där användaren **inte** uppvisar korsvaliderade tecken på att flera beslutsmotorer upplevs som jämbördiga för samma intent.

PDS är **inte** samma sak som `engine_authority_conflict`:

| Signal | Mäter | Typ |
|--------|--------|-----|
| `engine_authority_conflict` | Teknisk samexistens | System truth |
| **PDS proxy** | Beteendeindikator | Perception (indirekt) |
| **PDS validated** | Proxy + korsvalidering | Perception (operativt) |

---

## Drift-typer

### 1. Teknisk drift (redan täckt)

- Flera system skriver samma beslutspunkt
- Detekteras: `engine_authority_conflict`, authority-tester
- Åtgärd: L0 log → L1 review → L2 efter beslut

### 2. Semantisk drift (huvudrisk framåt)

Berättelsen och beteendet divergerar:

| Coach säger | Användaren gör | Drift-signal |
|-------------|----------------|--------------|
| `SHOW_CHILD` — "Visa barnet" | Klick på readiness `missing_pin` | `readiness_action_click` type=missing_pin, coach synlig |
| `INVITE_CO_PARENT` | Klick på `#medforalderCtaBanner` | `cta_invite_co_parent_clicked`, conflict `engine_invite_vs_cta_banner` |
| "Ett förslag i taget" | Klick på coach **och** readiness inom 60s | Dubbel intent-path |
| Intro dismiss + omedelbar readiness-only flow | Aldrig `engine_coach_cta_click` | Coach ignorerad |

**Regel:** Semantisk drift är farligare än teknisk drift — användaren ser ingen arkitektur, bara inkonsistens.

### 3. Narrativ drift (copy vs verklighet)

- `why_it_matters` lovar enkelhet men skärmen har 3 invite-ytor
- Change contract inte uppdaterad vid beteendeändring
- B/C copy börjar låta som "nästa steg" (coach-semantik i operativa lager)

Detekteras: manuell L1 + heuristiker — **inte** auto-ändring av copy från metrics.

### 4. Proxy-collapse (metodrisk)

Scenario: system truth ser bra ut, perceived truth är dålig.

| Symptom | Orsak |
|---------|--------|
| STABLE deklarerad | Endast conflict ↓ och CTR ↑ mätta |
| Användare fortfarande förvirrade | Proxies mäter behavioral convergence, inte cognitive convergence |
| Missad DRIFT | Ensam proxy utan korsvalidering |

### 5. Model completeness illusion (metodrisk)

När heatmap, windows och proxy-regler finns känns modellen "klar".

| Symptom | Orsak |
|---------|--------|
| "Allt är mätt → allt är förstått" | Non-adoption och non-action drift utanför decision graph |
| STABLE + låg conflict | A kan vara irrelevant, inte framgångsrik |
| Ingen eskalering | Tyst devalvering av hela beslutsarkitekturen |

**Motgift:** authority non-adoption som tredje axel vid LEARNING och state-review — inte ny instrumentation dag 1.

---

## Proxy-metrics (fas 1)

Alla events finns redan. **Använd aldrig en proxy ensam för STABLE.**

### Primära (veckovis)

| Metric | Typ | Formel / intent | Korsvalidera med |
|--------|-----|-----------------|------------------|
| **Ambiguity rate** | Perception-proxy | Resolution B/C inom 10s efter coach exposure, coach-semantik | Intent bypass |
| **Intent bypass** | Resolution | `readiness_action_click` (missing_pin) när coach synlig | Ambiguity rate |
| **Invite split** | Resolution | CTA click vs coach `INVITE_CO_PARENT` | `engine_invite_vs_cta_banner` |
| **Dual-path** | Resolution | Coach + readiness click samma session, Δt < 60s | Ambiguity rate |
| **Coach adoption** | Resolution | `engine_coach_cta_click` / impressions | Coach ignore (inverse) |
| **Non-adoption** | Absence | Structural ignore + outcome without A | Qualitative |
| **Conflict rate** | Exposure (system) | `engine_authority_conflict` / sessions | — (system truth only) |
| **Coach ignore** | Exposure→∅ | Impressions utan click 7d | Non-adoption |

### Coach-semantik readiness-typer

```
missing_pin          → Z1, överlappar SHOW_CHILD
(no_schedule_today   → gråzon)
```

### Sekundära (kvalitativ — perception path 3)

- Support/feedback: "vem bestämmer", "förvirrande hem", "två knappar"
- App Store / enkät (om tillgängligt)
- L1 review-anteckningar

---

## Stability states (operativ modell)

```
┌─────────────┐     metrics inom baseline      ┌─────────────┐
│   STABLE    │ ◄─────────────────────────── │  LEARNING   │
│  (grön)     │                              │  (gul)      │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │ semantisk drift / stigande bypass          │ första 2v efter release
       ▼                                            │
┌─────────────┐     eskalering / kill switch       │
│   DRIFT     │ ◄──────────────────────────────────┘
│  (röd)      │
└─────────────┘
```

| State | Kriterier | Tillåtna åtgärder |
|-------|-----------|-------------------|
| **LEARNING** | Första 14d efter ny `release_id` | Mät **ambiguity + bypass + non-adoption**; etablera baseline; inga B/C-ändringar |
| **STABLE** | ≥2 competition-proxies flat 2v **plus** non-adoption inom acceptabel baseline **plus** ingen qualitative drift | Fortsätt mät; ev. copy/salience via ny `release_id` |
| **DRIFT** | Korsvaliderad ambiguity/bypass ↑ 2v **eller** non-adoption ↑ med intent-gap **eller** qualitative drift | L1 → L2 (Z1/Z2) eller salience/copy; kill switch redo |

**LEARNING mäter fel om den bara tittar på system friction eller competition.** Den ska kalibrera ambiguity heatmap (Z1–Z5), proxy thresholds **och** non-adoption baseline.

---

## Veckovis stability review (15 min)

1. **Ambiguity heatmap** — Z1/Z2 events, trend?
2. **Non-adoption** — structural ignore, outcome without A?
3. **Proxy pairs** — ambiguity rate **och** intent bypass — samma riktning?
4. **Conflict top-3** — system truth, divergerar den från perception?
5. **Invite split** — C vs A när `INVITE_CO_PARENT`?
6. **Narrativ check** — stämmer `why_it_matters` med exponerade paths?
7. **Qualitative** — förvirring **eller** "använder inte kortet"?
8. **State** — LEARNING / STABLE / DRIFT (kräv dubbel proxy; STABLE ej vid hög non-adoption + intent-gap)
9. **Beslut** — inget | dokumentera | L2 (zone) | salience/copy | kill switch

Mall sparas i review-anteckningar — inte i kod.

---

## Vad som aldrig får hända (invariants)

1. **Conflict → auto-policy** — metrics styr inte `ProductEngine.evaluate`
2. **Metrics → auto-dölj B/C** — L2 kräver mänskligt beslut
3. **Ny A-yta för att "fixa" drift** — utökar problemet
4. **Systemspråk i UI** — bryter narrative injection layer
5. **Change utan `release_id`** — bryter UX governance layer
6. **"Allt mätt = allt förstått"** — non-adoption kräver egen axel i review

---

## Modellens blinda fläck (medvetet)

| Fråga modellen svarar på | Fråga modellen approximerar | Fråga utan direkt signal |
|--------------------------|----------------------------|--------------------------|
| När konkurrerar auktoriteter? | När är vi irrelevanta? | När bygger användaren helt egen strategi offline? |

Fas 3 (produktbeslut): direkta perception events — mikro-enkät, taggad support. **Ej scope för kod nu.**

---

## Relation till PR-nummer

| Fas | Innehåll |
|-----|----------|
| PR1 ✅ | Architecture + narrative injection |
| Prod governance ✅ | Change contract + operating envelope |
| **Stability model** (detta doc) | Kontinuerlig PDS-driftövervakning |
| Framtida L2 | Minimal B/C justering **endast** vid DRIFT + beslut |

Det finns inget "PR2 feature" — bara **stability loop**.

---

## Acceptance (modellen i bruk)

- [ ] Veckovis review schemalagd (ägare: produkt/eng)
- [ ] LEARNING baseline: ambiguity + bypass + **non-adoption**
- [ ] Proxy validation rule tillämpas vid STABLE/DRIFT-beslut
- [ ] STABLE ej deklarerad vid hög non-adoption + intent-gap
- [ ] Ambiguity heatmap Z1–Z2 prioriterad i första 14d
- [ ] DRIFT eskaleringsväg inkl. kill switch testad
- [ ] Ingen automatisk governance från metrics

---

## En mening att hålla sann i drift

> **Modellen mäter när beslutsmotorer konkurrerar — och när A inte ens deltar i beslutet. STABLE kräver att båda axlarna är inom baseline; annars har vi mätt oss till falsk trygghet.**
