# Google Play — grafik

## Play Console-krav

| Tillgång | Format | Mått | Max storlek | Antal |
|----------|--------|------|-------------|-------|
| **Funktionsbild** | PNG eller JPEG | **1024 × 500 px** | 15 MB | 1 |
| **Telefonskärmdumpar** | PNG eller JPEG | **9:16** (1080×1920), bredd/höjd 320–3840 px | 8 MB/st | **8** |
| Kampanj (valfritt) | — | Minst **1080 px** på både bredd och höjd | — | Minst 4 |

Våra genererade filer är exakt **1080×1920** (9:16) och uppfyller kampanjkravet.

## Generera

```bash
npm run play-store:assets
```

Eller mot annan miljö:

```bash
BASE_URL=https://mystarday.se REVIEW_EMAIL=review@mystarday.se REVIEW_PASSWORD='AppReview2026!' node scripts/generate-play-store-assets.mjs
```

## Output (`out/`)

| Fil | Innehåll |
|-----|----------|
| `feature-graphic-1024x500.png` | Funktionsbild |
| `01-foralder-dashboard-mobile-1080x1920.png` | Föräldrarvy — hem |
| `02-schema-mobile-1080x1920.png` | Veckoschema |
| `03-barnvy-mobile-1080x1920.png` | Barnvy — dagsschema |
| `04-skattkammaren-barn-mobile-1080x1920.png` | Barnvy — belöningar |
| `05-bibliotek-mobile-1080x1920.png` | Aktivitetsbibliotek |
| `06-familj-mobile-1080x1920.png` | Familj & inbjudningar |
| `07-skattkammaren-foralder-mobile-1080x1920.png` | Skattkammaren (förälder) |
| `08-installningar-mobile-1080x1920.png` | Inställningar |
| `_INTERNAL-desktop-do-not-upload.png` | **Ladda INTE upp** — jämförelse mobil vs dator |

## Viktigt: mobil vs dator

Skriptet simulerar **Android WebView** (smal viewport + `Capacitor` Android):

- Nedre **native tab bar** (Hem, Schema, Bibliotek, Familj, Inställn.)
- Ingen desktop-sidebar eller hamburger-meny
- Barnvy utan vuxen-tabbar (korrekt för barnläge)

**Ladda bara upp `*-mobile-*.png` till Play Console** — inte desktop-bilder.

## Bästa resultat

1. Se till att `review@mystarday.se` finns på prod med barn + schema + belöningar
2. Kör skriptet mot `https://mystarday.se`
3. Om layout ser fel ut: ta manuella skärmdumpar på **fysisk Android** efter Internal test
