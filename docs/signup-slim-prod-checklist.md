# Slim signup + ACT-1 — merge & prod-checklista

**Skapad:** 2026-07-02  
**Status:** ✅ **Shippat** — prod `8cc9f17` (2026-07-02), SW v477, smoketest OK  
**Syfte:** Säker ship av slim signup + Journey + ACT-1 PR 1–4.

**Produktlåsning:** ADR [`journey-event-first-onboarding.md`](./decisions/journey-event-first-onboarding.md)

---

## Migrations vid deploy

| Migration | Effekt |
|-----------|--------|
| `1809220000000_enable_act1_pr1_4_flags` | ACT-1 PR 1–4 flaggor ON |
| `1809230000000_activation_signup_slim_flag` | Skapar `activation_signup_slim_v1` |
| `1809240000000_enable_signup_slim_flag` | `activation_signup_slim_v1` ON |

---

## Prod-deploy (VPS)

Värden: `$VPS_APP_ROOT`, `$SYSTEMD_SERVICE` i deploy-regler / `AGENTS.md`.

```bash
cd "$VPS_APP_ROOT"
git pull origin main
npm run migrate
sudo systemctl restart "$SYSTEMD_SERVICE"
sleep 3
curl -s http://127.0.0.1:3000/health
```

### Journey-coach på Hem

```bash
psql "$DATABASE_URL" -c "
  UPDATE feature_flag SET enabled = true
  WHERE key IN (
    'family_journey_evaluator_enabled',
    'family_journey_coach_v1',
    'family_journey_ingest_enabled',
    'family_journey_context_api'
  );
"
sudo systemctl restart "$SYSTEMD_SERVICE"
```

### Verifiera flaggor

```bash
psql "$DATABASE_URL" -c "
  SELECT key, enabled FROM feature_flag
  WHERE key LIKE 'activation_%' OR key LIKE 'family_journey_%'
  ORDER BY key;
"
```

---

## Röktest (15 min)

### A — Slim standardväg
1. Ny registrering → 3 frågor → **Skapa rutin**
2. **Gå till Hem** → Journey coach dag 1 (om journey-flaggor på)

### B — Power-user
1. **Välj färdigt schema** eller **Bygg och anpassa själv**
2. Handoff ska fungera på dessa vägar

---

## Rollback

```sql
UPDATE feature_flag SET enabled = false WHERE key = 'activation_signup_slim_v1';
```

---

## Checklista

- [x] `test:gate` grön (pre-ship + hygiene-pass 2026-07-02)
- [x] `npm run migrate` prod OK (#506 + #508 migrations)
- [x] `/health` OK (prod efter deploy)
- [x] Journey evaluator + coach ON (prod SQL enligt §Journey-coach)
- [x] Röktest A + B (smoketest OK)
