# Go-live checklist (L1 / Engine)

Bockas av i **Admin → Experiment → L1 beslut (coach)** innan release till verklig trafik.

## 10 punkter

Varje punkt i admin har **Så bockar du** under rubriken. Kort översikt:

| # | Punkt | Så verifierar du (kort) |
|---|--------|-------------------------|
| 1 | Engine read-only | Dashboard som förälder; endast GET first-success; inget auto-state |
| 2 | /first-success payload | Network 200 med policy, milestone, trace |
| 3 | L1 admin UI | Ja/nej, override, testspara på denna sida |
| 4 | Beslut loggas | Spara HOLD → rad i beslutslogg |
| 5 | #engineCoachMount | Coach bara i det elementet på /dashboard |
| 6 | B/C skriver inte coach | Readiness-klick ändrar inte coach-text |
| 7 | Ingen auto-ACT | Frysperiod accepterad; inget auto-beslut till dag 14 |
| 8 | Observability 3 axlar | Metrics-raden laddas i admin (0 OK) |
| 9 | ACCEPT-UNKNOWN | Dag 7+: spara aktivt ACCEPT-UNKNOWN i logg |
| 10 | Ägare + kalender | Ägare sparade + kalender bokad + påminnelse bockad |

Du behöver **inte** 10/10 under dag 1–6 observation.

## Definition of done

> Drift = Engine föreslår, systemet loggar, människan bestämmer, inget automatiseras ännu.

När alla 10 är gröna är systemet redo att testas mot verkligt användarbeteende utan att tappa kontroll över beslutskedjan.

## Efter release (operativt)

- **Dag 7:** 30 min agenda — [DAY-7-14-REVIEW-AGENDA.md](DAY-7-14-REVIEW-AGENDA.md)
- **Dag 14:** 45 min + GO/NO-GO — samma doc
