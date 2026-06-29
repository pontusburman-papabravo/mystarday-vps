# Standard — Coding

**Version:** 1.0  
**Authority:** `.cursor/rules/000-core.mdc` · domain rules `070–100` · POS engineering bar

> Conventions live in Cursor rules. This file indexes them for agents.

---

## Global Bar (all code)

- No TODO · hacks · dead code · magic numbers · duplicated logic  
- New code **simpler** than replaced  
- Minimize diff scope  
- Match surrounding style  

---

## By Layer

| Layer | Rules | Key paths |
|-------|-------|-----------|
| Frontend | `070-frontend.mdc` | `public/js/` · small modules · no Tailwind CDN |
| Backend | `080-backend.mdc` · `100-api.mdc` | `src/routes/` · Zod validate |
| Database | `090-database.mdc` | `migrations/` · `db/` |
| Mobile | `060-mobile-first.mdc` | `platform.js` · Capacitor |
| Security | `120-security.mdc` | auth middleware · env secrets |
| Git | `170-git-workflow.mdc` | branch naming · commits |

---

## Large Files

Per `.cursor/rules/large-files.mdc`:

- Grep first · chunk-read only  
- New features in **new small files**  
- Never full-read critical files (schedule.js, dashboard.js, etc.)

---

## Agent Checks (before PR)

- [ ] `npm run lint` — 0 errors on `src/` + `server.js`
- [ ] No secrets in diff
- [ ] No `console.log` debug left (use structured logging patterns in codebase)
- [ ] SW + cache version if static assets changed

---

## Deep References

| Topic | Location |
|-------|----------|
| Self-review | `.cursor/rules/180-self-review.mdc` |
| Definition of Done | `.cursor/rules/190-definition-of-done.mdc` |
| Implementation workflow | [workflows/implementation.md](../workflows/implementation.md) |
