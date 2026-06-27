# Safe operating envelope — A i produktion

> **Fas:** *live multi-authority system stabilization* — inte "migration till Engine".

Relaterat: [CHANGE-SURFACE-CONTRACT.md](CHANGE-SURFACE-CONTRACT.md), [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md).

---

## Tre hårda regler i prod

### 1. Single observable truth per beslutspunkt

| Beslutspunkt | Primär yta | Övriga system |
|--------------|------------|---------------|
| "Vad ska vi göra härnäst?" (intent) | **A** — `#engineCoachMount` | B/C/D får **inte** duplicera samma fråga |
| "Vad kräver åtgärd?" (operativt) | **B** — `#homeReadinessMount` | A får inte skriva hit |
| Growth / invite / dela | **C** — banners + magic hub | A loggar konflikt, döljer inte auto |
| Experiment | **D** — activation banners/modal | Isolerat från A |

Användaren ska **aldrig behöva tolka** vilken yta som är "rätt" för nästa steg — det är alltid coach-kortet.

### 2. A är primär eller av — inte "extra signal"

| Läge | Tillåtet |
|------|----------|
| `first_success_engine_api` ON + 200 | Coach-kort synligt med policy |
| Flag OFF / 503 | `#engineCoachMount` tom — fallback till legacy (readiness + C) |
| Halvvägs (coach + coach-semantik i B) | **Undvik** — största perceptionsrisken |

A får **inte** utöka räckvidd utanför `#engineCoachMount` i stabiliseringsfasen.

### 3. Konfliktlogg = observability only

`engine_authority_conflict` får **aldrig**:

- auto-dölja readiness eller CTA
- mata tillbaka in i `ProductEngine.evaluate`
- trigga klient-policy baserat på conflict count

L0 log → L1 mänsklig review → L2 kod **endast efter beslut**.

---

## Kill switches (nödbroms)

| Mekanism | Effekt |
|----------|--------|
| `feature_flag.first_success_engine_api = false` | API 503, coach tom |
| `FIRST_SUCCESS_ENGINE_API=false` (env) | Samma, utan DB |
| SW/cache rollback | Tar bort coach-JS från klient |

Efter broms: befintliga familjer ser Hem som före PR1 (readiness + CTA kvar).

---

## User-visible conflict hotspots (rangordning)

Sannolik **första** upplevda motstrid (högst risk först):

| # | Konflikt | System | Var | Det användaren kan uppleva |
|---|----------|--------|-----|----------------------------|
| 1 | Dubbel "nästa steg" | A + B | Coach + readiness `missing_pin` / `no_schedule_today` | "Ska jag visa barnet eller sätta PIN?" |
| 2 | Dubbel invite | A + C | Coach `INVITE_CO_PARENT` + `#medforalderCtaBanner` | Två "bjud in"-vägar |
| 3 | Dubbel invite (magic) | C + C | `#medforalderCtaBanner` + `renderCoParentCta` i magic hub | Samma intent tre gånger |
| 4 | Uppmuntran vs coach | C + A | `encouragementCopy` + coach tone | Olika "röster" på samma skärm |
| 5 | Celebration | A + D | `milestone: first_success` + `#activationAhaModal` | Dubbel firande |

**Största reella riskområde:** readiness + CTA + encouragement — **inte** Engine i sig.

Engine gör konflikten **synlig** (`readiness_and_engine_both_visible`). Stabilisering = minska coach-semantik i B/C, inte expandera A.

---

## Minimal B/C-stabilisering (utan att bromsa A)

Ingen kod krävs dag 1 — **operativa regler**:

| B-item | Klass | Åtgärd i stabiliseringsfas |
|--------|-------|----------------------------|
| `pending_approval`, `pending_invite` | Operativ | Behåll — annan fråga än coach |
| `incomplete_past_days` | Operativ (med gråzon) | Bevaka conflict + readiness clicks |
| `missing_pin` | **Coach-semantik** | L1: överväg dölj när A = `SHOW_CHILD` (PR3, efter data) |
| `no_schedule_today` | Operativ | OK bredvid A |
| Medförälder CTA (C) | Coach-semantik vid A invite | L1: metrics på `engine_invite_vs_cta_banner` |

**Princip:** Ändra B/C först när conflict-rate + readiness_click data visar att användare följer fel yta.

---

## Mätning > expansion (PR2 i prod)

PR2 är **inte** ny funktion. PR2 är riskkontroll-loop:

| Mät | Fråga |
|-----|-------|
| `engine_coach_cta_click` / impressions | Tar familjer coach-CTA? |
| `engine_authority_conflict` rate | Hur ofta samexisterar ytor? |
| `readiness_action_click` när coach synlig | Bitar B fortfarande intent? |
| `policy.name` distribution | Stämmer A med funnel? |
| Change notice dismiss (`release_id`) | Förstod användaren intro? |

**Inte i PR2:** readiness semantic split, CSS secondary, auto-governance, fler A-ytor.

---

## Mental modell för familjen (extern)

En mening som alltid ska vara sann:

> **"Överst får jag ett förslag till nästa steg. Under det finns påminnelser om saker som behöver godkännas eller fixas."**

All prod-kommunikation ska stärka den modellen — se [CHANGE-SURFACE-CONTRACT.md](CHANGE-SURFACE-CONTRACT.md).

---

## Veckovis L1-review (mall)

1. Topp-3 `engine_authority_conflict` typer — trend upp/ner?
2. Coach CTR vs readiness clicks (samma session, approximativt via analytics)
3. Support/feedback som näner "förvirrande hem" / "vem bestämmer"
4. Beslut: inget | dokumentera | L2 minimal B/C | L3 policy (sista utväg)

---

## Acceptance (stabiliseringsfas)

- [ ] A begränsad till `#engineCoachMount` — ingen ny yta utan L1
- [ ] Change contract aktiv för första synliga release
- [ ] Kill switch testad i staging
- [ ] Conflict loggas, inget auto-governance
- [ ] Hotspot-lista granskad veckovis
