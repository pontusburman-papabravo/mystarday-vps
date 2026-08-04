# Activation — recoverable steps and problem reporting

**Status:** Implemented behind `activation_first_success_v1` (global OFF until prod-smoke).  
**Cache:** `stjarndag-v771`+

## Contract

Each Activation coach step offers:

- **Försök igen** (when load failed)
- **Rapportera problem**
- **Fortsätt ändå**

Step statuses (client + analytics, no new DB columns):

| Status | Meaning |
|--------|---------|
| `pending` | Not done |
| `completed` | Real product milestone |
| `skipped_by_user` | User continued without faking completion |
| `deferred` | User postponed |
| `blocked_by_error` | Technical failure UI |

`skipped_by_user` ≠ `completed`. Server milestones (`schema_saved_at`, etc.) are only set by real actions (e.g. `POST /api/onboarding/schedule`, template apply with items).

## APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/family/activation/schedule-options` | Starter + family templates for picker |
| POST | `/api/family/activation/step-status` | Skip/defer + continue URL |
| POST | `/api/family/activation/problem-report` | Bug report with safe metadata |

## Client modules

- `public/js/activation-recoverable-core.js` — shared reporting, skip, error codes
- `public/js/activation-schedule-picker.js` — load/retry/abort/empty/error UI
- `public/js/activation-first-success-hub.js` — primary coach + inline picker for `save_schedule`

## Analytics (no PII)

`activation_step_*`, `activation_schedule_load_*`, `activation_problem_report_*`, `activation_continue_anyway`

## i18n

`home.activationRecoverable.*` in `config/i18n/home-sv-SE.json` and `home-en-GB.json`

## Tests

`test/activation-recoverable-steps.test.js` — error codes, continue destination, contract strings, schedule-options DB smoke.
