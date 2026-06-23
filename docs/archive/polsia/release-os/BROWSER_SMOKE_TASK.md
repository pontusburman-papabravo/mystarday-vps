# Browser smoke task — Release OS (parallellt med deploy)

**Mål:** Puppeteer/Playwright mot **prod** efter deploy (eller mot staging om angivet).  
**URL:** `https://stjarndag.polsia.app`

---

## Automatiserbara tester

| # | Steg | Pass-kriterium |
|---|------|----------------|
| 1 | GET `/health` via fetch i page | `status: healthy` |
| 2 | GET `/api/app-config` | `parental_gate_enabled` finns |
| 3 | Öppna `/login` | Ingen 5xx; `#role-selection` eller `#parent-login-section` synlig |
| 4 | Öppna `/.well-known/assetlinks.json` | JSON array |
| 5 | Kontrollera `sw.js` innehåller `stjarndag-v167` | text match |

---

## Kräver manuell enhet (rapportera SKIPPED)

- Barnläge efter force-close
- Föräldra-PIN (PG)
- Native tab bar (Capacitor)
- Google/Apple native login
- Push notification tap

---

## Svarformat

```
BROWSER SMOKE — PASS / FAIL

1 health: ...
2 app-config: ...
3 login: ...
4 assetlinks: ...
5 sw v167: ...
Screenshots: <paths om tillgängligt>
```
