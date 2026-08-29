# Release Compliance Gate — Model

**Purpose:** catch Apple App Store / Google Play **policy, metadata, legal, and submission** problems *before* a release is sent to review — not after a rejection. This complements, and does not replace, the existing technical release gate.

Built after two real near-misses:

1. A user-visible **"English BETA"** label that risked an Apple **Guideline 2.2** (beta app) rejection.
2. An **EULA/legal metadata** gap that should have been caught in preflight (see [`docs/app-store-review-notes.md`](../app-store-review-notes.md), "Metadata rejection — missing Terms of Use (EULA) link", 2026-08-28).

Both were one-off fixes at the time. This document defines the systematic replacement: three gates, each with automated checks where possible and an explicit, permanent list of what can only ever be verified by a human in App Store Connect / Play Console.

## The three gates

| Gate | Scope | Where it lives | Status enum |
|---|---|---|---|
| **A — Technical Release Readiness** | test suites, lint, build, native build readiness, target SDK/API, entitlements, cache consistency, version/build consistency, production flags, crash risk, dependency state | **Existing script:** `npm run release:pre-public-gate` (`scripts/pre-public-release-gate.mjs`) | `PASS` / `BLOCKER` / `NOT_VERIFIED` / `EXCLUDED` |
| **B — Store Policy & Legal Compliance** | beta/test/trial/preview/experimental/early-access/coming-soon markings, EULA, Terms, Privacy Policy, account deletion, data-collection declarations, ATT/tracking, child/family requirements, Sign in with Apple, external purchase references, subscriptions, pricing/trials, restore purchases, legal URLs, login/access requirements, country/market/language claims, feature completeness | **New script:** `npm run release:compliance` (`scripts/release-compliance-gate.mjs`, checks A/B/D/E/F/G/H/I) | `PASS` / `FAIL` / `MANUAL_REVIEW_REQUIRED` / `NOT_APPLICABLE` |
| **C — Submission Metadata & Review Package** | App Store Connect / Play Console metadata, screenshots, What's New, promotional text, description, keywords, support/marketing/privacy URLs, EULA, review notes, test credentials, selected build, selected IAP/subscription products, privacy/Data Safety answers, content/age rating, App Review access paths, feature flags required for the reviewer | **New script:** `npm run release:compliance` (same script, checks C + submission-metadata) + [`STORE_SUBMISSION_CHECKLIST.md`](./STORE_SUBMISSION_CHECKLIST.md) (manual) | `PASS` / `FAIL` / `MANUAL_REVIEW_REQUIRED` / `NOT_APPLICABLE` |

**Gate A already existed** as a mature, well-tested technical rollout gate (`scripts/pre-public-release-gate.mjs`, ~550 lines, with its own manifest/report/kill-switch modules). It is not duplicated here — `release:compliance` only reads its last JSON output (`artifacts/pre-public-release-gate.json`) for cross-reference. **Gates B and C were missing** — that gap is exactly how the two known misses reached App Review. This mandate builds them.

## Why gate statuses are four-valued, not pass/fail

A binary pass/fail gate invites exactly the failure mode this mandate exists to prevent: collapsing "we cannot verify this from the repo" into a silent pass. Every check in Gate B/C reports one of:

- **PASS** — verified from repo/config data.
- **FAIL** — verified wrong from repo/config data. Hard blocker.
- **MANUAL_REVIEW_REQUIRED** — inherently requires a human with App Store Connect / Play Console / a running build (e.g. "does the account-deletion button actually work end to end", "does the Data Safety form match the code"). The gate can prove the *code path* exists; it cannot click the button or read Apple's console for you.
- **NOT_APPLICABLE** — the check does not apply in this checkout (e.g. `ios/App/` absent from a web-only checkout).

