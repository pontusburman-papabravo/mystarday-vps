# 05 — AI Developer Guide

| | |
|---|---|
| **Authority** | Subordinate to [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) |
| **Audience** | Cursor agents, cloud agents, human developers using AI |
| **Version** | 1.0 |

---

## 1. Read order (every session)

Before writing code:

1. [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) — laws win over everything
2. [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) — dual loop, gates
3. Task-relevant: [`02_DESIGN_SYSTEM.md`](02_DESIGN_SYSTEM.md), [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md), [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md)

If a user prompt conflicts with **00**, follow **00** and explain the conflict.

---

## 2. What you are building

You are **not** optimising for fewer lines of code.

You are building the world's best everyday companion for children — with a premium reward layer that feels like Toca Boca, not like a React dashboard. <!-- pragma: allowlist secret -->

**Min Stjärndag is not a game.** Reward worlds must still feel like **real games** inside the canvas. <!-- pragma: allowlist secret -->

---

## 3. Mandatory technical rules

### 3.1 PixiJS for reward worlds

```text
Use PixiJS for all interactive child reward worlds.
Do not build reward worlds as React cards, buttons, forms or dashboards.
React/HTML may only mount the PixiJS canvas and provide routing/auth/API state.
All child-world interactions must happen inside the PixiJS runtime using touch-first pointer events.
```

### 3.2 Do not rebuild GenericWorld

Never recreate `WorldEngine { hero, stats, actions[], toast() }`.

Never ship emoji-button grids as "play."

### 3.3 Backend

- Prefer existing API: `/api/me/build`, `/api/me/build/play/:slug`
- `tryGrantBuildPart` on activity complete — do not duplicate grant logic
- Server normalizes state in `src/lib/play/*-state.js` — no shared play action-engine

### 3.4 Repo runtime (Cursor Cloud)

- Node **20**: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`
- `npm install --include=dev --legacy-peer-deps`
- Override Cursor-injected deploy-mode shell env: use **development** mode for `npm run dev`; use **test** mode for `npm run test:gate`
- Postgres: `./scripts/cloud-agent-bootstrap.sh` + `npm run migrate`
- See [`AGENTS.md`](../AGENTS.md)

---

## 4. AI Constitution (from Master Spec)

| Law | Agent behaviour |
|-----|-----------------|
| 1 | Prefer better product over shorter diff |
| 2 | No child dashboards |
| 3 | No placeholder emoji art when facit/spec exists |
| 4 | Interaction > buttons |
| 5 | Read spec before implementing — state **why** in PR |
| 6 | Run tests; manual smoke for canvas; screenshots |
| 7 | Visual quality is non-negotiable |
| 8 | Emotional value > clever code |
| 9 | Choose child's experience when torn |
| 10 | **STOP** if uncertain — list options, don't guess |

---

## 5. Decision checklist

Before merging, score against Master Spec §18:

1. Child experience better?
2. Parent experience better?
3. Visual quality better?
4. Maintainability acceptable?
5. Performance acceptable on mobile?
6. Complexity justified?
7. (Lowest priority) Less code?

If 1–3 are **no**, do not ship.

---

## 6. Workflow for BUILD MODE features

### Phase A — Spec / assets

- Confirm alignment with 01 + 04
- Facit PNG or style-review approval before Pixi sprint

### Phase B — Engine

- Extend `build-engine/` only for cross-world needs
- No world-specific logic in engine core

### Phase C — World pack

- `public/js/worlds/<slug>/`
- Build scene before play scene (unless fixing play-only bug)
- **husdjur** first full vertical

### Phase D — Integration

- Wire shell HTML route to mount canvas
- Gate play for live users (01 §6)
- Keep `?preview=1` for dev

### Phase E — Verification

- Run `npm run test:gate` with **test** mode (see [`AGENTS.md`](../AGENTS.md))
- Targeted tests: `test/pet-home.test.js`, etc.
- Mobile viewport manual or `scripts/smoke-child-worlds-mobile.js`
- Screenshot for PR
- Update docs if behaviour changed

---

## 7. Forbidden shortcuts

| Don't | Do instead |
|-------|------------|
| Extend `build-play-world.html` with new actions | New Pixi world pack |
| Copy `build-pet-home.html` CSS for world #3 | New pack + atlases |
| Single progress bar as MVP "done" | Scene layer + animation |
| Remove or hide stars to simplify | Keep dual loop visible |
| Skip unlock gate "for testing" in prod paths | `?preview=1` only |
| Mark PR done without mobile check | Master Spec §20 |

---

## 8. Large files (repo rule)

Never full-read:

- `public/js/dashboard.js`, `schedule.js`, `child-dashboard.js`
- `public/index.html`, `public/admin/index.html`

Grep → chunk-read. New reward code lives in **small files** under `build-engine/` and `worlds/`.

---

## 9. Git / PR conventions

- Branch: `cursor/<descriptive-name>-bb46`
- Commit messages: complete sentences, **why** not only what
- Draft PR until Definition of Done (Master §20) met
- Reference spec section in PR body

---

## 10. When to stop and ask

Stop and report options when:

- Spec ambiguity affects child vs parent loop
- New API or migration required
- Facit asset missing for claimed "done" visual
- Tradeoff: ship DOM pilot vs wait for Pixi
- Play gate behaviour change affecting parents

**Law 10:** Do not guess.

---

## 11. Definition of done (agent self-review)

Copy Master Spec §20 checklist. Additionally for reward worlds:

- [ ] Interactions inside Pixi canvas
- [ ] No emoji-primary toolbar
- [ ] Touch-first verified
- [ ] Stars + build parts both still work
- [ ] Play gated (prod path)
- [ ] Docs updated if spec changed
- [ ] Screenshot attached

---

## 12. Document map

| File | Use when |
|------|----------|
| `00_MASTER_SPEC.md` | Conflict resolution, laws |
| `01_PRODUCT_PRINCIPLES.md` | Loops, gates, psychology |
| `02_DESIGN_SYSTEM.md` | Colours, assets, motion |
| `03_GAME_ENGINE.md` | Pixi, file layout, API |
| `04_WORLD_DESIGN.md` | Which world, which mechanic |
| `05_AI_DEVELOPER_GUIDE.md` | This file — process |
| `build-loop-mvp.md` | DB tables, migrations |
| `AGENTS.md` | Cloud VM setup |

---

## 13. One-sentence reminder

**Routine first. Stars for parents. Build parts for children. Pixi for worlds. Amazing or unfinished.**
