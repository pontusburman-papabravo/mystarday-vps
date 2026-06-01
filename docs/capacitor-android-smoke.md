# Sprint 16 — Capacitor Android smoke

**Polsia #2142930** · Kräver lokal maskin (android/ i .gitignore).

## Förutsättningar

```bash
npm install
npx cap add android   # om android/ saknas
npx cap sync android
```

## Checklista

- [ ] `Platform.isNative() === true` i WebView
- [ ] `document.documentElement` har `platform-native` + `is-native`
- [ ] Login laddar https://mystarday.se (eller CAP_DEV localhost)
- [ ] Ingen vit skärm / WebView-crash
- [ ] `targetSdk` dokumenterad i PR

## Release-gate

Android Capacitor bygger utan crash på login.
