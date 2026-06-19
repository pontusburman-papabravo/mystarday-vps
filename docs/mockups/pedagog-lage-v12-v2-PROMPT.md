# Pedagogläge v1.2 — mockup v2 (korrigeringsprompt)

**Status:** Väntar på bildgenerering  
**Bas:** 11-panelers mockup (v1) — paneler 1–5, 10 behålls oförändrade  
**Spec:** `docs/paket-v1.2-spec.md` §4.2, §4.4, §6

---

## Ändringar per panel

| Panel | Åtgärd |
|-------|--------|
| **1–5** | Oförändrade |
| **6** | Återinför: *"Inga barn delade"* + 3-stegsguide + Uppdatera-knapp |
| **7 & 11** | Rita om helt (se nedan) |
| **8** | Behåll historiklista; **ta bort** "Sammanfattning Juni" och all statistik |
| **9** | Banner: *"Barn markerat som frånvarande"*; låsta aktiviteter; knapp *"Ta bort frånvaro"* |
| **10** | Oförändrad |
| **2** | Modell A på aktiviteter; knapp *"Markera frånvarande"* i header |

---

## Panel 7 & 11 — Förälder · Samarbete (§4.2)

**Bottom nav (5 flikar):**

```
Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd
```

(Samarbete aktiv — lila accent)

**Inte chat.** Ingen kronologisk feed. Struktur:

```
Samarbete                          [ + Bjud in pedagog ]

── Aktiva pedagoger ─────────────────────────
Anna Svensson · Klasslärare · Förskolan Solen
  Delade barn: Ella
  Senast aktiv: Idag 14:32

Johan Nilsson · Resurspedagog
  Delade barn: Ella
  Senast aktiv: Igår

── Barn: Ella ▼ ─────────────────────────────

── Anteckningar idag ───────────────────────
Anna Svensson · publicerad 14:32
  Humör 4/5 · Lunch gick bra · Lugn eftermiddag

Johan Nilsson
  ○ Ingen anteckning idag

── Samarbetskommentar ──────────────────────
Förälder (08:15): "Sov dåligt inatt."
Pedagog Anna (08:45): "Tack, vi håller extra koll idag."

[ Lägg till kommentar ]   ← max 1 per sida per dag
```

---

## Panel 2 — Idag (pedagog) — Modell A (§4.4.11)

```
←  Andersson — Ella ▼ · onsdag 17 juni     [ Markera frånvarande ]

── 1. Dagens aktiviteter ─────────────────
☑ Morgonsamling     ✓ Klar hemma 07:15
☐ Rast
☑ Lunch             ✓ 11:45 [i skolan]
   Kommentar: "Hungrig idag"
☐ Eftermiddagssamling

── 2. Dagens dokumentation ───────────────
Humör 4/5 · Sömn Bra 9h · Måltider Lunch OK
Status: UTKAST                    [ Publicera ]

── 3. Skolaktiviteter ───────────────────
+ Utflykt  + Grupparbete  [ + Lägg till skolaktivitet ]
```

---

## Panel 8 — Historik (pedagog, §4.4.13)

Behåll:

```
Historik · Ella
[ Barn ▾ ]  [ Månad: Juni ▾ ]

17 juni   ✓ Publicerad
16 juni   ✓ Publicerad
15 juni   ○ Utkast
14 juni   — FRÅNVARANDE
```

**Ta bort:** "Sammanfattning Juni", procent, total aktiviteter, etc.

---

## Panel 9 — Frånvaro (§4.4.8)

```
←  Andersson — Ella ▼ · onsdag 17 juni     [ Ta bort frånvaro ]

⚠️ Barn markerat som frånvarande

── 1. Dagens aktiviteter ─────────────────  (grå, inaktiverade)
☑ Morgonsamling     ✓ Klar hemma 07:15
☐ Rast
...
```

---

## AI-bildprompt (klistra in vid generering)

```
Mobile app UI contact sheet, 11 panels, Swedish language family routine app (pedagog/parent collaboration). Clean modern design: white cards, light gray background, primary purple #6B46C1 for Samarbete/Collaboration theme, orange for "Åtgärd krävs", green for "Klar", gray for "Frånvarande". Sans-serif typography (Outfit or Plus Jakarta Sans). iPhone-style frames.

Panel 1: Pedagogöversikt — date filter, orange alert "2 barn kräver åtgärd idag", child list with status badges, bottom nav 3 tabs: Översikt (active), Idag, Historik. Gear icon top-right.

Panel 2: Pedagog Idag day view — header "Andersson — Ella" with "Markera frånvarande" button. Section 1 activities with Model A: "✓ Klar hemma 07:15" and "✓ 11:45 [i skolan]" with comment. Section 2 documentation UTKAST + purple Publicera. Section 3 school activities chips.

Panel 3: Modal "Lägg till skolaktivitet" — quick icons, name field, stars optional, Avbryt/Lägg till.

Panel 4: Welcome invitation "Acceptera inbjudan" for Ella Andersson.

Panel 5: Profile dual-role toggle Föräldraläge / Pedagogläge, Logga ut.

Panel 6: Empty state "Inga barn delade" with 3-step instructions and Uppdatera button.

Panel 7: Parent Samarbete — NOT a chat feed. Structured sections: Aktiva pedagoger list, Barn Ella dropdown, Anteckningar idag (one block per pedagog with attribution), Samarbetskommentar (max 2 lines: parent + pedagog), "Lägg till kommentar" button. Bottom nav 5 tabs: Idag · Rutiner · Utveckling · Samarbete (active purple) · Barn/Stöd.

Panel 8: Pedagog Historik — month/child filters, date list with Publicerad/Utkast/Frånvarande badges. NO monthly summary statistics.

Panel 9: Absence day view — purple banner "Barn markerat som frånvarande", "Ta bort frånvaro" in header, grayed locked activity checkboxes.

Panel 10: Access revoked — lock icon "Åtkomst borttagen", Till översikten button.

Panel 11: Same as Panel 7 emphasizing correct 5-tab parent bottom navigation.

No chat bubbles, no message timeline, no statistics dashboard in historik.
```

**Utdata:** Spara som `docs/mockups/pedagog-lage-v12-v2.png`
