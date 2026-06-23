# E1 — `family.js` endpoint-karta (förarbete inför split)

> **Syfte:** obligatoriskt förarbete enligt REFACTOR E1. Read-only analys, ingen kodändring.
> Underlag för en Opus-driven split-plan. `src/routes/family.js` = **2198 rader, 29 routes**.
> Mountas i `src/routes/index.js` rad 34: `app.use('/api/family', require('./family'))`.

---

## ⚠️ Tre kritiska risker (måste lösas i planen innan första commit)

### R1 — Router-nivå auth-gate mitt i filen (`router.use(requireParent)` rad 201)
Filen har **en intern auth-gräns**:

- **Rad 34–198 (publika, INGEN auth):** `GET /invite/:token`, `POST /invite/accept-new`
- **Rad 201:** `router.use(requireParent)` ← gate
- **Rad 205–2198 (parent-skyddade):** alla övriga 27 routes ärver `requireParent`

**Konsekvens för split:** när routes flyttas till separata filer försvinner den implicita
`router.use`-arvningen. Varje ny delfil måste **explicit** sätta rätt gate, annars blir
antingen publika rutter skyddade (trasigt invite-flöde) eller skyddade rutter publika
(säkerhetshål). De två publika invite-rutterna får **aldrig** hamna bakom `requireParent`.

### R2 — Delad mount-prefix `/api/family` med tre andra routrar
`route-inventory-pre-split.md` attribuerar **34 rader** till `src/routes/family.js`, men endast
**29** ägs faktiskt av filen. Dump-scriptets ägar-kolumn är **mount-prefix-baserad** och
kan inte skilja på filer som delar prefix. Dessa 5 ägs av ANDRA filer men listas som family.js:

| Route | Verklig ägare (index.js) |
|-------|--------------------------|
| `GET /api/family/hall` | `family-hall.js` (parentRouter, rad 29) |
| `GET /api/family/memory` | `family-hall.js` (memoryRouter, rad 30) |
| `GET /api/family/museum` | `family-hall.js` (rad 29) |
| `GET /api/family/museum/:childId/year-story` | `family-hall.js` (rad 29) |
| `POST /api/family/projects` | `child-universe.js` (parentRouter, rad 26) |

**Konsekvens för split:** acceptanskriteriet "route-dump identisk före/efter" måste verifieras
mot **mount-ordningen i index.js**. `app.use('/api/family', require('./family'))` måste behålla
exakt samma position relativt childUniverse/familyHall-mounten, annars ändras
prefix-matchningsordningen. Splitta family.js till `src/routes/family/index.js` och behåll
**en** mount-rad (`require('./family')`) på exakt nuvarande plats.

### R3 — Session/cookie-sidoeffekter + picker-flöde (rad 1877–2198)
Tre routes manipulerar httpOnly-cookies och login-picker-session, med subtilt auth-beteende:

- `parent-pin-status-picker` (1944), `verify-pin-picker` (1963), `restore-parent-session` (2141)
- Dokumenterade som "**utan aktiv JWT**" men ligger **efter** `requireParent`-gaten (rad 201).
- Fungerar p.g.a. `requireParent`s **barn→förälder-restore**: om ett barn-token finns
  återställs förälder ur `stjarndag_parent_session`-cookien (auth.js rad 57–87). De fungerar
  alltså bara när **ett barn är inloggat**, inte helt utloggat.
- Lokala helpers: `resolvePickerParentContext` (1880), `activateParentSessionCookies` (1898),
  `attachPickerFamily` (1928) — sätter/rensar `access_token`, `refresh_token`,
  `stjarndag_parent_session`; signerar `gateToken` via `jwt.sign`; `generateCsrfToken`.

**Konsekvens för split:** PIN/picker-gruppen måste flyttas **tillsammans med sina helpers** och
behålla exakt cookie-path/maxAge/sameSite. Får inte separeras från `requireParent`-semantiken.

---

## Föreslagen mål-struktur (`src/routes/family/`)

