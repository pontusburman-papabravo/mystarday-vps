# Ireland / Finland release gates

> **AUTHORITY (2026-09-14):** Ireland paid launch = [`docs/ie-paid-launch-kravspec.md`](ie-paid-launch-kravspec.md) + [ADR-023](adr/ADR-023-market-commercial-policy.md).  
> `PREBILLING_MARKET_READY` is **not** permission to open Ireland. IE requires 14-day trial + billing-ready + physical purchase **before** `market_ie_open`.

Do **not** flip `market_ie_open`, `market_fi_open`, or public billing from this document.

These states must stay separate. Print them with `npm run ie-fi:release-gates`.

| State | Means | Cannot be inferred from |
|---|---|---|
| `CLOSED_CODE_READY` | Code may deploy while IE/FI stay closed | A desire to launch |
| `PREBILLING_MARKET_READY` | Product path is proven for a later open with billing OFF | Store / device / RevenueCat / market flag |
| `BILLING_CONFIGURATION_READY` | Named IAP + RC evidence complete | Unit tests or device runs |
| `DEVICE_VERIFIED` | Android sandbox + IE/FI iOS device actually run | Committed JSON booleans |
| `READY_TO_OPEN` | Explicit founder/ops approval to flip a market flag | Green CI or `PREBILLING_MARKET_READY` |
| `PAID_ROLLOUT_READY` | Configuration + device + explicit paid-rollout approval | Prebilling readiness |

`BILLING_READY` is an alias of `BILLING_CONFIGURATION_READY` (store/RC only). It does not include device.

Rules:

- A closed market does not become `READY_TO_OPEN` because unit tests pass.
- An open prebilling market does not require `BILLING_READY` *(historical FI/IE prebilling path — not the Ireland 2026-09-14 launch model)*.
- Ireland must not reach `READY_TO_OPEN` while public billing is unusable.
- Paid rollout requires external / store / device evidence in `config/ie-fi-release-evidence.json`.
- That evidence file is not a live flag. `founder_open_approved_*` stays `false` until an explicit ops decision.

Evaluator: `src/lib/ie-fi-release-gates.js`.
