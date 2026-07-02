# Informationsarkitektur — barnapp

> **Syfte:** Teamreferens för design, backend och test. Styr var funktioner *bor*, inte bara var de *finns*.
>
> **Engineering:** [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`implementation-plan-3-layers.md`](./implementation-plan-3-layers.md)
>
> **Senast uppdaterad:** 2026-06-10 · **Branch:** `main`
>
> **⚠️ IA superseded (2026-07-02):** Canonical child places are **Idag · Min värld · Familj** per `product-operating-system/00A_EXPERIENCE_MANIFESTO.md` and ADR `14_DECISION_LOG.md` §1. Skattkammaren is a reward surface, not a root tab. This doc remains for historical engineering context.

---

## 1. Produktprincip (en rad som styr allt)

| Lager | Roll | Fråga det svarar på |
|-------|------|---------------------|
| **Idag** | Handling | *Vad gör jag nu?* |
| **Skattkammaren** | Mening | *Varför gör jag det?* |
| **Familj** | Relation | *Vad gör vi tillsammans?* |

**Designregel:** Idag skapar handling. Skattkammaren skapar känsla. Familj skapar samarbete.

Om Idag börjar skapa känsla → den blir rörig.  
Om Skattkammaren börjar kräva handling → den blir svag.

---

## 2. Systemöversikt (nu vs vision)

### LIVE på `main`

| Komponent | Status | Kod / API |
|-----------|--------|-----------|
| 🟡 **Idag** (quest layer) | ⚠️ Delvis | `child-today-focus.js`, `child-dashboard-warmth.js` |
| 🌈 **Skattkammaren** (game loop) | ✅ Klar | `child-skatt-house.js` + universe-moduler |
| 👤 **Barnprofil** | ✅ Klar | `child`, `avatar_url`, `avatar_config` |
| 🏛️ **Museum** (bakåtblick) | ✅ Grund | `GET /api/family/museum`, `child-museum.js` |
| 🎮 **Avatar / husdjur / samlingar** | ✅ Delvis | `child_universe` migration, `/api/me/universe` |
| ⚙️ **Profil / system** | ✅ Klar | Inställningar, notiser, familj |

### VISION (ej byggd)

| Komponent | Status | Notering |
|-----------|--------|----------|
| 🏡 **Familjehallen** (nav) | ✅ Live | `child-family-hall.js`, `GET /api/me/family` |
| 🎯 **Familjeprojekt** | ❌ | Delmål från alla medlemmar |
| ⭐ **Familjestjärnor** | ❌ | Auto-aggregat från barnaktivitet |
| 📖 **Familjens berättelse** | ❌ | Gemensam narrativ historik |
| 🧭 **Vuxenbidrag** | ❌ | Middag, saga, utflykt — inte jobb |

---

## 3. Mental karta (hela appen)

```
🏠 APPEN
│
├── 🟡 IDAG (HANDLING)
│   ├── 🎯 Dagens uppdrag          [PRIMÄR]
│   ├── 🎁 Dagens belöning/⭐      [sekundär, per aktivitet]
│   ├── 🎯 Långsiktigt mål        [kompakt teaser]
│   └── 🚪 CTA → Skattkammaren     [sekundär]
│
├── 🌈 SKATTKAMMAREN (MENING)
│   ├── 🏰 Universum (hus + rum)
│   ├── ⭐ Stjärnkista
│   ├── 🏆 Troférum
│   ├── 🎁 Belöningshylla + Butik
│   ├── 📚 Historiebok
│   ├── 🧸 Samlingar
│   ├── 🐾 Husdjur
│   ├── 🧑 Avatar
│   └── 🏛️ Museum
│
├── 👨‍👩‍👧 FAMILJ (FRAMTID)
│   ├── 🏡 Familjehallen (nav)
│   ├── 🎯 Familjeprojekt
│   ├── ⭐ Familjeskista
│   ├── 📖 Familjens berättelse
│   └── 🧭 Vuxenbidrag
│
├── ⚙️ PROFIL / SYSTEM
│   ├── 👤 Barnprofil
│   ├── 👨‍👩‍👧 Familjekoppling
│   ├── 🔔 Notiser
│   └── ⚙️ Inställningar
│
└── 🔄 DATAFLÖDE
    ├── aktivitet klar → +⭐ barn
    ├── stjärnor → unlocks → universum
    ├── historik → museum + berättelse
    └── (framtid) aktivitet → +⭐ familj → familjeprojekt
```

---

## 4. 🟡 IDAG — specifikation (action layer)

