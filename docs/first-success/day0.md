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

Inga mallar. Inga val. Inga extra steg.

---

## Direkt efter registrering

Familjen ska ha:

- Ett barn (med PIN för barninloggning)
- En färdig morgon- eller kvällsrutin
- Standardbelöningar och ifylld Skattkammare

Ingen wizard. Ingen AI. Ingen mallväljare.

### Standardrutin (morgon-exempel)

Vakna → Toalett → Klä på dig → Frukost → Borsta tänderna

### Tid på dygn

| Registrering | Rutin | Copy |
|--------------|-------|------|
| Före kl. 15 | Morgon | "Imorgon bitti är rutinen redo" |
| Efter kl. 15 | Kväll | "Ikväll kan barnet följa sin första rutin" |

Brain efter detta: core state `ONBOARDING` → `ACTIVE` när rutin finns; capability `has_routine`; need `SHOW_CHILD`.

---

## Success screen

```
# [Barn] är redo ⭐

Första rutinen är skapad.

[ Visa barnet ]     ← primär, alltid

Ändra rutinen       ← sekundär
```

Primär CTA leder till handoff — barnet ser sin rutin. Det sätter `child_seen_at` och uppfyller need `SHOW_CHILD`.

Voice: `tone: coach`. `reducesUncertainty`: "Eras första rutin är redo."

---

## Barnets första vy

```
NU        Vakna
NÄSTA     Klä på dig
SENARE    Frukost
```

Ingen barn-onboarding. Första aktivitet kan bockas av direkt → First Success-bevis (`kind: star`).

---

## Undantag

| Flöde | Beteende |
|-------|----------|
| Ny familj v2 | Dag 0 instant |
| Lägg till barn | Befintligt add-child |
| Pedagog | Utanför scope |
| Fastnade familjer | Coach `RESUME_ROUTINE` / fortsätt (befintligt barn + schema) |

---

## Experiment

```
A/B: legacy wizard vs dag 0 instant
KPI: first_success_within_48h
```

Experimentflagga hör till Coach/deploy — inte Brain.
