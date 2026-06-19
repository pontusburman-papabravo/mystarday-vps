# Pedagogläge v1.2 — definitiv mockup-referens (12 paneler)

**Status:** Godkänd UX-kontaktkarta för implementation  
**Spec:** `docs/paket-v1.2-spec.md` §4.2, §4.4, §6, §9.10.9  
**Utdatafil:** `docs/mockups/pedagog-lage-v12-reference.png`

---

## Kritiska IA-regler (10/10)

| Regel | Detalj |
|-------|--------|
| **Samarbete ≠ chat** | Strukturerade sektioner — max 1 kommentar per sida per dag (§4.4.7) |
| **Föräldernav** | `Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd` — aldrig Hem/Rapport |
| **Pedagog-nav** | `Översikt · Idag · Historik` + ⚙️ top-right — **aldrig** Samarbete-flik |
| **Historik** | Datumlista med `4/4 aktiviteter` OK — **ingen** månadssammanfattning |
| **Frånvaro** | Banner: *"Barn markerat som frånvarande"* — grå/lavendel, inte brun |
| **Modell A** | `✓ Klar hemma 07:15` · `✓ 11:45 [i skolan]` |

---

## Output format

- Bred produkt-design-kontaktkarta
- **4 kolumner × 3 rader = 12** iPhone-stora skärmar
- Tunna etiketter på svenska (Panel 1–12) under varje skärm
- Ren produkt-design-mockup — INTE fotorealistisk, INTE 3D
- Light mode, varm och professionell

## Design system

| Token | Värde |
|-------|--------|
| Rubriker | Outfit |
| Body | Plus Jakarta Sans |
| Bakgrund | off-white `#F5F4F0` |
| Primärtext | navy `#1B2340` |
| Accent / aktiv flik | lavender `#8B5CF6` |
| Framgång | green `#22C55E` |
| Varning | amber `#F5A623` |
| Kort | vit, 16px radius, subtil skugga |

---

## Panel 1 — Pedagogöversikt

- Rubrik: "Pedagogöversikt" + ⚙️ top-right
- Underrubrik: "(2 av 5 klara) · onsdag 17 juni"
- Filter: `[ Datum ▾ ]` `[ Filter: Åtgärd krävs ▾ ]`
- Kort: Ella ÅTGÄRD KRÄVS 2/4 · Noah KLAR 4/4 · Maja FRÅNVARANDE
- Bottom nav (pedagog): Översikt (aktiv) · Idag · Historik

## Panel 2 — Idag — dagvy

- Header: `Andersson — Ella ▼ · onsdag 17 juni` + `[ Markera frånvarande ]`
- Sektion 1: Modell A på aktiviteter + kommentar vid lunch
- Sektion 2: Dokumentation UTKAST + purple Publicera
- Sektion 3: Skolaktiviteter chips
- Bottom nav: Idag aktiv

## Panel 3 — Lägg till skolaktivitet (modal)

- Chips: Rast · Lunch · Utflykt · + Egen aktivitet
- Namn, Stjärnor valfritt, Avbryt / Lägg till

## Panel 4 — Inbjudan accepterad

- Välkommen + Ella + Acceptera inbjudan

## Panel 5 — Dual-roll profil

- Föräldraläge / Pedagogläge toggle + Logga ut

## Panel 6 — Tomt tillstånd

- "Inga barn delade" + instruktion + Uppdatera

## Panel 7 — Förälder Samarbete (KRITISK)

Struktur — **ingen timeline**:

```
Samarbete                    [ + Bjud in pedagog ]

── Aktiva pedagoger ──
Anna Svensson · Klasslärare · Förskolan Solen
Johan Nilsson · Resurspedagog

── Barn: Ella ▼ ──

── Anteckningar idag ──
Anna · publicerad 14:32 — Humör 4/5 · Lunch gick bra
Johan — ○ Ingen anteckning idag

── Samarbetskommentar (max 1/dag) ──
Förälder (08:15): "Sov dåligt inatt."
Pedagog Anna (08:45): "Tack, vi håller extra koll."

[ Lägg till kommentar ]
```

