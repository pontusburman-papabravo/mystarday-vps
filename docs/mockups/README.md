# Designmockups — Min Stjärndag

**Syfte:** Visuell referens för Polsia, dashboard-polish (#2143405) och native tab bar (#2141717).  
**Regel:** Implementation ska **matcha mockup** — inte improvisera ny layout.

---

## Bilder (PNG — lägg in / uppdatera här)

| Fil | Innehåll | Källa |
|-----|----------|--------|
| [`barnlogin-3-skarmar.png`](barnlogin-3-skarmar.png) | Barnlogin: rollval → välj barn → PIN | ✅ I repo |
| `dashboard-reimagined-parent-child.png` | **Föräldra + barn** sida vid sida (REIMAGINED) | ⬜ Spara chat-bilden här |
| `dashboard-vuxen-barn-annotated.png` | **Vuxenvyn + Barnvyn** med IMAGE_0–5 | ⬜ Spara chat-bilden här |

**Om PNG saknas:** använd HTML-mockups + DESIGN-*.md nedan.

---

## Interaktiva HTML-mockups (öppna i webbläsare)

| Fil | Beskrivning |
|-----|-------------|
| [`foraldra.html`](foraldra.html) | Föräldra-dashboard (ljus) |
| [`barnvy.html`](barnvy.html) | Barnvy / schema |
| [`beloningar.html`](beloningar.html) | Skattkammaren |
| [`celebration.html`](celebration.html) | Celebration / wow |
| [`dashboard-index.html`](dashboard-index.html) | Index — länkar till alla |

---

## Specifikationer (text + komponentkartor)

| Dokument | Innehåll |
|----------|----------|
| [`DESIGN-dashboard-reimagined.md`](DESIGN-dashboard-reimagined.md) | REIMAGINED parent + child (dual screen) |
| [`DESIGN-dashboard-vuxen-barn.md`](DESIGN-dashboard-vuxen-barn.md) | Vuxenvyn / Barnvyn med IMAGE_0–5 |
| [`../polsia-barnlogin-design.md`](../polsia-barnlogin-design.md) | Barnlogin 3 skärmar |

---

## Polsia-sprintar som använder detta

| Sprint | ID | Mockup |
|--------|-----|--------|
| Native tab bar | #2141717 | DESIGN-dashboard-reimagined (5 flikar förälder) |
| Dashboard polish | #2143405 | Båda DESIGN-* + foraldra.html |
| Barnlogin 5a–5b | #2141868, #2141884 | barnlogin-3-skarmar.png |

---

## Färger (gemensamt)

| Token | Värde | Användning |
|-------|--------|------------|
| Navy | `#1B2340` | Header, tab bar (förälder), barnvy bakgrund |
| Gold | `#F5A623` | Stjärnor, accenter |
| Grön progress | `#22C55E` | Framsteg, checkmarks |
| NU-tag | orange/gul | Aktuell aktivitet |
| NÄSTA-tag | lila | Nästa aktivitet |
| Barnvy bakgrund | mörk blå + stjärnfält | Rymd-tema |
