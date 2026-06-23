# Polsia — Kontohantering A–F (komplett spec)

**Skapad:** 2026-05-29  
**Produkt:** Min Stjärndag / Stjärndag  
**Produktion:** https://stjarndag.polsia.app (Capacitor-app laddar https://mystarday.se)  
**Stack:** Node.js 20, Express, Neon PostgreSQL, statiska filer i `public/`

Detta dokument är **en enda källfil** för Polsia AI. Implementera i prioriterad ordning (A → B → C → D/E → F).

---

## 0. Nuläge (analys mot senaste ZIP, maj 2026)

Referens: `stjarndag (1).zip` (SW v136). GitHub-spegeln kan ligga efter ZIP — **utgå från senaste ZIP/prod vid konflikt**.

### Redan levererat (rör inte om inte bugfix)

| Område | Status |
|--------|--------|
| JWKS-fix (`crypto.createPublicKey` i `_jwkToPem`) | ✅ |
| CSRF exempt: `/auth/apple`, `/auth/apple/link` | ✅ |
| Native Apple: `Capacitor.Plugins.SignInWithApple.authorize()` + `isAvailable()` | ✅ |
| Login 409: `data.error === 'email_conflict'` | ✅ |
| Login-länkning (logik): login → link med `idToken` + CSRF | ✅ |
| Register 409-fix | ✅ |
| Login redesign ("magisk natt", `login-magic.css/js`) | ✅ |
| Platform-theme (`platform-theme.js`, middleware) | ✅ |

### Saknas (detta dokument)

| Del | Innehåll | Status |
|-----|----------|--------|
| **A** | Android dölj Apple + login-modal (ersätt `prompt()`) | ❌ |
| **B** | Backend-grund: `accountAuth`, `set-password`, migration | ❌ |
| **C** | Inställningar-UI + "Lägg till lösenord" | ❌ |
| **D** | Koppla / koppla bort Apple från Inställningar | ❌ |
| **E** | Byt e-post (request + confirm + sida) | ❌ |
| **F** | Admin-stöd (badges, e-post, unlink, audit) | ❌ |

### Kvarvarande buggar i prod

1. **Android visar Apple-knapp** — `isIOS() \|\| isNative()` i login/register.
2. **Login-länkning använder `prompt()`** — funkar men dålig UX i native WebView.
3. **Apple-only utan lösenord** — kan inte logga in på Android/webb utan admin-reset.
4. **Ingen e-poständring** i Inställningar.
5. **Admin ser inte kontotyp** (Apple/lösenord).

---

## 1. Plattformsregler (Android)

| Funktion | iOS | Android | Webb |
|----------|-----|---------|------|
| Logga in / koppla Apple | ✅ | ❌ Dölj UI | ✅ Safari (Apple JS) |
| Sätt lösenord | ✅ | ✅ **Kritiskt** | ✅ |
| Byt lösenord | ✅ | ✅ | ✅ |
| Byt e-post | ✅ | ✅ | ✅ |
| Koppla bort Apple | ✅ | ✅ (med lösenord) | ✅ |
| Koppla Apple (Inställningar) | ✅ | ❌ Dölj | ✅ (Apple JS) |

**Hjälpfunktion (C/D):**

```javascript
function showAppleAuthUI() {
  return window.Platform && window.Platform.isIOS && window.Platform.isIOS();
}
```

**Android-info i Inställningar** (när `hasAppleLinked && !Platform.isIOS()`):

> *"Du kopplade Apple-kontot på en iPhone. För att logga in här, lägg till ett lösenord nedan."*

---

## 2. Leveransordning

```
A (snabbfix) → B (backend) → C (settings UI) → D + E (parallellt OK, serialisera account.js) → F (admin)
```

| Prioritet | Prompt | Värde |
|-----------|--------|-------|
| 1 | **A** | Android + login-UX |
| 2 | **B** | Blockerar C–E |
| 3 | **C** | Apple-only → Android |
| 4 | **D** | Apple i Inställningar |
| 5 | **E** | E-postbyte |
| 6 | **F** | Admin-support |

**Ingen Xcode/Android-build** krävs för A–F — web + server.

---

## 3. Prompt A — Snabbfix (Android + login-modal)

**Bas:** Nuvarande prod (SW v136+). **Rör inte** JWKS, CSRF eller befintlig login→link-logik.

### Uppgift

1. **`public/login.html` + `public/register.html`:** Visa Apple-knapp **endast** när `Platform.isIOS()` — ta bort `|| Platform.isNative()`.

