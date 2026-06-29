# 02 — Design System

| | |
|---|---|
| **Authority** | Subordinate to [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) |
| **Version** | 1.0 |
| **Scope** | Visual language for app shell + reward worlds |

---

## 1. Quality bar

Every screen must be good enough for **App Store**, **Google Play**, marketing, and press — without redesign.

**Target references:** Toca Boca warmth · premium children's apps · our own style anchors (garage, pet hero).

Reward worlds must **not** look like:

- A React admin panel
- Bootstrap cards
- Emoji grids
- Generic clip-art

They must look like a **real children's game** that happens to connect to real routines.

---

## 2. Brand foundation (app shell)

Shared across parent UI, child schedule, and world chrome:

| Token | Value | Use |
|-------|-------|-----|
| **Navy** | `#1B2340` | Text, structure |
| **Navy soft** | `#2A3458` | Headers, depth |
| **Navy deep** | `#0F1629` | Dark backgrounds (garage mood) |
| **Gold** | `#F5A623` | Primary accent, stars, warmth |
| **Gold light** | `#FFF3D6` | Backgrounds, cards |
| **Gold dark** | `#D4880A` | CTA, emphasis |
| **Lavender** | `#EDE7F6` | Soft panels, child UI |
| **Mint** | `#E0F5EC` | Success, unlock |
| **Sky** | `#E8F0FE` | Air, calm |

**Typography:**

| Role | Font |
|------|------|
| Headings / child energy | **Outfit** (600–800) |
| Body / parent clarity | **Plus Jakarta Sans** (400–600) |

**Each world** may shift temperature/lightness within this family — never break brand recognition.

---

## 3. Emotional palette (worlds)

Worlds should evoke Master Spec §8:

| Emotion | Visual levers |
|---------|----------------|
| Joy | Warm light, bounce animation, particles |
| Curiosity | Hidden details, rare finds, subtle motion |
| Pride | Visible growth, unlock ceremony |
| Wonder | Glow, stars, depth, parallax |
| Ownership | Name signs, chosen pets, custom colours |
| Calm | Soft gradients, rounded forms, no clutter |
| Safety | Clear touch targets, friendly faces, no harsh red |

If a screen creates **no emotion**, redesign it.

---

## 4. Reward world rendering

### 4.1 Rule: PixiJS canvas

All **interactive** child reward content (build scenes + play worlds) renders in **PixiJS** — not React components, not CSS layout, not DOM buttons.

App shell mounts `<canvas>` and passes auth/API state only.

See [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md).

### 4.2 Assets

| Type | Format | Notes |
|------|--------|-------|
| Heroes (characters) | PNG facit → WebP/AVIF + spritesheet | `build-pet-hero.png`, `build-car-hero.png` |
| Scenes | PNG facit → atlas | `build-garage-scene.png`; pet scene TBD |
| UI in worlds | Pixi sprites / bitmap text | Not HTML overlays except loading/error |
| Particles | Pixi particle emitters | Stars, hearts, dust, sparkles |
| Audio | Howler.js | Per-world SFX + ambient |

**Never** ship emoji as primary world graphics when facit or reasonable art can exist.

### 4.3 Style anchors (repo)

| Asset | Path | Role |
|-------|------|------|
| Car hero | `public/img/build/style-anchor/build-car-hero.png` | Racerbil quality bar |
| Garage scene | `build-garage-scene.png` | Environment reference |
| Car progress | `build-car-progress.png` | Part-collection silhouette |
| Pet hero | `build-pet-hero.png` | Husdjur quality bar |
| Review page | `public/build-style-review.html` | Internal style sign-off |

New worlds need hero + scene + progress art **before** Pixi implementation is "done."

---

## 5. Interaction design

### 5.1 Touch-first

- Minimum touch target: **44×44 pt** equivalent
- Pointer Events — not hover-only
- Drag, scrub, throw, paint — **physical** verbs
- Haptic feedback on success (Capacitor Haptics / vibrate fallback)

### 5.2 Forbidden patterns

| Pattern | Replace with |
|---------|----------------|
| "Feed pet" button | Drag bowl to pet |
| Stat row + button grid | Illustrated scene + tools |
| `+8 Happiness` toast | Animation + particle + sound |
| Lone `████████░░ 32/75` | Scene layer appears / animates |
| Emoji toolbar | Illustrated tool sprites |

### 5.3 Build scene UX

When a part is earned:

1. Brief celebration (particles, sound, haptic)
2. **Part flies into scene** and assembles (GSAP)
3. Guide line: *"The dog house grew!"* — not *"+1 part"*
4. Optional rare-find overlay (§01 rare finds)

---

## 6. Layout — app shell vs canvas

```
┌─────────────────────────────────────┐
│  App chrome (HTML) — back, safe area│
├─────────────────────────────────────┤
│                                     │
│     PIXI CANVAS (full bleed)        │
│     build scene OR play world       │
│                                     │
├─────────────────────────────────────┤
│  Minimal chrome only if needed      │
└─────────────────────────────────────┘
```

Avoid splitting attention between DOM cards above/below a tiny game view.

---

## 7. Motion

| System | Use |
|--------|-----|
| **GSAP** | Part land, unlock, micro-steps, UI micro-interactions in canvas |
| **Pixi ticker** | Idle animations (blink, tail wag, water ripple) |
| Easing | Soft overshoot for delight; never harsh linear UI |

Animations must feel **natural** (Master Spec §19) — not slideshow transitions.

---

## 8. Accessibility

- Sufficient contrast on app-shell text (WCAG AA target)
- Don't rely on colour alone for state
- Respect `prefers-reduced-motion` where feasible (reduce particles, keep function)
- Touch targets and clear feedback for motor difficulties

---

## 9. Responsive targets

| Device | Priority |
|--------|----------|
| Phone 390×844 | Primary (99.9% mobile) |
| Tablet | Secondary — scale canvas, don't reflow into dashboard |
| Desktop | Dev/parent only — child worlds still touch-minded |

---

## 10. Definition of done (visual)

- [ ] Would pass as App Store screenshot without embarrassment
- [ ] Matches style anchor or documented new anchor approved
- [ ] No emoji-primary UI in reward worlds
- [ ] Animations on earn, unlock, and key interactions
- [ ] Tested on real mobile viewport
- [ ] No visible DOM "card stack" in play/build views

---

## 11. Related documents

| Doc | Content |
|-----|---------|
| [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md) | Pixi implementation |
| [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md) | Per-world art direction |
| [`build-style-review.html`](../public/build-style-review.html) | Live anchor preview |
