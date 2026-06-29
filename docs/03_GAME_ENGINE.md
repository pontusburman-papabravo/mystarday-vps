# 03 — Game Engine

| | |
|---|---|
| **Authority** | Subordinate to [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) |
| **Version** | 1.0 |
| **Scope** | PixiJS runtime (BuildEngine), architecture, integration with app |

---

## 1. Platform decision

| Decision | Choice |
|----------|--------|
| Distribution | **Web-first PWA** + **Capacitor** (iOS/Android same bundle) |
| App shell | Existing web app — login, schema, parent, Skattkammaren, settings |
| Reward worlds | **PixiJS** 2D canvas runtime |
| Backend | **Express + PostgreSQL** — minimal changes |
| **Not** | Unity, Godot, React/CSS/DOM for interactive child worlds |

**Why not Unity/Godot:** Integration cost with schema/stars/auth; overweight for 2D; separate deploy story.

**Why not React/CSS worlds:** Inevitably becomes cards, buttons, dashboards — rejected per master spec.

**Repo today:** Express + static `public/` + Capacitor. Spellayer added as Pixi module; shell may adopt TypeScript incrementally **without** building worlds in DOM.

---

## 2. Two-layer architecture

```text
┌─────────────────────────────────────────────┐
│  APP SHELL (HTML/JS)                        │
│  · routing, auth cookies, API client        │
│  · mounts <canvas id="reward-world">        │
│  · passes: childId, slug, buildState, flags │
├─────────────────────────────────────────────┤
│  PIXI BUILD ENGINE                          │
│  · Application, loader, scene manager       │
│  · drag, particles, audio, haptics hooks    │
│  · save debounce → existing REST API        │
├─────────────────────────────────────────────┤
│  WORLD PACK (per adventure)                 │
│  · build scene + play scene                 │
│  · sprites, rules, state machine            │
└─────────────────────────────────────────────┘
```

**Cursor rule (mandatory):**

```text
Use PixiJS for all interactive child reward worlds.
Do not build reward worlds as React cards, buttons, forms or dashboards.
React/HTML may only mount the PixiJS canvas and provide routing/auth/API state.
All child-world interactions must happen inside the PixiJS runtime using touch-first pointer events.
```

---

## 3. Technology stack

| Layer | Library | Responsibility |
|-------|---------|----------------|
| Rendering | **PixiJS** v8 | Stage, containers, sprites, textures, particles |
| Animation | **GSAP** | Timelines, part-land, unlock, micro-steps |
| Audio | **Howler.js** | SFX, ambient, mute prefs |
| Client state | **Zustand** | Play/build state mirror; sync to API |
| Input | **Pointer Events** + **DragManager** | Touch-first drag, scrub, throw |
| Haptics | **Capacitor Haptics** via `Platform` | light/medium/success |
| Assets | WebP/AVIF + **spritesheets** (TexturePacker or similar) | Atlas JSON |
| Cache | **Service worker** (`public/sw.js`) | Precache atlases |
| Persistence | Existing | `play-world-save.js`, `customization` JSONB |

**Bundler note:** Introduce Pixi/GSAP/Howler/Zustand via npm in `package.json`; load world packs as ES modules or bundled chunks per route.

---

## 4. BuildEngine vs world pack

| | **BuildEngine** | **World pack** |
|---|-----------------|----------------|
| **Owns** | Pixi lifecycle, scene stack, drag, particles, audio bus, save hooks, unlock flow | Art, layout, game rules, copy |
| **Does not own** | "Feed pet" rules, dog vs car behaviour | Generic engine internals |
| **Analogy** | Engine (not Unity editor) | Game title |

### BuildEngine modules (target)

```
public/js/build-engine/
  app.js              # createApplication, resize, destroy
  scene-manager.js    # push/pop scenes, transitions
  drag-manager.js     # pointer capture, hit areas, drop targets
  particles.js        # burst, confetti, stars
  audio.js            # Howler wrapper, mute
  haptics.js          # Platform bridge
  save-hooks.js       # debounced PATCH, load on boot
  unlock.js           # ceremony scene hook
  progression.js      # onPartLanded(macro, micro, rarity)
  loader.js           # asset manifest per world pack
```

### World pack (example: pet-home)

