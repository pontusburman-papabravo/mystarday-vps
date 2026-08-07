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
  REVIEW_EMAIL=APP_REVIEW_EMAIL \
  REVIEW_PASSWORD='APP_REVIEW_PASSWORD (secret store)' \
  CHILD_NAME=Anna CHILD_PIN=$APP_REVIEW_CHILD_PIN \
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
| Förälder | `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD (secret store)` |
| Barn | Anna / PIN from APP_REVIEW_CHILD_PIN |

## Android App Bundle (AAB)

**Uppladdning till Play Console:**

```
assets/play-store/out/min-stjarnadag-release.aab
```

| | |
|--|--|
| Paket | `se.mystarday.app` |
| Storlek | ~7,3 MB |
| Signering | Upload key (`mystarday-upload`) |

### Bygga om

```bash
npm run android:aab
```

Versionsnummer styrs i `assets/play-store/android-version.json` (patchas in i `build.gradle` vid varje build). Höj `versionCode` före varje ny Play-upload.

Valfritt (Google Sign In i native):

```bash
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com npm run android:aab
```

### Upload key (spara säkert)

Keystore skapas vid första build och **checkas inte in** i git:

```
assets/play-store/signing/mystarday-upload.keystore
```

| | |
|--|--|
| Alias | `mystarday-upload` |
| Lösenord | Sätts via `ANDROID_UPLOAD_KEY_PASSWORD` / hemlig lagring — **aldrig** i git |

**SHA-1:** `8D:B3:2D:CD:77:6C:97:CB:1B:13:B7:D0:30:FD:52:3E:AC:AE:76:81`  
**SHA-256:** `E5:53:1C:CD:B0:1A:FF:11:C0:16:D5:9E:A9:C6:D5:A5:D8:3A:9A:3E:F3:A6:7B:34:E2:4C:05:96:4A:6E:42:88`

Registrera SHA-1 i Google Cloud Console (OAuth) och `/.well-known/assetlinks.json` på servern.
