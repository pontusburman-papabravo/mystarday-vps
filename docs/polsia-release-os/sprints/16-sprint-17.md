# Sprint 17 — Google backend

| Fält | Värde |
|------|--------|
| **Kö-position** | 16 |
| **Polsia** | #2143390 |
| **P0** | P0.2 |
| **Timmar (plan)** | 2 |
| **Layer** | 3 |
| **Deploy** | En task = ett deploy till Polsia prod |

**Källor:** [app2.md](../../app2.md) · [ios-städ.md](../ios-städ.md) · [android.md](../../android.md)

---

## Polsia-prompt (copy-paste hela blocket)

```
Uppgift: Sprint 17 — POST /api/auth/google (backend)

Läs: android.md §2 Backend, app2 §4 P0.2, auth.js Apple-mönster

Gör endast:
1. POST /api/auth/google — verifiera Google idToken (google-auth-library eller JWT)
2. Skapa/länka parent + session cookies (samma som Apple/e-post)
3. Returnera onboarding_completed för redirect-beslut
4. csrf.js: exempt /api/auth/google om CSRF blockerar
5. 409 email_conflict om e-post redan finns med annan metod

Gör INTE: login.html UI, Capacitor plugin, PG, push

Env: GOOGLE_CLIENT_ID (dokumentera i .env.example om finns)

TEST:
□ Postman/curl med test-idToken → 200 + Set-Cookie
□ Ogiltig token → 401

Release-gate: Google backend (del av P0.2)

FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Verifiering efter deploy (Polsia kör)

```bash
cd /workspace  # Polsia: repo root
npm run lint
node --test test/
```

Fokus: backend-routes — `node --test test/auth.test.js` om auth rörts.

---

## Signering i PR

- [ ] Scope = endast denna sprint
- [ ] npm test + npm run lint (se [02-verify-and-tests.md](../02-verify-and-tests.md))
- [ ] SW bump om klient/HTML ändrats
- [ ] Commit-hash noterad i Polsia-svar
