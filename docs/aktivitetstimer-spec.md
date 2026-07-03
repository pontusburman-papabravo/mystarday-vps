# Aktivitetstimer — kort spec (v0.1)

| | |
|--|--|
| **Status** | Förslag · ej implementerad |
| **Git** | [docs/aktivitetstimer-spec.md](https://github.com/pontusburman-papabravo/mystarday-vps/blob/main/docs/aktivitetstimer-spec.md) <!-- pragma: allowlist secret --> |
| **POS** | 04 C-04 (barnvy), 06A (mobil barn-UI), 15 B (reducerad rörelse / ej blockande) |
| **Skiljer sig från** | `visual_timer` (schemafönster start–slut), `how_long` (text i De sju frågorna) |
| **Relaterat** | [bildstod-app-plan.md](./bildstod-app-plan.md), [paket-v1.2-spec.md](./paket-v1.2-spec.md) |

---

## Problem

Förälder vill säga *"borsta tänder i 2 minuter"* och barnet ska se en **startbar nedräkning** (timglas + siffror). Idag finns bara schema-cirkel (kräver start+sluttid i schemat) och valfri text "Hur länge?" utan timer.

---

## Mål

| Krav | Beslut |
|------|--------|
| Default | **Av** globalt och per aktivitet |
| Vem ställer in | Förälder |
| Var | Barninställningar (global) + Bibliotek/aktivitet (per aktivitet) |
| Barnvy | Timglas + `M:SS` nedräkning |
| Start | Barn trycker **Starta timer** (v1); auto-start vid NU = öppen fråga v1.1 |
| Slut | Tid = 0 → mjuk signal (haptic + kort text); **Klar** stoppar alltid |
| Blockerar inte | Ingen modal; Klar alltid tillgänglig (nödutgång) |

---

## Datamodell

**Barn** (`child` eller `child_view_config`):

| Fält | Typ | Default |
|------|-----|---------|
| `activity_timers_enabled` | boolean | `false` |

**Aktivitet** (`activity_template`):

| Fält | Typ | Default |
|------|-----|---------|
| `timer_enabled` | boolean | `false` |
| `timer_minutes` | smallint nullable | `null` |

**Visning i barnvy:** `activity_timers_enabled && timer_enabled && timer_minutes > 0`

**Migration av befintlig data:** `how_long.minutes` i `seven_questions` får **inte** auto-aktivera timer. Vid redigering kan UI föreslå samma minutvärde.

---

## Förälder-UI

### Barninställningar → Avancerade

- Toggle: **Aktivitetstimer (timglas)** — default av  
- Hjälptext: *"Nedräkning per aktivitet som du slår på i biblioteket."*

### Bibliotek → Redigera aktivitet

- `[ ] Visa nedräkningstimer`  
- `Minuter:` steg 1–60 (snabbval 1 / 2 / 5 / 10 / 15)  
- Om globalt av: fält gråade + länk till barninställningar

---

## Barnvy (NU-kort)

```
NU — Borsta tänderna
[aktivitetsbild]     [⏳]
                      1:47
[ Starta timer ]  (döljs när igång)
[ ○ Klar ]
```

- Uppdatering: 1 Hz  
- Färger: grön >50% kvar, orange >20%, röd ≤20% (samma semantik som schema-timer)  
- `prefers-reduced-motion`: statisk siffra, ingen animation på timglas  
- Touch: min 44pt på Starta / Klar

---

## Förifyllda minuter (endast när förälder aktiverar funktionen)

Föräldern väljer själv per aktivitet. Vid **första aktivering** av global toggle kan vi föreslå (inte auto-på):

| Aktivitet (match namn) | Föreslagen min |
|------------------------|----------------|
| Borsta tänder* | 2 |
| Tvätta händer | 1 |
| Hårborstning | 3 |
| Duscha | 8 |
| Bada | 12 |
| Medicin | 1 |
| Klä på sig*, Packa *väska | 5–8 |
| Pyjamas | 3 |
| Godnattsaga, Läsa* | 10 |
| Läxor | 20 |

**Utan förslag (lämna av):** Vakna, Sova, Skola/Förskola, Leka*, Pyssel, Rast, Utflykt, blockaktiviteter.

---

## API (utkast)

- `PUT /api/children/:id` — `activity_timers_enabled`  
- `PUT /api/activities/:id` — `timer_enabled`, `timer_minutes`  
- `GET /api/daily-logs/child/...` — inkludera `timer_enabled`, `timer_minutes` per item när barn-flagga på

Ingen server-side timer-state v1 (klient räknar; Klar = sanning).

---

## Avgränsning v1

| Ingår | Ingår inte |
|-------|------------|
| En timer per aktivitet | Timer per delsteg |
| Manuell start | Push/larm vid 0 |
| Ersätter inte `visual_timer` | Schema-cirkel kvar oförändrad |
| Timglas + siffror | Ljud (v1.1) |

---

## Acceptanskriterier

1. Ny familj: global timer **av**, inga timers i barnvy.  
2. Förälder slår på global + sätter Borsta tänder 2 min → barn ser Starta + nedräkning.  
3. Klar före 0 → timer stoppas, aktivitet bockas som idag.  
4. Global av → per-aktivitet-inställningar sparas men syns inte i barnvy.  
5. `test:gate` + manuell mobil QA (iPhone Safari, Android Chrome).

---

## Öppna frågor

- Auto-start när aktivitet blir NU? (rekommendation: **nej** v1)  
- Visa timer på SEDAN-listan eller bara NU? (rekommendation: **bara NU** v1)  
- Pictogram: emoji ⏳ vs `wait` / `timer_5` från bildbiblioteket?
