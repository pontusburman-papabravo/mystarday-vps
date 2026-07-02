# ACT-1 rollout runbook (v1)

**Syfte:** Säker aktivering av ACT-1 (child handoff + first star guide) utan oavsiktlig prod-exponering.

**Default:** Alla `activation_*` flaggor är **OFF** efter migrate. Ingen auto-enable i deploy.

---

## Flaggor (per familj + global `feature_flag.enabled`)

| Nyckel | Vad | PR |
|--------|-----|-----|
| `activation_child_handoff_v1` | Steg 5 handoff, soft gate, `child_access_completed` | A1 |
| `activation_first_star_guide_v1` | First star guide efter steg 6 | A1 |
| `activation_first_star_mode_v1` | Barnvy: en aktivitet i taget (separat agent) | — |
| `activation_onboarding_v1` | Template-first wizard (PR 3 — utanför v1 handoff) | A2 |
| `activation_ai_starter_plan` | AI-personalisering (PR 4) | A3 |
| `activation_nudge_v1` | 24–48h påminnelse om ej P0 | PR 5 |

**Cohort:** Om `ACTIVATION_ONBOARDING_LAUNCH_AT` är satt i `.env` får endast familjer skapade efter det datumet flaggorna (utom undantag i `activation-flags.js`).

---

## Före rollout

1. `npm run test:gate` grön på main/branch
2. `node --test test/first-star-mode*.test.js test/pr2-checkpoint.test.js test/act1-rollout.test.js test/onboarding-handoff-p0.test.js`
3. `node scripts/pr2-checkpoint.mjs` (assets) — API-delen kräver `PR2_EMAIL` + `PR2_PASSWORD`
4. Admin → Analytics → Aktivering: baseline-vecka noterad

---

## Dev / staging (en familj)

```bash
# Efter migrate — aktivera bara handoff + guide (inte hela ACT-1)
psql "$DATABASE_URL" -c "
  UPDATE feature_flag SET enabled = true
  WHERE key IN (
    'activation_child_handoff_v1',
    'activation_first_star_guide_v1'
  );
"
```

Manuellt test: ny registrering → onboarding steg 5 → testa barninloggning / hoppa över → first star guide → barnvy → första avbockning.

---

## Prod — full rollout (endast efter explicit go)

**FÖRBJUDET** att köra utan produkt-go:

```bash
# PÅ VPS — endast efter godkännande (sökväg/service: se deploy-regler i .cursor/rules/)
cd "$VPS_APP_ROOT"
./scripts/rollout-act1-full.sh
```

Skriptet: `git pull` → `npm run migrate` → `node scripts/enable-act1-flags.js` → `systemctl restart "$SYSTEMD_SERVICE"` → health.

**Alternativ manuell flag-enable (begränsad):**

```bash
node scripts/enable-act1-flags.js   # sätter ALLA ACT-1-flaggor ON
```

---

## Verifiering efter prod

1. `sleep 3 && curl -s http://127.0.0.1:3000/health`
2. `PR2_EMAIL=... PR2_PASSWORD=... node scripts/pr2-checkpoint.mjs`
3. Admin funnel: signup → child access → first completion (48h-kohort)
4. `node scripts/diagnose-onboarding-funnel.js` (valfritt)

---

## Rollback

1. Stäng flaggor (snabbast):

```sql
UPDATE feature_flag SET enabled = false
WHERE key LIKE 'activation_%' OR key = 'referral_program';
```

2. `sudo systemctl restart "$SYSTEMD_SERVICE"`
3. Befintliga familjer påverkas inte retroaktivt — state i `family_activation_state` behålls.

---

## Relaterade filer

| Fil | Roll |
|-----|------|
| `public/js/onboarding-activation.js` | Child handoff (steg 5) |
| `public/js/onboarding-first-star.js` | First star guide (steg 6) |
| `scripts/enable-act1-flags.js` | Prod flag-enable (manuell) |
| `scripts/pr2-checkpoint.mjs` | Smoke efter deploy |
| `src/lib/activation-flags.js` | Cohort + fail-closed |
| `src/lib/child-handoff-reminder-scheduler.js` | 24h efter `child_handoff_skipped` |

---

## P0-metric

**`activation_rate_48h`** = schema sparat + `child_access_completed` + first completion inom 48h.

Huvudtratt-event: `child_access_completed` (server via `updateActivationState`, inte enbart klient).
