# ACT-1 rollout runbook (PR 1–4 live)

**Syfte:** Aktivera ACT-1 PR 1–4 (instrumentering, handoff, template-first, AI) för alla familjer.

**Default efter migrate `180932`:** PR 1–5 flaggor **ON** (inkl. `activation_nudge_v1`). Referral och `activation_first_star_mode_v1` förblir **OFF** tills separat go-live.

---

## Flaggor

| Nyckel | Vad | PR | Default efter 180922 |
|--------|-----|-----|----------------------|
| `activation_onboarding_v1` | Template-first wizard | 3 | **ON** |
| `activation_child_handoff_v1` | Steg 5 handoff, `child_access_completed` | 2 | **ON** |
| `activation_first_star_guide_v1` | First star guide efter handoff | 2 | **ON** |
| `activation_ai_starter_plan` | AI-personalisering (fallback till mall) | 4 | **ON** |
| `activation_first_star_mode_v1` | Barnvy: en aktivitet i taget | — | OFF |
| `activation_nudge_v1` | 24–48h påminnelse om ej P0 | 5 | **ON** (efter `180932`) |
| `referral_program` | Referral v0 spårning | parallell | OFF |

**Cohort:** Om `ACTIVATION_ONBOARDING_LAUNCH_AT` är satt i `.env` får endast familjer skapade efter det datumet flaggorna (utom undantag i `activation-flags.js`). **För alla familjer:** ta bort env-raden och starta om.

**AI:** Utan `OPENAI_API_KEY` faller PR 4 tillbaka till ren mall — onboarding blockeras aldrig.

---

## Före rollout

1. `npm run test:gate` grön på main/branch
2. `node --test test/pr2-checkpoint.test.js test/pr3-checkpoint.test.js test/pr4-checkpoint.test.js test/act1-rollout.test.js`
3. Admin → Analytics → Aktivering: baseline-vecka noterad

---

## Deploy (automatisk via CI)

GitHub Actions deploy kör `npm run migrate` → migration `1809220000000_enable_act1_pr1_4_flags` sätter PR 1–4 **ON**.

Verifiera efter deploy:

```bash
sleep 3 && curl -s http://127.0.0.1:3000/health
```

---

## Prod — manuell rollout (om migrate redan körts utan 180922)

```bash
cd "$VPS_APP_ROOT"
./scripts/rollout-act1-full.sh
```

Skriptet: `git pull` → `npm run migrate` → `node scripts/enable-act1-flags.js` (PR 1–4) → restart → health.

**Full rollout** (inkl. nudge + referral + first_star_mode):

```bash
node scripts/enable-act1-flags.js --full
```

---

## Verifiering efter prod

1. Ny registrering → template-wizard (7 frågor) → preview → handoff → first star guide
2. Admin funnel: signup → child access → first completion (48h-kohort)
3. `PR2_EMAIL=... PR2_PASSWORD=... node scripts/pr2-checkpoint.mjs` (valfritt)

---

## Rollback

1. Stäng PR 1–4 flaggor:

```sql
UPDATE feature_flag SET enabled = false
WHERE key IN (
  'activation_onboarding_v1',
  'activation_child_handoff_v1',
  'activation_first_star_guide_v1',
  'activation_ai_starter_plan'
);
```

2. `sudo systemctl restart "$SYSTEMD_SERVICE"`
3. Befintliga familjer påverkas inte retroaktivt — state i `family_activation_state` behålls.

---

## Relaterade filer

| Fil | Roll |
|-----|------|
| `migrations/1809220000000_enable_act1_pr1_4_flags.js` | PR 1–4 ON vid migrate |
| `scripts/enable-act1-flags.js` | Idempotent PR 1–4 (eller `--full`) |
| `scripts/rollout-act1-full.sh` | VPS rollout-helper |
| `src/lib/activation-flags.js` | Cohort + fail-closed |
| `public/js/onboarding-starter-plan.js` | Template-first (PR 3) |
| `public/js/onboarding-activation.js` | Child handoff (PR 2) |
| `public/js/onboarding-first-star.js` | First star guide (PR 2) |

---

## P0-metric

**`activation_rate_48h`** = schema sparat + `child_access_completed` + first completion inom 48h.

Huvudtratt-event: `child_access_completed` (server via `updateActivationState`, inte enbart klient).
