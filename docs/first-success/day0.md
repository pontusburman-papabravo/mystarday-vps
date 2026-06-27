# Dag 0 — First Success start

Mål: familj + färdig rutin + möjlighet till First Success-bevis **utan wizard**.

Se [FIRST-SUCCESS.md](../FIRST-SUCCESS.md) för mission och lagar.

---

## Registrering

Endast:

- Förälderns namn
- E-post
- Lösenord
- Barnets namn

---

## Backend direkt efter register

Atomiskt i samma flöde:

- Barn (emoji, PIN)
- Morgon- eller kvällsrutin (tid-på-dygn, se nedan)
- Standardbelöningar (redan seedade)
- Skattkammare ifylld
- Facts: `routine_created_at`, state → `ROUTINE_READY`

Ingen wizard. Ingen AI. Ingen mallväljare.

### Standardrutin (morgon-exempel)

Vakna → Toalett → Klä på dig → Frukost → Borsta tänderna

### Tid på dygn

| Registrering | Rutin | Copy |
|--------------|-------|------|
| Före kl. 15 | Morgon | "Imorgon bitti är rutinen redo" |
| Efter kl. 15 | Kväll | "Ikväll kan barnet följa sin första rutin" |

---

## Success screen

```
# [Barn] är redo ⭐

Första rutinen är skapad.

[ Visa barnet ]     ← primär, alltid

Ändra rutinen       ← sekundär
```

Primär CTA sätter `child_seen_at` (eller motsvarande) när handoff slutförts.

---

## Barnets första vy

```
NU        Vakna
NÄSTA     Klä på dig
SENARE    Frukost
```

Ingen barn-onboarding. Första aktivitet kan bockas av direkt.

---

## Undantag

| Flöde | Beteende |
|-------|----------|
| Ny familj v2 | Dag 0 instant |
| Lägg till barn | Befintligt add-child |
| Pedagog | Utanför scope |
| Fastnade familjer | Coach "fortsätt" (befintligt barn + schema) |

---

## Experiment

```
feature_flag: first_success_v2
A/B: legacy wizard vs dag 0 instant
KPI: first_success_within_48h
```

---

## Tekniskt

- Ny: `POST` register utökar med `instantStart()` eller `POST /api/onboarding/instant-start` efter login
- Återanvänd: child create, schedule seed, reward seed från onboarding/register
- Brain: efter register `collectFamilyFacts` → `ROUTINE_READY`
