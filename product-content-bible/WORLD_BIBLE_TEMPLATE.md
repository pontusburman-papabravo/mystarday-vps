# World Bible Template

**Use this template for every world in the Product Content Bible.**  
Copy structure; replace every `[WORLD]` placeholder. Delete instructional lines before marking a bible complete.

**Inherits:** POS `04`, `06`, `09`, `03A`, `03B`, `06A` · PCB README differentiation matrix.

---

## World ID

| Field | Value |
|-------|-------|
| **Internal name** | `[WORLD_SLUG]` |
| **Child-facing name (SV)** | `[Svenskt namn]` |
| **Icon metaphor** | `[One emoji / symbol concept]` |
| **Unlock tier** | `[Starter / Mid / Late / Parent-selected theme]` |

---

## Purpose

*Why does this world exist in Stjärndag? What job does it do in the child's week? One paragraph, mission-linked.*

---

## Fantasy

*The story the child tells themselves when they enter. Present tense, child voice optional. What do they believe this place is?*

---

## Core Emotion

*Single primary feeling + secondary feeling. Must be unique vs other worlds in PCB README matrix.*

| Primary | Secondary |
|---------|-----------|
| `[emotion]` | `[emotion]` |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | `[e.g. 5–8]` | |
| **Younger** | `[4–5]` | Simplifications |
| **Older** | `[9–12]` | Extra depth without pressure |

---

## Visual Language

*Illustration brief — line, color, materials, light, hero props. Reference 03A; world-specific overrides only.*

- **Palette:** `[3–5 colors with emotional role]`
- **Materials:** `[wood, fabric, stone…]`
- **Light:** `[time of day, direction, mood]`
- **Scale:** `[diorama depth, camera feel]`
- **Hero silhouettes:** `[3 recognizable shapes]`
- **Never here:** `[off-brand list]`

---

## Audio Language

*Per 06A — optional, calm, never mandatory.*

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | `[e.g. soft room tone]` |
| **Interaction** | `[tap, place, success]` |
| **NPC** | `[if any — 2–3 vocalizations max]` |
| **Silence** | `[when audio is off]` |
| **Reduced motion** | `[visual-only equivalents]` |

---

## Animation Language

*Per 03B — timing, easing, idle life.*

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | `[ms]` | `[crossfade / parallax]` |
| Place part | `[ms]` | `[snap, bounce?]` |
| Idle loop | `[s]` | `[breathing, blink]` |
| Unlock reveal | `[ms]` | `[curtain, glow — skippable]` |
| Celebration link | `≤2000ms` | `[from routine — optional]` |

---

## NPC Behaviour

*Who lives here besides the child? Not every world needs a speaking NPC.*

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| `[name]` | `[guide / companion / ambient]` | `[2–3 beat description]` | `[idle / after unlock / visit]` |

**Rules:** No guilt dialogue · no comparison · no requests that block routine.

---

## Idle Behaviour

*What the world does when the child watches without tapping — the "living diorama" test.*

- **Always:** `[list ambient motions]`
- **Sometimes:** `[rare idle beats]`
- **After progress:** `[what changed since last visit]`
- **Never:** `[spam, flashing CTAs]`

---

## Room Layout

*Spatial design — zones, camera, depth layers. ASCII or prose map.*

```
[Layer back → front]
[Zone A — job]
[Zone B — job]
[Primary interaction anchor]
```

**Navigation:** One-thumb reachable primary zone on 375px width.

---

## Progression

*How this world grows with real life — not grind.*

| Phase | Trigger (behavior) | World change |
|-------|-------------------|--------------|
| **Arrival** | `[first visit condition]` | |
| **Early** | `[first completions]` | |
| **Mid** | `[sustained routine / stars band]` | |
| **Late** | `[long arc]` | |
| **Memory** | `[optional museum link]` | |

---

## 75 Build Parts

*Minimum catalog. Format: `# · Name · Category · Visual one-liner · Unlock tier`*

**Categories used in this world:** `[list]`

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | `[name]` | `[cat]` | `[one line]` | `[starter/mid/late/secret]` |
| … | | | | |
| 75 | | | | |

---

## Unlock Moments

*Ceremony copy + fiction — reveal when entering world after progress (W-05).*

| Moment | Behavior trigger | What child sees | Copy (SV) |
|--------|------------------|-----------------|-----------|
| 1 | | | |
| 2 | | | |

---

## Daily Interactions

*What a child might do in a normal 2–5 minute visit after school or after morning routine.*

1. `[interaction]`
2. `[interaction]`
3. `[interaction]`

**Cap:** No mandatory loop longer than 5 minutes.

---

## Long-Term Interactions

*Weeks-months — collection completion, room evolution, companion arc.*

- `[arc beat]`
- `[arc beat]`

---

## Rare Discoveries

*Earned secrets — not random loot boxes.*

| Discovery | Approx. effort | Fiction |
|-----------|----------------|---------|
| | | |

---

## Secrets

*Hidden interactions for observant children — fair hints, no paywall.*

| Secret | Hint | Payoff |
|--------|------|--------|
| | | |

---

## Reward Philosophy

*How stars / redemptions connect to this world without becoming a points shop.*

---

## Parent Value

*Why parents feel good about this world — stress, independence, real-life bridge.*

---

## Educational Value

*Incidental learning — never worksheet energy.*

---

## Accessibility Considerations

*Motor, vision, cognitive, reduced motion, audio off.*

---

## Future Expansion Ideas

*Not commitments — seeds for v2 content.*

---

## Sign-off Checklist

- [ ] Unique vs other six worlds (PCB README matrix)
- [ ] G-/W- compliant — no toxic mobile patterns
- [ ] 75 parts numbered and categorized
- [ ] Artist can illustrate without questions
- [ ] Game designer can spec loops without questions
- [ ] Engineer knows fiction boundaries (not how to code)
