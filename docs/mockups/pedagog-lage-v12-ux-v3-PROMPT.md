# Pedagogläge v1.2 — UX 10/10 mockup (v3.1 production)

**Status:** Definitiv implementationsreferens (production-ready)  
**Spec:** `docs/paket-v1.2-spec.md` §4.2, §4.4, §6, **§13.10**  
**Utdatafil:** `docs/mockups/pedagog-lage-v12-ux-v3.png`  
**Paneler:** 14 (ersätter feed-panel med **Publicera steg 3**)

**Bedömning senaste iteration:** 8.5/10 — kvarvarande 15 % är **arbetsflödesproblem**, inte visuella.

---

## Designmål

**IA > estetik.** Pedagog ska inom 2 sekunder veta: *vad behöver jag göra, för vilket barn?*

| Behåll (visuell polish) | Kasta (fel IA) |
|-------------------------|----------------|
| Whitespace, kortdesign, typografi | `Hem · Idag · Historik · Mer` |
| Grupperad inställningssida | Pedagoglista på översikt |
| Tydlig CTA-hierarki | Veckostatistik / *"12 skolaktiviteter"* |
| Veckoremsa i Idag (kompakt) | Notis-feed, *"1 oläst"*, chat |
| Illustrationer i tomt tillstånd | Återkommande aktivitet / starttid |

---

## Design system

| Token | Värde |
|-------|--------|
| Bakgrund | `#F5F4F0` warm off-white |
| Text | navy `#1B2340` |
| Accent / aktiv flik | lavender `#8B5CF6` |
| Åtgärd | amber `#F5A623` (remsa + ikon) |
| Klar | green `#22C55E` |
| Frånvaro | neutral grå/lavendel `#94A3B8` |
| Rubriker | Outfit |
| Body | Plus Jakarta Sans |
| Kort | vit, 16px radius, subtil skugga |

**Pedagog bottom nav:** `Översikt · Idag · Historik` + ⚙️ top-right  
**Förälder bottom nav:** `Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd` (alltid 5)

---

## Kontaktkarta — 14 paneler

**Pedagog end-to-end:** Översikt → Idag (steg 2) → Lägg till aktivitet → **Publicera (steg 3)** → Historik

**FÖRBUDET:** Panel med "Today 3 active", "This week 5 active", notis-feed, eller månadssammanfattning (Aktiviteter 5 / Avvikelser 0).

### Panel 1 — Pedagogöversikt (prioriteringsmotor)

```
Pedagogöversikt                              ⚙️
Idag · 2 kräver åtgärd · onsdag 17 juni

⚠️ 2 barn kräver åtgärd

┌─ 🟠 left stripe ──────────────────────────┐
│ 👧 Ella Andersson                          │
│ 2 aktiviteter kvar · anteckning saknas   │
│                        [ Fortsätt → ]     │
├───────────────────────────────────────────┤
│ 👦 Noah Lindqvist              🟢         │
│ Allt klart · publicerad 14:32  [ Visa → ] │
├───────────────────────────────────────────┤
│ 👧 Maja Svensson               ⚪         │
│ Frånvarande idag               [ Visa → ] │
└───────────────────────────────────────────┘

[ Filter ▾ ]  Åtgärd krävs

Bottom nav: Översikt (active purple) · Idag · Historik
```

**INTE:** andra pedagoger, veckostatistik, Hem, Mer.

---

### Panel 2 — Idag steg 2 (arbetsflöde, inte informationsvy)

```
← Andersson — Ella ▼    ons 17 jun    [ Frånvaro ▾ ]

Steg 2 av 3

✓ Barn valt
● Dokumentation
○ Publicera

☑ Morgonsamling    ✓ Klar hemma 07:15  (muted)
☐ Rast
☑ Lunch            ✓ 11:45 i skolan

Humör [😊 4/5]  Måltider  Beteende

+ Lägg till skolaktivitet

┌─────────────────────────────────┐
│ [ Fortsätt till publicering → ] │
└─────────────────────────────────┘

Bottom nav: Idag (active)
```

**INTE:** platt schema-lista utan stepper.

---

### Panel 3 — Lägg till skolaktivitet (ultra-snabb)

Bottom sheet overlay on Panel 2.

