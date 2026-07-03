# Aktivitetstimer — kort spec (v0.2)

| | |
|--|--|
| **Status** | Accepted — designspec (implementation i separat PR) |
| **Git** | [docs/aktivitetstimer-spec.md](https://github.com/pontusburman-papabravo/mystarday-vps/blob/main/docs/aktivitetstimer-spec.md) <!-- pragma: allowlist secret --> |
| **POS** | 04 C-04 (barnvy), 06A (mobil barn-UI), 15 B (a11y, reducerad rörelse, ej blockande) |
| **Skiljer sig från** | `visual_timer` (schemafönster start–slut), `how_long` (text i De sju frågorna) |
| **Relaterat** | [bildstod-app-plan.md](./bildstod-app-plan.md), [paket-v1.2-spec.md](./paket-v1.2-spec.md) |
| **Changelog** | v0.2 — livscykel, kantfall, a11y, ljud, master switch, lokalt session-objekt |

---

## Problem

Förälder vill säga *"borsta tänder i 2 minuter"* och barnet ska se en **startbar nedräkning** (timglas + siffror). Idag finns bara schema-cirkel (kräver start+sluttid i schemat) och valfri text "Hur länge?" utan timer.

---

## Mål

| Krav | Beslut |
|------|--------|
| Default | **Av** globalt och per aktivitet |
| Vem ställer in | Förälder |
| Var | Barninställningar (master) + Bibliotek/aktivitet (per aktivitet) |
| Barnvy | Progress-ring runt timglas + `M:SS` |
| Före start | Visa full tid (`2:00`), inte `--:--` |
| Start | Barn trycker **Starta timer** — **ingen** auto-start v1 |
| Paus | **v1: ingen paus.** Endast Start → (nedräkning) → Klar |
| Slut vid 0 | Stanna på `0:00`, visa **Färdig!** + ljud + lätt haptic |
| Klar före 0 | Avsluta utan slutsignal (inget ljud, ingen "Färdig!") |
| Blockerar inte | Ingen modal; **Klar** alltid tillgänglig (nödutgång) |
| Minsta tid | **1 minut** (`timer_minutes >= 1`) |

---

## Master switch vs per aktivitet

Två fält behålls — men beteendet ska vara **tydligt**:

| Global (`activity_timers_enabled`) | Per aktivitet (`timer_enabled` + minuter) | Barnvy |
|-----------------------------------|-------------------------------------------|--------|
| Av | sparad i biblioteket | Ingen timer |
| På | av | Ingen timer |
| På | på + minuter ≥ 1 | Timer enligt spec |

**Föräldra-copy (global toggle):** *"Masterbrytare. Individuella inställningar i biblioteket sparas även när detta är av."*

Biblioteket visar alltid per-aktivitet-inställningar (gråade när master av).

---

## Datamodell (persistens)

**Barn** (`child`):

| Fält | Typ | Default |
|------|-----|---------|
| `activity_timers_enabled` | boolean | `false` |

**Aktivitet** (`activity_template`):

| Fält | Typ | Default | Validering |
|------|-----|---------|------------|
| `timer_enabled` | boolean | `false` | |
| `timer_minutes` | smallint nullable | `null` | om `timer_enabled`: 1–60 |

**Visning i barnvy:** `activity_timers_enabled && timer_enabled && timer_minutes >= 1`

**Migration:** `how_long.minutes` i `seven_questions` får **inte** auto-aktivera timer. UI kan föreslå samma värde vid redigering.

---

## Lokalt runtime-objekt (ej server)

Timer-state lever **endast i klienten** (localStorage / sessionStorage per barn + dag + aktivitet):

```text
activity_timer_session
----------------------
daily_log_item_id   (eller schedule item id + datum)
activity_id
duration_seconds    (från timer_minutes × 60)
started_at          (ISO 8601, null om ej startad)
ended_at            (ISO 8601, när 0 nåtts eller Klar)
cancelled_at        (ISO 8601, vid Klar före 0)
```

**Återhämtning vid bakgrund / reload / låst skärm:**

1. Vid **Start** sparas `started_at` + `duration_seconds` lokalt.  
2. Vid återöppning: `remaining = duration_seconds - (now - started_at)` i **verklig tid**, inte antal renderade tick.  
3. Om `remaining <= 0` → behandla som **Färdig!**-tillstånd (0:00, slutsignal redan spelad max en gång per session).  
4. Om aktiviteten är **Klar** i API → rensa session, visa inte timer.

**Förälder ändrar aktivitet under pågående timer:**

> Pågående session påverkas **inte**. Ändringar i biblioteket gäller **nästa** gång aktiviteten startas (ny dag eller ny NU-session utan aktiv `started_at`).

---

## Livscykel (tillstånd)

```
IDLE          full tid visas (2:00), [Starta timer]
  │ start (debounce, ingen dubbeltryck)
  ▼
RUNNING       nedräkning, Start-knapp borta
  │ klar före 0          │ remaining → 0
  ▼                      ▼
DONE_EARLY    cancelled_at    FINISHED   ended_at, 0:00, Färdig!
  (ingen ljud)                  │ starta igen
                                ▼
                          RUNNING (ny started_at, samma duration)
```

| Tillstånd | UI |
|-----------|-----|
| IDLE | `⏳` + ring + `2:00` + **[Starta timer]** |
| RUNNING | ring fylls + `1:47` — **ingen Start-knapp** |
| FINISHED | `0:00` + **Färdig!** + **[Starta igen]** + **[Klar]** |
| DONE_EARLY | (aktivitet bockad) — timer borta |

**Paus v1:** finns **inte**. Felstart → vänta ut eller tryck **Klar** (förälder kan avbocka i daglig logg v1.1).

**Omstart:**

- Efter **0:00** (FINISHED): barnet kan trycka **Starta igen** → ny `started_at`, samma `duration_seconds`. Aktiviteten är fortfarande inte klar.  
- Efter **Klar**: ingen omstart i barnvy (aktivitet avbockad). Förälder hanterar via daglig logg.

**Start-knapp:** Efter tryck ersätts den **omedelbart** av nedräkning (optimistic UI + debounce 300 ms) — inga race conditions vid dubbeltryck.

---

## Vid 0:00 (normativt)

```
      ◜⏳◝
       0:00
     Färdig!

 [Starta igen]   [Klar]
```

- **Aldrig** negativ tid (`-0:17` förbjudet).  
- Timern **stannar** på `0:00`.  
- Text: **Färdig!** (inte bara siffror).  
- **Ljud:** kort, mjukt "klart"-ljud (samma familj som befintliga celebration-ljud; respektera `prefers-reduced-motion` → dämpa eller hoppa över ljud).  
- **Haptic:** lätt vid 0 (medium endast om redan använt i appen).  
- **Klar** finns kvar — barnet blockereras inte.

**Klar före 0:** sätt `cancelled_at`, rensa ljudkö, **ingen** Färdig!-text, **inget** slutljud.

---

## Barnvy (NU-kort)

**Före start:**

```
NU — Borsta tänderna
[🪥]        ◜⏳◝
            2:00
      [ Starta timer ]
      [ ○ Klar ]
```

**Under nedräkning:**

```
            ◜⏳◝
            1:47
      [ ○ Klar ]
```

- Uppdatering: **1 Hz** (eller `requestAnimationFrame` med beräkning från `Date.now()`).  
- **Progress-ring** runt timglas — primär visuell "hur mycket kvar".  
- Färg på ring: grön >50%, orange >20%, röd ≤20% — **kompletteras alltid** med siffror + ikon (färg får aldrig vara enda signalen).  
- Sista 20%: färgskifte till rött/orange tillåtet — **ingen** blink, skakning eller aggressiv puls.  
- **Haptic vid Start:** lätt vibration (light) som bekräftelse.  
- Touch: min **44pt** på Starta / Klar / Starta igen.  
- Timer visas **bara på NU-kort**, inte på SEDAN-listan v1.

---

## Tillgänglighet

| Krav | Implementation |
|------|----------------|
| `prefers-reduced-motion` | Statisk ring/siffra, ingen ring-animation, inget ljud (eller mycket kort) |
| VoiceOver | `aria-live="polite"` på sifferfält; läs t.ex. *"Timer. En minut trettio sekunder kvar."* vid väsentlig ändring (var 15 s eller vid färgbyte, inte varje sekund) |
| Färg | Alltid parat med siffra + text/ikon |
| Kontrast | Siffror mot bakgrund ≥ WCAG AA (15) |

---

## Förälder-UI

### Barninställningar → Avancerade

- Toggle: **Aktivitetstimer (timglas)** — master, default av  
- Hjälptext: *"Masterbrytare. Sätt minuter per aktivitet i biblioteket."*

### Bibliotek → Redigera aktivitet

- `[ ] Visa nedräkningstimer`  
- `Minuter:` 1–60, snabbval 1 / 2 / 5 / 10 / 15  
- Om master av: fält synliga men gråade + länk *"Slå på under barninställningar"*

---

## Förifyllda minuter (förslag vid första master-aktivering)

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

**Utan förslag:** Vakna, Sova, Skola/Förskola, Leka*, Pyssel, Rast, Utflykt, blockaktiviteter.

---

## API

- `PUT /api/children/:id` — `activity_timers_enabled`  
- `PUT /api/activities/:id` — `timer_enabled`, `timer_minutes` (validera ≥ 1 om enabled)  
- `GET /api/daily-logs/child/...` — `timer_enabled`, `timer_minutes` per item när master på  

**Ingen** server-side timer-state. Klar via befintlig avbockning = sanning.

---

## Avgränsning v1

| Ingår | Ingår inte |
|-------|------------|
| En timer per aktivitet | Timer per delsteg |
| Manuell start | Auto-start vid NU |
| Lokalt `activity_timer_session` | Server-sync av timer |
| Progress-ring + timglas + ljud vid 0 | Push/larm |
| Starta igen efter 0 | Paus |
| Ersätter inte `visual_timer` | Schema-cirkel oförändrad |
| Ljud + haptic vid 0 | Aggressiv animation sista 20% |

---

## Acceptanskriterier

1. Ny familj: master **av** → ingen timer i barnvy.  
2. Master på + Borsta tänder 2 min → barn ser `2:00` + Start (inte `--:--`).  
3. Start → knapp försvinner direkt; dubbeltryck startar inte två sessioner.  
4. Lås skärm 30 s under 2-min timer → återstående tid korrekt (verklig tid).  
5. 0:00 → Färdig! + ljud en gång; aldrig negativ tid.  
6. Klar vid 1:30 → inget slutljud; aktivitet bockad.  
7. Förälder ändrar 2→5 min under RUNNING → pågående fortfarande 2 min.  
8. Master av → biblioteksinställningar kvar men barnvy utan timer.  
9. VoiceOver läser återstående tid vid behov.  
10. `test:gate` + mobil QA (iPhone Safari, Android Chrome, WebView).

---

## Låsta beslut (tidigare öppna frågor)

| Fråga | Beslut v0.2 |
|-------|-------------|
| Auto-start vid NU? | **Nej** v1 |
| Timer på SEDAN? | **Nej** v1 |
| Paus? | **Nej** v1 |
| Pictogram | `wait` / `timer_*` från bildbiblioteket; emoji ⏳ fallback |
| Ljud vid klart? | **Ja** v1 (reduced-motion respekteras) |
