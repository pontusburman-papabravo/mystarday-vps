# Fas 6 — Golden path kartläggning (read-only)

**Branch:** `cursor/golden-path-first-star`  
**Bas:** `origin/main` @ `caa5753d8301fac89f8fa23147df85555fbdce3e` (prod live vid kartläggning)  
**Spår:** A only — ingen merge/deploy i denna leverans.

## 1. Aktuell `origin/main`-SHA

| Referens | SHA |
|----------|-----|
| Kartläggning start | `caa5753d8301fac89f8fa23147df85555fbdce3e` |
| Prod `/health` (kartläggning) | `caa5753d` (match) |

---

## 2. Golden path — routes, moduler, tabeller, events

### 2.1 Användarflöde (happy path)

```
/register.html
  → POST /api/auth/register
  → POST /api/auth/login (cookies + CSRF)
/onboarding.html
  → POST /api/onboarding/child
  → POST /api/onboarding/schedule (+ optional weekend/reward/complete i legacy/ACT-1)
  → (UI) handoff → /child-login
/child-login.html
  → POST /api/auth/child-login
/child-dashboard.html
  → GET /api/me/daily-log
  → PUT /api/me/daily-log-items/:id/complete
```

**Parent redirect:** `public/js/auth.js` `redirectIncompleteOnboarding()` tvingar `/onboarding` när `user.onboarding_completed === false` (routing-infrastruktur; produktfas i Journey/activation separat).

**Schema sparat:** `src/routes/onboarding.js` anropar `markParentOnboardingComplete` vid lyckad schedule — parent kan lämna wizard utan separat `POST /complete` i många fall.

### 2.2 HTTP routes (API)

| Steg | Route | Handler | Auth |
|------|-------|---------|------|
| Registrering | `POST /api/auth/register` | `src/routes/auth/register.js` | Publik (rate limit) |
| Login | `POST /api/auth/login` | `src/routes/auth/login.js` | Publik |
| Me / session | `GET /api/auth/me` | `src/routes/auth/login.js` | Parent cookie/JWT |
| Barn (wizard) | `POST /api/onboarding/child` | `src/routes/onboarding.js` | `requireParent` + feature `child_creation_wizard` |
| Schema | `POST /api/onboarding/schedule` | `src/routes/onboarding.js` | Parent |
| Helg | `POST /api/onboarding/weekend-schedule` | samma | Parent |
| Reward | `POST /api/onboarding/reward` | samma | Parent |
| Klart flag | `POST /api/onboarding/complete` | samma | Parent |
| Handoff ctx | `GET /api/onboarding/handoff-context` | samma | Parent |
| PIN | `POST /api/onboarding/update-pin` | samma | Parent |
| Barnlogin | `POST /api/auth/child-login` | `src/routes/auth/child-login.js` | Publik (rate limit) |
| Idag-vy | `GET /api/me/daily-log` | `src/routes/daily-logs/child-self.js` | `requireChild` |
| Slutför | `PUT /api/me/daily-log-items/:id/complete` | `child-self.js` | Child |
| Parent checkoff | `PUT /api/daily-log-items/:id/complete` | `src/routes/daily-logs/items.js` | Parent |

**Mount:** `src/routes/index.js` — `/api/auth`, `/api/onboarding`, `/api/me` (child self).

### 2.3 Frontend moduler (kritiska)

| Modul | Roll |
|-------|------|
| `public/js/auth.js` | Register/login, onboarding redirect, parent session |
| `public/js/onboarding.js` | Wizard orchestration, steg, schedule/reward/complete |
| `public/js/onboarding-starter-plan.js` | ACT-1 / activation-config branch |
| `public/js/onboarding-activation.js` | Handoff till barnlogin (flag-gated) |
| `public/js/onboarding-handoff-resume.js` | Resume efter refresh |
| `public/js/onboarding-handoff-film.js` | Film (engångs) |
| `public/js/onboarding-first-star.js` | First-star UI efter completion |
| `public/js/onboarding-activity-guide.js` | Aktivitetsguide-steg |
| `public/js/child-login.js` | Barnväljare, PIN, milestones |
| `public/js/child-dashboard-checkoff.js` | Checkoff, rating modal, offline queue |
| `public/js/child-dashboard-substeps.js` | Substep complete |
| `public/js/meta-app-events.js` | `meta_milestones` → analytics |

