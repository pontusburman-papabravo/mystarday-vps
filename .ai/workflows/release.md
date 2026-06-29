# Workflow — Release

**Version:** 1.0  
**Roles:** Release Manager · QA Director · CTO  
**Authority:** `docs/RELEASE.md` · POS 13 · `.ai/company/010_RELEASE_COMMAND.md`

---

## Input

- Merged PRs on `main` (human merge)
- Migration files if any
- Static asset changes requiring SW bump
- Native changes requiring store build

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Pre-flight** | CI green on `main` |
| 2 | **Gate** | `test:gate` on release commit |
| 3 | **Migrate** | `npm run migrate` on target env |
| 4 | **SW** | Bump `public/sw.js` + `config/cache-version.json` if static changed |
| 5 | **Deploy** | GitHub Actions preferred · VPS per live deploy ops rule |
| 6 | **Health** | `sleep 3` · `curl http://127.0.0.1:3000/health` |
| 7 | **Smoke** | Critical paths: login · child dashboard · star give |
| 8 | **Monitor** | Logs 15 min · live systemd journal |
| 9 | **Document** | Release notes · deploy timestamp |

---

## Output

- Deployed artifact
- Health check pass
- Release log

---

## Quality Gates

- [ ] REL-01–REL-09 (POS 13)
- [ ] No open P0
- [ ] Migrations applied
- [ ] SW version matches cache bump
- [ ] Rollback plan noted if risky

---

## Stop Conditions

- Gate fail on main → do not deploy
- Migration untested → hold
- Human has not merged → agent does not deploy autonomously to prod
- Friday deploy of risky schema → recommend hold (note in report, human decides)

**Agent note:** Release to live is **human-operated**. Agents prepare checklist and PR; humans execute deploy.