2. **`public/login.html` — ersätt `prompt()` i `handleAppleLink()`:**
   - Utöka `appleLinkingPrompt` med lösenordsfält (`type="password"`, id t.ex. `appleLinkPassword`)
   - "Ja, länka" läser fältet och kör **befintlig** flöde: `POST /api/auth/login` → `POST /api/auth/apple/link` med `{ idToken }` + CSRF
   - "Avbryt" stänger och rensar `_applePendingEmail` / `_applePendingIdToken`
   - Matcha "magisk natt"-design (inte system-`prompt()`)

3. **SW-bump** (v137+).

### Test

- iOS: Apple-knapp syns; länkning med modal + lösenord → dashboard
- Android: ingen Apple-knapp på login/register

### Filer

`public/login.html`, `public/register.html`, `public/sw.js`

---

## 4. Prompt B — Backend-grund

### Uppgift

#### 4.1 Utöka `GET /api/auth/me` (`src/routes/auth.js`)

Utöka parent-query med: `password_hash IS NOT NULL AS has_password`, `apple_user_id`, `apple_email`.

Returnera (bryt inte befintliga fält):

```json
{
  "accountAuth": {
    "hasPassword": true,
    "hasAppleLinked": true,
    "email": "ann@example.com",
    "appleEmail": "ann@example.com",
    "canUnlinkApple": true
  }
}
```

- `canUnlinkApple` = `hasPassword && hasAppleLinked`

#### 4.2 `POST /api/account/set-password` (`src/routes/account.js`)

- Auth: `requireParent` + CSRF
- Body (Zod): `{ newPassword, confirmPassword }`, min 8 tecken, måste matcha
- Bara om `password_hash IS NULL` → annars 409 *"Lösenord finns redan"*
- Returnera `{ message, accountAuth }`

#### 4.3 Migration `email_change_token`

```sql
CREATE TABLE email_change_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  new_email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_change_token_parent ON email_change_token(parent_id);
CREATE INDEX idx_email_change_token_token ON email_change_token(token);
```

#### 4.4 Rör inte (redan klart i prod)

- JWKS / `_jwkToPem` med `crypto.createPublicKey`
- CSRF exempt för `/auth/apple` och `/auth/apple/link`

### Test

- `/me` returnerar `accountAuth` för Apple-only vs lösenordskonto
- Apple-only kan sätta lösenord via API
- `npm run migrate` körd

### Filer

`src/routes/auth.js`, `src/routes/account.js`, `src/lib/schemas.js` (ev.), `migrations/`

---

## 5. Prompt C — Inställningar-UI

**Förutsättning:** Prompt B deployad.

### Uppgift

#### 5.1 Ny fil `public/js/settings-account.js`

- Hämta `accountAuth` från `GET /api/auth/me` (via `Auth.api`)
- `showAppleAuthUI()` → `Platform.isIOS()`

Dynamisk UI:

| Villkor | Visa |
|---------|------|
| `!hasPassword` | Form "Lägg till lösenord" → `POST /api/account/set-password` |
| `hasPassword && !hasAppleLinked && isIOS()` | Knapp "Koppla Apple-konto" (wire i D) |
| `hasAppleLinked && isIOS()` | "✓ Apple kopplat" + placeholder unlink (D) |
| `hasAppleLinked && !isIOS()` | Android-info-text (se plattformsregler) |
| `hasPassword` | Placeholder "Byt e-post" (wire i E) |

#### 5.2 `public/settings.html`

- Ny `<section id="accountAuthSection">` **ovanför** "Byt lösenord"
- Rubrik: **Konto & inloggning**
- `<script src="/js/settings-account.js">` efter `auth.js`
- Init: `SettingsAccount.init()` i befintlig DOMContentLoaded

#### 5.3 "Lägg till lösenord" (funktionell i denna del)

- Fält: nytt lösenord + bekräfta — **inget** "nuvarande lösenord"
- Vid success: uppdatera UI → visa "Byt lösenord" istället
- Dölj "Byt lösenord"-sektionen tills `hasPassword`

#### 5.4 SW-bump

### Test

- Apple-only → Inställningar → sätt lösenord → `hasPassword: true`
- Android: info-text, ingen Apple-knapp

### Filer

`public/js/settings-account.js` (ny), `public/settings.html`, `public/sw.js`

---

## 6. Prompt D — Apple från Inställningar

**Förutsättning:** Prompt B + C.

### Uppgift

#### 6.1 `POST /api/account/link-apple` (`src/routes/account.js`)

- Auth: `requireParent` + CSRF
- Body: `{ idToken }`
- `verifyAppleIdToken(idToken)`
- Redan kopplat på detta konto → 409
- `apple_user_id` tillhör annat konto → 409
- `linkAppleUserId(req.user.id, sub, appleEmail)` — uppdatera **inte** `parent.email` automatiskt
- Returnera `{ message, accountAuth }`