Gruppering efter domän + auth-gräns. **En router per delfil**, `index.js` monterar i rätt ordning.

| Delfil | Routes | Auth | Anmärkning |
|--------|--------|------|-----------|
| `invites-public.js` | `GET /invite/:token`, `POST /invite/accept-new` | **ingen** | Måste monteras FÖRE requireParent-gaten |
| `core.js` | `GET /`, `PUT /`, `PUT /settings`, `GET /dashboard-stats`, `GET /readiness`, `GET /star-history`, `GET /subscription-status` | requireParent (+ requireNotPedagogOnly) | Familjedata + statistik |
| `members.js` | `PUT /members/:id`, `PUT /members/:id/children`, `DELETE /members/:id`, `DELETE /children/:id` | requireParent | Medlems/barnhantering |
| `invites.js` | `POST /check-member`, `POST /invite`, `DELETE /invite/:inviteId`, `POST /add-parent`, `POST /accept-invite` | requireParent | Förälderinbjudan (inviteLimiter) |
| `pedagog.js` | `POST /invite-pedagog`, `GET /invite-pedagog`, `DELETE /invite-pedagog/:id`, `POST /pedagog-access/revoke` | requireParent + requirePrimaryParent | Pedagoginbjudan |
| `account.js` | `DELETE /delete-account` | requireParent | Rensar cookies (1690–1692) |
| `pin.js` | `GET /parent-pin-status-picker`, `POST /verify-pin-picker`, `GET /parent-pin-status`, `POST /set-pin`, `POST /verify-pin`, `POST /restore-parent-session` | requireParent (se R3) | + helpers 1877–1940 |

> **OBS:** `core.js` har en blandning av `requireNotPedagogOnly` per-route — behåll exakt
> per-route-middleware, lägg INTE `requireNotPedagogOnly` som router-gate (subscription-status
> + star-history har det INTE).

---

## Auth-/middleware-matris (per route, exakt nuvarande kedja)

`G` = ärvs från `router.use(requireParent)` rad 201.

| # | Metod | Path | Rad | Explicit middleware | Effektiv auth |
|---|-------|------|-----|---------------------|---------------|
| 1 | GET | `/invite/:token` | 34 | — | **publik** |
| 2 | POST | `/invite/accept-new` | 81 | — | **publik** |
| 3 | GET | `/` | 205 | `requireNotPedagogOnly` | G + notPedagog |
| 4 | PUT | `/` | 283 | `validate(UpdateFamilySchema)` | G |
| 5 | PUT | `/members/:id` | 323 | `validate(UpdateFamilyMemberSchema)` | G |
| 6 | PUT | `/members/:id/children` | 357 | — | G |
| 7 | DELETE | `/members/:id` | 416 | — | G |
| 8 | DELETE | `/children/:id` | 477 | `requireNotPedagogOnly` | G + notPedagog |
| 9 | PUT | `/settings` | 538 | `requireNotPedagogOnly`, `validate(UpdateFamilySchema)` | G + notPedagog |
| 10 | POST | `/check-member` | 641 | `validate(CheckFamilyMemberSchema)` | G |
| 11 | POST | `/invite` | 668 | `inviteLimiter`, `validate(InviteMemberSchema)` | G |
| 12 | DELETE | `/invite/:inviteId` | 731 | — | G |
| 13 | POST | `/add-parent` | 788 | — | G |
| 14 | POST | `/accept-invite` | 891 | — | G |
| 15 | GET | `/dashboard-stats` | 968 | `requireNotPedagogOnly` | G + notPedagog |
| 16 | GET | `/readiness` | 1291 | `requireNotPedagogOnly` | G + notPedagog |
| 17 | GET | `/star-history` | 1465 | — | G |
| 18 | GET | `/subscription-status` | 1571 | `requireParent` (redundant) | G |
| 19 | DELETE | `/delete-account` | 1613 | `requireParent` (redundant) | G — rensar cookies |
| 20 | POST | `/invite-pedagog` | 1705 | `requireParent`, `requirePrimaryParent` | G + primary |
| 21 | GET | `/invite-pedagog` | 1768 | — | G |
| 22 | DELETE | `/invite-pedagog/:id` | 1811 | `requirePrimaryParent` | G + primary |
| 23 | POST | `/pedagog-access/revoke` | 1830 | `requirePrimaryParent` | G + primary |
| 24 | GET | `/parent-pin-status-picker` | 1944 | — | G (+ picker-restore, se R3) |
| 25 | POST | `/verify-pin-picker` | 1963 | `attachPickerFamily`, `parentPinLimiter` | G + picker |
| 26 | GET | `/parent-pin-status` | 2019 | `requireAuth` (svagare, no-op bakom G) | G |
| 27 | POST | `/set-pin` | 2039 | `requireParent` (redundant) | G |
| 28 | POST | `/verify-pin` | 2094 | `parentPinLimiter`, `requireAuth` | G |
| 29 | POST | `/restore-parent-session` | 2141 | — | G — sätter cookies |

