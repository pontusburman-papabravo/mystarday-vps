# Föräldraaktivering 7D — Implementation Contract

Version: MVP v1.1

Syfte:
Detta dokument är den tekniska sanningen för implementationen.
Om detta dokument och PRD:n motsäger varandra gäller detta dokument.

**Relaterat:** [Spec](./foraldaraktivering-7-dagar-spec.md) · [Invariants](./activation-program-invariants.md) · [Execution plan](./cursor-execution-plan.md)

---

# Scope

Implementera endast Fas 1–4.

Ingår:

- Datamodell
- Daglogik
- Enrollment
- Banner
- Aha-tracking
- Celebratory modal
- Reflection
- Analytics-events

Ingår inte:

- Push scheduler
- Admin dashboard
- Day 30 retention UI
- Day 60 retention UI
- Reactivation_3d
- Win-back
- Summer programs
- School restart programs

---

# Programtyper

Tillåt endast:

onboarding_7d

Ingen annan programtyp får skapas i MVP.

---

# Datamodell

Tabeller:

- parent_activation_program
- parent_seen_completion

Måste innehålla:

- status
- cohort_arm
- program_type
- started_at
- first_banner_seen_at
- last_seen_day
- reflection_score
- reflection_text

---

# Enrollment (Fas 4 — föräldraval)

Alla nya föräldrar som slutför onboarding ska få välja — **ingen tvingad enroll**.

Placering: sista steget i onboarding, **innan** dashboard.

| Val (CTA) | System | UI |
|-----------|--------|-----|
| **Ja, hjälp oss första veckan** | Skapa `onboarding_7d`, `cohort_arm = treatment`, `status = active` | Banner, modal, programinnehåll |
| **Vi kör själva** | **Ingen** programrad | Vanlig dashboard — inget program |

Regler:

- Default: kort 1 (rekommenderas) är förvalt
- Ingen slumpmässig 50/50 A/B vid enroll i MVP v1.1
- Jämförelsegrupp = familjer som valde "Vi kör själva" (observationell, ingen `parent_activation_program`-rad)
- `cohort_arm = control` finns kvar i schemat men tilldelas **inte** vid föräldraval i MVP
- Opt-out i bannern kvarstår för enrolled familjer ("Avsluta när ni vill")

---

# Onboarding-val — copy (låst)

## Intro

> **Hur vill ni börja?**
>
> Ni har satt upp barnets schema — bra start.
>
> Många familjer upptäcker att den största utmaningen inte är att komma igång, utan att hålla i rutinen de första dagarna när vardagen tar vid.
>
> Välj det som passar er:

## Kort 1 — rekommenderas (förvalt)

| Fält | Copy |
|------|------|
| **Rubrik** | Håll i rutinen första veckan |
| **Brödtext** | Många familjer uppskattar lite stöd efter att schemat är klart. Inte för att något är fel, utan för att nya vanor tar tid att sätta sig. |
| **Fördelar** | Korta dagliga påminnelser som hjälper er hålla igång · Se när barnet klarar uppgifter utan extra tjat · Barnets schema är redan klart — vi hjälper er få rutinen att fungera · Avsluta när ni vill |
| **CTA (primär)** | **Ja, hjälp oss första veckan** |

Rubriken säljer **utfallet**, inte produktnamnet ("guidad start" ska inte stå i kortrubriken).

## Kort 2

| Fält | Copy |
|------|------|
| **Rubrik** | Kör igång direkt |
| **Brödtext** | Ni känner er redo att köra på själva. Allt finns på plats och ni kan börja direkt. |
| **Fördelar** | Direkt till dashboarden · Samma schema, stjärnor och belöningar · Använd appen i er egen takt |
| **CTA (sekundär)** | **Vi kör själva** |

## Fotnot (under valen)

> Oavsett vilket ni väljer kan ni använda appen fullt ut. Guidad start ger bara lite extra stöd under den första veckan.

## UX-regler

- Primär knapp: fylld/stark (kort 1)
- Sekundär knapp: outline/text — "Vi kör själva" ska inte kännas som fel val
- Ingen "är du säker?"-dialog vid direkt-val
- Ton: stödjande, inte dömande (ingen skuldbelagd copy vid val av kort 2)
- Barnets schema påverkas inte av valet — endast förälderns stöd första veckan

## CTA A/B-test (valfritt post-launch)

Testordning för primär knapp (håll sekundär konstant: "Vi kör själva"):

1. `Ja, hjälp oss första veckan` — primär hypotes
2. `Håll i rutinen`
3. `Välj guidad start` — kontroll

Mobil-backup (kortare par): `Få stöd första veckan` / `Vi kör själva`

---

# Cohort

Schema tillåter:

treatment
control

MVP v1.1 enroll:

- Val "Ja, hjälp oss första veckan" → `cohort_arm = treatment`
- Val "Vi kör själva" → ingen rad (jämförelsegrupp utanför tabellen)

`cohort_arm = control` tilldelas inte vid föräldraval.

Control / icke-enrolled ska INTE se:

- banner
- celebratory modal
- programinnehåll

---

# Daglogik

Två separata begrepp:

calendar_day
effective_day

calendar_day används för:

- expiry
- retention
- reflection window

effective_day används för:

- innehåll
- CTA
- progress

---

# Programlängd

onboarding_7d = 7 dagar

effective_day cap = 7

calendar_day fortsätter öka.

---

# Expiry

När:

calendar_day > 21

och

status = active

sätt:

status = expired

---

# Banner

Visa endast när:

status = active
AND cohort_arm = treatment

---

# Dag 1

Primär CTA:

inline preview

Fallback:

child-login

Track:

child_view_opened

---

# Dag 3

Om child_first_completion finns:

visa celebratory modal

Annars:

visa supportive fallback

Track:

trigger = aha
eller
trigger = supportive_fallback

---

# Celebratory modal

Måste vara modal.

Inte inline card.

Inte bannertext.

Måste kunna triggas dag 1–7.

---

# Reflection

Visas från:

calendar_day >= 7

Tills:

submitted
eller
expired

---

# Analytics

Måste implementeras:

activation_program_enroll_choice

activation_program_started

activation_program_first_banner_seen

activation_program_cta_clicked

activation_program_day_done

activation_program_completed

child_first_completion

parent_first_completion_seen

parent_aha_moment_dismissed

## activation_program_enroll_choice (Fas 4)

När föräldern väljer på onboarding-skärmen.

```json
{
  "event_type": "activation_program_enroll_choice",
  "metadata": {
    "choice": "guided",
    "cta_variant": "help_us_week_one"
  }
}
```

| Fält | Värden |
|------|--------|
| `choice` | `guided` \| `direct` |
| `cta_variant` | `help_us_week_one` \| `hold_routine` \| `choose_guided_start` \| `get_support_week_one` (endast vid CTA-test) |
| `direct_cta` | `we_run_ourselves` (konstant under CTA-test) |

`activation_program_started` loggas endast vid `choice = guided` (samma request eller direkt efter).

---

# Retention

North Star:

Family Day 14 Retention

Definition:

parent_login
OR
child_completion

under dag 13–15.

Definitionen får inte ändras.

---

# Launch

Onboarding-val-skärmen visas endast efter:

ACTIVATION_PROGRAM_LAUNCH_AT

Ingen retroaktiv enrollment.

Före launch: ingen val-skärm, ingen programrad (befintligt beteende).

---

# Success

Implementation anses klar när:

- Fas 1
- Fas 2
- Fas 3
- Fas 4

uppfyller acceptanskriterierna.
