# Ireland / Finland release gates

Do **not** flip `market_ie_open`, `market_fi_open`, or public billing from this document.

These five states must stay separate. Print them with `npm run ie-fi:release-gates`.

| State | Means | Cannot be inferred from |
|---|---|---|
| `CLOSED_CODE_READY` | Code may deploy while IE/FI stay closed | A desire to launch |
| `PREBILLING_MARKET_READY` | Product path is proven for a later open with billing OFF | Store / device / RevenueCat |
| `BILLING_READY` | Named IAP + RC + device paid path verified | Unit tests |
| `READY_TO_OPEN` | Explicit founder/ops approval to flip a market flag | Green CI |
| `PAID_ROLLOUT_READY` | Billing ready **and** explicit paid-rollout approval | Prebilling readiness |

Rules:

- A closed market does not become `READY_TO_OPEN` because unit tests pass.
- An open prebilling market does not require `BILLING_READY`.
- Paid rollout requires external / store / device evidence in `config/ie-fi-release-evidence.json`.
- That evidence file is not a live flag. `founder_open_approved_*` stays `false` until an explicit ops decision.

Evaluator: `src/lib/ie-fi-release-gates.js`.
