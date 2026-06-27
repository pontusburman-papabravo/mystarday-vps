# Go-live checklist (L1 / Engine)

Bockas av i **Admin → Experiment → L1 beslut (coach)** innan release till verklig trafik.

## 10 punkter

1. Engine körs read-only (ingen state write, bara rekommendationer)
2. `/first-success` returnerar stabil payload (intent + policy + release_id)
3. L1 admin UI aktivt (ja/nej + beslutstyp + override)
4. Beslut loggas (decision_type, override, release_id, timestamp)
5. `#engineCoachMount` är enda A-yta (ingen parallell coach i frontend)
6. B/C fortsätter men skriver inte coach-slotten
7. Engine auto-agerar inte (ingen ACT/INVESTIGATE automation)
8. 3 observability-axlar aktiva (competition, ambiguity, non-adoption)
9. ACCEPT-UNKNOWN kan registreras som aktivt beslut (mål: dag 7)
10. L1-ägare + backup + dag 7/14 review bokad i kalendern

## Definition of done

> Drift = Engine föreslår, systemet loggar, människan bestämmer, inget automatiseras ännu.

När alla 10 är gröna är systemet redo att testas mot verkligt användarbeteende utan att tappa kontroll över beslutskedjan.

## Efter release (operativt)

- **Dag 7:** 30 min agenda — [DAY-7-14-REVIEW-AGENDA.md](DAY-7-14-REVIEW-AGENDA.md)
- **Dag 14:** 45 min + GO/NO-GO — samma doc
