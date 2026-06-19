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

### Panel 12 — Kommentar-input + Inställningar (split or focus)

**Option A — Kommentar (förälder):**

```
Samarbetskommentar

Anna · publicerad 14:32
Humör 4/5 · Lunch gick bra

Din kommentar (max 1 per dag)
[                                    ]
[ Avbryt ]              [ Spara ]

5-tab parent nav, Samarbete active.
```

**Option B — Inställningar pedagog (⚙️ from Panel 1):**

```
Inställningar

KONTO
  Profil · Byt lösenord

NOTISER
  Kommentar från förälder  [toggle on]
  Ny koppling              [toggle on]
  Aktivitetspush           [toggle on]

SUPPORT
  Support · FAQ

[ Logga ut ]
```

*För 12-panel sheet: visa Panel 12 som Kommentar; Inställningar = Panel 1 ⚙️ destination.*

---

## AI-bildprompt (klistra in)

```
Product design contact sheet, 12 iPhone screens, 4 columns x 3 rows, Swedish family routine app pedagog v1.2 UX 10/10. Scandinavian B2B2C professional, NOT photorealistic NOT 3D. Warm off-white #F5F4F0 background, navy #1B2340 text, lavender purple #8B5CF6 accents, green #22C55E success, amber #F5A623 action stripe. Outfit headings Plus Jakarta Sans body. White cards 16px radius subtle shadow. Thin Swedish labels Panel 1-12 below each screen.

CRITICAL NAV RULES:
- Pedagog screens: bottom nav ONLY "Översikt Idag Historik" + gear top-right. NEVER Hem NEVER Mer.
- Parent screens: bottom nav ALL 5 tabs "Idag Rutiner Utveckling Samarbete Barn/Stöd".

Panel 1 Pedagog priority queue NOT colleague list: orange left stripe Ella "2 aktiviteter kvar Fortsätt", green Noah "Allt klart", grey Maja "Frånvarande". Alert "2 barn kräver åtgärd". Översikt tab active.

Panel 2 Idag stepper "Steg 2 av 3 Dokumentation", collapsed activities, mood chips, Model A "Klar hemma 07:15" muted, sticky purple Publicera anteckning footer, compact week strip, Frånvaro menu header.

Panel 3 Bottom sheet add school activity: chip buttons Rast Lunch Utflykt Grupparbete, name field, optional stars, Avbryt Lägg till. NO recurring NO start time.

Panel 4 Welcome invitation purple checkmark Acceptera inbjudan Ella.

Panel 5 Dual role Föräldraläge Pedagogläge profile Logga ut.

Panel 6 Empty state Inga barn delade numbered 3 steps illustration Uppdatera button.

Panel 7 Parent Samarbete segmented tabs Idag active: "Dagens puls" summary card Anna published, two-line comment exchange NOT chat feed, "Väntar Johan" card, Lägg till kommentar, 5-tab nav Samarbete purple active.

Panel 8 Parent Samarbete Pedagoger tab: teacher list with Återkalla, 5-tab nav.

Panel 9 Pedagog Historik date list Publicerad 4/4 aktiviteter NO monthly summary Historik tab active.

Panel 10 Absence lavendel banner TOP "Barn markerat som frånvarande", greyed disabled checkboxes, Ta bort frånvaro header, no Publish.

Panel 11 Access revoked lock modal Åtkomst borttagen Gå till Översikt no bottom nav.

Panel 12 Parent comment input max 1 per dag Spara button 5-tab nav OR pedagog settings grouped KONTO NOTISER SUPPORT.

No notification badges no unread counts no chat timeline no weekly statistics on overview.
```

---

## Implementationschecklista (10/10)

- [ ] Översikt = barnkö med handling, inte kollegor/statistik
- [ ] Idag = stepper + sticky Publicera
- [ ] Skolaktivitet = 1 skärm, chips, ingen återkommande
- [ ] Samarbete = puls + 3 segment, inte feed
- [ ] Förälder = 5 flikar alltid
- [ ] Pedagog = 3 flikar + ⚙️, aldrig Hem/Mer
- [ ] Frånvaro = banner top, lavendel
- [ ] Kommentar = max 1/dag, Spara inte Skicka
