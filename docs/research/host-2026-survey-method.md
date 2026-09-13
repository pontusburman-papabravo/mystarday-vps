# Host 2026 — produktundersökning (metod)

Kort intern läsanvisning. Inte akademisk forskning.

**Begränsning:** Respondenterna är självselekterade och ett presentkortsincitament används. Resultaten är därför directional product research och ska inte tolkas som representativa för svenska barnfamiljer.

## Researchfrågor

1. Vilken åldersgrupp tänker nya besökare främst på?
2. Vad lockade dem till produkten (utan att fråga om diagnos)?
3. Vilka vardagssituationer upplevs som svårast just nu?
4. Vilket stöd tror de skulle hjälpa mest?
5. Vilken struktur har de redan (så vi inte bygger dubletter)?
6. Vad skulle få dem att stanna över tid (värde, inte pris)?
7. Delad enhet kontra barnets egen enhet?

## Varför just dessa frågor

| Fråga | Beslut den kan informera | Inte |
|-------|--------------------------|------|
| 1 Ålder | Vilken barnvy/copy som prioriteras | Diagnos, skolform |
| 2 Nyfikenhet | Vilka behov vi syns för i annonser | "Har barnet NPF?" |
| 3 Svårast | Vilka flöden som gör mest nytta först | Kausalitet ("appen minskar tjat") |
| 4 Skulle hjälpa | Feature-prioritering mot faktisk efterfrågan | Att allt måste byggas |
| 5 Nuvarande struktur | Hur stor omställningen är | Att papper är "sämre" |
| 6 Stanna över tid | Retention-hypoteser för nya användare | Pris (59 kr/mån) |
| 7 Enhet | Delad vs egen enhet | Att en väg är "rätt" |
| Fritext | Oväntade behov | Representativitet |

## Vad datan INTE får användas till

- Prisbeslut för 59 kr/mån — den här kohorten har oftast inte använt produkten.
- Medicinsk inferens. "NPF-anpassning" är vad personen *söker*, inte barnets diagnos.
- Påståenden om svenska barnfamiljer i allmänhet.
- Meta Pixel / GA: inga svar, ingen fritext, ingen e-post.

## Bias att räkna med

- **Self-selection:** de som klickar enkäten är redan nyfikna.
- **Incentive bias:** presentkortet kan locka andra än "typiska" blivande användare, och kan ge snabbare/mindre genomtänkta svar.
- **Kampanjtrafik:** Meta-annonskohort, inte slumpurval.

## Datum (utlottning vs Premium)

Utlottningen och Premium-erbjudandet är inte samma sak. Offentlig copy säger "senast 30 september" / "kl. 23:59 svensk tid" utan att påstå att klockslagen är identiska.

| Händelse | Instant | Europe/Stockholm (CEST, UTC+2) |
|---|---|---|
| Sista giltiga utlottningsanmälan | `2026-09-30T21:59:59.000Z` | 30 september 2026 23:59:59 |
| Premium-cutoff (`payment_start_at`) | `2026-10-01T00:00:00+02:00` = `2026-09-30T22:00:00.000Z` | 1 oktober 2026 00:00:00 |

Utlottningen stänger **en sekund** före Premium-cutoff — inte en timme. `21:59:59Z` är 23:59:59 svensk sommartid, inte 23:59 UTC.

Admin: Enkäter → `host-2026` → rapport (fördelning, fritext) + tävlingspanel (antal e-post). Inga nya dashboards.
