# Föräldraaktivering 7D — Implementation Contract

Version: MVP v1.0

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

# Cohort

Tillåt endast:

treatment
control

Control ska existera i databasen.

Control ska INTE se:

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

activation_program_started

activation_program_first_banner_seen

activation_program_cta_clicked

activation_program_day_done

activation_program_completed

child_first_completion

parent_first_completion_seen

parent_aha_moment_dismissed

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

Enrollment tillåts endast efter:

ACTIVATION_PROGRAM_LAUNCH_AT

Ingen retroaktiv enrollment.

---

# Success

Implementation anses klar när:

- Fas 1
- Fas 2
- Fas 3
- Fas 4

uppfyller acceptanskriterierna.