```
public/js/worlds/pet-home/
  index.js            # register with engine
  build-scene.js      # 0→75 assembly
  play-scene.js       # care mechanics after unlock
  manifest.json       # atlas URLs, audio
  assets/             # atlases (git-lfs or CDN in prod)
```

---

## 5. Do not build GenericWorld

**v1 anti-pattern (delete when replaced):**

`build-play-world.html` + `WorldEngine { hero, stats, actions[], toast() }`

Same UI, different background — fails child QA immediately.

**v2 anti-pattern:**

DOM/CSS worlds (`build-garage.html`, `build-pet-home.html`) — useful **pilots** for mechanics; **must migrate** to Pixi, not copy.

**BuildEngine ≠ GenericWorld.** Engine provides infrastructure; each pack registers unique scenes and interactions.

---

## 6. Scene types

| Scene | When | Owned by |
|-------|------|----------|
| `BuildScene` | `parts_collected < 75` | World pack |
| `UnlockScene` | milestone 75 crossed | Engine + pack skin |
| `PlayScene` | unlocked + gate passed | World pack |
| `GreetingOverlay` | on session start | Engine + pack copy |

Engine handles transitions; pack provides sprites and hooks.

---

## 7. API integration (unchanged)

```
GET   /api/me/build                     → active project, parts_collected
POST  /api/me/build/start
POST  /api/me/build/part                ← daily-log trigger (server)
GET   /api/me/build/play/:slug          → customization JSON
PATCH /api/me/build/play/:slug          → save play state
```

**Client flow:**

1. Shell loads `/child/pet-home` (or embedded canvas on child dashboard for build)
2. `Auth.api('/api/me/build')` + play endpoint
3. Engine `boot({ slug, parts, customization, unlocked })`
4. `save-hooks` debounces PATCH on state change

**Server:** No shared play action-engine. `src/lib/play/pet-home-state.js` normalizes JSON per slug.

---

## 8. Migration from current code

| Current | Action |
|---------|--------|
| `build-game-mobile.js` | Haptics/scroll → `build-engine/haptics.js`; retire DOM-specific |
| `build-garage.html` + `build-garage.js` | Mechanics spec → `worlds/garage/` Pixi |
| `build-pet-home.html` + `play/pet-home.js` | Mechanics spec → `worlds/pet-home/` Pixi |
| `child-build-hype.js` | Build preview → embed Pixi `BuildScene` thumbnail or full canvas |
| `build-play-world.html` | Remove when all slugs have packs or "coming soon" shell |

**Reuse:** state machines, API field names, interaction **design** from DOM pilots.

**Rewrite:** rendering, hit areas, animation — all Pixi.

---

## 9. Performance budgets (mobile)

| Metric | Target |
|--------|--------|
| First interactive canvas | < 3s on mid Android (with SW cache) |
| Frame rate | 60fps idle; 30fps minimum during heavy particles |
| Texture memory | Atlases per scene, unload on scene pop |
| Touch latency | < 100ms visual feedback on drag start |

---

## 10. Testing

| Level | What |
|-------|------|
| Unit | DragManager hit tests, state normalizers (existing Node tests) |
| Integration | API contract tests (existing `pet-home.test.js`, etc.) |
| Manual | `scripts/smoke-child-worlds-mobile.js` updated for canvas |
| Visual | Screenshots per milestone — App Store checklist |

---

## 11. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **2a** | `build-engine/app.js` — empty stage, resize, boot/teardown |
| **2b** | DragManager + particles + haptics |
| **2c** | GSAP + Howler + save-hooks |
| **3** | `worlds/pet-home` build + play scenes, gate, facit art |
| **5** | Migrate garage; deprecate DOM routes |

---

## 12. Related documents

| Doc | Content |
|-----|---------|
| [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) | Gates, dual loop |
| [`02_DESIGN_SYSTEM.md`](02_DESIGN_SYSTEM.md) | Visual bar, assets |
| [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md) | Per-world mechanics |
| [`05_AI_DEVELOPER_GUIDE.md`](05_AI_DEVELOPER_GUIDE.md) | Agent workflow |
| [`build-play-worlds-spec.md`](build-play-worlds-spec.md) | Play-world DoD checklist |
