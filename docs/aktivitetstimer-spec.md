# Aktivitetstimer — kort spec (v0.3.1)

| | |
|--|--|
| **Status** | Accepted — implemented |
| **Git** | [docs/aktivitetstimer-spec.md](https://github.com/pontusburman-papabravo/[REDACTED]-vps/blob/main/docs/aktivitetstimer-spec.md) <!-- pragma: allowlist secret --> |
| **POS** | 04 C-04 (barnvy), 06A (mobil barn-UI), 15 B (a11y, reducerad rörelse, ej blockande) |
| **Skiljer sig från** | `visual_timer` (schemafönster start–slut), `how_long` (text i De sju frågorna) |
| **Relaterat** | [bildstod-app-plan.md](./bildstod-app-plan.md), [paket-v1.2-spec.md](./paket-v1.2-spec.md) |
| **Changelog** | v0.3.1 — `timer_enabled` borttagen (härleds från `duration_seconds`); session `status` + `ended_at` (ej `cancelled_at`); designprincip. v0.3 — `duration_seconds`, Klar-rensning, localStorage, `daily_log_item_id`, ljudspec |

---

## Problem

Förälder vill säga *"borsta tänder i 2 minuter"* (eller 45 sekunder) och barnet ska se en **startbar nedräkning** (timglas + siffror). Idag finns bara schema-cirkel (kräver start+sluttid i schemat) och valfri text "Hur länge?" utan timer.

---

## Mål

| Krav | Beslut |
|------|--------|
| Default | **Av** globalt och per aktivitet |
| Vem ställer in | Förälder |
| Var | Barninställningar (master) + Bibliotek/aktivitet (per aktivitet) |
| Lagring (tid) | **`duration_seconds`** (heltal sekunder) — inte minuter i DB |
| Timer på/av per aktivitet | **`duration_seconds = null`** → ingen timer; **`≥ 5`** → timer |
| Barnvy | Progress-ring runt timglas + `M:SS` eller `0:SS` |
| Före start | Visa full tid (`2:00`, `0:45`), inte `--:--` |
| Start | Barn trycker **Starta timer** — **ingen** auto-start v1 |
| Paus | **v1: ingen paus.** Endast Start → (nedräkning) → Klar |
| Slut vid 0 | Stanna på `0:00`, **Färdig!** + ljud + lätt haptic |
| Klar före 0 | Avsluta utan slutsignal; **rensa session** (se nedan) |
| Blockerar inte | Ingen modal; **Klar** alltid tillgänglig (nödutgång) |
| Minsta tid | **5 sekunder** (`duration_seconds >= 5`) |
| Max tid | **3600 sekunder** (60 min) |

---

## Master switch vs per aktivitet

| Global (`activity_timers_enabled`) | Per aktivitet (`duration_seconds`) | Barnvy |
|-----------------------------------|-------------------------------------|--------|
| Av | sparad i biblioteket | Ingen timer |
| På | `null` | Ingen timer |
| På | ≥ 5 | Timer enligt spec |

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
| `duration_seconds` | integer nullable | `null` | `null` eller 5–3600 (heltal) |

**Visning i barnvy:** `activity_timers_enabled && duration_seconds >= 5`

**Migration:** `how_long.minutes` i `seven_questions` får **inte** auto-aktivera timer. UI kan föreslå `minutes × 60` vid redigering.

**API-exempel:**

```http
PUT /api/activities/:id
```

```json
{
  "duration_seconds": 150
}
```

Sätt `duration_seconds: null` för att stänga av timer på aktiviteten.

---

## Förälder-UI

### Barninställningar → Avancerade

- Toggle: **Aktivitetstimer (timglas)** — master, default av  
- Hjälptext: *"Masterbrytare. Sätt tid per aktivitet i biblioteket."*

### Bibliotek → Redigera aktivitet

**Normal (99 %):** snabbval i sekunder (visas som minuter i etikett där det passar):

| Knapp | `duration_seconds` |
|-------|-------------------|
| 30 s | 30 |
| 1 min | 60 |
| 2 min | 120 |
| 3 min | 180 |
| 5 min | 300 |
| 10 min | 600 |
| 15 min | 900 |
| **Anpassa…** | öppnar avancerat fält |

**Anpassa:** två heltalsfält (inga decimaler):

```
Minuter: [ 2 ]    Sekunder: [ 30 ]
```

eller ett fält `M:SS` som parsas till heltal sekunder. UI ska tydliggöra **endast heltal** — ingen 1,5 min.

**Ingen timer:** knapp som sätter `duration_seconds` till `null`.

Om master av: fält synliga men gråade + länk *"Slå på under barninställningar"*.

---

## Lokalt runtime-objekt (ej server)

**Lagring:** **`localStorage` endast** (inte `sessionStorage`). Safari/WebView kan döda sessioner; `localStorage` överlever omladdning.

**Nyckel:** `activity_timer_session:{childId}:{scheduleDate}:{daily_log_item_id}`

**Primär identifierare:** `daily_log_item_id` — **inte** `activity_id`.  
Samma aktivitet två gånger samma dag (t.ex. borsta tänder morgon + kväll) får **separata** sessioner.

```text
activity_timer_session
----------------------
daily_log_item_id   (PK i praktiken — obligatorisk)
child_id
schedule_date       (YYYY-MM-DD, barnets tidszon)
duration_seconds    (snapshot vid start — pågående session påverkas inte av senare API-ändring)
status              idle | running | finished
started_at          (ISO 8601, null om ej startad)
ended_at            (ISO 8601, när 0 nåtts)
end_sound_played    (boolean — ljud max en gång per session)
```

Vid **Klar** (före eller efter 0): session **tas bort** helt (`localStorage.removeItem`) — ingen `cancelled_at`.

**Två timers samma dag:** får **aldrig** dela session eller påverka varandra (acceptanstest #11).

---

## Tidkälla och klockändringar

**Systemklockan** (`Date.now()`) är sann källa för återstående tid.

Mindre avvikelser vid manuell klockändring, resa eller automatisk tidshopp **accepteras**. Aktivitetstimern är ett **hjälpmedel**, inte exakt tidtagning — ingen NTP-kompensation v1.

---

## Återhämtning och rensning

### Vid Start

Spara `started_at` + `duration_seconds` + `status: running` i `localStorage`.

### Vid reload / bakgrund / låst skärm

`remaining = duration_seconds - (now - started_at)` i verklig tid.

- Om `remaining <= 0` → **FINISHED** (0:00, slutljud max en gång per session).  
- Om aktiviteten är **klar** i API → rensa session (se Klar nedan).

### När **Klar** trycks (normativt) ⭐

1. Lokalt `activity_timer_session` för detta **`daily_log_item_id` tas bort** (`localStorage.removeItem`).  
2. **Ingen** timer återställs vid reload — IDLE eller borttagen UI.  
3. Aktiviteten markeras klar enligt **befintligt** avbockningsflöde (ingen ändring av completion-API).

Eliminerar race där gammal timer dyker upp efter Klar.

### Om aktiviteten försvinner från NU

Om posten inte längre är aktuell i dagens schema (förälder flyttat, schema ändrat, dag regenererad, annat NU-kort):

> Eventuell lokal timersession för det `daily_log_item_id` **avslutas och rensas** från `localStorage`.

### Förälder ändrar `duration_seconds` under RUNNING

Pågående session påverkas **inte**. Ändringar gäller nästa start.

---

## Livscykel (tillstånd)

```
IDLE          full tid (2:00 / 0:45), [Starta timer]
  │ start (debounce 300 ms, optimistic UI)
  ▼
RUNNING       nedräkning, ingen Start-knapp
  │ Klar före 0              │ remaining → 0
  ▼                          ▼
DONE_EARLY    session BORTTAGEN   FINISHED   ended_at, 0:00, Färdig!
  aktivitet klar                    │ ↻ Starta igen (sekundär)
                                    ▼
                              RUNNING (ny started_at)
```

| Tillstånd | UI |
|-----------|-----|
| IDLE | ring full + tid + **[Starta timer]** + [Klar] |
| RUNNING | ring töms + `M:SS` + **[Klar]** |
| FINISHED | `0:00` + **Färdig!** + **[Klar]** (primär) + *↻ Starta igen* (sekundär, mindre) |
| DONE_EARLY | timer borta, aktivitet bockad |

**Paus v1:** nej.

**Omstart:** efter 0:00 — **Starta igen** (diskret länk under Klar). Efter **Klar** — ingen omstart i barnvy.

**Start-knapp:** ersätts **omedelbart** vid tryck; debounce förhindrar dubbel session.

---

## Vid 0:00

```
      ◜⏳◝
       0:00
     Färdig!

      [ Klar ]

   ↻ Starta igen
```

- **Aldrig** negativ tid.  
- **Ljud (normativt):** max **500 ms**, **låg volym**, **en ton**, spelas **en gång** per session — aldrig upprepas vid re-render. `prefers-reduced-motion` → hoppa över ljud.  
- **Haptic:** lätt vid 0.  
- **Klar** är visuellt primär; **Starta igen** sekundär (textlänk, inte lika stor knapp).

**Klar före 0:** **ta bort** `localStorage`-session, inget ljud, ingen Färdig!.

---

## Barnvy (NU-kort)

**Formatering:** `duration_seconds` → visning

| Sekunder | Visning |
|----------|---------|
| ≥ 60 | `M:SS` (t.ex. `2:00`, `1:47`) |
| < 60 | `0:SS` (t.ex. `0:45`, `0:07`) |

**Progress-ring:**

- Ringen **töms medurs** när tiden rinner ut (full ring = hela tiden kvar; tom ring = 0:00).  
- Färg: grön >50%, orange >20%, röd ≤20% — **alltid** tillsammans med siffra + ikon.  
- Sista 20%: färgskifte OK — **ingen** blink, puls eller skakning.

**Uppdatering:** beräkning från `Date.now()`; visuell uppdatering 1 Hz.

**Haptic vid Start:** lätt (light).

**Timer endast på NU-kort** v1.

---

## Tillgänglighet

| Krav | Implementation |
|------|----------------|
| `prefers-reduced-motion` | **Ingen kontinuerlig animation** (inga svep, puls, blink). Diskret uppdatering av ring/siffra 1 Hz är OK. |
| VoiceOver | `aria-live="polite"`; t.ex. *"Timer. En minut trettio sekunder kvar."* (var ~15 s eller vid färgbyte, inte varje sekund) |
| Färg | Alltid parat med siffra + text/ikon |
| Kontrast | Siffror ≥ WCAG AA (15) |

---

## Förifyllda värden (sekunder, vid master-aktivering)

| Aktivitet (match namn) | `duration_seconds` |
|------------------------|-------------------|
| Tvätta händer | 30 |
| Medicin | 30 |
| Borsta tänder* | 120 |
| Hårborstning | 180 |
| Pyjamas | 180 |
| Klä på sig*, Packa *väska | 300–480 |
| Duscha | 480 |
| Bada | 720 |
| Godnattsaga, Läsa* | 600 |
| Läxor | 1200 |

**Utan förslag:** Vakna, Sova, Skola/Förskola, Leka*, Pyssel, Rast, Utflykt, blockaktiviteter.

---

## API

- `PUT /api/children/:id` — `activity_timers_enabled`  
- `PUT /api/activities/:id` — `duration_seconds` (`null` eller 5–3600)  
- `GET /api/daily-logs/child/...` — `duration_seconds` per **daily_log_item** när master på  

Ingen server-side timer-state.

---

## Avgränsning v1

| Ingår | Ingår inte |
|-------|------------|
| `duration_seconds` 5–3600 eller `null` | Separat `timer_enabled`-fält |
| `localStorage` + `daily_log_item_id` | `sessionStorage`, nyckel på `activity_id` |
| Klar rensar session | Timer kvar efter Klar |
| Progress-ring töms medurs | Paus |
| Ljudspec 500 ms | Push/larm |
| Starta igen (sekundär) | Auto-start vid NU |
| Ersätter inte `visual_timer` | Schema-cirkel oförändrad |

---

## Acceptanskriterier

1. Master av → ingen timer i barnvy.  
2. Master på + 120 s → barn ser `2:00` + Start.  
3. 45 s → barn ser `0:45` + Start.  
4. Start → knapp borta direkt; dubbeltryck = en session.  
5. Lås skärm 30 s under 2-min timer → korrekt återstående (verklig tid).  
6. 0:00 → Färdig! + ljud en gång (≤500 ms); aldrig negativ tid.  
7. **Klar** vid 1:30 → inget ljud; **localStorage-session borta**; reload visar ingen pågående timer.  
8. Förälder ändrar duration under RUNNING → pågående oförändrad.  
9. Aktivitet försvinner från NU → session rensad.  
10. VoiceOver läser återstående tid vid behov.  
11. **Två olika aktiviteter med timer samma dag delar inte session** (olika `daily_log_item_id`).  
12. Samma `activity_id` två gånger samma dag → **två** oberoende sessioner.  
13. `test:gate` + mobil QA (iPhone Safari, Android Chrome, WebView).

---

## Låsta beslut (register)

| Fråga | Beslut |
|-------|--------|
| Auto-start vid NU? | Nej v1 |
| Timer på SEDAN? | Nej v1 |
| Paus? | Nej v1 |
| Timer på/av per aktivitet | `duration_seconds` null vs ≥ 5 |
| Lagring | `localStorage` |
| Session-nyckel | `daily_log_item_id` (+ child + datum) |
| Tidsenhet i DB | `duration_seconds` |
| Klockändring | Systemklocka; hjälpmedel, inte exakt |
| Pictogram | `wait` / `timer_*`; emoji ⏳ fallback |
| Ring | Töms medurs |
| Ljud | ≤500 ms, låg volym, en ton, en gång |
| Reduced motion | Ingen kontinuerlig animation; 1 Hz diskret OK |
| Klar före 0 | Rensa session — ingen `cancelled_at` |

---

## Designprincip

> **Aktivitetstimern är ett visuellt stöd för barnet, inte en exakt tidtagare eller ett verktyg för kontroll.** Vid konflikt mellan enkelhet och teknisk precision prioriteras ett förutsägbart och lugnt användarflöde.

Använd denna kompass vid framtida önskemål (auto-paus, synk mellan enheter, föräldrarlogg, push, schemaändring under pågående timer).
