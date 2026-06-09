# Activation Program Invariants

Får aldrig brytas.

Full spec: [foraldaraktivering-7-dagar-spec.md](./foraldaraktivering-7-dagar-spec.md)

---

## 1

Ingen current_day-kolumn.

---

## 2

status och cohort_arm är separata koncept.

---

## 3

control_holdout får aldrig användas som status.

---

## 4

Banner query:

status = active
AND cohort_arm = treatment

---

## 5

Control-arm ska finnas i databasen.

---

## 6

Control-arm får aldrig få behandling.

---

## 7

Celebratory card ska vara modal.

---

## 8

child_first_completion och parent_first_completion_seen är separata events.

---

## 9

parent_first_completion_seen får endast triggas en gång per programkörning.

---

## 10

Day 14 retention-definitionen är fryst.

---

## 11

Family Day 14 är North Star.

Parent Day 14 är endast diagnostisk.

---

## 12

Ingen retroaktiv enrollment.

---

## 13

ACTIVATION_PROGRAM_LAUNCH_AT får inte ändras efter launch.

---

## 14

Programmet fortsätter efter missad dag.

Ingen negativ copy.

---

## 15

MVP får endast skapa onboarding_7d.