### Syfte

Barnet ska veta **exakt vad de ska göra nu** — inom 3 sekunder.

### Ska innehålla

| Element | Prioritet | Live? |
|---------|-----------|-------|
| Max 3–5 aktiviteter (checklist) | Primär | ⚠️ Hela schemat visas |
| Tydlig dagprogress (`3 av 5 klara`) | Primär | ✅ |
| Liten belöning per aktivitet (`+3 ⭐`) | Sekundär | ❌ |
| Kompakt långsiktigt mål (`47/150`) | Sekundär | ✅ |
| CTA "Gå till Skattkammaren" | Sekundär | ✅ |

### Ska INTE innehålla

| Element | Live? | Åtgärd |
|---------|-------|--------|
| Veckokalender | ⚠️ Dold i DOM | Ta bort eller flytta till "Andra dagar" |
| Full historik | ✅ Borta från Idag | — |
| Detaljerad statistik / saldo-box | ✅ Dolt | — |
| Stora dashboards / progressring i header | ⚠️ Synlig | **Minimera header** |
| Konkurrerande UI-sektioner | ⚠️ Delvis | Fortsätt förenkla |

### UI-regel

> **En skärm = en primär handling.**

Primär handling = bocka av nästa uppdrag.  
Allt annat är sekundärt eller borta.

### Filer

- `public/js/child-today-focus.js`
- `public/css/child-today-focus.css`
- `public/js/child-dashboard-warmth.js` (narrativ historik → hör hemma i Skattkammaren)

---

## 5. 🌈 SKATTKAMMAREN — spec (meaning layer)

### Syfte

Barnet ska förstå **varför** de gör saker och känna progression över tid.

### Innehåller (live)

| Rum | Fil / API | Unlock-villkor |
|-----|-----------|----------------|
| 🏰 Universum (hubb) | `child-skatt-house.js` | Alltid |
| ⭐ Stjärnkista | `child-skatt-house.js` | Alltid |
| 🎯 Drömvägg (mål) | `renderSkattkammaren` | Alltid |
| 🛍️ Butiken | `renderSkattkammaren` | Alltid |
| 🏆 Troférum | `child-achievements.js` | 10⭐ livstid |
| 🎁 Belöningshylla | `child-skatt-house.js` | 10⭐ livstid |
| 🧑 Avatar | `child-avatar.js` | 15⭐ livstid |
| 🗂️ Samlingar | `child-collections.js` | 30⭐ livstid |
| 📖 Historiebok | `child-dashboard-warmth.js` | 30⭐ livstid |
| 🐾 Husdjur | `child-pet.js` | 50⭐ livstid |
| 🏛️ Museum | `child-museum.js` | 100⭐ livstid |

**Teman:** 🏰 Slott (0⭐) · 🌳 Trädkoja (75⭐) · 🚀 Rymden (150⭐)

### Regler

- Ingen *"vad ska jag göra nu"*
- Ingen checklist-fokus
- Ingen primär CTA
- Allt är explorativt

### Filer

- `public/js/child-skatt-house.js` — hubb + navigation
- `public/js/child-universe-client.js` — API-klient
- `src/lib/universe-engine.js` — unlocks + progression
- `src/routes/child-universe.js` — `/api/me/universe`
- `migrations/1800000000000_child_universe.js`

---

## 6. 👨‍👩‍👧 FAMILY LAYER (ej byggd)

### Syfte

Göra individuell motivation till **gemensam riktning**.

### Komponenter (plan)

| Komponent | Beskrivning |
|-----------|-------------|
| 🏡 **Familjehallen** | Appens framtida nav — det enda rum alla går in i |
| 🎯 **Familjeprojekt** | t.ex. "Liseberg" med delmål per familjemedlem |
| ⭐ **Familjeskista** | Auto-aggregat: barnaktivitet → `+1` familj (barnet gör inget extra) |
| 📖 **Familjens berättelse** | Gemensam narrativ historik (inte statistik) |
| 🧭 **Vuxenbidrag** | Middag, saga, planerad utflykt — **inte** jobb |

### Viktig regel

> **Familj = berättelse, inte ekonomi.**

Testa med prototyp innan migration. Se testprinciper §8.

### Vad som finns idag (inte Familjehallen)

- `GET /api/family/museum` — livstidsstatistik (aktiviteter, belöningar, stjärnor)
- `public/js/family-museum.js` — kort på `/family`
- Barnets museum-rum — per-barn statistik + årsberättelse

Detta är **bakåtblick**, inte *"vi sparar tillsammans"*.

