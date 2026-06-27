# Authority propagation — stabiliseringsfas (prod)

> **Status:** Live multi-authority system. PR1 etablerade A:s **monopol-yta** (`#engineCoachMount`).  
> **PR2 = riskkontroll + mätning** — inte expansion, propagation eller semantikomklassificering.

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md), [CHANGE-SURFACE-CONTRACT.md](CHANGE-SURFACE-CONTRACT.md), [AUTHORITY-PRECEDENCE.md](AUTHORITY-PRECEDENCE.md).

---

## Vad PR1 gav

| Bevis | Betydelse |
|-------|-----------|
| Exklusiv slot | A kan vara **primär** för "nästa steg" |
| B/C/D oförändrade | Multi-authority samexisterar |
| `engine_authority_conflict` | Avvikelse är **mätbar** |
| Change notice | Familjer ser **lokalt** vad som ändrats (`engine-coach-change.js`) |

---

## PR2 i prod = stabilisering, inte funktion

### Gör

| Åtgärd | Syfte |
|--------|--------|
| Håll A inom `#engineCoachMount` | Undvik halvvägs-expansion |
| Mät conflict + coach CTR + readiness clicks | L1-review under lärande |
| Change contract per release | Extern mental modell |
| Kill switch redo | `first_success_engine_api` / env |

### Gör inte

| Åtgärd | Varför |
|--------|--------|
| Readiness `semantic` split (server) | För tidigt — tappar isolerad effekt |
| CSS "secondary" readiness | Perception utan data |
| Auto-dölj B/C vid conflict | Feedback loop |
| Fler A-ytor | Drift i realtid |
| Kausal wedge / downstream state | PR3+ efter stabil baseline |

---

## Influence radius (fryst i PR2)

| Yta | PR2 |
|-----|-----|
| `#engineCoachMount` | A primär + change notice |
| `#homeReadinessMount` | B oförändrad |
| CTA banners | C oförändad |
| Activation | D oförändad |
| `encouragementCopy` | C oförändad |

Propagation-regel oförändrad:

```
first_success_engine_api ON + 200:
  → coach synlig (om policy finns)
  → B/C/D fortsätter
  → konflikt loggas, inget auto-döljs
```

---

## Conflict resolution (oförändrad)

> **`engine_authority_conflict` är instrumentering — aldrig automatisk policy.**

| Nivå | Handling |
|------|----------|
| L0 | Logga alltid |
| L1 | Veckovis review (se PROD-OPERATING-ENVELOPE) |
| L2 | Kodändring **efter** L1-beslut |
| L3 | Engine policy — sista utväg |

---

## Drift signals (PR2 observability)

| Event | Fråga |
|-------|-------|
| `engine_coach_cta_click` | Följer användare coach? |
| `engine_authority_conflict` | Hur ofta samexisterar ytor? |
| `readiness_action_click` (coach synlig) | Bitar B intent? |
| Change notice dismiss | Förstod intro? |

---

## PR-fasöversikt (uppdaterad)

| PR | Fokus |
|----|-------|
| PR1 ✅ | Monopol-yta + conflict log + change contract |
| PR2 | **Stabilisering** — mätning, envelope, L1-review |
| PR3 | B/C overlap (t.ex. dölj C invite när A dominerar) — **efter data** |
| PR4 | `encouragementCopy` → A tone |
| PR5 | Celebration authority (A milestone vs D aha) |

---

## Acceptance (PR2)

- [ ] Inga nya A-ytor utan L1
- [ ] PROD-OPERATING-ENVELOPE + CHANGE-SURFACE-CONTRACT publicerade
- [ ] Change notice i coach för `coach_primary_v1`
- [ ] Veckovis conflict aggregate (script eller admin)
- [ ] Ingen automatisk governance från conflict log