---

## Lokala helpers (måste flyttas med rätt grupp)

| Helper | Rad | Används av | Mål-delfil |
|--------|-----|-----------|-----------|
| `getWeekNumber(d)` | 1601 | star-history / stats | `core.js` |
| `resolvePickerParentContext(req)` | 1880 | picker-rutter | `pin.js` |
| `activateParentSessionCookies(req,res)` | 1898 | restore-parent-session | `pin.js` |
| `attachPickerFamily(req,res,next)` | 1928 | verify-pin-picker | `pin.js` |
| `parentPinDb` (require rad 1877) | 1877 | alla PIN-rutter | `pin.js` |

---

## Externa beroenden (imports + inline requires)

**Topp-imports:** `crypto`, `jwt`, `db`, auth (`requireParent`, `requireAuth`,
`resolveParentIdForLoginPicker`), `generateCsrfToken`, authz (`requireNotPedagogOnly`,
`requirePrimaryParent`), `parent-access` (`syncAccountType`, `getChildrenForParent`),
email (`sendEmail`, `sendInviteEmail`), `createNewsletterSubscription`, `hashPassword`,
`config`, `app-settings`, validate, rateLimiter (`inviteLimiter`, `parentPinLimiter`),
schemas (5 st + `UUIDParam`), `family-duplicates` (3 st), daily-log-generator
(`getLocalDateStr`, `getOrGenerateDailyLog`).

**Inline requires (lazy):** `payment-policy` (1584), `pedagog-invite` (1727/1770/1813/1838),
`email.sendPedagogInviteEmail` (1742), `parent-pin` (1877), `hash.comparePassword/hashPassword`
(2060/2072/2080), `lib/hash` (2060+).

**Cookie-sidoeffekter:** clearCookie ×3 (delete-account 1690–1692), set/clear cookies i
`activateParentSessionCookies` (1909/1916/1923) och restore-parent-session (2175/2182/2189).

---

## Acceptans för E1 (per PR)

1. `npm run check:routes` — **601 routes oförändrade**, inkl. korrekt `/api/family`-prefixordning (R2).
2. Två publika invite-rutter förblir publika; alla övriga kvar bakom `requireParent` (R1).
3. Per-route `requireNotPedagogOnly` / `requirePrimaryParent` exakt bevarade (matris ovan).
4. Cookie-/PIN-/picker-flöde oförändrat (R3) — manuell verifiering, inte bara check:routes.
5. `test/family-*.test.js` grönt (`family-invite-routing`, `family-chest-enabled`,
   `family-ui-avatar-menu-fix`) + prod QA 7/7.
6. **E-grundregel:** flytta routes ELLER ändra authz/query — aldrig båda i samma PR.

## Föreslagen PR-ordning (en grupp per PR)

`invites-public.js` → `pin.js` (+ helpers) → `pedagog.js` → `members.js` → `invites.js` →
`account.js` → `core.js` → `index.js` (ta bort shim). Picker/PIN tidigt eftersom det är
högst risk; lämna `core.js` (störst, lägst risk) sist.
