# App Store Screenshots — Min Stjärndag

Screenshots captured from production (`https://mystarday.se`) using the review account `review@mystarday.se`.

## Regenerate

```bash
npx playwright install chromium   # once per machine
node scripts/capture-app-store-screenshots.mjs
```

## iPhone 6.7" (`iphone-6.7/`)

Logical viewport 430×932 @ 3× → **1290×2796 px** (iPhone 14/15 Pro Max class).

| File | Content |
|------|---------|
| `01-parent-dashboard.png` | Parent overview with child profile |
| `02-child-picker.png` | Child login — "Välj vem du är" |
| `03-child-idag.png` | Child view — **☀️ Idag** tab (schedule + tasks) |
| `04-child-skattkammaren.png` | Child view — **💎 Skattkammaren** universe hub |
| `05-child-familj.png` | Child view — **🏡 Familj** (Familjehallen) |

## Upload to App Store Connect

1. App Store Connect → Min Stjärndag → **App Store** → your version
2. **Screenshots** → iPhone 6.7" Display
3. Upload `01`–`05` in order (parent first, then child flow)
4. Optionally duplicate resized set for 6.5" if required by Connect

Last captured: 2026-06-08 · SW v222 · 3-tab child navigation (Idag · Skattkammaren · Familj)
