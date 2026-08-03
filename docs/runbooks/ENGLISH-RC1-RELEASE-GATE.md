# English RC-1 release gate — operator runbook

Operators run this **after** a deploy is frozen and **before** physical device QA or store upload. No secrets in this document — only variable names and commands.

**Harness PR:** #842 (`cursor/english-launch-rc-audit`). **Do not** merge draft #813 in parallel.

---

## A. Prerequisites

| Prerequisite | How to verify |
|--------------|----------------|
| Release candidate SHA locked | Record `EXPECTED_GIT_SHA` from merge commit / deploy tag |
| Deploy finished | No in-flight deploy on target host |
| `/health` matches SHA | `curl -sS "$RC1_SMOKE_BASE_URL/health" \| jq -r .git_sha` |
| Expected SW cache | Read `CACHE_NAME` from deployed `/sw.js` (e.g. `stjarndag-v762` on current main) |
| QA family prepared | Allowlisted RC-1 fixture only — [`rc1-qa-fixture.md`](../rc1-qa-fixture.md) |
| Secrets in secure store | GitHub Environment `rc1-release-gate` or local vault — see §B |
| No parallel deploys | Ops confirms single target URL for entire gate window |

**Source of truth for test order and scenarios:** [`test-rc1-prod-smoke.md`](../test-rc1-prod-smoke.md).

---

## B. Secret provisioning

Set **only** in approved secret stores (GitHub Actions environment, Cursor secrets, local export — never commit).

| Variable | Required when | Type |
|----------|----------------|------|
| `RC1_SMOKE_BASE_URL` | Always | HTTPS deploy base URL (no credentials in URL) |
| `RC1_EXPECTED_SHA` | Always | Git SHA string from `/health` |
| `RC1_EXPECTED_CACHE` | Always | `CACHE_NAME` from `/sw.js` |
| `RC1_QA_EMAIL` | Always | Allowlisted parent email |
| `RC1_QA_PASSWORD` | Always | Parent password |
| `RC1_QA_FAMILY_ID` | Always (fixture mode) | UUID — must match `/api/auth/me` |
| `RC1_CHILD_USERNAME` | Always | Fixture child (`rc1qachild`) |
| `RC1_CHILD_PIN` | Always | 4-digit child PIN |
| `RC1_PARENT_PIN` | Handoff / full gate | 4-digit parent app-lock PIN |
| `RC1_PIN_FINGERPRINT_KEY` | Prepare + runner | HMAC key for PIN fingerprint logs |
| `RC1_QA_DATABASE_URL` | `rc1:qa:prepare` only | DB URL for fixture DB (not prod customer DB) |
| `RC1_REQUIRE_HANDOFF` | Full gate | `true` (default) |
| `RC1_SMOKE_RUNS` | Full gate | `2` for 5/5 × 2 |
| `RC1_SMOKE_FILTER` | Handoff debug only | `handoff` (not release gate) |
| `RC1_HANDOFF_DEBUG_RUNS` | Handoff debug | `3` for 3/3 ladder |

Deprecated: `RC1_REVIEW_*` — use `RC1_QA_*`.

**Blocked preflight:** If required variables are missing, `npm run test:rc1:english-smoke` prints `BLOCKED` and exits with code **2** (not 0). That is **not** a PASS.

Optional override: `RC1_SMOKE_BLOCKED_EXIT_CODE` (default `2`).

---

## C. Prepare

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
```

1. Dry-run plan (no DB writes):

```bash
RC1_PREPARE_MODE=dry-run npm run rc1:qa:prepare
```

2. Inspect-only dry-run against DB (needs `DATABASE_URL` / `RC1_QA_DATABASE_URL`):

```bash
export DATABASE_URL="$RC1_QA_DATABASE_URL"
RC1_PREPARE_MODE=dry-run npm run rc1:qa:prepare
```

3. Apply reset + reseed (QA family only — email domain guard):

```bash
export DATABASE_URL="$RC1_QA_DATABASE_URL"
RC1_PREPARE_MODE=apply npm run rc1:qa:prepare
```

4. **VERIFY CLEAN STATE:** JSON output includes `family_id`, `child_username`, `prep_pin_verified_against_database`. Parent email must be allowlisted; `RC1_QA_FAMILY_ID` must match prepare output.

Workflow: **PREPARE → VERIFY CLEAN STATE → RUN → CAPTURE EVIDENCE → RESET → VERIFY RESET**

---

## D. Handoff-debug 3/3

**Purpose:** First manually watched gate — parent session, child login, child UI, locale, handoff back to parent. **Not** the full release gate.

```bash
export RC1_SMOKE_BASE_URL="https://<deploy-host>"
export RC1_EXPECTED_SHA="<deploy-sha>"
export RC1_EXPECTED_CACHE="stjarndag-v<nnn>"
# … all RC1_QA_* secrets …

