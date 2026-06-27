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
| **Qualitative PDS** | Uttryckt förvirring | Support, feedback, enkät |

**Kritisk punkt (proxy-collapse):** Klick, invite och CTA-interaktion är **resolution events** — de bevisar att *något* valdes, inte att användaren upplevde *ett* val.

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

**Motgift:** proxy validation rule + ambiguity window + qualitative path vid state-transition.

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
| **Conflict rate** | Exposure (system) | `engine_authority_conflict` / sessions | — (system truth only) |
| **Coach ignore** | Exposure→∅ | Impressions utan click 7d | Coach adoption |

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
| **LEARNING** | Första 14d efter ny `release_id` | Mät **ambiguity + bypass** (inte bara conflict/CTR); etablera baseline; inga B/C-ändringar |
| **STABLE** | ≥2 proxies flat 2v **plus** ingen qualitative drift | Fortsätt mät; ev. copy-justering via ny `release_id` |
| **DRIFT** | Korsvaliderad ambiguity/bypass ↑ 2v **eller** qualitative drift | L1 → L2 minimal B/C (Z1/Z2 först); kill switch redo |

**LEARNING mäter fel om den bara tittar på system friction.** Den ska kalibrera ambiguity heatmap (Z1–Z5) och proxy validation thresholds.

---

## Veckovis stability review (15 min)

1. **Ambiguity heatmap** — Z1/Z2 events, trend?
2. **Proxy pairs** — ambiguity rate **och** intent bypass — samma riktning?
3. **Conflict top-3** — system truth, divergerar den från perception?
4. **Invite split** — C vs A när `INVITE_CO_PARENT`?
5. **Narrativ check** — stämmer `why_it_matters` med exponerade paths?
6. **Qualitative** — någon perception path 3?
7. **State** — LEARNING / STABLE / DRIFT (kräv dubbel proxy för STABLE)
8. **Beslut** — inget | dokumentera | L2 (specific zone) | kill switch

Mall sparas i review-anteckningar — inte i kod.

---

## Vad som aldrig får hända (invariants)

1. **Conflict → auto-policy** — metrics styr inte `ProductEngine.evaluate`
2. **Metrics → auto-dölj B/C** — L2 kräver mänskligt beslut
3. **Ny A-yta för att "fixa" drift** — utökar problemet
4. **Systemspråk i UI** — bryter narrative injection layer
5. **Change utan `release_id`** — bryter UX governance layer

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
- [ ] LEARNING baseline: ambiguity rate + bypass (inte enbart conflict/CTR)
- [ ] Proxy validation rule tillämpas vid STABLE/DRIFT-beslut
- [ ] Ambiguity heatmap Z1–Z2 prioriterad i första 14d
- [ ] DRIFT eskaleringsväg inkl. kill switch testad
- [ ] Ingen automatisk governance från metrics

---

## En mening att hålla sann i drift

> **System truth får loggas i tysthet. Perceived truth kräver korsvaliderade proxies — annars tror vi att singular narrativ fungerar för att klick samlas på ett ställe, medan användaren fortfarande upplever flera beslutsmotorer.**