#### 6.2 `DELETE /api/account/unlink-apple` (`src/routes/account.js`)

- Auth: `requireParent` + CSRF
- Body: `{ password }`
- Kräv `hasPassword` → annars 400: *"Sätt ett lösenord innan du kopplar bort Apple"*
- Verifiera lösenord
- `UPDATE parent SET apple_user_id = NULL, apple_email = NULL`
- Returnera `{ message, accountAuth }`

#### 6.3 Wire `settings-account.js`

- **Koppla Apple** (iOS only): `Platform.appleSignIn.signIn()` → `POST /api/account/link-apple`
- **Koppla bort:** modal + lösenord + varning: *"Du måste ha lösenord för att logga in utan Apple"*

### UI-texter (svenska)

| Element | Text |
|---------|------|
| Apple kopplat | ✓ Apple-konto kopplat |
| Länka Apple | Koppla Apple-konto |
| Koppla bort | Koppla bort Apple-konto |
| Unlink-varning | Du måste ha ett lösenord för att koppla bort Apple. Annars kan du inte logga in. |

### Test

- iOS: koppla Apple från Inställningar; koppla bort med lösenord
- Unlink utan lösenord → 400

### Filer

`src/routes/account.js`, `db/parent.js` (ev. helper), `public/js/settings-account.js`, `public/sw.js`

---

## 7. Prompt E — Byt e-post

**Förutsättning:** Prompt B + C (migration från B).

### Uppgift

#### 7.1 `POST /api/account/change-email/request`

- Auth: `requireParent` + CSRF
- Body: `{ newEmail, password }`
- Verifiera lösenord (Apple-only utan lösenord → 400: *"Sätt lösenord först"*)
- Normalisera e-post; kolla att den inte finns
- Invalidera gamla tokens för parent
- Skapa token i `email_change_token` (64 hex, 24h TTL)
- Skicka mail till **ny** adress via Polsia email proxy:

```
Ämne: Bekräfta din nya e-postadress — Min Stjärndag
Länk: https://mystarday.se/verify-email-change?token=...
```

#### 7.2 `POST /api/account/change-email/confirm`

- Body: `{ token }` — lägg till CSRF exempt om public/anonym confirm
- Validera token (ej expired, ej used)
- `UPDATE parent SET email = new_email`
- Markera `used_at = NOW()`
- Ev. uppdatera `email_subscriptions`

#### 7.3 `public/verify-email-change.html` (ny)

- Läser `?token=` från URL
- Anropar confirm-endpoint
- Success: *"E-post uppdaterad!"* + länk till login/settings

#### 7.4 Registrera route

`src/routes/index.js` — serve HTML-sidan.

#### 7.5 Wire `settings-account.js`

- Form: ny e-post + lösenord → request
- Pending: *"Vi har skickat en länk till [email]"*

### Test

- Request med fel lösenord → 401
- Confirm → inloggning med ny e-post fungerar

### Filer

`src/routes/account.js`, `src/lib/email.js`, `src/middleware/csrf.js`, `public/verify-email-change.html`, `public/js/settings-account.js`, `src/routes/index.js`, `public/sw.js`

---

## 8. Prompt F — Admin-stöd

**Förutsättning:** Prompt B önskvärt (samma fältnamn) men **inte blockerande**.

### Bakgrund — admin idag

| Finns | Saknas |
|-------|--------|
| Återställ lösenord (`PUT /api/admin/reset-parent-password/:id`) | Synlighet Apple/lösenord |
| Lås / lås upp | Admin e-postbyte |
| Ta bort konto | Admin koppla bort Apple |
| Impersonera + `admin_audit_log` | Audit-vy för support |

### F1 — Visa kontotyp i familjvyn

**Backend:** Utöka parent i `GET /api/admin/families-grouped` (`src/routes/admin/family.js`):

```json
{
  "hasPassword": true,
  "hasAppleLinked": true,
  "appleEmail": "ann@privaterelay.appleid.com",
  "authMethods": ["password", "apple"]
}
```

**Frontend:** `public/admin/admin-families.js` — badges under e-post:

| Badge | Villkor |
|-------|---------|
| 🔑 Lösenord | `hasPassword` |
| 🍎 Apple | `hasAppleLinked` |
| ⚠️ Apple-only | `hasAppleLinked && !hasPassword` |
| 📧 Relay | `appleEmail` innehåller `privaterelay` |

### F2 — Förbättra "Återställ lösenord"

