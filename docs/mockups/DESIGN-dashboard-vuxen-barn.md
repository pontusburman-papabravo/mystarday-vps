# DESIGN — Vuxenvyn + Barnvyn (annoterad)

**Källor:** Mockup-bild `dashboard-vuxen-barn-annotated.png` (spara i denna mapp).  
**Komponent-ID:** IMAGE_0 … IMAGE_5 (från designannoteringar)

---

## Vuxenvyn (förälder) — ljus tema

### Top
- Titel **Dashboard** (centrum)
- **Dela** (share) höger

### `<IMAGE_0>` — Barnöversikt (horisontell scroll)
- Kort **Astrid**: foto, stjärna, **Idag 4/14**, **Totalt 82**
- Ikoner: bok, present (t.ex. **2** väntande)
- Text: **Senast:** / **Nästa:** aktivitet
- Delvis synligt syskonkort (**Ol…**)

### `<IMAGE_1>` — Dagens Quick Actions
- **Ge extra stjärnor** | **Ledig dag** (två kolumner)
- Primär knapp: **Lägg till aktivitet** (mörk, full bredd)

### `<IMAGE_2>` — IDAG-lista
- Rader med radio + stjärnvärde (+1, +2 …)
- **Förskola / Skola** — tag **NU** (gul)
- **Mellanmål** — tag **NÄSTA** (lila)
- **Läxor / Pyssel**, **Fritidsaktivitet**

### Bottom — Persistent navigation (5)
Hem · Schema · Bibliotek · Familj · Inställningar — **Hem** aktiv

---

## Barnvyn — mörkt rymd-tema

### Top
- **Dagens Schema** (titel)
- Tillbaka vänster · hamburger höger (i mockup — native kan använda tab bar istället)

### Profil
- Cirkulär avatar **Hej Astrid!** + **82** stjärnor

### Långsiktigt mål (scroll-område)
- Bar mot **150**, label **8v**

### `<IMAGE_5>` — Uppgiftslista
Stora rader med grön bock:
- Bädda sängen
- Förskola / Skola
- Mellanmål
- Läxor / Pyssel
- Aktivitet

### Bottom — Persistent tap (3)
**Dagens Schema** (aktiv) · **Skattkammaren** · **Min Profil**

---

## Mapping → befintlig kod (Polsia)

| Design | Trolig fil |
|--------|------------|
| IMAGE_0 | `public/dashboard.html` + `public/js/dashboard.js` (barnkort) |
| IMAGE_1 | dashboard quick actions |
| IMAGE_2 | dagens lista / schedule koppling |
| IMAGE_5 | `public/child-dashboard.html` + `child-dashboard.js` |
| Tab bar förälder | `public/js/native-tab-bar.js` (sprint 4) |
| Tab bar barn | barn-specifik nav (ej föräldra-tab-bar) |

---

## Skillnad mot "REIMAGINED"-mockup

Båda mockup-seten beskriver **samma produktvision** med små layoutskillnader. Vid konflikt:

1. **Tab bar & native** → `DESIGN-dashboard-reimagined.md`
2. **Komponentdetaljer (IMAGE_*)** → detta dokument
3. **Interaktiv pixel-peeping** → `foraldra.html` / `barnvy.html`
