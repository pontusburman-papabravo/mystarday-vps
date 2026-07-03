# Repository State

**Last updated:** 2026-07-03 ~08:15 UTC  
**Maintainer:** Autonomous agent (relay system)

---

## Active branch

| Field | Value |
|-------|-------|
| **Branch** | `cursor/autonomous-relay-resume-b105` |
| **Base** | `main` |
| **Base SHA** | `6aa50c74fbcb7487c778ee4b46f7e2905f2091ae` |
| **Remote tracking** | `origin/cursor/autonomous-relay-resume-b105` |

---

## Last commit (this branch)

| SHA | Message | When |
|-----|---------|------|
| `cursor/autonomous-relay-resume-b105` | `40dcfb7d` | feat(runtime): Autonomous Relay & Resume Engine (BL-043, BL-044) |

---

## Gate status

| Gate | Result | Run at |
|------|--------|--------|
| `npm run test:gate` | **785/785 pass** (679 unit + 106 db) | 2026-07-03 |
| `npm run check:governance` | N/A | Not on `main` — ships IRC-007 |
| `npm run lint` | not run | — |
| `npm run check:css` | N/A | — |

### How to run gates

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
sudo pg_ctlcluster 16 main start || true
env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
```

---

## Last known good (reference)

| Context | SHA | Gate |
|---------|-----|------|
| `main` | `6aa50c74` | CI baseline (Aktivitetstimer #537) |
| This branch | (after push) | 785/785 test:gate |
| Memory hall IRC branches | IRC-014/015 | 707/707 per handover (pre-relay) |

---

## Key paths shipped

```
.ai/runtime/AUTONOMOUS_SESSION.md
.ai/runtime/RESUME_ENGINE.md
.ai/runtime/CONTINUOUS_EXECUTION.md
.ai/runtime/SESSION_HANDOFF_TEMPLATE.md
.ai/runtime/RELAY_HANDOFF_CHECKLIST.md
.ai/prompts/RESUME_AUTONOMOUS_WORKER.md
.ai/knowledge/MISSION_QUEUE.md
.ai/knowledge/REPOSITORY_STATE.md
.ai/knowledge/OPEN_BLOCKERS.md
.ai/knowledge/OPEN_PRS.md
public/js/memory-hall-asset-pipeline.js
test/memory-hall-asset-pipeline.test.js
docs/schemas/warm-echo-exhibit-draft.md
migrations/1809520000000_memory_hall_allowlist_template.js
docs/art-specs/memory-hall-bl041.md
```

---

## Environment notes

- Node 20 required (`.nvmrc`)
- `NODE_ENV` secret is deploy-mode — override per command
- `DATABASE_URL` + `JWT_SECRET` injected on Cursor Cloud

---

## Staleness

If `Last updated` > 24h: re-run `test:gate` before new implementation.