### 2.4 Databastabeller (kärna)

| Tabell | Golden path |
|--------|-------------|
| `family` | Skapas vid register |
| `parent` | `onboarding_completed`, `verified` |
| `child` | Wizard + PIN |
| `parent_child` | Länk parent–child |
| `activity_template` | Seed vid register + schedule |
| `weekly_schedule` / `weekly_schedule_item` | Onboarding schedule |
| `daily_log` / `daily_log_item` | Idag + completion |
| `family_activation_state` | `signup_at`, `schema_saved_at`, `child_access_completed_at`, `first_completion_at` |
| `refresh_token` | Parent/child session (handoff #805/#806) |
| `pin_lockout` / `pin_audit_log` | Barn-PIN |

**Journey (parallell):** `family_milestone` via `src/lib/journey/ingest.js` (`child_first_completion`, `child_logged_in`, …).

### 2.5 Milestones & events (server)

| Händelse | Var | Fält / analytics |
|----------|-----|------------------|
| Signup | `register.js` | `family_activation_state.signup_at` |
| Schema sparat | `onboarding.js` schedule | `recordActivationMilestone('schema_saved')`, `onboarding_completed=true` |
| Barnåtkomst | `child-login.js` | `recordActivationMilestone('child_access')` → `child_access_completed_at` |
| Första completion P0 | `activation-first-completion.js` | `first_completion_at` när exakt 1 completed item i familjen |
| Journey ingest | `child-self.js` efter complete | `child_first_completion` |
| Client milestones | Response `meta_milestones` | `first_star_earned`, `child_access_completed` |

**Viktigt:** `POST /api/onboarding/child-access-complete` är **deprecated no-op** — barnåtkomst endast via verifierad `child-login` (test: `onboarding-handoff-p0.test.js`).

---

## 3. Befintliga tester och luckor

### 3.1 Täcker delar av flödet

| Test | Täcker |
|------|--------|
| `test/auth-integration.test.js` | register + login + refresh |
| `test/onboarding-child-without-schema.test.js` | child resume, schedule, duplicate name |
| `test/onboarding-handoff-p0.test.js` | Handoff kontrakt, child_access semantics |
| `test/onboarding-handoff-resume.test.js` | Resume UI |
| `test/onboarding-handoff-film.test.js` | Film gate |
| `test/onboarding-activity-guide.test.js` | Activity guide |
| `test/child-access-semantics.test.js` | child-access-complete no-op |
| `test/parent-child-handoff-*.integration.test.js` | Session/handoff efter barnlogin |
| `test/journey-golden-path.test.js` | Journey milestones (DB), **inte** full HTTP signup |
| `test/first-success-journey-e2e.test.js` | Journey ingest chain |
| `test/platform-runtime-integration.test.js` | First completion feedback |
| `test/meta-app-events.test.js` | Client milestone guards |
| `test/e2e/onboarding-child-form-interactive.test.js` | Form (e2e) |

### 3.2 Luckor (Fas 6)

| Lucka | Risk |
|-------|------|
| **End-to-end HTTP:** register → schedule → child-login → **first star** i en test | P1 |
| Dubbel submit register / onboarding | P1 |
| Refresh mitt i wizard (alla steg) | P2 |
| Två flikar / parallella completes | P2 |
| Tom global `default_schedule` (lokal dev) | P2 (prod har library) |
| ACT-1 vs legacy wizard branch divergence | P2 |
| Parent complete vs child complete båda ger `first_star` | P1 (dubbel stjärna?) |
| Timing / API-count budget | Fas 7A overlap |
| Mobil WebView handoff + `sessionRestored` (#806) | P1 prod-relevant |

**Ny read-only baseline:** `test/golden-path-fas6-baseline-timing.integration.test.js` (API-sekvens + timing-logg).

---

## 4. Brytpunkter och duplicering

| Punkt | Beskrivning |
|-------|-------------|
| **Register utan login** | Register 201 men session kräver login (dubbel nätverkssteg) |
| **Dubbel onboarding/child** | Resume `RESUME_CHILD_WITHOUT_SCHEMA` vs 409 `DUPLICATE_CHILD_NAME` |
| **Schedule utan library** | Wizard fastnar om inga mallar (lokal DB) |
| **onboarding/complete** | Flera anrop i `onboarding.js` / starter-plan — redundant om schedule redan markerat complete |
| **child_access** | Endast `child-login`; falsk “åtkomst” om parent bara öppnar child-login UI utan PIN |
| **Complete idempotent** | `UPDATE … WHERE completed = false` — retry ska inte dubbelräkna P0 om redan completed |
| **first_completion guard** | `maybeRecordFirstCompletion` kräver `COUNT(completed)=1` i familjen |
| **Handoff parent cookies** | Parent backup + child session (#805) — fel kan ge fel “me” |
| **Offline queue** | `child-dashboard-checkoff.js` kan köa complete — replay-risk (Fas 8) |
| **Journey vs activation-p0** | Två spår för “första completion” (milestone ingest + `first_completion_at`) |

---

## 5. Lokal tidsmätning (realistisk körning)

Kör:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  node --test test/golden-path-fas6-baseline-timing.integration.test.js
```

Loggprefix: `[FAS6_GOLDEN_PATH_TIMING]` (JSON med `timings_ms`, `api_sequence`, `total_api_calls`).

**Fält att tolka:**

| Nyckel | Mening |
|--------|--------|
| `register_ms` | Efter POST register t.o.m. 201 |
| `login_ms` | Login efter register |
| `onboarding_child_ms` | POST onboarding/child |
| `onboarding_schedule_ms` | POST onboarding/schedule |
| `child_login_ms` | POST child-login |
| `child_daily_log_ms` | GET daily-log (barnvy “användbar” proxy) |
| `child_complete_ms` | PUT complete (serverbekräftad stjärna) |
| `child_complete_retry_ms` | Idempotent retry |

**Obs:** Detta är **API-only** (ingen browser paint). UI-respons och checkoff-animation kräver Fas 7A mobil eller Playwright. **Fas 7 follow-up** för p95 och perceived latency.

Exempelresultat fylls i efter CI/lokal körning i PR-kommentar eller append här.

### Exempel (lokal `listenApp` + Postgres, `NODE_ENV=test`, 2026-08-01)

| Steg | ms |
|------|-----|
| register | 96 |
| login | 48 |
| onboarding/child | 51 |
| onboarding/schedule (`helg`, alla dagar) | 30 |
| child-login | 50 |
| GET daily-log | 14 |
| PUT complete | 10 |
| PUT complete retry | 7 |

**API-anrop:** 8 sekventiella (ingen dubbel register i detta test).  
**meta_milestones:** `first_star_earned` + `child_access_completed` som förväntat.

**Viktigt:** `template_group: forskola` seedar endast **vardagar** — på helg kan `GET daily-log` vara tom (brytpunkt R4). Testet använder `helg` för stabil helg-körning.

---

## 6. Förslag på små separata fixcommits (ej implementerade än)

| # | Commit-tema | Innehåll | Risk |
|---|-------------|----------|------|
| 1 | `test(fas6): golden path HTTP e2e` | Utöka timing-test med dubbel register + refresh simulation | Låg |
| 2 | `test(fas6): idempotent complete contract` | Assert `first_completion_at` oförändrad på retry | Låg |
| 3 | `fix(onboarding): dedupe complete calls` | En canonical `complete` efter schedule (om audit visar dubbel POST) | Medel |
| 4 | `fix(onboarding): empty library UX` | Tydlig fallback när `default_schedule` tom (dev + edge prod) | Medel |
| 5 | `fix(child-login): handoff session edge` | Endast om repro från #806 kvar | P1 |
| 6 | `docs(fas6): timing budget table` | Koppla API ms → Fas 7 budget | Låg |

Prestandaoptimeringar **inte** i dessa commits → **Fas 7 follow-up**.

---

## 7. Riskklass P0–P3

| ID | Risk | Klass | Beskrivning |
|----|------|-------|-------------|
| R1 | Dubbel första stjärna / dubbel milestone | **P0** | Parent + child complete samma item; offline replay |
| R2 | Barnåtkomst utan PIN (fel signal) | **P1** | Deprecated endpoints; analytics only on real login |
| R3 | Handoff session fel barn/familj | **P0** | JWT/cookie mismatch efter logout/handoff |
| R4 | Wizard fastnar utan schema-mall | **P1** | Tom library lokalt; fel template_group |
| R5 | Dubbel child/schema POST | **P2** | 409 vs resume — UX ok men extra API |
| R6 | `onboarding_completed` vs Journey phase | **P2** | Routing vs produkt truth (docs/first-success) |
| R7 | Långsam perceived Idag-vy | **P3** | Fas 7 — daily-log payload, assets |
| R8 | Dubbel submit register | **P1** | Dubbel familj om inte idempotent (verify) |

---

## 8. Rekommenderad testmatris (Fas 6)

| Scenario | Automatiserad | Manual mobil |
|----------|---------------|--------------|
| Dubbel submit registrering | API ×2 rapid | Ja |
| Refresh efter varje wizard-steg | Playwright / manual | Ja |
| Avbruten onboarding → befintligt barn | `onboarding-child-without-schema` | Ja |
| Dubbla child/schema requests | Integration | Ja |
| Parent-session efter barnlogin | `parent-child-handoff-*` | Ja |
| Barnåtkomst endast efter PIN | `child-access-semantics` + manual | Ja |
| Rätt barn/familj | Handoff integration | Ja |
| Idempotent complete | `golden-path-fas6-baseline-timing` | Ja |
| Exakt en första stjärna | DB assert `first_completion_at` | Ja |
| Två flikar / parallella PUT | Ny integration test | Ja |
| Serverfel + återhämtning | Mock 500 + retry UI | Ja |
| Ny login befintligt konto | Login + onboarding skip | Ja |

---

## Obligatoriska scenarier — kartläggningsstatus

| Scenario | Kartlagt | Test idag |
|----------|----------|-----------|
| Dubbel submit register | Delvis (rate limit) | Utöka |
| Refresh per onboardingsteg | Handoff-resume | Delvis |
| Befintligt barn avbruten onboarding | Resume API | Ja |
| Dubbla requests barn/schema | Duplicate + resume | Ja |
| Parent-session efter barnlogin | Handoff PR tests | Ja |
| Barnåtkomst efter barnlogin | Semantics tests | Ja |
| Rätt barn/familj | Handoff tests | Delvis |
| Idempotent complete | Ny timing test | Ja |
| En första stjärna | Timing test DB assert | Ja |
| Två flikar | Lucka | Nej |
| Serverfel/återhämtning | Lucka | Nej |
| Ny login befintligt konto | Delvis | Utöka |

---

## Avgränsning (Spår A)

Ej ändrat: Fas 7B/7C, custody preselect, push-native, SW/offline, family/child-dashboard lint, betal, Morgonhuset.

---

## Nästa steg (efter godkänd kartläggning)

1. Draft-PR med denna doc + timing-test.  
2. Implementera P0/P1 fixar i små commits.  
3. Mobil inloggad smoke (founder-QA checklist).  
4. Mät igen → jämför mot Fas 7 budget.
