# Redan implementerat i repo (Polsia: gör mindre / verifiera bara)

**Deploy-lista:** [`docs/polsia-deploy-manifest.md`](../polsia-deploy-manifest.md)  
**Main-status:** [`docs/MAIN-RELEASE-OS-STATUS.md`](../MAIN-RELEASE-OS-STATUS.md)

| Sprint | Polsia ID | Status |
|--------|-----------|--------|
| 1.1–1.4, Gate 0, 14, 2a–2b, 3a–3c, 4, 17 | ✅ | På main (#45) |
| 5a | ◐ | Rollval finns |
| 5b | ✅ | PIN haptik |
| 5c | ◐ | child-login 3-vy |
| 18 | ✅ | UI + platform stub; `npx cap sync` + plugin |
| 19 | ✅ | FCM send (kräver `FCM_SERVER_KEY`) |
| 20 | ◐ | APNs finns; deep-link tap via 22b |
| 22a | ✅ | assetlinks + AASA routes |
| 22b | ✅ | deep-link-router.js |
| 26 | ✅ | dashboard-polish |
| 16, 23A–B, Gate 24 | ○ | Checklist-dokument; manuell signering |

```
npm run test → 151+
npm run polsia:gate0 → OK
```
