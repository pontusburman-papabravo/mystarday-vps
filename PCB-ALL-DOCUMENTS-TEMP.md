# ALL DOCUMENTS — Stjärndag Product Content Bible v1.0
# Temp export — copy entire file (Cmd+A, Cmd+C)


================================================================================
FILE: product-content-bible/README.md
================================================================================

# Product Content Bible (PCB)

**Version:** 1.0  
**Status:** Highest-priority creative authority for child-facing worlds  
**Frozen upstream:** POS v1.0 · AOS v1.0 · COS v1.0 — do not expand governance unless critical contradiction

---

## What This Is

The **Product Content Bible** defines everything the child experiences inside **Min värld** — the places they build, visit, and discover after real life goes well.

This is **not** technical documentation. No APIs, schemas, or implementation. It is the creative foundation artists, game designers, writers, and engineers use to build worlds **without asking what anything should feel like**.

| System | Location | Role |
|--------|----------|------|
| **POS** | `product-operating-system/` | Product law — motivation, rules, art north star |
| **COS** | `.ai/company/` | Executive judgment |
| **AOS** | `.ai/` | Engineering execution |
| **PCB** | `product-content-bible/` (here) | **World fiction, parts, behaviour, unlock poetry** |

**Hierarchy:** POS > COS > PCB > AOS > code.  
If PCB and POS conflict → **POS wins** — fix PCB.

---

## Worlds in v1.0

| World | File | One-line identity |
|-------|------|-------------------|
| **Routine Home** | [WORLD_ROUTINE_HOME.md](./WORLD_ROUTINE_HOME.md) | The warm morning house where capability lives |
| **Garage** | [WORLD_GARAGE.md](./WORLD_GARAGE.md) | Build, fix, and finish what you start |
| **Pet Home** | [WORLD_PET_HOME.md](./WORLD_PET_HOME.md) | A companion who grows when life goes well |
| **Dinosaur** | [WORLD_DINOSAUR.md](./WORLD_DINOSAUR.md) | Wonder, fossils, and earned prehistoric secrets |
| **Dollhouse** | [WORLD_DOLLHOUSE.md](./WORLD_DOLLHOUSE.md) | Miniature rooms for pretend and control |
| **Fishing** | [WORLD_FISHING.md](./WORLD_FISHING.md) | Patience, water, and quiet evening calm |
| **Study** | [WORLD_STUDY.md](./WORLD_STUDY.md) | A proud nook for focus without school pressure |

**Template:** [WORLD_BIBLE_TEMPLATE.md](./WORLD_BIBLE_TEMPLATE.md)

---

## How to Use This Bible

1. Read POS `04`, `06`, `09`, `03A`, `03B`, `06A` once — rules live there, not repeated here.
2. Open the world bible for your discipline.
3. Every deliverable must trace to a section: visual → Visual language; animation → Animation language; etc.
4. **75 build parts** per world are the minimum content catalog — not a shipping mandate for v1 code.
5. Unlock moments describe **when** fiction changes; thresholds are tuned in product ops, never client-only (W-01).

---

## Shared Rules (reference only)

All worlds inherit without restating full rule text:

- **G-01–G-08** — no login rewards, loot boxes, shame streaks, pay-to-skip rooms  
- **W-01–W-05** — unlocks from real behavior; pet not day-one; discovery on visit  
- **C-01–C-08** — child simplicity, celebrations ≤2s, no paywalled visits  
- **00A** — calm magic; accomplishment before points  
- **03A** — Scandinavian children's book diorama; warm top-left light  

---

## World Differentiation Matrix

Each world must occupy a **distinct emotional job**. Overlap is failure.

| World | Core emotion | Energy | Best age | Unique verb |
|-------|--------------|--------|----------|-------------|
| Routine Home | Capable, safe | Morning medium | 4–10 | *Start the day* |
| Garage | Proud maker | Active | 5–10 | *Fix and finish* |
| Pet Home | Gentle belonging | Soft | 4–9 | *Care and greet* |
| Dinosaur | Awe, discovery | Wonder bursts | 4–8 | *Uncover* |
| Dollhouse | Cozy control | Quiet play | 4–9 | *Arrange* |
| Fishing | Patient calm | Low, evening | 5–11 | *Wait and notice* |
| Study | Focus pride | Still | 6–12 | *Settle and create* |

---

## Cross-Role Review Summary (v1.0)

Reviewed as executive + specialist roles before freeze. Findings incorporated into world docs.

| Role | Verdict | Key action taken |
|------|---------|------------------|
| **CEO** | Approve | Each world maps to mission (calmer mornings); no vanity grind economies |
| **CPO** | Approve | Parent value explicit per world; First Success not blocked by any world |
| **Game Director** | Approve | Progression tied to real behavior; toxic mobile patterns absent; unique reward loops |
| **Creative Director** | Approve | Visual/audio languages distinct; handcrafted bar in every bible |
| **UX Director** | Approve | One primary interaction per visit; no dead-end decoration menus |
| **QA Director** | Approve | Accessibility sections added; no P0 fiction (shame, comparison, gambling) |
| **Child psychologist lens** | Approve | Autonomy + competence supported; Pet Home avoids guilt caregiving; Study avoids school anxiety |

**Duplication removed:** Shared POS rules live in this README only. Per-world docs keep one-line inheritance note, not full G-/W- lists. Build-part numbering schemes are world-unique (no copy-paste props across worlds except abstract categories).

---

## Export

Full text for copy: `/PCB-ALL-DOCUMENTS-TEMP.md` (repo root, generated on commit)

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Seven world bibles + template |

Changes require CPO + Game Director + Creative Director sign-off. Critical POS contradiction → fix PCB, do not edit frozen POS without ADR.

================================================================================
FILE: product-content-bible/WORLD_BIBLE_TEMPLATE.md
================================================================================

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

================================================================================
FILE: product-content-bible/WORLD_ROUTINE_HOME.md
================================================================================

# World Bible — Routine Home

**World ID:** `routine_home` · **Child name (SV):** Morgonhuset · **Icon:** 🏠  
**Unlock tier:** Starter — every child receives this world after First Success  
**Inherits:** POS + PCB README (shared rules not repeated)

---

## Purpose

Routine Home is the **emotional mirror of the child's real morning** — not a fantasy escape from it. It exists so the child feels *capable in the same rooms where life actually happens*: hallway, kitchen nook, bedside, bathroom door. When Idag goes well, Morgonhuset glows warmer. This world anchors the product promise: **morgonen går smidigare**.

---

## Fantasy

*"This is my house on a good morning. The coat is on the hook because I got dressed. The breakfast table is set because I came down. My star jar sits on the shelf — not to count points, but to remember I did it. When I tap the front door, I can peek at the day waiting outside — but I don't have to rush. The house is proud of me, quietly."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Capable safety** | Quiet pride |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 4–9 | Strong mirror of daily routine |
| **Younger** | 3–5 | Fewer build zones; bigger tap targets on bed + door |
| **Older** | 10–12 | Subtle "morning mastery" trophies; less cute, still warm |

---

## Visual Language

- **Palette:** Warm oat white walls · honey oak · soft sky blue through windows · butter-yellow morning sun · star-gold accent on jar only
- **Materials:** Light Scandinavian wood, woven textile, matte ceramic, soft wool rug
- **Light:** Top-left morning sun; short soft shadows; kitchen window brightest
- **Scale:** Shallow dollhouse cutaway — three rooms visible in one diorama (hall, kitchen corner, bed nook)
- **Hero silhouettes:** Round coat hook · low breakfast table · arched front door
- **Never here:** Chrome appliances, harsh fluorescent, clutter chaos, dark oppressive corners, gamified HUD furniture

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Very soft home hush — distant birds, faint kettle warmth (optional toggle) |
| **Interaction** | Wood tap, fabric puff, ceramic clink — all ≤200ms |
| **NPC** | No speaking NPC — house "breathes" through sound only |
| **Silence** | Default acceptable — visual idle carries emotion |
| **Reduced motion** | Static warm light shift instead of animated steam |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 300ms | Crossfade + 2px parallax on window light |
| Place part | 180ms | Gentle snap + 1px settle bounce |
| Idle loop | 3s | Curtain breathe, jar shimmer at 1% opacity |
| Unlock reveal | 800ms | Doorway glow peel — skippable |
| Celebration link | ≤1500ms | Star trail from Idag may land on jar — skippable |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Husnisse** (optional ambient) | Tiny helpful presence — never seen fully | Peeks from behind coat rack; leaves footprint of dust motes in sunbeam | After 7-day gentle routine streak |
| *(none required)* | | | |

**Husnisse rules:** Never asks for tasks · never disappointed · disappears if child idle >30s · no voice

---

## Idle Behaviour

