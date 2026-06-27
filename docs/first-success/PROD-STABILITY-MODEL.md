# Prod stability model — multi-authority UX

> **Inte en PR. Inte migration.**  
> Operativ modell för att hålla *upplevd beslutssingularitet* stabil i drift.

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md), [CHANGE-SURFACE-CONTRACT.md](CHANGE-SURFACE-CONTRACT.md), [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md).

---

## Vad som är stabilt (tre lager)

| Lager | Innehåll | Status |
|-------|----------|--------|
| **Architecture** | A/B/C/D separation, monopol-yta, kill switch | ✔ |
| **UX governance** | Change contract, funktionsspråk, release_id | ✔ |
| **Narrative injection** | Coach-slotten, transient intro, dismissal | ✔ |

Det som **inte** är automatiskt stabilt: att *berättelsen* ("ett tydligt nästa steg") matchar *beteendet* (flera klickbara paths till samma intent).

---

## Kärnmetrik: perceived decision singularity (PDS)

**Definition:** Andelen sessioner på Hem där användaren **inte** uppvisar beteende som tyder på att de söker alternativa "beslutsmotorer" för samma intent som coachen uttrycker.

PDS är **inte** samma sak som `engine_authority_conflict`:

| Signal | Mäter | Synlig för användare? |
|--------|--------|------------------------|
| `engine_authority_conflict` | Teknisk samexistens (A synlig + B/C/D synlig) | Nej (instrumentering) |
| **PDS drift** | Beteende som tyder på förvirrad intent | Ja (upplevd) |

Konfliktlogg säger *"systemen överlappar"*. PDS säger *"användaren verkar inte lita på singulariteten"*.

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

Detekteras: manuell L1 + heuristiker nedan — **inte** auto-ändring av copy från metrics.

---

## Proxy-metrics (ingen ny kod krävs dag 1)

Alla events finns redan eller kan approximeras i `analytics_events`.

### Primära (veckovis)

| Metric | Formel / query-intent | Tröskel (start) |
|--------|----------------------|-----------------|
| **Coach adoption** | `engine_coach_cta_click` / coach impressions | Baseline första 2 veckor |
| **Intent bypass** | `readiness_action_click` (coach-semantik typer) när coach synlig samma dag | >30% av coach impressions → L1 |
| **Invite split** | `cta_invite_co_parent_clicked` vs coach `INVITE_CO_PARENT` clicks | Trend, inte absolut |
| **Conflict rate** | `engine_authority_conflict` / Hem sessions (approx) | Stigande 2 veckor → L1 |
| **Coach ignore** | Impressions utan click inom 7d (familj) | Segment, inte alarm |

### Coach-semantik readiness-typer (för bypass-metric)

```
missing_pin          → överlappar SHOW_CHILD
(no_schedule_today   → gråzon — operativ men kan kännas som "nästa steg")
```

### Sekundära (kvalitativ)

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
| **LEARNING** | Första 14d efter ny `release_id` | Mät only; inga B/C-ändringar |
| **STABLE** | Coach adoption etablerad; bypass flat eller sjunker | Fortsätt mät; ev. ny release copy |
| **DRIFT** | Bypass ↑ 2v; conflict ↑; kvalitativ feedback | L1 → L2 minimal B/C; **aldrig** auto från logg; kill switch redo |

---

## Veckovis stability review (15 min)

1. **Conflict top-3** — vilka typer, trend?
2. **Intent bypass** — readiness coach-semantik vs coach CTR?
3. **Invite split** — C vs A när `INVITE_CO_PARENT`?
4. **Narrativ check** — stämmer `why_it_matters` med det som syns på skärmen?
5. **State** — LEARNING / STABLE / DRIFT?
6. **Beslut** — inget | dokumentera | L2 (specific surface) | kill switch

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
- [ ] Baseline coach adoption mätt första 2 veckor efter prod
- [ ] Intent bypass-query dokumenterad (admin SQL eller script — valfritt senare)
- [ ] DRIFT eskaleringsväg inkl. kill switch testad
- [ ] Ingen automatisk governance från metrics

---

## En mening att hålla sann i drift

> **Teknisk konflikt får finnas och loggas. Upplevd konflikt ska minska genom singular narrativ + mätning — inte genom fler system som förklarar sig själva.**
