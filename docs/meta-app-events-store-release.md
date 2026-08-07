# Meta App Events — Mac store release (iOS + Android)

Kör **efter** `git pull`, `npm install`, `cap:sync` med `META_CLIENT_TOKEN` satt.

## 0. En gate — kör alltid först

```bash
cd <repo-root>
export META_CLIENT_TOKEN='…'   # redan satt i din shell

node scripts/verify-meta-native-release.mjs
node scripts/verify-capacitor-facebook-events-privacy.mjs
```

**STOPPA** om något failar. Skriptet skriver bara *längd* på token, aldrig värdet.

Manuell kontroll utan att läcka token:

```bash
# iOS — ska skriva "OK length=…" (inte själva token)
python3 - <<'PY'
import plistlib, sys
p = plistlib.load(open("ios/App/App/Info.plist", "rb"))
t = (p.get("FacebookClientToken") or "").strip()
print("OK" if len(t) >= 8 else "MISSING", f"length={len(t)}")
PY

# Android
python3 - <<'PY'
import re, pathlib
s = pathlib.Path("android/app/src/main/res/values/strings.xml").read_text()
m = re.search(r'name="facebook_client_token">([^<]+)<', s)
t = (m.group(1) if m else "").strip()
print("OK" if len(t) >= 8 else "MISSING", f"length={len(t)}")
PY
```

## 1. Versionsnummer (obligatoriskt före upload)

| Plattform | Var | Nuvarande i repo |
|-----------|-----|------------------|
| iOS build | `ios/App/App.xcodeproj` → **CURRENT_PROJECT_VERSION** | höj t.ex. 25 → **26** |
| iOS version | **MARKETING_VERSION** | t.ex. 1.2 → **1.3** om du vill |
| Android | `assets/play-store/android-version.json` | höj **versionCode** (t.ex. 6 → **7**) |

Efter Android-versionändring:

```bash
npm run cap:sync:android   # patchar version in i build.gradle
```

## 2. iOS — Xcode → App Store

```bash
npm run cap:ios
# eller: npx cap open ios
```

1. Öppna **App.xcworkspace** (inte bara .xcodeproj om CocoaPods används).
2. **Signing & Capabilities** → rätt Team, Automatic signing.
3. **Product → Scheme → Edit Scheme → Run** → Build Configuration: **Release**.
4. Välj **fysisk iPhone** → **Product → Run** — minimismoke (nedan).
5. Välj **Any iOS Device (arm64)** → **Product → Archive**.
6. Organizer → **Distribute App** → **App Store Connect** → Upload.
7. App Store Connect → skicka till **Review**.

### iOS minimismoke (release på riktig iPhone)

1. **Färsk install** (ta bort appen först om du testat tidigare).
2. Öppna **utan** marknadsföringssamtycke → Meta Events Manager: **inga** events.
3. Logga in som förälder — appen ska inte krascha före/efter WebView.
4. **Acceptera** marknadsföringssamtycke (ingen ATT-dialog — appen använder inte ATT).
5. Stäng appen, öppna igen → **framtida** app open kan synas (inte retroaktiv install).
6. **Återkalla** samtycke i appen → inga nya events.
7. Meta events ska **inte** aktivera advertiser-ID (alltid av i denna build).

## 3. Android — signerad AAB → Google Play live track

```bash
export GOOGLE_WEB_CLIENT_ID='…apps.googleusercontent.com'   # om inte redan satt
export META_CLIENT_TOKEN='…'

# Bygger cap:sync:android + signerad AAB
npm run android:aab
```

Output: `assets/play-store/out/min-stjarnadag-release.aab`

**Installera på riktig Android** (välj ett):

- Play Console → **Internal testing** / **Closed testing** → installera från Play (rekommenderat för signerad build), eller
- `bundletool build-apks` + `adb install` från samma AAB (avancerat).

Sedan samma minimismoke som iOS.

**Play Console:**

1. **Produktion** → Skapa ny release.
2. Ladda upp `min-stjarnadag-release.aab`.
3. Release notes + skicka till granskning/publicering.

## 4. Absoluta stoppvillkor

Släpp **inte** om:

- `verify-meta-native-release.mjs` eller privacy-verify failar
- appen kraschar eller fastnar före inloggning
- Meta Test Events visar något **före** marknadsföringssamtycke
- events fortsätter **efter** återkallat samtycke
- `verify-ios-no-att-meta-release.mjs` eller `verify-meta-native-release.mjs` failar
- iOS-binary länkar ATT eller deklarerar `NSUserTrackingUsageDescription`

## 5. Meta Dashboard (behåll avstängt)

Meta for Developers → App `27941105858861495`:

- **Automatically Log In-App Purchase Events** = **OFF** (iOS + Android)
- Ingen automatisk Subscribe / Start Trial / Purchase-rapportering

## 6. Klart

När **båda** butiksversionerna är godkända och live i butikerna börjar Meta-data trilla in för användare som:

1. Uppdaterat till den nya appversionen, och  
2. Gett marknadsföringssamtycke.

Servern (redan deployad på `main`) behöver ingen ny deploy för native Meta SDK.
