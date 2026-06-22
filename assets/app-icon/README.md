# App-ikon — Min Stjärndag

**Master:** `source.png` (din 1024×1024 PNG, ingen transparens för App Store)

## Uppdatera alla storlekar

```bash
# Ersätt source.png med din ikon, sedan:
node scripts/install-app-icons.mjs
```

Skapar:
- `assets/app-icon/icon-1024.png` — App Store / Xcode / Play Store
- `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, favicons — PWA
- `android/app/src/main/res/mipmap-*/ic_launcher*.png` — Android launcher (efter `cap:sync:android`)

## iOS (på Mac)

```bash
npm run cap:sync:ios
node scripts/install-app-icons.mjs
open ios/App/App.xcworkspace
```

I Xcode: **App → Assets.xcassets → AppIcon** ska visa 1024×1024.

Sedan **Archive → Upload**.
