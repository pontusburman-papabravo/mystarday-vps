# RC1 Release Checklist

**Release:** RC1  
**Integration branch:** `cursor/rc1-integration-a43c`  
**Status:** **READY TO MERGE**

---

## A. Pre-merge gates

- [x] Merge order: #401 → #396 → #400 → #402
- [x] Schema authority: 180895 canonical; 180896 removed
- [x] `PgProgressionStore` aligned with 180895
- [x] Merge conflicts resolved (`context-builder.js`, `package.json`, `sw.js`)
- [x] `test:gate` green (192 tests)
- [x] Route inventory regenerated

## B. Feature flag safety

```sql
SELECT key, enabled FROM feature_flag
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
-- Expected: both enabled = false
```

- [x] Migration seeds `false` with `ON CONFLICT DO NOTHING`
- [ ] **Pre-deploy:** verify SQL on target environment

## C. Legacy paths (flags OFF)

- [x] Onboarding unchanged
- [x] Parent/child dashboards unchanged
- [x] Journey evaluator unchanged
- [x] Runtime returns `{ skipped: true, reason: 'runtime_disabled' }`
- [x] First-week block skipped when `family_journey_first_week_v1` OFF
- [x] `/api/me/platform-feedback` → 503

## D. Deployment

- [x] Migrations: 180895, 180900 (no 180896)
- [x] SW + cache-version aligned: `stjarndag-v409`
- [x] Rollback: flag OFF first; migration `down()` on 180900 → 180895
- [ ] Deploy via merge to `main` → GitHub Actions
- [ ] Post-deploy health + flag SQL

## E. Observability (first activation — not at deploy)

See `docs/first-success/FIRST-LIVE-ENABLE-CHECKLIST.md`

**Logs:** `[platform-runtime]`, `[platform-feedback]`, `[journey-context]`  
**Rollback trigger:** `[platform-runtime] activity complete error` spike

## F. Sign-off

| Role | Status |
|------|--------|
| CTO | APPROVED |
| Release Manager | APPROVED |
| QA Director | APPROVED |
| Security Lead | APPROVED |
| Parent Experience Lead | APPROVED |
