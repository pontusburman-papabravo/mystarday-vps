# App Store Screenshots — Min Stjärndag

## Godkända mått (App Store Connect)

**Endast dessa pixelstorlekar accepteras** (Apple visar exakt detta felmeddelande om måttet är fel):

| Orientering | Bredd × höjd |
|-------------|----------------|
| Portrait | **1242 × 2688** |
| Portrait | **1284 × 2778** |
| Landscape | **2688 × 1242** |
| Landscape | **2778 × 1284** |

**Avvisas:** t.ex. **1290 × 2796** (Playwright standard iPhone 15 Pro Max), **1242 × 2208**, eller valfri annan storlek.

Kontrollera alltid före upload:

```bash
file din-bild.png
# Måste visa exakt ett av: 1242 x 2688  eller  1284 x 2778  (portrait)
```

---

## Rätt källa: native app (inte PWA i Safari)

Playwright-skriptet (`capture-app-store-screenshots.mjs`) fångar **mobil webb/PWA** — hamburger-meny, `?`-knapp, ingen native bottenflik. Det **ska inte** laddas upp till App Store.

**Ta screenshots i Xcode Simulator eller TestFlight på iPhone** — se [`NATIVE-CAPTURE.md`](./NATIVE-CAPTURE.md).

---

## Web-referens (internt only)

Mappen `web-reference/` (om den finns) eller Playwright-output är endast för dokumentation/intern QA.

```bash
npx playwright install chromium
node scripts/capture-app-store-screenshots.mjs
# → 1284×2778 men fortfarande PWA-utseende
```

---

## Rekommenderat uppladdnings-set (native)

| # | Vy | Innehåll |
|---|-----|----------|
| 1 | Förälder | Hem med **native bottenflik** (Hem · Schema · Bibliotek · Familj · Inställn.) |
| 2 | Barn | Välj barn / PIN |
| 3 | Barn | **☀️ Idag** |
| 4 | Barn | **💎 Skattkammaren** |
| 5 | Barn | **🏡 Familj** |

Simulator som ger rätt mått:
- **1284 × 2778** → iPhone **14 Plus** (eller 13 Pro Max / 12 Pro Max)
- **1242 × 2688** → iPhone **11 Pro Max** (eller XS Max)

Screenshot i Simulator: **⌘S** → sparas på Skrivbordet.