---

## 7. 🔄 Dataflöde (source of truth)

### Live

```
aktivitet klar (daily_log_item.completed)
    → +⭐ barn (star_value)
    → stjärnsaldo (getStarBalance)
    → unlocks (universe-engine.syncUnlocks)
        → rum låses upp (house_config.unlocked_rooms)
        → prestationer (child_achievement)
        → samlarföremål (child_collectible)
    → historik (reward_redemption)
        → historiebok (narrativ)
        → museum (statistik)
```

### Planerat (Familj-lager)

```
aktivitet klar
    → +⭐ barn (oförändrat)
    → +1 ⭐ familj (auto, ingen UI för barnet)

vuxenbidrag (middag, saga, utflykt)
    → +⭐ familj (endast familj, inte personligt)

familjestjärnor
    → driver familjeprojekt-progress
    → INTE separat "ekonomi" i barnets UI
```

---

## 8. Design-konflikter att undvika

### ❌ Fel

| Konflikt | Varför det skadar |
|----------|-------------------|
| Idag + Skattkammaren båda känns som "hem" | Barn vet inte var de ska börja |
| För många siffror i Idag | Systemkänsla, inte quest |
| Progression på 3 ställen | Samma info, olika vikt = förvirring |
| Kalender konkurrerar med uppdrag | Vuxenlogik i barnyta |

### ✅ Rätt

| Princip | Implementation |
|---------|----------------|
| Idag = startpunkt | Default-flik, quest först |
| Skattkammaren = destination | Utforskning, belöning efter handling |
| Familj = relation (overlay) | Framtida nav ovanpå, inte ny flik |

---

## 9. Testprinciper

### 5-sekundersregeln

Visa **Idag**-skärmen i 5 sekunder. Fråga:

> *"Vad ska du göra här?"*

**Utan** att barnet sett Skattkammaren.

| Svar | Tolkning |
|------|----------|
| "Göra uppdrag" / "Bocka av" / pekar på aktivitet | ✅ Bra |
| "Klicka på saker" | ⚠️ Okej |
| "Titta på stjärnor" | ❌ För mycket progression i Idag |
| "Gå till skattkammaren" | ❌ Idag är inte tydlig nog |
| "Vet inte" / "många saker" | ❌ För komplex |

### Framgångskriterier

- *"Göra uppdrag"* > *"titta runt"*
- Ingen scroll innan förståelse
- Uppdrag klickas inom 10 sekunder

### Familjehallen (innan bygg)

Testa prototyp med frågor:

- *Vems stjärnor är detta?*
- *Hur får familjen fler stjärnor?*
- *Känns det som samarbete?* (förälder)
- *Förstår barnet skillnaden?* (förälder)

---

## 10. Roadmap (prioriterad)

```
✅ 1. Skattkammaruniversum (per barn)          — LIVE
✅ 2. Förenklad Idag-vy (PR #107)              — LIVE, ej färdig quest layer
⏳ 3. 5-sekunderstest (3–5 barn)
⏳ 4. Idag v2 (header bort, 3–5 uppdrag, +⭐ per rad)
⏳ 5. Prototyp Familjehallen (Figma, ingen backend)
⏳ 6. Familjetest (5–10 familjer)
⏳ 7. Familjelager (migration + UX)
```

**Bygg INTE före test:** Familjehallen, dubbel valuta, fler samlingar, husdjursfeatures.

---

## 11. Viktigaste insikt

Ni bygger inte en barnapp med belöningar.

Ni bygger ett system där:

```
handling  →  mening  →  relation
  (Idag)    (Skattkammaren)   (Familj)
```

**Live idag:**

| Lager | Mognad |
|-------|--------|
| Mening (Skattkammaren) | ~85 % |
| Handling (Idag) | ~60 % |
| Relation (Familj) | ~5 % |

Problemet är inte för få features — det är **otydliga hem** för det ni redan har.

---

## 12. Referenser i kodbasen

| Område | Filer |
|--------|-------|
| Idag-fokus | `public/js/child-today-focus.js` |
| Skattkammare | `public/js/child-skatt-house.js` |
| Universe API | `src/routes/child-universe.js`, `db/child-universe.js` |
| Museum (förälder) | `public/js/family-museum.js` |
| Feature flag | `skattkammar_universum` i `scripts/seed-features.js` |
| Barnvy warmth | `public/js/child-dashboard-warmth.js` |

---

*Detta dokument ska uppdateras när Idag v2 eller Familjelagret byggs — inte vid varje liten UI-tweak.*
