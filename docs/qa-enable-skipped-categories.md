# QA — köra hoppade kategorier

De 120+ punkter som tidigare markerades **skip** kräver extra setup. Detta dokument beskriver hur du aktiverar och kör dem.

## 1. Server: aktivera QA-läge (e-postflöden)

På **staging/VPS** (inte publik prod utan restriktioner):

```bash
# .env på servern
QA_MODE=true
QA_SECRET=din-slumpmässiga-hemlighet-minst-32-tecken
```

Starta om appen. Verifiera:

```bash
curl -H "X-QA-Secret: din-hemlighet" https://mystarday.se/api/qa/status
# → {"qaMode":true,...}
```

**Vad det gör:**
- `verifyToken` / `resetToken` / `inviteToken` returneras i API-svar
- `/api/qa/token?email=&kind=verify|reset|invite` — hämta token från DB utan inbox
- Familjeinbjudan returnerar 201 även om e-post misslyckas (QA-läge)

## 2. Admin-panel (QA-262–286)

**Alternativ A — auto (QA_MODE på server):**

```bash
export QA_SECRET=din-hemlighet   # samma som server QA_SECRET
export QA_BASE_URL=https://188.66.60.93
export QA_HOST=mystarday.se
npm run qa:admin
```

Skriptet registrerar `qa.admin+<stamp>@test.mystarday.se`, verifierar e-post via harness och kör `POST /api/qa/setup-admin`.

**Alternativ B — befintligt admin-konto:**

```sql
UPDATE parent SET is_admin = true, verified = true
WHERE LOWER(email) = 'din-admin@mystarday.se';
```

```bash
export QA_ADMIN_EMAIL=din-admin@mystarday.se
export QA_ADMIN_PASSWORD='...'
npm run qa:admin
```

## 3. E-postflöden (QA-017–024, QA-197–201)

```bash
npm run qa:email
```

Testar: registrering → verify → forgot/reset → family invite → accept-new.

## 4. Browser / PWA / UX (QA-232–243, QA-297–299)

```bash
npm install
npx playwright install chromium
npm run qa:browser
```

**Kan inte automatiseras här:** riktig APNs/FCM (QA-221–222), Capacitor native (QA-236–243), Apple Sign In (QA-025–026).

## 5. Destruktiva tester (QA-087, QA-205)

Skapar **engångsfamilj** och raderar barn + konto:

```bash
QA_ALLOW_DESTRUCTIVE=1 npm run qa:destructive
```

## 6. Kör allt + merge till 300-rapport

```bash
export QA_BASE_URL=https://188.66.60.93
export QA_HOST=mystarday.se
export QA_SECRET=...
export QA_ADMIN_EMAIL=...
export QA_ADMIN_PASSWORD=...

npm run qa:skipped    # email + admin + browser + destructive
npm run qa:merge      # slår ihop alla körningar
```

## Miljövariabler (referens)

| Variabel | Syfte |
|----------|--------|
| `QA_MODE` | Server: aktivera test-token API |
| `QA_SECRET` | Server + klient: skyddar `/api/qa/*` |
| `QA_BASE_URL` | Målserver |
| `QA_HOST` | `mystarday.se` vid IP-access (188.66.60.93) |
| `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD` | Admin-tester |
| `QA_ALLOW_DESTRUCTIVE=1` | Radera barn/konto |
| `QA_SKIP_LOCKOUT=1` | Undvik IP rate limit barnlogin |

## Fortfarande manuellt

| Kategori | Varför |
|----------|--------|
| Apple Sign In | Kräver Apple IdP + enhet |
| iOS/Android native push | Fysisk enhet + FCM/APNs |
| Admin impersonation UI | Manuell browser |
| Schema drag-and-drop | Playwright med inloggad session |
| Enkäter live (QA-287–291) | Survey slug + GDPR flow |
