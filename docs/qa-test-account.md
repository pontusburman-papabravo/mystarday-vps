# QA test account index

**Agents (Cursor / Cloud):** use [`founder-qa-test-account.md`](founder-qa-test-account.md) only.

| Role | Reference |
|------|-----------|
| Parent | `FOUNDER_QA_EMAIL` / `FOUNDER_QA_PASSWORD` |
| Child | Astrid · username `FOUNDER_CHILD_USERNAME` · PIN `FOUNDER_CHILD_PIN` |

Values are stored outside the repository — see [`secret-references.md`](secret-references.md).

Agents must **not** use the App Store review account (Anna) for routine testing.

## App Store / human release QA

- [`app-store-demo-konto.md`](app-store-demo-konto.md) — `APP_REVIEW_*` secrets only when the task is store review or release QA.

## RC-1 automation

- [`rc1-qa-fixture.md`](rc1-qa-fixture.md) — dedicated `RC1_QA_*` fixture (not founder / not review).
