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