Bottom nav (förälder): Idag · Rutiner · Utveckling · **Samarbete** (lila) · Barn/Stöd

## Panel 8 — Historik

- Filter barn + månad
- Lista: `17 juni ✓ Publicerad · 4/4 aktiviteter` etc.
- **Ingen** Sammanfattning Juni
- Bottom nav: Historik aktiv (pedagog)

## Panel 9 — Frånvaro dagvy

- Banner lavendel: "Barn markerat som frånvarande"
- `[ Ta bort frånvaro ]` i header
- Aktiviteter gråade, ej klickbara, ingen Publicera

## Panel 10 — Åtkomst borttagen

- Lås-ikon, "Åtkomst borttagen"
- Body: koppling avslutad av förälder
- CTA: "Gå till Översikt" (modal, ingen bottom nav)

## Panel 11 — Samarbetskommentar input

- Samma föräldernav (5 flikar, Samarbete aktiv)
- Fokuserat inmatningsläge
- Anteckningar idag (Anna) ovan
- Input: "Lägg till kommentar (max 1 per dag)…"
- Avbryt / Spara
- Hjälptext: "Du har 1 kommentar kvar för idag" *(endast om rollen ej kommenterat)*

## Panel 12 — Pedagog inställningar (⚙️)

- Byta lösenord, kontaktuppgifter
- Notifikationer: kommentar från förälder, ny koppling, aktivitetspush
- Support / FAQ *(implementation — minimikrav: profil + logga ut enligt §4.4.16)*
- Logga ut
- Ingen bottom nav

---

## AI-bildprompt (klistra in)

```
Product design contact sheet, 12 iPhone mobile screens in 4 columns x 3 rows, Swedish family routine app pedagog mode v1.2. Clean Scandinavian B2B2C UI, NOT photorealistic, NOT 3D. Light mode warm off-white background #F5F4F0, navy text #1B2340, lavender purple accent #8B5CF6, green #22C55E success, amber #F5A623 warnings. Outfit headings, Plus Jakarta Sans body. White cards 16px radius subtle shadow. Thin Swedish labels Panel 1-12 below each screen.

Panel 1 Pedagogöversikt: child list with orange ÅTGÄRD KRÄVS green KLAR gray FRÅNVARANDE badges, date filter, 3-tab bottom nav Översikt active Idag Historik, gear top-right.

Panel 2 Idag day view: header Markera frånvarande button, Model A activities Klar hemma 07:15 and 11:45 i skolan with comment, documentation UTKAST Publicera purple, school activity chips, pedagog 3-tab nav Idag active.

Panel 3 Add school activity modal bottom sheet.

Panel 4 Welcome invitation Acceptera inbjudan.

Panel 5 Dual role profile Föräldraläge Pedagogläge.

Panel 6 Empty state Inga barn delade.

Panel 7 Parent Samarbete CRITICAL: structured sections NOT chat timeline - Aktiva pedagoger, Barn Ella dropdown, Anteckningar idag one block per pedagog, Samarbetskommentar max 2 lines, Lägg till kommentar button. Parent 5-tab bottom nav Idag Rutiner Utveckling Samarbete active purple Barn/Stöd. NO Hem NO Rapport.

Panel 8 Historik date list with Publicerad Utkast FRÅNVARANDE and 4/4 aktiviteter, NO monthly summary statistics, pedagog nav Historik active.

Panel 9 Absence lavender banner Barn markerat som frånvarande, Ta bort frånvaro, grayed locked checkboxes no Publicera.

Panel 10 Access revoked lock icon Åtkomst borttagen Gå till Översikt modal no bottom nav.

Panel 11 Parent comment input focused state same 5-tab nav Samarbete active max 1 per day.

Panel 12 Pedagog settings gear screen notifications toggles logout no bottom nav.

No chat bubbles no message feed no pedagog Samarbete tab.
```
