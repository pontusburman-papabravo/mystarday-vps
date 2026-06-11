# Google Play — grafik

## Play Console-krav

| Tillgång | Format | Mått | Max storlek | Antal |
|----------|--------|------|-------------|-------|
| **Funktionsbild** | PNG eller JPEG | **1024 × 500 px** | 15 MB | 1 |
| **Telefon** | PNG eller JPEG | **9:16** (1080×1920), 320–3840 px | 8 MB/st | **8** |
| **Surfplatta 7"** | PNG eller JPEG | **9:16** (1080×1920), 320–3840 px | 8 MB/st | **8** |
| **Surfplatta 10"** | PNG eller JPEG | **9:16** (1440×2560), 1080–7680 px | 8 MB/st | **8** |

## Generera

```bash
npm run play-store:assets
```

Bara surfplattor (om telefon redan finns):

```bash
PROFILES=tablet-7,tablet-10 npm run play-store:assets
```

Eller mot annan miljö:

```bash
BASE_URL=https://mystarday.se \
  REVIEW_EMAIL=review@mystarday.se \
  REVIEW_PASSWORD='AppReview2026!' \
  CHILD_NAME=Anna CHILD_PIN=4455 \
  node scripts/generate-play-store-assets.mjs
```

## Output

### `out/` — telefon + funktionsbild

| Fil | Innehåll |
|-----|----------|
| `feature-graphic-1024x500.png` | Funktionsbild |
| `01-foralder-dashboard-mobile-1080x1920.png` | Föräldrarvy — hem |
| `02-schema-mobile-1080x1920.png` | Veckoschema |
| `03-barnvy-mobile-1080x1920.png` | Barnvy — dagsschema |
| `04-skattkammaren-barn-mobile-1080x1920.png` | Barnvy — belöningar |
| `05-bibliotek-mobile-1080x1920.png` | Aktivitetsbibliotek |
| `06-familj-mobile-1080x1920.png` | Familj |
| `07-skattkammaren-foralder-mobile-1080x1920.png` | Skattkammaren (förälder) |
| `08-installningar-mobile-1080x1920.png` | Inställningar |

### `out/tablet-7/` — surfplatta 7" (1080×1920)

Samma 8 vyer, filnamn t.ex. `01-foralder-dashboard-tablet-7-1080x1920.png`

### `out/tablet-10/` — surfplatta 10" (1440×2560)

Samma 8 vyer, filnamn t.ex. `01-foralder-dashboard-tablet-10-1440x2560.png`

## Viktigt: mobil vs dator

Skriptet simulerar **Android WebView** (native tab bar, ingen desktop-sidebar).

**Ladda INTE upp** `_INTERNAL-desktop-do-not-upload.png`.

## Testkonto

| | |
|--|--|
| Förälder | `review@mystarday.se` / `AppReview2026!` |
| Barn | Anna / PIN `4455` |
