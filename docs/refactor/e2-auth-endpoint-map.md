# E2 — `auth.js` endpoint-karta (förarbete inför split)

> **Syfte:** obligatoriskt förarbete inför E2 (REFACTOR Fas 7, *mycket hög risk*).
> Read-only analys. `src/routes/auth.js` = **1770 rader, 16 routes**.
> Mountas i `src/routes/index.js`: `app.use('/api/auth', require('./auth'))`.
> Följer mönstret från `e1-family-endpoint-map.md`.
>
> **Beroenden uppfyllda:** E1 ✅ (familjesplit klar) · D2 ✅ (`src/lib/google-auth.js`
> använder redan `OAuth2Client.verifyIdToken` med multi-client audience).

---

## Skillnad mot family.js (lägre på en axel, högre på en annan)

- **Ingen `router.use()`-gate** — auth.js har INTE en positionell auth-grind som family.js (R1).
  Varje route har sin egen middleware (limiter + `validate`, eller `requireAuth`). Det gör
  mount-ordningen ofarlig (se R-A nedan).
- **MEN: delade session-helpers** är hjärtat av risken. `completeLogin`, `parseDuration` och
  `clearAllSessionCookies` sätter/rensar httpOnly-cookies och bygger login-svaret. De korsar
  flera route-grupper och måste extraheras FÖRST (E2 fas 1) innan routes flyttas (fas 2).

---

## ⚠️ Risker

### R-A — Mount-ordning ofarlig, men verifiera path-skuggning
Inga top-level `/:param`-routes som kan greedy-matcha. `/me` (GET) vs `/me/preferences` (POST)
krockar inte. Acceptans: `check:routes` identisk + ingen route byter ägare-prefix.

### R-B — Delade session-helpers (fas 1, störst risk)
| Helper | Rad | Används av | Sätter/rensar |
|--------|-----|-----------|----------------|
| `parseDuration(val)` | 60 | login (472), child-login (961), refresh (1153/1169), completeLogin (1553) | — (util) |
| `completeLogin(req,res,parent,userType)` | 1526 | apple (1222/1249), google (1763) | access+refresh cookie, csrf, login-svar |
| `clearAllSessionCookies(res)` | 1626 | logout (1655/1724) | rensar alla session-cookies |

`completeLogin` använder själv `parseDuration` + `generateCsrfToken` + `setAccessCookie`/
`setRefreshCookie` (från `lib/refresh-tokens`) + `createRefreshToken`. **Måste flyttas med
exakt samma cookie-options.** login/register/child-login bygger sina svar INLINE (inte via
completeLogin) — så cookie-sättningen finns på flera ställen; ändra inget beteende, flytta bara.

### R-C — Apple ID-token-verifiering (krypto)
`verifyAppleIdToken` (1324) + `_fetchAppleJwks` (1301, JWKS-hämtning/cache) + `_jwkToPem` (1318)
+ `createParentWithApple` (1386). Apple-only. Flyttas samlat till `oauth-apple.js`.
JWKS-cachen (modulnivå-state) måste följa med — verifiera att cache-variabeln flyttas, inte dupliceras.

### R-D — Refresh-flödet (Gate-skyddat i REFACTOR-acceptans)
`POST /refresh` (1116) roterar refresh-token + sätter nya cookies via `lib/refresh-tokens`.
Acceptans kräver att refresh-flödet är **oförändrat**. Flyttas verbatim till `refresh.js`.

---

## Route-inventory (16 routes, alla `/api/auth`)

| # | Metod | Path | Rad | Middleware | Mål-fil |
|---|-------|------|-----|-----------|---------|
| 1 | POST | `/register` | 74 | `registrationLimiter`, `validate(RegisterSchema)` | `register.js` |
| 2 | POST | `/login` | 391 | `loginLimiter`, `validate(LoginSchema)` | `login.js` |
| 3 | POST | `/verify-email` | 499 | `validate(VerifyEmailSchema)` | `email.js` |
| 4 | POST | `/resend-verification` | 535 | `resendVerificationLimiter`, `validate` | `email.js` |
| 5 | POST | `/forgot-password` | 610 | `forgotPasswordLimiter`, `validate` | `email.js` |
| 6 | POST | `/reset-password` | 670 | `validate(ResetPasswordSchema)` | `email.js` |
| 7 | POST | `/child-login` | 723 | `childLoginLimiter`, `validate(ChildLoginSchema)` | `child-login.js` |
| 8 | POST | `/me/preferences` | 986 | `requireAuth` | `login.js` (session) |
| 9 | GET | `/me` | 1013 | `requireAuth` | `login.js` (session) |
| 10 | GET | `/csrf-token` | 1108 | — | `refresh.js` |
| 11 | POST | `/refresh` | 1116 | — | `refresh.js` |
| 12 | POST | `/apple` | 1195 | `appleLoginLimiter` | `oauth-apple.js` |
| 13 | POST | `/apple/link` | 1260 | `appleLoginLimiter` | `oauth-apple.js` |
| 14 | GET | `/login-picker-children` | 1576 | — | `login.js` |
| 15 | POST | `/logout` | 1645 | — | `login.js` |
| 16 | POST | `/google` | 1734 | `appleLoginLimiter` | `oauth-google.js` |

---

## Föreslagen mål-struktur (`src/routes/auth/`)

```
index.js        — barrel: monterar alla sub-routrar (mount-ordning bevarad)
session.js      — parseDuration, completeLogin, clearAllSessionCookies (FAS 1)
register.js     — POST /register
login.js        — POST /login, /logout, GET /me, POST /me/preferences, GET /login-picker-children
email.js        — POST /verify-email, /resend-verification, /forgot-password, /reset-password
child-login.js  — POST /child-login
refresh.js      — GET /csrf-token, POST /refresh
oauth-apple.js  — POST /apple, /apple/link + Apple JWKS/PEM/verify helpers
oauth-google.js — POST /google
```

---

## E2 körordning (en PR per steg, E-grundregel: flytta ELLER ändra, aldrig båda)

1. **PR-relocate** — `auth.js` → `auth/index.js` (fix require-paths en nivå djupare).
2. **PR-session (fas 1)** — extrahera `session.js` (parseDuration, completeLogin, clearAllSessionCookies); index.js importerar och anropar dem. Ingen route-flytt.
3. **PR-oauth-apple** — `oauth-apple.js` (+ Apple-helpers + JWKS-cache).
4. **PR-oauth-google** — `oauth-google.js`.
5. **PR-email** — `email.js` (verify/resend/forgot/reset).
6. **PR-child-login** — `child-login.js`.
7. **PR-refresh** — `refresh.js` (csrf-token + refresh).
8. **PR-register** — `register.js`.
9. **PR-login + barrel** — `login.js` (login/logout/me/preferences/picker) + `index.js` blir ren barrel.

## Acceptans (varje PR)
- `npm run check:routes` — 601 routes oförändrade.
- `npm run lint` — 0 errors.
- `test/auth.test.js`, `test/auth-integration.test.js`, `test/apple-signup-sql.test.js`,
  `test/google-auth.test.js` grönt.
- **Refresh-flöde oförändrat** (R-D); cookie-options identiska (R-B).
- Prod QA 7/7 (login-endpoint ingår redan i smoke-setet).