```
Lägg till skolaktivitet

[ Rast ] [ Lunch ] [ Utflykt ] [ Grupparbete ]

Namn
[ Grupparbete              ]

★ Stjärnor (valfritt)  0    ← belöning, INTE 5-stjärnig "fokus"-rating

[ Avbryt ]        [ Lägg till ]
```

**INTE:** starttid, återkommande, typ-dropdown.

---

### Panel 4 — Inbjudan accepterad

- Stor lila check-cirkel
- "Välkommen! Du har blivit inbjuden till:"
- Kort: 👧 Ella Andersson · Förskolan Solen
- Purple CTA: **Acceptera inbjudan**

---

### Panel 5 — Dual-roll profil

```
Profil                                       ⚙️

Visningsläge
○ Föräldraläge
● Pedagogläge  (purple selected)

[ Logga ut ]
```

Minimal — ingen bottom nav.

---

### Panel 6 — Tomt tillstånd

- Varm outline-illustration (koppling/människor)
- **"Inga barn delade"**
- 3 numrerade steg (korta rader):
  1. Be förälder bjuda in dig
  2. Öppna länken i mejlet
  3. Acceptera inbjudan
- Outline: **Uppdatera**

Pedagog bottom nav synlig (Översikt aktiv).

---

### Panel 7 — Förälder Samarbete · Idag (puls)

```
Samarbete                    [ + Bjud in pedagog ]

[ Ella ▾ ]

[ Idag ● | Pedagoger | Historik ]   ← segmented control

┌─ Dagens puls · 17 juni ──────────────┐
│ 📋 Anna · publicerad 14:32          │
│ Humör bra · Lunch OK · Lugn em      │
│                                     │
│ 💬 Du: "Sov dåligt inatt"           │
│    Anna: "Vi håller extra koll"     │
└─────────────────────────────────────┘

┌─ Väntar ────────────────────────────┐
│ Johan har inte antecknat idag       │
└─────────────────────────────────────┘

[ Lägg till kommentar ]

Bottom nav: Idag · Rutiner · Utveckling · Samarbete (purple) · Barn/Stöd
ALL 5 TABS VISIBLE.
```

**INTE:** "1 oläst", "SENASTE KOMMENTARER", chat bubbles.

---

### Panel 8 — Förälder Samarbete · Pedagoger

Same header + segmented control, **Pedagoger** active.

```
Anna Svensson · Klasslärare · Förskolan Solen
  Delade barn: Ella · Senast aktiv: Idag 14:32
  [ Visa historik ]  [ Återkalla ]

Johan Nilsson · Resurspedagog
  Delade barn: Ella · Senast aktiv: Igår
  [ Visa historik ]  [ Återkalla ]
```

Same 5-tab parent bottom nav.

---

### Panel 8 — Historik månad (ren lista)

```
Historik                                     ⚙️

[ Barn: Ella ▾ ]  [ Månad: Juni ▾ ]

17 juni
16 juni
15 juni
14 juni
13 juni
```

**INTE:** Aktiviteter 5 · Avvikelser 0 · Samarbeten 2. **INTE:** kalendergrid med sammanfattning.

Bottom nav: Historik active.

---

### Panel 9 — Historik dag (read-only)

```
Historik · 7 juni 2025 · Ella

✓ Rast
✓ Lunch
✓ Grupparbete

Humör 4/5 · Allt klart utan avvikelser
```

Read-only. Bottom nav: Historik active.

---

### Panel 10 — Frånvaro (nästan tråkig — avsiktligt)

```
← Andersson — Ella ▼    7 juni    [ Ta bort frånvaro ]

┌─ lavendel #E9E5FF banner TOP ─────────────┐
│ Barn markerat som frånvarande idag         │  ← INTE amber FRÅNVARO REGISTRERAD
└───────────────────────────────────────────┘

Aktiviteter (låsta)
☑ Morgonsamling   (grey disabled)
☐ Rast            (grey disabled)

No Publicera. No warning icons.

Bottom nav: Idag active.
```

---

### Panel 11 — Åtkomst borttagen

Full-screen modal, no bottom nav.

- Lock icon (navy/lavender)
- **Åtkomst borttagen**
- "Din koppling till Ella Andersson har avslutats av föräldern."
- Purple CTA: **Gå till Översikt**

---

### Panel 12 — Förälder kommentar