RC1_SMOKE_FILTER=handoff RC1_HANDOFF_DEBUG_RUNS=3 npm run test:rc1:english-smoke
```

**Acceptance:** 3 independent suite runs; each run **2 tests** pass (release identity + handoff). Runner logs `handoff debug: 3/3 OK (not release gate)`.

**Per run verify:**

1. Parent session valid before child login  
2. Child login succeeds  
3. Child dashboard renders  
4. Locale en-GB (fixture + child contract)  
5. Child logout / parent access initiated  
6. Parent session restored  
7. Parent dashboard renders  
8. No critical console errors (harness captures counts)  
9. SHA + `CACHE_NAME` match `RC1_EXPECTED_*`

**Evidence:** `artifacts/rc1-prod-smoke/<timestamp>/` — screenshots + summary (no cookies/PIN/tokens).

**Independence:** Each full-suite iteration uses pacing (`RC1_SMOKE_PACING_MS`, default 90s). Handoff debug repeats the filtered suite — not a single browser session across all three.

---

## E. Full smoke 5/5 × 2

**Definition:** Five scenarios per suite, two full suites in sequence.

| # | Scenario | Evidence |
|---|----------|----------|
| 1 | Release identity | `/health` SHA + `/sw.js` cache |
| 2 | Parent locale (Settings UI) | en-GB via Settings; persists on reload |
| 3 | Child login + i18n | Child dashboard English |
| 4 | Parent handoff | Parent session restored after child |
| 5 | Reports gating | Documented 403 `COMPONENT_MISSING` (429 retry policy) |

**Between scenarios:** `RC1_TEST_GAP_MS` (default 20s).  
**Between suite 1 and suite 2:** `RC1_SMOKE_PACING_MS` (default 90s) + optional `RC1_SMOKE_INITIAL_COOLDOWN_MS`.

```bash
RC1_REQUIRE_HANDOFF=true RC1_SMOKE_RUNS=2 npm run test:rc1:english-smoke
```

**Acceptance:** Both suites report `tests=5 pass=5 fail=0 skip=0` and runner logs `release gate: 5/5 OK for all runs`.

**Stop-the-gate failures:** Any fail count, skip, SHA/cache mismatch, handoff classification failure, locale regression, all-429 on reports probe.

**Retry:** One retry after cooldown may be used for **investigation**; **fail then pass is FLAKY**, not stable PASS for release sign-off.

---

## F. Evidence

| Artifact | Location |
|----------|----------|
| Smoke screenshots | `artifacts/rc1-prod-smoke/<timestamp>/<test-name>/` |
| Runner TAP output | CI job log or local terminal |
| Handoff diagnostics | Structured logs in test output (classification codes) |

**Redaction:** Logs must not contain passwords, PINs, cookies, or tokens. Runner and prepare scripts redact connection strings on error. Verify no credential substrings in saved artifacts.

---

## G. Reset

After a run (pass or fail):

```bash
RC1_PREPARE_MODE=apply npm run rc1:qa:prepare
```

**VERIFY RESET:** Prepare output matches known fixture contract (en-GB, `english_app`, `english_child_experience`, minimal schedule, today log cleared). Family row **not** deleted — data wiped per reset manifest only.

---

## H. Stop conditions

Abort the gate and mark **FAIL** or **BLOCKED** if:

- SHA mismatch (`RC1_EXPECTED_SHA` ≠ `/health.git_sha`)  
- SW cache mismatch (`RC1_EXPECTED_CACHE` ≠ active `CACHE_NAME`)  
- Auth or handoff failure  
- Locale regression (en-GB not stable through reload)  
- Critical console error threshold (harness failure)  
- Customer / founder / review account used instead of allowlisted QA fixture  
- Unknown QA state (family ID mismatch, wrong child username)  
- Deploy starts during an in-progress smoke  
- Redirect to unexpected host (canonical host check)  
- Base URL contains embedded credentials  

---

## I. Result labels

Use only:

| Label | Meaning |
|-------|---------|
| **PASS** | All required scenarios green on locked SHA |
| **FAIL** | Ran against target but scenario failed |
| **BLOCKED** | Could not run (secrets, URL, contract) — exit code 2 on preflight |
| **FLAKY** | Fail then pass on retry — not release sign-off |

---

## J. After PASS

1. Lock `RC1_EXPECTED_SHA` and `RC1_EXPECTED_CACHE` for this release.  
2. No new product commits on that deploy without re-running full smoke.  
3. Proceed to **physical** iPhone + Android QA (en-GB, native builds).  
4. Then legal review (`/en/privacy`, `/en/terms`), native screenshots, store console sign-off (RC-2).

**English store launch remains NO-GO** until prod smoke PASS + device QA + legal + screenshots + native release build verified.

---

## Related workflows

- `.github/workflows/rc1-web-release-gate.yml` — full web gate (prepare → handoff ladder → smoke ×2)  
- `.github/workflows/rc1-prod-smoke.yml` — smoke-only `workflow_dispatch`  

See also: [`ENGLISH-LAUNCH-RC-AUDIT-2026-08.md`](../ENGLISH-LAUNCH-RC-AUDIT-2026-08.md), [`ENGLISH-RC1-GATE-READINESS-REPORT.md`](../ENGLISH-RC1-GATE-READINESS-REPORT.md).
