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