```
Samarbete · Kommentar

Anna · publicerad 14:32
Humör 4/5 · Lunch gick bra

Din kommentar (max 1 per dag)
[                                    ]

[ Avbryt ]              [ Spara ]

5-tab nav: Idag · Rutiner · Utveckling · Samarbete (purple) · Barn/Stöd
```

---

### Panel 13 — Publicera steg 3 (ERSÄTTER feed-panel)

**Kritisk panel** — knyter ihop hela pedagog-flödet.

```
← Andersson — Ella ▼    ons 17 jun

Steg 3 av 3

✓ Barn valt
✓ Dokumentation
● Publicera

── Dagens sammanfattning ──────────────
✓ Rast
✓ Lunch · Hungrig idag
✓ Grupparbete

Humör 4/5 · Lunch OK · Lugn eftermiddag

┌─────────────────────────────────┐
│      [ Publicera ]              │  ← enda primära CTA, purple
└─────────────────────────────────┘

Bottom nav: Idag active.
```

**INTE:** "Today 3 active", "This week 5 active", notis-statistik.

---

### Panel 14 — Inställningar (pedagog)

```
Inställningar

KONTO — Profil · Byt lösenord
NOTISER — toggles (förälder, koppling, push)
SUPPORT — Support · FAQ

[ Logga ut ]

No bottom nav. Opened from ⚙️ on Panel 1.
```

---

## AI-bildprompt (v3.1 — klistra in)

```
Product design contact sheet, 14 iPhone screens, Swedish family routine app pedagog v1.2 UX 10/10 production. Scandinavian B2B2C, NOT photorealistic NOT 3D. Off-white #F5F4F0, navy #1B2340, lavender #8B5CF6, green #22C55E, amber action stripes only on priority queue. Outfit + Plus Jakarta Sans. Labels Panel 1-14 below.

NAV: Pedagog = Översikt Idag Historik + gear. Parent = ALL 5 tabs Idag Rutiner Utveckling Samarbete Barn/Stöd. NEVER Hem NEVER Mer.

P1 Work queue: orange stripe Ella "Samarbetssvar saknas" [Fortsätt], green Noah "Allt klart" [Visa], grey Maja frånvarande. Alert 2 barn kräver åtgärd.

P2 Workflow NOT info display: Step 2 of 3 checkmarks Barn valt Documentation Publish, activities Model A, Fortsätt till publicering button.

P3 School activity chips Rast Lunch Utflykt Grupparbete, optional stars for rewards NOT 5-star focus rating.

P4 Invitation welcome Acceptera.

P5 Dual role Föräldraläge Pedagogläge NOT "Följ dagliga".

P6 Parent Samarbete Idag tab pulse card Dagens puls, segmented Idag Pedagoger Historik, 5-tab nav.

P7 Parent Samarbete Pedagoger tab teacher list Återkalla.

P8 Historik month ONLY date list 17 juni 16 juni 15 juni NO summary stats NO Aktiviteter 5 Avvikelser 0.

P9 Historik day read-only activity list.

P10 Absence calm lavendel banner TOP "Barn markerat som frånvarande idag" grey locked activities NO amber FRÅNVARO REGISTRERAD.

P11 Access revoked lock Gå till Översikt.

P12 Parent comment max 1 per dag Spara 5-tab nav.

P13 Publish Step 3 of 3 summary Rast Lunch Grupparbete purple Publicera button REPLACES any feed or notification stats panel.

P14 Settings KONTO NOTISER SUPPORT grouped.

No chat feed no unread badges no weekly stats on overview no notification feed panel.
```

---

## Implementationschecklista (10/10)

- [ ] Översikt = arbetskö med `[Fortsätt]` / `[Visa]` per kort
- [ ] Idag = steg 2 arbetsflöde (✓ Barn · ● Dokumentation · ○ Publicera)
- [ ] Panel 13 = Publicera steg 3 med sammanfattning — **ingen feed-panel**
- [ ] Skolaktivitet = chips, stjärnor = belöning inte fokus-betyg
- [ ] Samarbete = puls + segment, inte notis-statistik
- [ ] Historik månad = datumlista only
- [ ] Frånvaro = lavendel, lugn, top banner
- [ ] Förälder = 5 flikar · Pedagog = 3 + ⚙️