- Bekräftelsemodal med kontotyp + varning om Apple relay
- Audit efter reset: `action: 'admin_reset_password'`, metadata: `{ target_parent_id, target_email, had_password_before, had_apple_linked }`
- **Lösenord ska endast skickas via e-post** — aldrig i API-svar eller `alert()`

### F3 — Admin: byt e-post

**`PUT /api/admin/parents/:id/email`**

- `requireAdmin`
- Body: `{ newEmail, reason }` — reason min 10 tecken
- Uppdatera `parent.email`; notifiera gammal + ny adress
- Audit: `action: 'admin_change_email'`

**UI:** Knapp "Byt e-post" → modal.

### F4 — Admin: koppla bort Apple

**`DELETE /api/admin/parents/:id/apple-link`**

- `requireAdmin`
- Body: `{ reason }` obligatorisk
- Kräv `hasPassword` — annars 400: *"Återställ lösenord först"*
- Audit: `action: 'admin_unlink_apple'`

### F5 — Audit-vy (minimal)

**`GET /api/admin/families/:familyId/audit-log`**

- Senaste 20 rader: `admin_reset_password`, `admin_change_email`, `admin_unlink_apple`, `impersonate_start`

**UI:** Expanderbar "Support-historik" per familj.

### Säkerhetsregler (F)

1. Alla endpoints: `requireAdmin`
2. `reason` obligatorisk för e-postbyte och Apple-unlink
3. Logga aldrig lösenord
4. Admin kan **inte** koppla Apple åt användare — bara koppla bort

### Test (F)

- Badges syns; admin e-postbyte; unlink kräver lösenord; icke-admin → 403

### Filer (F)

`src/routes/admin/family.js`, `public/admin/admin-families.js`, `src/lib/email.js` (ev.)

---

## 9. Säkerhetsregler (alla delar)

1. Koppla aldrig bort Apple utan lösenord (förälder + admin)
2. Länka aldrig Apple-ID som tillhör annat konto
3. E-postbyte (E): verifiering på ny adress; admin (F3): override + notis
4. JWT-verifiering alltid server-side för Apple
5. Rate limit på nya endpoints (samma mönster som `appleLoginLimiter` / `forgotPasswordLimiter`)

---

## 10. Support-flöde (förälder vs admin)

| Scenario | Förälder (B–E) | Admin (F) |
|----------|----------------|-----------|
| Sätt lösenord | Inställningar | Återställ lösenord |
| Byt e-post | Verifieringsmail | Direkt override + notis |
| Koppla Apple | iOS Inställningar | ❌ |
| Koppla bort Apple | Inställningar + lösenord | Admin + audit |
| Apple-only på Android | Sätt lösenord | Gul badge + reset |

---

## 11. Filer — sammanfattning

| Fil | A | B | C | D | E | F |
|-----|---|---|---|---|---|---|
| `public/login.html` | ✅ | | | | | |
| `public/register.html` | ✅ | | | | | |
| `public/sw.js` | ✅ | | ✅ | ✅ | ✅ | |
| `src/routes/auth.js` | | ✅ | | | | |
| `src/routes/account.js` | | ✅ | | ✅ | ✅ | |
| `migrations/` | | ✅ | | | | |
| `public/js/settings-account.js` | | | ✅ | ✅ | ✅ | |
| `public/settings.html` | | | ✅ | | | |
| `public/verify-email-change.html` | | | | | ✅ | |
| `src/routes/admin/family.js` | | | | | | ✅ |
| `public/admin/admin-families.js` | | | | | | ✅ |

---

## 12. Env-variabler

| Variabel | Behov |
|----------|-------|
| `APPLE_CLIENT_ID=se.mystarday.app` | Apple-inloggning (redan satt?) |
| `POLSIA_API_KEY` / email proxy | E-post i Del E och F3 |
| Inga nya secrets för A–D | |

---

## 13. Efter deploy — röktest

- [ ] GET https://stjarndag.polsia.app/health → OK
- [ ] `npm run migrate` om B eller E migration
- [ ] iOS Apple-inloggning + länkning (modal)
- [ ] Android: ingen Apple-knapp; sätt lösenord i Inställningar
- [ ] Admin: badges i familjvyn (F)
- [ ] SW-cache: användare får ny login/settings efter bump

---

## 14. Framtida (INTE i detta dokument)

- Google Sign In på Android (separat uppdrag)
- Google Play-lansering
- Platform-theme fas 2 (tab bar)
- **Barnlogin redesign** — se `docs/polsia-barnlogin-design.md` (separat Polsia-uppdrag)

---

*Slut på spec. Implementera A → F i ordning om inget annat anges.*