**`FULL PASS` is structurally impossible while any P0/P1 finding or mandatory manual check remains** (see [Readiness](#readiness-labels) below). This is intentional per DEL 6/12 of the mandate — a green gate must never be mistaken for "ready for App Review".

## Running the gates

```bash
# Gate A — technical readiness (existing, unchanged)
npm run release:pre-public-gate

# Gate B + C — store policy, legal, and submission-metadata compliance (new)
npm run release:compliance

# Both, in sequence, before an actual submission
npm run release:preflight
```

`release:compliance` writes `artifacts/release-compliance-gate.json` and prints a human-readable report (see [Release report](#release-report)). Exit codes:

| Exit | Meaning |
|---|---|
| `0` | Automated checks pass. **Manual App Store Connect / Play Console checks may still remain** — this is never equivalent to "ready for App Review". |
| `1` | Hard compliance failure — at least one check returned `FAIL`. |
| `2` | Script/config error — the gate itself could not run (e.g. `config/release-compliance-gate.json` is malformed). |

## Automated checks (Gate B / C)

Implemented in `scripts/lib/release-compliance/`, tuned via `config/release-compliance-gate.json` (edit the config, not the check code, when a new market/host/fixture needs to be taught to the gate):

| Check | File | What it does |
|---|---|---|
| **A** | `check-language-scan.cjs` | Pre-release language scan (beta/test/trial/preview/experimental/early access/coming soon) across shipped HTML, `public/js/**`, `public/admin/**`, and locale JSON. Classifies every hit as consumer-UI (fails), internal/admin (informational), or a known-safe phrase (informational) — see [classification](#classification-rules-for-check-a--c) below. |
| **B** | `check-legal-urls.cjs` | Resolves Privacy/Terms/EULA routes for every market via the real `src/lib/legal-routing.js`, verifies the wired file exists on disk, verifies no forbidden host (localhost/dev/staging/example.com), verifies Apple's standard-EULA link is used correctly (not our own `/terms` mislabeled as "EULA"). |
| **C** | `check-placeholder-scan.cjs` | Shipped consumer copy surface (same as A) for TODO/FIXME/lorem ipsum/example.com/"your review password"/not implemented/placeholder/demo/sandbox/staging/dev only. **Historical submission docs are evidence-only** (presence checked in submission-metadata helper, never blocking scan). Closed-market placeholder pages are `NOT_APPLICABLE` when their gate is off. |
| **D** | `check-market-consistency.cjs` | Locale files exist on disk; market-registration gate defaults (`src/lib/market-region.js`) match the documented live-market list (`expectedLiveMarketCountryCodes`); closed-market copy exists in every locale. |
| **E** | `check-auth-review-access.cjs` | Reviewer account documented; email/password login exists as a fallback independent of Sign in with Apple/Google; child/adult PIN flow documented for reviewers. |
| **F** | `check-account-deletion.cjs` | Server route + client entry point exist (Apple 5.1.1(v) / Play account-deletion requirement); flags the manual functional test that automation cannot perform. |
| **G** | `check-iap.cjs` | Kill-switch documented; purchase UI respects server config; restore-purchases wired; no external iOS payment links; grandfathering documented. Never changes payment behaviour. |
| **H** | `check-tracking-privacy.cjs` | Native config matches the documented "no ATT / no IDFA / no Meta native SDK" posture (`docs/meta-app-events.md`). |
| **I** | `check-version-build-cache.cjs` | SW `CACHE_NAME` matches `config/cache-version.json`; iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` and Android `versionCode`/`versionName` are present and parse. |
| Gate C helper | `check-submission-metadata.cjs` | Verifies the repo-side review documentation a human needs exists (review notes, ASC description docs, reviewer-account doc, TestFlight checklist, Play store-listing/Data-Safety docs); always surfaces the store-console-only parts of Gate C as `MANUAL_REVIEW_REQUIRED`. |

### Classification rules for Check A / C

Not every keyword hit is a violation. Every match is classified, then assigned a **disposition** before it can affect gate status:

| Disposition | Gate effect |
|---|---|
| **BLOCKER** | Verified user/reviewer-facing release risk → section `FAIL`, exit code `1` |
| **REVIEW** | Consumer-visible but ambiguous → section `MANUAL_REVIEW_REQUIRED`, exit code `0` |
| **NOT_APPLICABLE** | Closed-market surface (`market_*_open=false`) or otherwise unreachable → informational only |
| **INFORMATIONAL** | Internal/admin/safe fixture/historical doc → never fails |

Classifier classes (before disposition):

- **A_CONSUMER_UI** — rendered, shipped, user-visible text. Only this class can become a BLOCKER.
- **B_INTERNAL** — admin/internal/dev/test/docs/identifier. Never fails.
- **C_SAFE** — a known-legitimate phrase (allowlisted fixture, "free trial" subscription copy, "English coming soon" store-locale note, an HTML `placeholder=` form attribute, etc.). Never fails.

Historical docs (`config: reviewPackageDocs`) may contain sandbox/beta/rejected notes by design — they are **never** blocking scan targets. Gate A stale artifacts (`BLOCKER` from an unsuitable environment, or SHA mismatch) surface as `NOT_VERIFIED`, not `CODE READY: false`.

The scanner also applies structural heuristics before classification, all in `scripts/lib/release-compliance/scan-utils.cjs`:

- HTML comments, `<script>`/`<style>` blocks, and tag attributes are stripped before matching visible text.
- JS comments are stripped; a match only counts as prose if it is inside a quoted string, not a comparison (`indexOf('preview')`, `mode === 'test'`), and not a bare keyword passed as a function argument (`setView('placeholder')`).
- A match glued to other characters by `-`/`_`/`/` (`ccsz-preview`, `preview_data_fetch_failed`, `/api/preview-data`) is a compound identifier/CSS-class/path token, not prose.
- "test" and "preview" are common English words with everyday meanings; they only count as pre-release signals when a release-stage word (version/mode/feature/release/…) appears nearby.

**This is a heuristic static scanner, not a full parser.** A `PASS` here is necessary but not sufficient — [`STORE_SUBMISSION_CHECKLIST.md`](./STORE_SUBMISSION_CHECKLIST.md) still requires a human click-through of the actual shipped build before every submission.

## Release report

`release:compliance` prints (and writes to `artifacts/release-compliance-gate.json`):

```
APPLE / GOOGLE RELEASE COMPLIANCE REPORT

Technical gate: MANUAL_REVIEW_REQUIRED (run release:pre-public-gate separately)
Policy gate: FAIL
Submission gate: FAIL

FAILURES (P0)
- ...

MANUAL CHECKS REQUIRED
- App Store Connect EULA / App Privacy answers / Review Notes
- Play Data Safety
- ...
```

### Readiness labels

The report always computes three distinct readiness labels — never conflate them:

| Label | Meaning |
|---|---|
| **CODE READY** | `PASS` only when Gate A (`release:pre-public-gate`) has a fresh `PASS` on current HEAD and Gate B/C have no `FAIL`. `NOT_VERIFIED` when Gate A is missing/stale. |
| **STORE READY** | Gate B (policy/legal) status: `PASS` / `FAIL` / `MANUAL_REVIEW_REQUIRED`. `FAIL` only for verified BLOCKER dispositions. |
| **SUBMISSION READY** | Always `NOT_VERIFIED` from this script — App Store Connect / Play Console state requires [`STORE_SUBMISSION_CHECKLIST.md`](./STORE_SUBMISSION_CHECKLIST.md). |

## Integration with the release process

- `npm run release:compliance` and `npm run release:preflight` are available as npm scripts (see `package.json`) but are **not** wired into `ci.yml`. Feature-branch CI must not depend on manual App Store Connect / Play Console answers (per the mandate's own constraint) — those checks belong to the deliberate, occasional act of preparing an actual submission, not every PR.
- Run `npm run release:compliance` (or `release:preflight` for both gates) manually before every App Store / Play submission, and whenever `.cursor/rules/150-release.mdc`'s "TestFlight if native binary changed" step applies.
- If a future CI workflow specifically for release/submission branches is added, wire `release:compliance` there — do not add it to the default PR gate.

## Maintenance

- **Config, not code:** `config/release-compliance-gate.json` holds the tunable knobs (keyword lists, allowlists, expected live markets, evidence file paths). Extend it first when the gate is wrong about something; only touch `scripts/lib/release-compliance/*.cjs` for genuinely new check logic.
- **Regression tests:** `test/release-compliance-gate.test.js` — run with `NODE_ENV=test node --test test/release-compliance-gate.test.js`. These test the pure classifier functions directly against fixed fixtures (not the live repo content), so they do not need updating every time `public/` changes.
- **Policy currency:** this gate encodes *structural* checks, not the current text of Apple/Google policy. See [`STORE_POLICY_SOURCES.md`](./STORE_POLICY_SOURCES.md) — it must be checked against the live policy pages before every production submission. Memorized/training-data policy knowledge is not sufficient for a go/no-go call (see `.cursor/rules/151-store-compliance.mdc`).