- **Always:** Sunbeam dust motes drift; clock hands move real-time (slow); kettle lid micro-wobble if kitchen zone built
- **Sometimes:** Cat silhouette passes window (if part #42 placed); mail slot flap twitches once per visit
- **After progress:** New completion adds one warm object glow for first visit only
- **Never:** Blinking "tap here"; countdown timers; sad house if routine missed

---

## Room Layout

```
[BACK: bedroom nook — bed, night lamp, star shelf]
[MID: hallway — coat hooks, shoes, mirror, front door]
[FRONT: kitchen corner — table, chairs, window, jar counter]
[ANCHOR: front door — primary emotional exit to "day outside" vignette]
```

375px: kitchen + door visible first; swipe or pan reveals bed nook (one direction only — no maze).

---

## Progression

| Phase | Trigger (behavior) | World change |
|-------|-------------------|--------------|
| **Arrival** | First activity completed ever | Hallway + empty hook + jar appear |
| **Early** | 5 completions | Kitchen table + chair set unlock |
| **Early+** | First reward redemption | Celebration plate on table (memory prop) |
| **Mid** | 25 lifetime stars | Bedroom nook + lamp + window seat |
| **Mid+** | 7 days with ≥1 completion | Husnisse ambient + shoe pair placement |
| **Late** | 100 lifetime stars | "Morning mastery" shelf with 3 rotating memory trophies |
| **Memory** | Parent-approved photo upload on activity | Polaroid-style frame on wall (one per month cap) |

---

## 75 Build Parts

**Categories:** Structure · Floor · Wall · Hall · Kitchen · Bedroom · Decor · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Oat white wall panel | Structure | Matte warm white, soft corner | Starter |
| 2 | Honey floorboard strip | Floor | Light oak plank, subtle grain | Starter |
| 3 | Round woven entry rug | Floor | Small circle, blue-grey weave | Starter |
| 4 | Front door (closed) | Structure | Red paint, round knob, friendly | Starter |
| 5 | Star jar (empty) | Interactive | Glass jar, wooden lid | Starter |
| 6 | Single coat hook | Hall | Wood peg, brass tip | Starter |
| 7 | Kid-height mirror | Hall | Oval, soft frame | Starter |
| 8 | Shoe pair (plain) | Hall | Sneakers, toe-out | Early |
| 9 | Umbrella stand | Hall | Slim ceramic | Early |
| 10 | Welcome mat | Hall | "Hej" woven, not branded | Early |
| 11 | Wall clock | Hall | Round, no numbers stress | Early |
| 12 | Mail slot flap | Hall | Brass flap, static | Mid |
| 13 | Key bowl | Hall | Wood dish | Mid |
| 14 | Backpack hook | Hall | Lower peg | Mid |
| 15 | Rain boots pair | Hall | Yellow, cheerful | Mid |
| 16 | Hall bench | Hall | Oak, soft cushion | Mid |
| 17 | Family photo frame (empty) | Decor | Waiting for memory | Mid |
| 18 | Small umbrella | Decor | Closed, striped | Late |
| 19 | Winter scarf on hook | Seasonal | Knit, draped | Late |
| 20 | Spring wreath on door | Seasonal | Soft florals | Late |
| 21 | Birthday banner (subtle) | Seasonal | Parent-triggered date | Secret |
| 22 | Kitchen corner wall | Structure | Same oat white | Early |
| 23 | Kitchen window | Wall | Blue sky view | Early |
| 24 | Window sill | Wall | Wide enough for plant | Early |
| 25 | Breakfast table (low) | Kitchen | Round, two seats max | Early |
| 26 | Chair A | Kitchen | Oak, blue pad | Early |
| 27 | Chair B | Kitchen | Oak, yellow pad | Early |
| 28 | Table bowl | Kitchen | Cereal-ready, empty | Early |
| 29 | Spoon rest | Kitchen | Tiny ceramic | Mid |
| 30 | Juice glass | Kitchen | Short, stable | Mid |
| 31 | Kettle (cold) | Kitchen | Matte, no steam yet | Mid |
| 32 | Toast rack | Kitchen | One slice slot | Mid |
| 33 | Fruit bowl | Kitchen | Apple + banana silhouette | Mid |
| 34 | Napkin holder | Kitchen | Cloth, not paper brand | Mid |
| 35 | Kitchen plant | Decor | Small pothos, calm green | Mid |
| 36 | Sunbeam decal zone | Decor | Light patch on floor | Mid |
| 37 | Celebration plate | Decor | Appears after first redemption | Mid+ |
| 38 | Recipe card stand | Decor | Blank card for pretend | Late |
| 39 | Saturday pancake stack | Seasonal | Whimsical, rare Saturday | Secret |
| 40 | Bed nook platform | Bedroom | Raised 8px diorama | Mid |
| 41 | Child bed (made) | Bedroom | Quilt, pillow dent | Mid |
| 42 | Night lamp | Bedroom | Warm glow cone | Mid |
| 43 | Bedside book | Bedroom | Spine unreadable, friendly | Mid |
| 44 | Stuffed friend | Bedroom | Generic bear, soft | Mid |
| 45 | Window seat cushion | Bedroom | Lavender fabric | Mid+ |
| 46 | Star shelf | Bedroom | Holds jar alternate display | Mid+ |
| 47 | Morning checklist board | Interactive | Icons only, no text wall | Late |
| 48 | Closet door (closed) | Bedroom | Slides visually | Late |
| 49 | Pajama pile (neat) | Decor | Folded, not messy | Late |
| 50 | Dream cloud mobile | Decor | Slow rotate idle | Late |
| 51 | Toothbrush mug (hall bath door) | Decor | Hint at hygiene win | Late |
| 52 | Bathroom door (closed) | Structure | Never opens to full room | Late |
| 53 | Towel hook | Decor | Fluffy, one | Late |
| 54 | Rubber duck peek | Secret | Visible only if hygiene streak | Secret |
| 55 | Gold star sticker on chart | Decor | One at a time | Mid |
| 56 | Parent note peg | Interactive | Blank note, parent writes offline | Late |
| 57 | Calendar leaf tear | Interactive | Month changes quietly | Late |
| 58 | Coat (child) | Hall | Hangs on hook #6 | Early |
| 59 | Coat (seasonal thick) | Seasonal | Autumn | Late |
| 60 | Lunch box on bench | Kitchen | Closed, sticker dots | Mid |
| 61 | Water bottle | Kitchen | Reusable, pastel | Mid |
| 62 | Morning mastery trophy | Decor | Wooden star on shelf | Late |
| 63 | Memory polaroid slot | Interactive | One frame | Memory |
| 64 | Door open variant | Interactive | Peeks to garden vignette | Late |
| 65 | Garden vignette patch | Decor | Green blur beyond door | Late |
| 66 | Bicycle bell sound prop | Interactive | Visual only, ding on tap | Secret |
| 67 | Husnisse footprint | Secret | Dust sparkle trail | Secret |
| 68 | Extra star jar (small) | Decor | For sibling fiction — not comparison | Late |
| 69 | Sibling hook (second peg) | Hall | Same height, no labels | Late |
| 70 | Quiet corner rug | Bedroom | For "breath" idle animation | Late |
| 71 | Sock pair (matched) | Decor | Reward for "getting dressed" arc | Mid |
| 72 | Hairbrush on shelf | Decor | Round, gentle | Mid |
| 73 | Morning sun lens flare | Decor | Static art, toggle | Mid |
| 74 | "Done" check tile | Interactive | Lights when day milestone | Mid |
| 75 | House sigil plaque | Secret | "Morgonhuset" carved — find by long-press door | Secret |

---

## Unlock Moments

| Moment | Behavior trigger | What child sees | Copy (SV) |
|--------|------------------|-----------------|-----------|
| First hall | 1st completion | Coat hook + jar fade in | *"Ditt hus växer när du gör klart."* |
| Kitchen awakens | 5 completions | Table + window light bloom | *"Frukostbordet väntar."* |
| Bed nook | 25 lifetime stars | Bedroom slides into view | *"En plats att vila efter en bra morgon."* |
| Husnisse | 7-day gentle presence | Dust trail near rack | *(no text — wonder only)* |
| Door to day | 50 lifetime stars | Door opens to garden peek | *"Du är redo för dagen."* |

---

## Daily Interactions

1. Tap star jar — hear/see gentle clink; stars from today visible as soft glow (not number wall)
2. Place or swap one decor item (if unlocked) — single drag, snap grid
3. Open/close front door — peek outside vignette; no travel minigame
4. Tap bed — stuffed friend wiggles once; night lamp toggles warm/cool

**Cap:** 3 meaningful taps + decor = ~4 minutes max delight

---

## Long-Term Interactions

- Complete memory polaroid set (12 months) — wall becomes gentle family timeline
- Rotate morning mastery trophies by season (spring run, autumn run)
- Husnisse trail leads to one new secret decor per quarter (non-random, calendar-based)

---

## Rare Discoveries

| Discovery | Approx. effort | Fiction |
|-----------|----------------|---------|
| Saturday pancake stack | 4+ Saturday completions | Kitchen celebrates weekend rhythm |
| Rubber duck peek | Hygiene activity streak | Bathroom door giggles once |
| House sigil plaque | 30 visits over 60 days | Long-press door — carved name |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Bicycle bell | Mail slot twitches twice | Tap mat — visual bell ripple |
| Husnisse full peek | Follow dust trail 3 visits | Tiny hat on hook for one day |
| Birthday banner | Parent sets birthday in profile | Door wreath + plate — one day |

---

## Reward Philosophy

Stars **fill the jar** as metaphor — not a shop currency here. Redemptions celebrated via **celebration plate** memory, not bigger numbers. Morgonhuset never sells parts for stars; unlocks follow **real completions** (W-01).

---

## Parent Value

Mirrors real morning wins — parent can point to app house and real house: *"Same coat hook, same pride."* Reduces nagging by externalizing progress visually. Photo memory frames honor co-parent visibility.

---

## Educational Value

Incidental sequencing (coat before door), time reading on analog clock, hygiene hints without lesson tone. No literacy required for core loop.

---

## Accessibility Considerations

- All interactive ≥56px child target in primary zones
- Door/jar/bed work without audio
- Reduced motion: no dust motes; static sun; instant unlocks
- High contrast mode: stronger hook/door outline per AD-08
- No time pressure; missed days do not decay house

---

## Future Expansion Ideas

- Seasonal window views (snow, midsummer) — cosmetic
- Co-parent "note peg" sync from parent app — one note max
- Link to real routine activity: placing sock pair when "get dressed" completed that day

---

## Sign-off

Unique identity: **morning capability mirror** · Distinct from all other worlds · 75/75 parts · v1.0

================================================================================
FILE: product-content-bible/WORLD_GARAGE.md
================================================================================

# World Bible — Garage

**World ID:** `garage` · **Child name (SV):** Verkstaden · **Icon:** 🔧  
**Unlock tier:** Mid — unlocks after sustained routine (≈15 lifetime stars band; tunable)  
**Inherits:** POS + PCB README

---

## Purpose

Verkstaden celebrates **finishing what you start** — the maker fantasy for children who love vehicles, tools, and visible progress. It converts abstract "done" into **something built**: a scooter gets grips, a go-kart gets wheels, a shelf gets painted. Real life link: *when I complete tasks, projects advance.*

---

## Fantasy

*"This is my workshop. Projects don't finish because I tap fast — they finish because I showed up on my mornings. The go-kart on the lift gains one honest part at a time. Uncle wrench (the tool wall) doesn't talk much, but the right tool lights up when I need it. When the kart rolls out the door, the whole garage cheers once — then goes quiet again, ready for the next thing."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Competence pride** | Satisfying completion |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 5–10 | Vehicle + build fantasy peak |
| **Younger** | 4–5 | Scooter project only; fewer tools |
| **Older** | 10–12 | Go-kart + blueprint wall depth |

---

## Visual Language

- **Palette:** Concrete grey floor · pegboard tan · safety orange accent (one per screen) · teal tool handles · warm work-lamp yellow
- **Materials:** Brushed wood bench, metal with warm brass not chrome, rubber tires, chalk marks
- **Light:** Overhead work lamp + open garage door daylight strip
- **Scale:** Wide shallow garage — door back, bench mid, lift front-left
- **Hero silhouettes:** Go-kart on lift · pegboard · rolling door
- **Never here:** Real brand logos, weapon tools, oil stains grimy, racing aggression UI

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Low garage hum, distant bird through door crack |
| **Interaction** | Wrench click, ratchet one-turn, rubber tire thump |
| **NPC** | Compressor "pff" once when project stage completes — optional |
| **Silence** | Tools still glint idle |
| **Reduced motion** | Stage completion = light flash only |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 300ms | Roll-up door rises 40% |
| Place part | 220ms | Bolt tighten 90° + snap |
| Idle loop | 4s | Kart suspension bounce; lamp flicker rare |
| Unlock reveal | 1000ms | Project part slides on rail — skippable |
| Celebration link | ≤2000ms | Confetti = spark particles (not stars rain) |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Onkel Tång** | Tool spirit on pegboard | Wrong tools grey; right tool warm-glow when project stage ready | Mid progression |
| **Kompis-katt** | Bench cat | Sleeps on rag; ear twitch on tap | After 10 visits |

No dialogue — only visual guidance.

---

## Idle Behaviour

- **Always:** Work lamp sway micro; kart wheel slow spin if stage complete
- **Sometimes:** Cat stretches; door rattles in wind once
- **After progress:** New bolt appears on lift each behavior milestone
- **Never:** Racing countdown; "fix now or lose" timers

---

## Room Layout

```
[BACK: pegboard + tool silhouettes + parts bins]
[MID: workbench + vise + blueprint clip]
[FRONT: go-kart/scooter lift + roll-up door to driveway vignette]
[RIGHT: paint corner + tire stack]
```

Primary anchor: **lift project** (one active build arc at a time).

---

## Progression

| Phase | Trigger | World change |
|-------|---------|--------------|
| Arrival | Garage unlock moment | Empty bench + scooter frame |
| Early | 3 completions post-unlock | Wheels + grips stage |
| Mid | 20 lifetime stars | Go-kart frame replaces scooter |
| Mid+ | First week with 5+ completions | Paint booth corner |
| Late | 75 lifetime stars | Drive-out ceremony (kart rolls to door) |
| Reset arc | New project chosen (cosmetic) | Scooter → wagon → kart variants |

---

## 75 Build Parts

**Categories:** Structure · Floor · Tools · Bench · Lift · Projects · Decor · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Concrete floor slab | Floor | Speckled warm grey | Starter |
| 2 | Roll-up door (down) | Structure | Ribbed metal, warm | Starter |
| 3 | Work lamp | Decor | Swing arm, yellow cone | Starter |
| 4 | Pegboard panel | Structure | Tan, empty hooks | Starter |
| 5 | Hook set (5) | Tools | Empty | Starter |
| 6 | Wrench (small) | Tools | Teal handle | Early |
| 7 | Screwdriver | Tools | Orange handle | Early |
| 8 | Hammer | Tools | Short, safe cartoon | Early |
| 9 | Pliers | Tools | Rounded jaws | Early |
| 10 | Tape measure | Tools | Yellow retract | Mid |
| 11 | Level bubble | Tools | Green capsule | Mid |
| 12 | Allen key set | Tools | L-shape silhouette | Mid |
| 13 | Paint brush | Tools | Bristle fan | Mid |
| 14 | Roller tray | Tools | Mini paint | Mid |
| 15 | Safety goggles | Decor | Hang on peg | Mid |
| 16 | Ear muffs (toy) | Decor | Never required | Late |
| 17 | Work gloves pair | Decor | Draped | Mid |
| 18 | Oil can (sealed) | Decor | Prop only | Late |
| 19 | Parts bin red | Bench | Empty | Early |
| 20 | Parts bin blue | Bench | Labels icons only | Early |
| 21 | Bench vise | Bench | Cartoon clamp | Mid |
| 22 | Bench top scar | Bench | Honest use marks | Mid |
| 23 | Blueprint clip | Bench | Blank scroll | Mid |
| 24 | Pencil stub | Bench | For blueprint doodle | Mid |
| 25 | Rag pile | Bench | For cat | Mid |
| 26 | Scooter frame | Projects | Matte, no brand | Starter |
| 27 | Scooter front wheel | Projects | Rubber | Early |
| 28 | Scooter back wheel | Projects | Matching | Early |
| 29 | Scooter grips | Projects | Teal rubber | Early |
| 30 | Scooter bell | Projects | Round | Mid |
| 31 | Scooter basket | Projects | Front wire | Mid |
| 32 | Scooter sticker dots | Projects | Child-placed 3 max | Mid |
| 33 | Go-kart frame | Projects | Low, wide | Mid |
| 34 | Go-kart seat | Projects | Bucket red | Mid |
| 35 | Go-kart steering wheel | Projects | 3-spoke | Mid+ |
| 36 | Go-kart front wheels pair | Projects | Small racing | Mid+ |
| 37 | Go-kart rear wheels pair | Projects | Wide | Mid+ |
| 38 | Go-kart engine cover | Projects | Fake, friendly | Late |
| 39 | Go-kart spoiler (toy) | Projects | Small wing | Late |
| 40 | Go-kart number plate | Projects | "Du" not digits | Late |
| 41 | Wagon frame | Projects | Alternate arc | Late |
| 42 | Wagon sides | Projects | Wood slats | Late |
| 43 | Wagon handle | Projects | Long pull | Late |
| 44 | Tire stack (3) | Decor | Different sizes | Mid |
| 45 | Traffic cone (toy) | Decor | Orange, one | Mid |
| 46 | Chalk hopscotch on floor | Decor | Fades weekly | Secret |
| 47 | Driveway vignette | Structure | Beyond door | Mid+ |
| 48 | Paint booth curtain | Structure | Striped | Mid+ |
| 49 | Paint spray can (cap on) | Tools | Color pick cosmetic | Late |
| 50 | Color swatch cards | Decor | 4 muted choices | Late |
| 51 | Trophy shelf | Decor | One slot | Late |
| 52 | Finished project ribbon | Decor | After drive-out | Late |
| 53 | Calendar project chart | Interactive | Icons per stage | Mid |
| 54 | Bolt jar | Decor | Glass, rattles on shake | Mid |
| 55 | Magnet tray | Bench | Holds loose bolts art | Mid |
| 56 | Fan (off) | Decor | Blade static | Late |
| 57 | Extension cord coil | Decor | Safety cap | Late |
| 58 | First-aid tin (toy) | Decor | Star on lid | Late |
| 59 | Radio box | Interactive | Tap = one chord | Secret |
| 60 | Snow tire pair | Seasonal | Tread deep | Seasonal |
| 61 | Summer bike hook | Seasonal | Wall mount | Seasonal |
| 62 | Birthday balloon tied | Seasonal | Door | Secret |
| 63 | Cat bed on bench | Decor | Unlocks with cat | Mid+ |
| 64 | Cat food bowl | Decor | Never empty guilt | Late |
| 65 | Helmet (toy) | Projects | Hang on kart | Mid+ |
| 66 | Knee pads pair | Projects | Color dots | Late |
| 67 | Project name chalkboard | Interactive | Parent types offline | Late |
| 68 | Honest dent sticker | Decor | "Fixed!" narrative | Secret |
| 69 | Spare bulb box | Decor | For lamp story | Late |
| 70 | Garage sign | Decor | "Verkstaden" wood | Mid |
| 71 | Window to yard | Wall | Green blur | Mid |
| 72 | Spider web corner | Secret | Single, gentle | Secret |
| 73 | Golden bolt | Secret | One hidden in bin | Secret |
| 74 | Confetti exhaust pipe | Secret | Kart celebration | Late |
| 75 | Next project blueprint | Secret | Faded future kart | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| Garage opens | Star band + 3-day presence | Door rises | *"Ditt projekt väntar."* |
| Scooter rolls | Stage 4 complete | Wheels spin once | *"Du byggde klart!"* |
| Go-kart frame | 20 stars | Scooter fades respectful | *"Nästa utmaning."* |
| Drive-out | Full kart + 75 stars | Door open, kart exits | *"Ut och kör — på riktigt imorgon också."* |

---

## Daily Interactions

1. Tap current project stage — bolt tightens if behavior milestone met
2. Swap tool on pegboard (cosmetic sort) — no score
3. Pet cat once — purr visual only
4. View blueprint — shows next real-world-linked stage icon

---

## Long-Term Interactions

- Three project arcs per year (scooter → wagon → kart)
- Trophy shelf holds finished project badges
- Blueprint wall accumulates faint ghost outlines of past builds

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Golden bolt | 20 taps on bin over visits | Unlocks sparkle wrench skin |
| Chalk hopscotch | Friday completion | Floor art appears |
| Radio chord | Tap radio 7 visits | Hidden jingle 2s |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Spider web | Lamp flickers twice | Corner web + cat chases |
| Honest dent | Kart stage 3 | Sticker narrative "fixed together" |
| Next blueprint | Drive-out done | Faded future project tease |

---

## Reward Philosophy

Progress tied to **project stages**, not star shopping. Stars may accelerate **one** stage per week max (anti-grind cap in product ops). Completion ceremonies skippable.

---

## Parent Value

Teaches task persistence metaphor parents use naturally: *"Let's finish what we started."* Links to real chores (clean room = paint booth unlock fiction optional in copy).

---

## Educational Value

Tool recognition, sequence planning, left-right wheel pairing, safety gear normalization — playful not OSHA lecture.

---

## Accessibility Considerations

- Project stages communicated with icon + progress bar + haptic
- Color-blind: tool glow uses shape not color alone
- No audio required for stage advance
- Reduced motion: instant stage snap

---

## Future Expansion Ideas

- Parent-upload photo of real bike/scooter as blueprint background
- Sister project: dollhouse furniture repair cross-promo (fiction link only)

---

## Sign-off

Unique identity: **maker completion** · 75/75 · v1.0

================================================================================
FILE: product-content-bible/WORLD_PET_HOME.md
================================================================================

# World Bible — Pet Home

**World ID:** `pet_home` · **Child name (SV):** Husdjurshemmet · **Icon:** 🐾  
**Unlock tier:** Mid-late — sustained engagement (W-02: not day one; ≈30 lifetime stars band)  
**Inherits:** POS + PCB README

---

## Purpose

Husdjurshemmet gives the child a **companion who grows when life goes well** — not a Tamagotchi guilt trip. Care is **reflective**, not demanding: the pet is happy when routines happen, never sad when they don't. Emotion: *someone soft waits for me after I tried.*

---

## Fantasy

*"My friend lives in the cozy pet house. They weren't there the first day — I had to show I could take care of mornings first. Now they stretch when I come in. I can brush their fur, fill the water bowl, and sit on the rug together. They don't ask me to stay forever — just to say hej. When I've had a good week, they bring me a leaf or a toy. They never cry if I'm away."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Gentle belonging** | Soft responsibility |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 4–9 | Companion peak |
| **Younger** | 3–5 | One pet species; tap-only care |
| **Older** | 10–12 | Pet diary memories; less cute UI, same warmth |

---

## Visual Language

- **Palette:** Cream plaster · sage green trim · peach bedding · warm brown fur tones · sky through round window
- **Materials:** Wool rug, clay water bowl, woven basket bed, soft clay tile
- **Light:** Afternoon soft — never harsh noon
- **Scale:** Single-room cottage interior + small garden patch visible through door
- **Hero silhouettes:** Round pet bed · arched pet door · water bowl
- **Never here:** Hunger meters, sick faces, skull eyes, dirty neglect states, breeding, combat

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Soft purr layer optional (toggle) |
| **Interaction** | Brush swish, water pour, paw tap |
| **NPC** | Pet: 3 sounds — greeting chirp, content sigh, sleep yawn |
| **Silence** | Pet idle anim sufficient |
| **Reduced motion** | Pet breathing scale only |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 350ms | Pet lifts head if present; else empty bed breathe |
| Care action | 400ms | Brush strokes ×3 auto-complete |
| Idle loop | 5s | Sleep breathe; tail thump rare |
| Unlock reveal | 900ms | Pet enters from garden door — skippable |
| Celebration link | ≤1200ms | Pet brings star-shaped leaf after day milestone |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Primary pet** | Companion (species chosen at unlock) | Sleep → greet → play → sleep; never blocks exit | Always when unlocked |
| **Garden butterfly** | Ambient | Crosses window | Spring seasonal |

**Pet state machine (fiction only):**

| State | Trigger | Visual |
|-------|---------|--------|
| Resting | Default | Curled, slow breathe |
| Greeting | Child enters after 4h+ | Head up, one hop |
| Playful | After completion today | Toy in mouth |
| Memory | Weekly streak gentle | Brings gift prop once |

**Never:** Sick · hungry · dirty · crying · "feed now" popup

---

## Idle Behaviour

- **Always:** Bed fabric ripple; sun patch moves imperceptibly
- **Sometimes:** Pet dream bubble (icon of yesterday activity)
- **After progress:** Gift leaf on rug once per good week
- **Never:** Decay for absence; guilt animations

---

## Room Layout

```
[BACK: round window + sky + plant sill]
[MID: pet bed + rug + toy basket]
[FRONT: water/food corner + brush hook + garden door]
[GARDEN PATCH: visible 20% — butterfly, leaf pile]
```

---

## Progression

| Phase | Trigger | Change |
|-------|---------|--------|
| Empty home | Before unlock | Bed + bowl only — anticipation |
| Pet arrives | 30 stars + 5-day gentle presence | Choose dog/cat/rabbit (cosmetic) |
| Bond 1 | 10 completions post-pet | Brush + toy basket |
| Bond 2 | 50 stars | Garden door + outdoor patch |
| Bond 3 | 90 stars | Memory wall (polaroid pets) |
| Seasonal | Calendar | Coat or flower collar cosmetic |

---

## 75 Build Parts

**Categories:** Structure · Floor · Pet · Care · Toys · Garden · Decor · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Cream wall arc | Structure | Soft plaster | Starter |
| 2 | Terra cotta floor tile | Floor | Warm square | Starter |
| 3 | Round window | Structure | Blue sky | Starter |
| 4 | Window sill | Decor | Wide | Starter |
| 5 | Pet bed (empty) | Pet | Fluffy donut | Starter |
| 6 | Small rug | Floor | Woven circle | Starter |
| 7 | Water bowl | Care | Clay, full | Early |
| 8 | Food bowl | Care | Matching set | Early |
| 9 | Food scoop | Care | Wall hook | Early |
| 10 | Brush | Care | Soft bristle | Early |
| 11 | Towel hook | Care | For paw fiction | Mid |
| 12 | Treat jar (closed) | Care | Parent-controlled | Mid |
| 13 | Leash hook | Decor | Not mandatory walk | Mid |
| 14 | Collar (plain) | Pet | Buckle | Mid |
| 15 | Collar (star charm) | Pet | Gentle gold | Mid+ |
| 16 | Pet door (small) | Structure | To garden | Mid |
| 17 | Dog companion | Pet | Floppy ears | Unlock |
| 18 | Cat companion | Pet | Round face | Unlock |
| 19 | Rabbit companion | Pet | Long ears | Unlock |
| 20 | Toy bone | Toys | Soft | Early |
| 21 | Yarn ball | Toys | Cat bias | Early |
| 22 | Carrot chew | Toys | Rabbit bias | Early |
| 23 | Squeak toy | Toys | One squeak/tap | Mid |
| 24 | Rope tug | Toys | Two-knot | Mid |
| 25 | Puzzle feeder (static) | Toys | No food required | Mid |
| 26 | Ball trio | Toys | Scatter on rug | Mid |
| 27 | Basket storage | Toys | Holds 3 toys | Mid |
| 28 | Pet portrait frame | Decor | Empty until memory | Mid+ |
| 29 | Name tag plaque | Interactive | First name only | Mid |
| 30 | Paw print mat | Decor | Entry | Mid |
| 31 | Plant pot (safe) | Decor | Non-toxic look | Mid |
| 32 | Butterfly sticker window | Decor | Seasonal | Seasonal |
| 33 | Garden grass patch | Garden | 3 blades style | Mid+ |
| 34 | Garden fence low | Garden | White picket | Mid+ |
| 35 | Leaf pile | Garden | Jump fiction | Late |
| 36 | Bird bath (tiny) | Garden | No birds required | Late |
| 37 | Flower pot red | Garden | One bloom | Late |
| 38 | Flower pot yellow | Garden | Alternate | Late |
| 39 | Stepping stone path | Garden | 3 stones | Late |
| 40 | Cozy lamp | Decor | Floor, warm | Mid |
| 41 | Book "pet stories" | Decor | Spine cute | Late |
| 42 | Blanket fold | Pet | On bed | Early |
| 43 | Season scarf pet | Seasonal | Winter | Seasonal |
| 44 | Sun hat pet | Seasonal | Summer | Seasonal |
| 45 | Rain boot pair (toy) | Toys | Mini | Seasonal |
| 46 | Birthday hat | Seasonal | One day | Secret |
| 47 | Memory polaroid 1 | Interactive | Week 1 bond | Memory |
| 48 | Memory polaroid 2 | Interactive | Week 4 | Memory |
| 49 | Memory polaroid 3 | Interactive | Week 12 | Memory |
| 50 | Gift leaf prop | Interactive | Weekly good | Mid+ |
| 51 | Gift stick prop | Interactive | Dog | Mid+ |
| 52 | Gift yarn prop | Interactive | Cat | Mid+ |
| 53 | Dream bubble holder | Decor | Above bed | Late |
| 54 | Star sticker chart (pet) | Decor | Not child compare | Late |
| 55 | sibling pet bed (small) | Secret | Two-pet fiction | Late |
| 56 | Fish bowl (decorative) | Decor | No care loop | Late |
| 57 | Cage cover (open) | Decor | Small pet fiction | Late |
| 58 | Hamster wheel (static) | Decor | No spin requirement | Late |
| 59 | Vet bag (toy) | Decor | Positive visit | Late |
| 60 | First aid pet pack | Decor | Bandage sticker | Late |
| 61 | Agility hoop (mini) | Garden | Play fiction | Late |
| 62 | Tunnel toy | Toys | Fabric | Late |
| 63 | Pet diary book | Interactive | Parent reads offline | Late |
| 64 | Paw print stamp | Interactive | One stamp/day | Mid |
| 65 | Feather toy | Toys | Cat | Mid |
| 66 | Dig box corner | Garden | Sand pit | Late |
| 67 | Umbrella stand (pet walk) | Decor | Optional | Late |
| 68 | Co-parent treat note | Interactive | From parent | Late |
| 69 | Night light moon | Decor | Sleep | Mid |
| 70 | Constellation window | Secret | Night toggle | Secret |
| 71 | Firefly jar | Secret | Summer eve | Secret |
| 72 | Pet graduation ribbon | Decor | 100 stars | Late |
| 73 | Welcome mat "Hej vän" | Decor | Entry | Early |
| 74 | House sign | Decor | "Husdjurshemmet" | Mid |
| 75 | Hidden photo under bed | Secret | Long-press bed | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| Empty home visible | Approaching unlock | Bed breathes | *"Någon kanske flyttar in snart…"* |
| Pet arrives | 30 stars + presence | Pet from garden | *"Hej! Jag heter [namn]."* (name child picks) |
| Garden opens | 50 stars | Door + grass | *"Vi kan leka ute också."* |
| Memory wall | 90 stars | Polaroid rail | *"Vi minns bra veckor."* |

---

## Daily Interactions

1. Greet pet — one animation cycle
2. Brush OR refill water — single care action (alternate days fiction)
3. Throw toy — pet returns once
4. Sit on rug — 3s cuddle idle, skippable

---

## Long-Term Interactions

- Memory polaroid timeline (12 weeks)
- Seasonal collar collection (4/year)
- Pet graduation at 100 stars — ribbon, no stat screen

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Firefly jar | 5 evening visits | Summer magic |
| Constellation window | Toggle night 7 times | Sky names as shapes not text |
| Hidden photo | 30-day bond | Baby pet picture under bed |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Second small bed | Sibling profile exists | Fiction co-pet nap |
| Birthday hat | Profile birthday | Party animation once |
| Butterfly lands | Spring + window open | Pet chases gently |

---

## Reward Philosophy

Pet **never sold for stars**. Cosmetics from behavior milestones only. Treat jar parent-controlled offline — app does not dispense virtual food as currency.

---

## Parent Value

Models gentle care without adding parent nagging — pet happy reflects child's week, not hour-by-hour duty. Supports independence: child visits pet **after** routine, not instead.

---

## Educational Value

Empathy, gentle motor care sequences, naming responsibility, rhythm of daily hello — zero guilt mechanics.

---

## Accessibility Considerations

- Pet emotions readable via posture not only sound
- Care actions single-tap option (no brush drag required)
- No time-critical feeding
- Reduced motion: pet state icon badge

---

## Future Expansion Ideas

- Real pet photo in portrait frame
- Gentle ASL-inspired pet hand signals animation (inclusion)

---

## Sign-off

Unique identity: **reflective companion** · No guilt Tamagotchi · 75/75 · v1.0

================================================================================
FILE: product-content-bible/WORLD_DINOSAUR.md
================================================================================

# World Bible — Dinosaur

**World ID:** `dinosaur` · **Child name (SV):** Dinosaurielunden · **Icon:** 🦕  
**Unlock tier:** Mid — parent or child theme pick at ≈20 stars OR onboarding preference  
**Inherits:** POS + PCB README

---

## Purpose

Dinosaurielunden channels **awe and discovery** — the child as young paleontologist in a safe jungle clearing, not a combat arena. Fossils, eggs, and footprints appear because **real effort uncovered them**. Wonder without fear.

---

## Fantasy

*"Behind the ferns is my dig site. I don't fight dinosaurs — I find them. Each time I do something hard in real life, the brush uncovers more bone. The big skeleton isn't complete on day one — that's good. It means there's always something to look forward to. Sometimes an egg wiggles. Sometimes a footprint matches my shoe. The T-rex skull is scary-funny, not scary-scary."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Awe** | Curious discovery |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 4–8 | Dino peak interest |
| **Younger** | 3–5 | Eggs + friendly silhouettes only |
| **Older** | 9–11 | Museum plaque depth, species names optional SV |

---

## Visual Language

- **Palette:** Fern green · sandstone tan · sky teal · bone ivory · lava orange accent (volcano corner only)
- **Materials:** Paper-mache dig aesthetic, matte bone, soft clay mud, felt ferns
- **Light:** Dappled jungle sun — top-left patches
- **Scale:** Clearing diorama: dig pit center, museum shelf back, volcano far left small
- **Hero silhouettes:** Neck of long-neck peeking · dig brush · egg cluster
- **Never here:** Blood, roaring teeth close-up, combat UI, realistic gore, chase sequences

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Jungle insects soft, distant friendly rumble (sub-bass, not scary) |
| **Interaction** | Brush scrape, bone click-fit, egg wobble wood tap |
| **NPC** | Long-neck hum (1 note); pterosaur chirp fly-by rare |
| **Silence** | Visual dig progress clear |
| **Reduced motion** | Bone appears fade-in |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 350ms | Fern part + light ray |
| Uncover bone | 500ms | Brush 3 strokes auto | 
| Idle loop | 6s | Egg wiggle 1px; leaf sway |
| Skeleton complete | 1200ms | Museum light ping — skippable |
| Celebration link | ≤1500ms | Footprint stamp appears |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Lång-Hals** | Gentle giant | Neck enters frame, blinks, leaves | After 3 fossils |
| **Pip (pterosaur)** | Fly-by | Crosses sky once per visit max | Mid |
| **Egg cluster** | Non-sentient | Wiggle on milestone | Early |

No aggression; no chase child.

---

## Idle Behaviour

- **Always:** Ferns sway offset; dig pit has one glint speck
- **Sometimes:** Pip flies; distant stomp dust (friendly)
- **After progress:** New bone segment visible in pit
- **Never:** Dino attacks; night scare mode

---

## Room Layout

```
[BACK: museum shelf + plaque slots + completed skull display]
[MID: dig pit grid + brush station + sifter tray]
[LEFT: volcano mini (decorative, no eruption gameplay)]
[RIGHT: fern arch entry + footprint path]
```

---

## Progression

| Phase | Trigger | Change |
|-------|---------|--------|
| Clearing | Unlock | Empty pit + brush |
| Early | 5 completions | First bone + egg |
| Mid | 15 fossils equiv stars | Long-neck visit idle |
| Late | Full skeleton | Museum spotlight |
| Ultra | 100 stars | Second species shadow (hint DLC fiction) |

---

## 75 Build Parts

**Categories:** Terrain · Dig · Fossils · Museum · Flora · NPC · Decor · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Sand pit base | Dig | Raked tan | Starter |
| 2 | Grid lines subtle | Dig | 3×3 | Starter |
| 3 | Brush tool prop | Dig | Wooden handle | Starter |
| 4 | Sifter tray | Dig | Mesh | Early |
| 5 | Magnifying glass | Dig | Handle | Early |
| 6 | Bucket | Dig | Rope handle | Early |
| 7 | Bone piece A (tail) | Fossils | Ivory | Early |
| 8 | Bone piece B (leg) | Fossils | | Early |
| 9 | Bone piece C (rib) | Fossils | | Mid |
| 10 | Bone piece D (spine) | Fossils | | Mid |
| 11 | Bone piece E (arm) | Fossils | | Mid |
| 12 | Bone piece F (skull friendly) | Fossils | Smiling | Mid+ |
| 13 | Bone piece G (neck) | Fossils | Long | Mid+ |
| 14 | Bone piece H (foot) | Fossils | Three toe | Mid+ |
| 15 | Egg fossil 1 | Fossils | Crack line | Early |
| 16 | Egg fossil 2 | Fossils | Intact | Mid |
| 17 | Egg fossil 3 | Fossils | Hatched art | Late |
| 18 | Footprint cast | Fossils | Child match size | Mid |
| 19 | Amber chip | Fossils | Insect silhouette | Late |
| 20 | Coprolite (funny) | Fossils | Label "bajssten" gentle | Secret |
| 21 | Fern cluster A | Flora | Left | Starter |
| 22 | Fern cluster B | Flora | Right | Early |
| 23 | Palm small | Flora | Back | Mid |
| 24 | Vine hang | Flora | Museum edge | Mid |
| 25 | Rock border | Terrain | Warm grey | Early |
| 26 | Mud patch | Terrain | Darker tan | Mid |
| 27 | Volcano mini | Terrain | No lava flow | Mid |
| 28 | Smoke puff (static) | Terrain | Volcano | Late |
| 29 | Museum shelf | Museum | Wood | Mid |
| 30 | Plaque blank | Museum | Waiting | Mid |
| 31 | Plaque name slot | Museum | Optional SV species | Late |
| 32 | Spotlight | Museum | On skeleton | Late |
| 33 | Rope barrier | Museum | Velvet | Late |
| 34 | Visitor sign "Titta!" | Decor | Icons | Mid |
| 35 | Long-neck neck prop | NPC | Peeks over fern | Mid+ |
| 36 | Long-neck eye | NPC | Kind | Mid+ |
| 37 | Pip nest | NPC | Cliff art | Late |
| 38 | Pterosaur wing fossil | Fossils | Wall mount | Late |
| 39 | Stego plate piece | Fossils | Alternate set | Late |
| 40 | Trike horn piece | Fossils | Alternate | Late |
| 41 | Raptor claw (cartoon) | Fossils | Not scary | Late |
| 42 | Skeleton stand | Museum | Metal warm | Late |
| 43 | Dig hat | Decor | Hang peg | Early |
| 44 | Field journal | Interactive | Blank pages | Mid |
| 45 | Map wall | Decor | Contour lines | Late |
| 46 | Compass prop | Dig | Brass | Mid |
| 47 | Chalk outline tool | Dig | White mark | Mid |
| 48 | Water spray bottle | Dig | Clean bone fiction | Late |
| 49 | Sun shade tarp | Decor | Striped | Seasonal |
| 50 | Rain puddle decal | Seasonal | Autumn | Seasonal |
| 51 | Snow on volcano | Seasonal | Winter | Seasonal |
| 52 | Firefly night fern | Seasonal | Summer eve | Secret |
| 53 | Footprint path outdoor | Terrain | 5 steps | Mid |
| 54 | Child shoe compare | Interactive | Match game once | Mid |
| 55 | Star dust on bone | Interactive | After completion | Mid |
| 56 | Brush wear mark | Decor | Honest use | Late |
| 57 | Team banner | Decor | "Lag [barn]" | Late |
| 58 | Co-digger plush | Decor | Sibling fiction | Late |
| 59 | Tape measure bone | Dig | Size compare | Late |
| 60 | Crate shipping | Decor | "Till museet" | Late |
| 61 | Second pit corner | Dig | Expansion | Late |
| 62 | Microraptor tiny | Fossils | Hidden size | Secret |
| 63 | Crystal geode | Fossils | Sparkle | Secret |
| 64 | Time capsule egg | Secret | Buried corner | Secret |
| 65 | Dino footprint rug | Decor | Entry | Early |
| 66 | Sign lund | Decor | "Dinosaurielunden" | Mid |
| 67 | Herbivore sign icon | Decor | Leaf | Mid |
| 68 | Carnivore sign icon | Decor | Friendly teeth | Mid |
| 69 | Museum clock | Decor | Slow tick | Late |
| 70 | Gift shop shelf (empty) | Decor | No commerce | Late |
| 71 | Postcard rack | Decor | Blank | Late |
| 72 | Photo op frame | Interactive | Child avatar | Late |
| 73 | Graduation bone ribbon | Decor | 100 stars | Late |
| 74 | Shadow T-rex wall | Secret | Night toggle only | Secret |
| 75 | Next species silhouette | Secret | Faded triceratops | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| First bone | 3 completions post-unlock | Brush animation | *"Du hittade något!"* |
| Egg wiggle | 10 stars in world | Egg moves | *"Något växer…"* |
| Skeleton complete | All pieces | Museum light | *"En hel varelse — du grävde fram den."* |
| Long-neck hello | 5 fossils | Neck enters | *(soft hum only)* |

---

## Daily Interactions

1. Brush dig pit once — progress if milestone met
2. Match footprint to shoe — one tap puzzle weekly
3. Tap egg — wiggle feedback
4. View museum — rotate skeleton 15° (cosmetic)

---

## Long-Term Interactions

- Complete 2 skeleton sets per year (different species)
- Field journal fills stamp per week with activity icon
- Time capsule egg opens at 90-day gentle presence

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Coprolite | Dig corner 10 taps | Funny museum label |
| Microraptor | Find smallest bone | Size contrast lesson |
| Crystal geode | Full skeleton + 7 visits | Extra sparkle case |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Time capsule | Egg cluster long-press | Note from "past self" template |
| Shadow T-rex | Night mode 3 times | Wall shadow roar-silent |
| Next species | Skeleton done | Faded outline |

---

## Reward Philosophy

Fossils **uncover** from behavior — not purchased. Star dust visual links to Idag without shop UI in world.

---

## Parent Value

Celebrates persistence and science curiosity without screen-time combat. Dinner conversation: *"What bone did you find today?"*

---

## Educational Value

Bone anatomy basics, dig patience, species herbivore/carnivore icons, footprint measurement — playful museum literacy.

---

## Accessibility Considerations

- Scary skull has "friendly" mode toggle in parent settings
- Dig progress bar + icon
- Brush auto-complete path
- Reduced motion: instant bone reveal

---

## Future Expansion Ideas

- AR fossil on floor (native) — optional
- Visit real museum photo upload to plaque

---

## Sign-off

Unique identity: **awe discovery** · 75/75 · v1.0

================================================================================
FILE: product-content-bible/WORLD_DOLLHOUSE.md
================================================================================

# World Bible — Dollhouse

**World ID:** `dollhouse` · **Child name (SV):** Dockhuset · **Icon:** 🏡  
**Unlock tier:** Early-mid — theme pick ≈12 stars OR preference for pretend play  
**Inherits:** POS + PCB README

---

## Purpose

Dockhuset is **miniature control** — the child arranges tiny rooms to feel order when real life feels big. Pretend without performance pressure. Supports emotional regulation through **sorting, placing, visiting** — not scoring.

---

## Fantasy

*"My dollhouse opens like a book. Left side is kitchen, right is bedroom — I decide where the tiny chair goes. The family figures aren't exactly us — they're soft shapes with kind faces. I can make the bed, set the table, and close the house when I'm done. Nothing falls apart if I leave. Tomorrow the rooms wait exactly how I left them — or I can change everything in one minute."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Cozy control** | Quiet pretend |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 4–9 | Dollhouse play peak |
| **Younger** | 3–5 | 2 rooms only; big pieces |
| **Older** | 10–12 | Extra attic room; less pastel |

---

## Visual Language

- **Palette:** Rose milk · mint trim · butter yellow · soft lilac · white porcelain miniatures
- **Materials:** Matte painted wood, felt carpet, paper wallpaper patterns, tiny clay food
- **Light:** Even soft — like tabletop at window
- **Scale:** True dollhouse cutaway — 1:12 feel, shallow depth per room
- **Hero silhouettes:** Open facade · triangular roof · tiny bed
- **Never here:** Barbie realism, brand dolls, messy broken rooms, competitive decor scores

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Almost silent — clock tick optional |
| **Interaction** | Tiny wood click, fabric slide, teapot clink |
| **NPC** | Figure hum (non-verbal) on lift | 
| **Silence** | Preferred default |
| **Reduced motion** | Snap placement |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Open house | 400ms | Facade swing like book |
| Place miniature | 150ms | Magnetic snap |
| Idle loop | 4s | Curtain micro-sway |
| Close house | 400ms | Satisfying click latch |
| Celebration link | ≤1000ms | Tiny star sticker on roof |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Familjen (3 figures)** | Soft humanoids | Stand/sit toggle; no speech | When placed |
| **House mouse** | Secret ambient | Peeks from baseboard | Rare |

Figures never demand food/tasks.

---

## Idle Behaviour

- **Always:** One room lamp glow; curtain breathe
- **Sometimes:** Mouse peeks; figure wave if moved last session
- **After progress:** One new miniature box appears unopened
- **Never:** Mess events; broken furniture

---

## Room Layout

```
[LEFT WING: kitchen + tiny table]
[CENTER: stairs graphic (non-nav maze)]
[RIGHT WING: bedroom + bed + wardrobe]
[ATTIC: late unlock — toy chest only]
[FRONT: garden strip optional late]
```

Open/close is primary gesture — house can be "put away."

---

## Progression

| Phase | Trigger | Change |
|-------|---------|--------|
| Starter | Unlock | Kitchen + 5 miniatures |
| Mid | 20 stars | Bedroom wing |
| Late | 50 stars | Attic + garden strip |
| Complete | 75 miniatures placed once | Roof star sticker |

---

## 75 Build Parts

**Categories:** Structure · Rooms · Furniture · Figures · Food · Decor · Garden · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Dollhouse facade | Structure | Pink milk paint | Starter |
| 2 | Roof triangle | Structure | Red tile feel | Starter |
| 3 | Chimney | Structure | Short | Early |
| 4 | Open hinge left | Structure | Book swing | Starter |
| 5 | Kitchen floor | Rooms | Checker faint | Starter |
| 6 | Kitchen wall | Rooms | Mint | Starter |
| 7 | Tiny stove | Furniture | 4 burners cartoon | Early |
| 8 | Tiny sink | Furniture | Round basin | Early |
| 9 | Tiny fridge | Furniture | Magnet dots | Early |
| 10 | Kitchen table | Furniture | Round 2 seat | Early |
| 11 | Chair A | Furniture | Lilac | Early |
| 12 | Chair B | Furniture | Yellow | Early |
| 13 | Teapot | Food | Ceramic | Early |
| 14 | Cup pair | Food | | Early |
| 15 | Plate trio | Food | | Mid |
| 16 | Loaf bread | Food | Sliceable art | Mid |
| 17 | Fruit bowl mini | Food | | Mid |
| 18 | Rug kitchen | Decor | Oval weave | Mid |
| 19 | Clock wall | Decor | Analog | Mid |
| 20 | Window kitchen | Structure | | Early |
| 21 | Curtains kitchen | Decor | Dot pattern | Mid |
| 22 | Bedroom floor | Rooms | Carpet felt | Mid |
| 23 | Bedroom wall | Rooms | Star wallpaper soft | Mid |
| 24 | Tiny bed | Furniture | Quilt puff | Mid |
| 25 | Pillow pair | Furniture | | Mid |
| 26 | Wardrobe | Furniture | Door closed | Mid |
| 27 | Nightstand | Furniture | One drawer | Mid |
| 28 | Lamp bedside | Furniture | Warm | Mid |
| 29 | Toy bear mini | Decor | On bed | Mid |
| 30 | Figure adult A | Figures | Soft shape | Mid |
| 31 | Figure adult B | Figures | | Mid |
| 32 | Figure child | Figures | Neutral | Mid |
| 33 | Figure pet | Figures | Dog blob | Late |
| 34 | Stairs decal | Structure | Visual only | Mid |
| 35 | Bathroom tile (half) | Rooms | Not full sim | Late |
| 36 | Tiny toilet closed | Furniture | Lid down | Late |
| 37 | Tiny bath tub | Furniture | Duck inside | Late |
| 38 | Towel bar | Decor | | Late |
| 39 | Attic floor | Rooms | Wood | Late |
| 40 | Toy chest attic | Furniture | Open | Late |
| 41 | Mini train | Decor | Attic | Late |
| 42 | Mini blocks stack | Decor | | Late |
| 43 | Garden strip | Garden | Grass | Late |
| 44 | Mini tree | Garden | Round | Late |
| 45 | Fence picket | Garden | | Late |
| 46 | Flower bed | Garden | 3 flowers | Late |
| 47 | Mailbox mini | Garden | Flag up | Late |
| 48 | Swing garden | Garden | One seat | Late |
| 49 | Season wreath door | Seasonal | | Seasonal |
| 50 | Snow roof cap | Seasonal | | Seasonal |
| 51 | Birthday banner mini | Seasonal | | Secret |
| 52 | High chair | Furniture | Baby fiction | Late |
| 53 | Crib mini | Furniture | | Late |
| 54 | Book shelf | Furniture | 5 spines | Late |
| 55 | Piano toy | Furniture | 3 keys | Late |
| 56 | TV blank | Furniture | No content | Late |
| 57 | Sofa mini | Furniture | 2 seat | Late |
| 58 | Coffee table | Furniture | | Late |
| 59 | Plant pot | Decor | | Mid |
| 60 | Picture frame | Decor | Empty | Mid |
| 61 | Star sticker roof | Interactive | Milestone | Late |
| 62 | Unopened box prop | Interactive | Weekly | Mid+ |
| 63 | Mouse hole | Secret | Baseboard | Secret |
| 64 | Mouse figure | Secret | Gray cute | Secret |
| 65 | Hidden attic note | Secret | Long-press chest | Secret |
| 66 | Carpet bedroom | Decor | Purple | Mid |
| 67 | Coat rack mini | Decor | Hall fiction | Late |
| 68 | Umbrella stand | Decor | | Late |
| 69 | Shoe pair mini | Decor | | Late |
| 70 | Calendar mini | Decor | | Late |
| 71 | House sign | Decor | "Dockhuset" | Mid |
| 72 | Lamp ceiling | Decor | Kitchen | Mid |
| 73 | Broom mini | Decor | Closet | Late |
| 74 | Dustpan | Decor | | Late |
| 75 | Golden key decor | Secret | Attic | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| House opens | Unlock | Facade swing | *"Välkommen in."* |
| Bedroom wing | 20 stars | Right side | *"En plats att drömma."* |
| Attic | 50 stars | Top opens | *"Fler små saker att ordna."* |
| Roof star | 75 parts once | Sticker | *"Du skötte om ditt hus."* |

---

## Daily Interactions

1. Open house — choose room to view
2. Place or move one miniature — snap grid
3. Sit figure on chair — toggle pose
4. Close house — end session ritual

---

## Long-Term Interactions

- Collect all 75 miniatures over months
- Seasonal room reskin (winter/summer)
- Mouse secret storyline (3 peek events)

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Mouse figure | Find hole | Tiny friend |
| Golden key | All rooms once | Attic sparkle |
| Birthday banner | Profile date | Mini party |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Attic note | Chest long-press | Parent can write tiny note offline |
| Mouse peek | Quiet visit | Mouse waves |
| Piano chord | Tap keys order | 3-note lullaby |

---

## Reward Philosophy

Miniatures unlock from **behavior boxes** — unopened prop on rug, not star shop grid. Teaches anticipation without gambling.

---

## Parent Value

Supports emotional regulation and pretend processing of home life — especially helpful NPF context without clinical tone.

---

## Educational Value

Sorting, spatial layout, domestic roles play, fine motor snap — incidental.

---

## Accessibility Considerations

- Large snap zones on miniatures
- Open/close works without precision drag
- High contrast outline mode on pieces
- No text required

---

## Future Expansion Ideas

- Photo in frame from family
- Custom wallpaper pattern picker (bounded)

---

## Sign-off

Unique identity: **miniature control** · 75/75 · v1.0

================================================================================
FILE: product-content-bible/WORLD_FISHING.md
================================================================================

# World Bible — Fishing

**World ID:** `fishing` · **Child name (SV):** Fiskebryggan · **Icon:** 🎣  
**Unlock tier:** Mid-late — evening-friendly world ≈25 stars OR explicit calm-theme pick  
**Inherits:** POS + PCB README

---

## Purpose

Fiskebryggan teaches **patience and noticing** — the anti-anxiety counterweight to high-energy worlds. Water, line, waiting, small reward. Best after school or kväll routine. Real life link: *good things come when I calm down and pay attention.*

---

## Fantasy

*"I sit on the dock. The lake is still. I don't have to catch anything fast — the bobber floats and that's okay. When I've had a calm day, sometimes a fish nips. I put it in the bucket, show it once, and let it go back. The heron watches from far away. Fireflies come later. This place is never loud."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Patient calm** | Gentle anticipation |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 5–11 | Patience band broad |
| **Younger** | 4–5 | Bobber only; auto-catch gentle |
| **Older** | 10–12 | Logbook species notes optional |

---

## Visual Language

- **Palette:** Lake navy · dock grey-brown · sunset peach horizon · reeds olive · bobber red (one accent)
- **Materials:** Weathered wood planks, rope coil, tin bucket, watercolor sky gradient
- **Light:** Golden hour default — warm low sun
- **Scale:** Wide horizon — 60% sky/water, 40% dock foreground
- **Hero silhouettes:** Dock plank · bobber · bent rod
- **Never here:** Arcade timing bars, competitive leaderboard fish size, blood, storm scare

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Water lap, distant loon optional (single call/minute max) |
| **Interaction** | Cast swoosh, bobber plop, reel click |
| **NPC** | Heron croak once; fish splash small |
| **Silence** | **Recommended default** — visual water enough |
| **Reduced motion** | Static water shimmer sprite |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 400ms | Horizon fade from peach to navy |
| Cast line | 600ms | Slow arc — no twitch skill |
| Bobber wait | 3–8s variable | Gentle — never >10s |
| Catch | 800ms | Fish arc + bucket — skippable |
| Release | 500ms | Splash return — always release fiction |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Herron** | Still watcher | Stands on far post; flies once per week | Mid |
| **Fish (species roster)** | Catch targets | Appear by behavior calm score — not RNG loot box | On catch moment |
| **Frog** | Dock corner | Croaks once on tap | Late |

---

## Idle Behaviour

- **Always:** Water shimmer loop; bobber drift if line out
- **Sometimes:** Dragonfly cross; cloud slow parallax
- **After progress:** New fish silhouette in logbook shadow
- **Never:** Storm threat; timer fail

---

## Room Layout

```
[SKY: 35% gradient + clouds]
[WATER: 40% reflective band]
[DOCK: planks + stool + rod rack + bucket]
[SHORE LEFT: reeds + heron post]
[SHORE RIGHT: tackle box + logbook stand]
```

Single horizontal composition — landscape-friendly on tablet; portrait crops sky.

---

## Progression

| Phase | Trigger | Change |
|-------|---------|--------|
| Empty dock | Unlock | Rod + stool |
| First cast | 3 calm visits | Bobber kit |
| Logbook | 10 completions (any) | Species stamps |
| Heron friend | 14-day gentle presence | NPC idle |
| Night fireflies | Evening visits ×5 | Light mode |

---

## 75 Build Parts

**Categories:** Dock · Tackle · Water · Shore · Catch · Log · Decor · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Dock plank set | Dock | 5 boards weathered | Starter |
| 2 | Dock post A | Dock | Rope tie | Starter |
| 3 | Dock post B | Dock | | Starter |
| 4 | Stool seat | Dock | Round wood | Starter |
| 5 | Rod rack | Dock | 2 slots | Early |
| 6 | Basic rod | Tackle | Bent flex | Starter |
| 7 | Reel | Tackle | Click wheel | Early |
| 8 | Line spool | Tackle | | Early |
| 9 | Bobber red | Tackle | White stripe | Early |
| 10 | Hook (safe) | Tackle | Barb hidden cartoon | Early |
| 11 | Tackle box closed | Tackle | Green tin | Mid |
| 12 | Lure spoon | Tackle | Silver | Mid |
| 13 | Lure feather | Tackle | | Mid |
| 14 | Net (small) | Tackle | Release aid | Mid |
| 15 | Bucket tin | Catch | Empty | Early |
| 16 | Bucket water fill | Catch | Slosh idle | Mid |
| 17 | Fish perch | Catch | Green stripe | Mid |
| 18 | Fish pike friendly | Catch | Long cartoon | Mid |
| 19 | Fish roach | Catch | Small | Mid |
| 20 | Fish trout | Catch | Spots | Late |
| 21 | Fish bass | Catch | | Late |
| 22 | Fish mystery shadow | Catch | Secret species | Secret |
| 23 | Logbook stand | Log | Wood easel | Mid |
| 24 | Logbook pages | Log | Stamp slots | Mid |
| 25 | Stamp perch | Log | Ink | Mid |
| 26 | Stamp pike | Log | | Late |
| 27 | Pencil on string | Log | | Mid |
| 28 | Thermos | Decor | Dock | Mid |
| 29 | Sandwich wrap | Decor | Fiction lunch | Late |
| 30 | Lantern | Decor | Off default | Late |
| 31 | Lantern glow | Decor | Evening | Late |
| 32 | Rope coil | Decor | Post | Early |
| 33 | Life ring | Decor | Safety positive | Mid |
| 34 | Sign "Fiskebryggan" | Decor | Carved | Mid |
| 35 | Reed cluster A | Shore | Left | Early |
| 36 | Reed cluster B | Shore | Right | Early |
| 37 | Lily pad pair | Water | Static | Mid |
| 38 | Lily flower | Water | White | Late |
| 39 | Heron post far | Shore | NPC perch | Mid+ |
| 40 | Heron figure | NPC | Still | Mid+ |
| 41 | Frog on rock | NPC | Corner | Late |
| 42 | Dragonfly | Water | Fly-by | Mid |
| 43 | Cloud set 1 | Sky | Soft | Starter |
| 44 | Cloud set 2 | Sky | | Mid |
| 45 | Sunset gradient swap | Sky | Interactive eve | Mid |
| 46 | Star sky swap | Sky | Night | Late |
| 47 | Firefly jar | Decor | Night | Secret |
| 48 | Firefly particles | Decor | Ambient | Secret |
| 49 | Moon reflection | Water | Night | Late |
| 50 | Boot pair dock | Decor | | Mid |
| 51 | Hat wide brim | Decor | Hang | Mid |
| 52 | Seat cushion | Dock | | Mid |
| 53 | Umbrella folded | Decor | Rain season | Seasonal |
| 54 | Rain ripple overlay | Water | Seasonal | Seasonal |
| 55 | Snow dock cap | Seasonal | Winter | Seasonal |
| 56 | Ice hole (decorative) | Water | Winter | Seasonal |
| 57 | Gift fish scale | Secret | Collect wall | Secret |
| 58 | Scale wall frame | Decor | 5 slots | Late |
| 59 | Cast marker stone | Shore | "Min plats" | Late |
| 60 | Pebble stack | Shore | Balance art | Late |
| 61 | Boat distant | Water | Far blur | Late |
| 62 | Friend silhouette boat | Water | Co-op fiction | Late |
| 63 | Radio quiet | Decor | Off | Late |
| 64 | Bell dock | Interactive | One ring | Secret |
| 65 | Message bottle | Secret | Shore | Secret |
| 66 | Message scroll blank | Secret | Parent note | Secret |
| 67 | Star reflection water | Interactive | After good day | Mid |
| 68 | Release splash FX | Interactive | Always | Mid |
| 69 | Calm breath prompt | Interactive | Optional 3 breath | Mid |
| 70 | Bench backrest | Dock | Upgrade stool | Late |
| 71 | Two-rod rack | Dock | | Late |
| 72 | Kid height rail | Dock | Safety | Early |
| 73 | Worm tin (closed) | Tackle | No gross | Late |
| 74 | Graduation fish badge | Decor | 100 stars | Late |
| 75 | Horizon aurora | Secret | Rare winter night | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| Dock appears | Unlock | Water fade in | *"En lugn plats."* |
| First catch | Calm day completion | Fish splash | *"Du väntade — bra jobbat."* |
| Logbook | 10 stamps | Stand rises | *"Du minns vad du sett."* |
| Fireflies | 5 evening visits | Jar glow | *(no text)* |

---

## Daily Interactions

1. Cast line — one tap; wait animation (skippable after 3s)
2. Catch OR calm breath if no catch — both valid sessions
3. Release fish — mandatory gentle ritual
4. Stamp logbook if new species

---

## Long-Term Interactions

- Complete logbook 12 species — aurora secret
- Seasonal dock reskins
- Message bottle notes from parent (offline)

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Mystery fish | 30 calm sessions | Shadow log stamp |
| Aurora | Winter + logbook full | Sky dance |
| Message bottle | Shore tap 10 visits | Scroll note |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Bell ring | Double-tap post | Heron bows |
| Firefly jar | Night only | Jar fills |
| Scale wall | Release 10 fish | Shimmer scales |

---

## Reward Philosophy

Catch probability tied to **completion + calm visit**, not star spend. **Always release** — no keep tank grind. Bucket is momentary display only.

---

## Parent Value

Teaches wind-down ritual before sleep or after school — supports NPF regulation without therapy language.

---

## Educational Value

Species observation, patience, catch-and-release ethics, weather/season awareness — quiet science.

---

## Accessibility Considerations

- Wait skippable — never punish ADHD with forced 10s
- No audio required; breath prompt visual
- High contrast bobber on water
- Reduced motion: instant catch option in parent settings

---

## Future Expansion Ideas

- Link to "kväll routine" activity completion
- Real photo of family fishing trip in logbook

---

## Sign-off

Unique identity: **patient calm** · 75/75 · v1.0

================================================================================
FILE: product-content-bible/WORLD_STUDY.md
================================================================================

# World Bible — Study

**World ID:** `study` · **Child name (SV):** Läshörnan · **Icon:** 📚  
**Unlock tier:** Mid — ≈18 stars OR school-age profile (6+) suggestion  
**Inherits:** POS + PCB README

---

## Purpose

Läshörnan celebrates **focus pride** without school pressure — a cozy nook where homework, reading, and creative projects feel **chosen**, not assigned. Links to real routines (pack bag, read, practice) but never duplicates teacher authority.

---

## Fantasy

*"This is my corner when I want to think. The desk lamp turns on when I sit down. My books aren't tests — they're adventures I pick. When I finish something hard at school or at home, a new pencil or poster appears. The clock doesn't rush me. The eraser crumbs mean I tried. Nobody grades me here."*

---

## Core Emotion

| Primary | Secondary |
|---------|-----------|
| **Focus pride** | Quiet curiosity |

---

## Target Age

| Band | Fit | Notes |
|------|-----|-------|
| **Sweet spot** | 6–12 | Study nook peak |
| **Younger** | 5–6 | Drawing desk only; no homework copy |
| **Older** | 12+ | Project board; less cartoon lamp |

---

## Visual Language

- **Palette:** Library navy · desk oak · cream paper · sage plant · lamp honey glow
- **Materials:** Realistic-soft paper stack, wax pencil, cork board, fabric chair
- **Light:** Pool of lamp light — rest of room softer vignette
- **Scale:** Corner room — desk foreground, shelf wall, window side
- **Hero silhouettes:** Desk lamp arc · stacked books · cork board
- **Never here:** Red F grades, timer exam UI, teacher avatar scolding, infinite worksheet scroll

---

## Audio Language

| Layer | Direction |
|-------|-----------|
| **Ambient bed** | Library hush — page turn rare |
| **Interaction** | Pencil scratch, stamp thud, lamp click |
| **NPC** | Owl figurine "hoo" optional once | 
| **Silence** | Default good |
| **Reduced motion** | Lamp on/off instant |

---

## Animation Language

| Moment | Duration | Feel |
|--------|----------|------|
| Enter world | 300ms | Lamp fade on |
| Sit desk | 400ms | Chair slide subtle |
| Place item | 180ms | Book stack adjust |
| Focus session complete | 1000ms | Star pencil sparkle — skippable |
| Celebration link | ≤1500ms | Poster unroll |

---

## NPC Behaviour

| NPC | Role | Behaviour | When active |
|-----|------|-----------|-------------|
| **Uggla figur** | Desk guardian | Head turn follow tap | Always |
| **Bookworm (ribbon)** | Bookmark character | Peeks from book | After 5 reading activities |

No teacher NPC. No assignment giver.

---

## Idle Behaviour

- **Always:** Lamp flicker micro; plant leaf sway
- **Sometimes:** Page corner flip; owl blink
- **After progress:** New supply on desk (pencil, sticker)
- **Never:** "Homework overdue" alerts

---

## Room Layout

```
[BACK: bookshelf wall + cork board + clock]
[MID: desk + chair + lamp + supplies tray]
[SIDE: window seat + plant + globe]
[FLOOR: rug + backpack hook]
```

---

## Progression

| Phase | Trigger | Change |
|-------|---------|--------|
| Empty nook | Unlock | Desk + lamp |
| Reader | 5 reading/homework-tagged completions | Bookshelf fills |
| Creator | 20 stars | Art supply caddy |
| Scholar | 50 stars | Globe + project board |
| Graduate | 100 stars | Honor ribbon on board |

---

## 75 Build Parts

**Categories:** Structure · Desk · Supplies · Books · Board · Decor · Window · Interactive · Seasonal · Secret

| # | Part | Category | Visual | Unlock |
|---|------|----------|--------|--------|
| 1 | Corner wall navy | Structure | Matte | Starter |
| 2 | Floor rug round | Structure | Woven blue | Starter |
| 3 | Desk top oak | Desk | Wide | Starter |
| 4 | Desk legs | Desk | Sturdy | Starter |
| 5 | Chair soft | Desk | Swivel fiction | Starter |
| 6 | Lamp desk | Desk | Honey cone | Starter |
| 7 | Lamp pull chain | Interactive | Toggle | Starter |
| 8 | Pencil cup | Supplies | 3 pencils | Early |
| 9 | Pencil HB | Supplies | Yellow | Early |
| 10 | Pencil star foil | Supplies | Reward | Mid |
| 11 | Eraser block | Supplies | Crumbs art | Early |
| 12 | Sharpener | Supplies | Hand crank | Early |
| 13 | Ruler | Supplies | Wood | Mid |
| 14 | Scissors safe | Supplies | Round tip | Mid |
| 15 | Glue stick | Supplies | | Mid |
| 16 | Tape roll | Supplies | | Mid |
| 17 | Stapler toy | Supplies | | Late |
| 18 | Paper stack white | Supplies | Neat | Early |
| 19 | Paper stack color | Supplies | Pastel | Mid |
| 20 | Notebook spiral | Supplies | Closed | Early |
| 21 | Notebook open blank | Interactive | Doodle surface | Mid |
| 22 | Sticker sheet | Supplies | Stars only | Mid |
| 23 | Stamp set | Supplies | 3 shapes | Late |
| 24 | Ink pad | Supplies | | Late |
| 25 | Book stack A | Books | 3 spines | Early |
| 26 | Book stack B | Books | Taller | Mid |
| 27 | Book adventure | Books | Dragon spine | Mid |
| 28 | Book science | Books | Planet spine | Mid |
| 29 | Book feelings | Books | Heart spine | Mid |
| 30 | Book Swedish | Books | Flag subtle | Late |
| 31 | Book English optional | Books | Late unlock | Late |
| 32 | Bookmark ribbon | Books | Red | Early |
| 33 | Reading glasses prop | Decor | On book | Late |
| 34 | Bookshelf unit | Structure | 3 shelf | Mid |
| 35 | Shelf plant | Decor | Pothos | Mid |
| 36 | Globe | Decor | Spin slow | Late |
| 37 | Cork board | Board | Empty | Mid |
| 38 | Push pin set | Board | 5 colors | Mid |
| 39 | Photo pin child art | Board | Placeholder | Mid+ |
| 40 | Project board | Board | Large | Late |
| 41 | Honor ribbon | Board | 100 stars | Late |
| 42 | Clock wall | Decor | Analog calm | Mid |
| 43 | Calendar page | Decor | Tear monthly | Late |
| 44 | Window side | Structure | Day sky | Early |
| 45 | Window seat cushion | Window | | Mid |
| 46 | Curtain half | Window | | Mid |
| 47 | Backpack hook | Decor | Low | Early |
| 48 | Backpack prop | Decor | Color dots | Mid |
| 49 | Lunch box study | Decor | | Late |
| 50 | Water bottle desk | Supplies | | Mid |
| 51 | Snack apple | Decor | Fiction | Late |
| 52 | Owl figurine | NPC | Wood | Early |
| 53 | Owl graduation cap | Seasonal | | Seasonal |
| 54 | Bookworm ribbon | NPC | In book | Mid+ |
| 55 | Art caddy | Supplies | Markers 6 | Mid+ |
| 56 | Marker red | Supplies | | Mid+ |
| 57 | Marker blue | Supplies | | Mid+ |
| 58 | Crayon box | Supplies | | Mid |
| 59 | Paint set closed | Supplies | Watercolor | Late |
| 60 | Easel mini | Decor | | Late |
| 61 | Music sheet stand | Decor | No performance | Late |
| 62 | Metronome (static) | Decor | | Late |
| 63 | Calculator toy | Supplies | Big buttons | Late |
| 64 | Abacus | Supplies | Slide beads | Late |
| 65 | World map poster | Board | Pin places | Late |
| 66 | Star chart study | Board | Not sibling | Late |
| 67 | Co-parent note cork | Interactive | | Late |
| 68 | Focus timer sand (visual) | Interactive | 3 min max optional | Mid |
| 69 | Breath corner sticker | Decor | Calm | Mid |
| 70 | Season autumn leaf | Seasonal | Window | Seasonal |
| 71 | Season winter snow window | Seasonal | | Seasonal |
| 72 | Secret compartment desk | Secret | Long-press | Secret |
| 73 | Secret comic strip | Secret | Inside compartment | Secret |
| 74 | House sign | Decor | "Läshörnan" | Mid |
| 75 | Golden bookmark | Secret | 30 reading activities | Secret |

---

## Unlock Moments

| Moment | Trigger | Reveal | Copy (SV) |
|--------|---------|--------|-----------|
| Lamp on | Unlock | Pool light | *"Din hörna."* |
| Bookshelf | 5 reading-tagged | Books appear | *"Berättelser väntar."* |
| Art caddy | 20 stars | Colors | *"Skapa vad du vill."* |
| Honor ribbon | 100 stars | Board | *"Du har jobbat fokuserat."* |

---

## Daily Interactions

1. Sit — lamp on animation
2. Open notebook — one doodle stroke saved locally cosmetic
3. Pick book — spine glow; no quiz
4. Optional focus sand timer — 3 min max, skippable

---

## Long-Term Interactions

- Cork board fills with parent-pinned art photos
- Book collection 12 spines/year
- Golden bookmark at 30 reading activities

---

## Rare Discoveries

| Discovery | Effort | Fiction |
|-----------|--------|---------|
| Secret comic | Open compartment | 3-panel encouragement |
| Golden bookmark | 30 reads | Ribbon animation |
| Globe spin | 50 visits | One country ping parent-set |

---

## Secrets

| Secret | Hint | Payoff |
|--------|------|--------|
| Desk compartment | Owl looks left | Comic strip |
| Bookworm | Same book 5 taps | Ribbon waves |
| Lamp flicker code | Toggle 3 times | Night sky window |

---

## Reward Philosophy

Supplies unlock from **reading/homework-tagged completions** — parent tags activities in build system. Never GPA, never grades.

---

## Parent Value

Positive association with homework corner at home — mirrors real desk setup. Supports school routines without app becoming teacher.

---

## Educational Value

Literacy encouragement, tool familiarity, project planning board, globe geography incidental — intrinsic not extrinsic.

---

## Accessibility Considerations

- Dyslexia-friendly: no wall of text in world
- Timer optional off by default
- High contrast lamp focus area
- Notebook doodle not graded

---

## Future Expansion Ideas

- Scan real homework done photo to cork board
- Gentle link to Study activity templates in library

---

## Sign-off

Unique identity: **focus pride** · 75/75 · v1.0
