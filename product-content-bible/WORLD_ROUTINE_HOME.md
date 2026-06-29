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
