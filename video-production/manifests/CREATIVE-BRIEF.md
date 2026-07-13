# Emotional brand films — creative brief

These are **advertising**, not product demos. We sell a **feeling**:

> Morgonen blev normal. Det här gick ju faktiskt.

Not: *Bra att jag planerade igår.* Not: an app that helps.

Identity anchor:

> Den familj vi vill vara på morgonen.

## Story arc (all films)

```
Kärlek → Kaos → Hopp → Lösning
```

| Beat | What the viewer feels | On-screen text |
|------|----------------------|----------------|
| **recognition** | Love first — parent watches sleeping child, birds, stillness | None |
| **chaos** | 07:08 reality — painful recognition, sigh | None |
| **hope** | Black + identity line | One line |
| **payoff** | Child acts alone — toothbrush, shoes | None |
| **validation** | **Shoes + eye contact** — iterate on Pika before anything else | None |
| **brand** | Family out the door → door closes → silence → logo | Variant E default: **none** |

## Emotional payoff (non-negotiable)

The film earns its ending in **one shot**:

1. Child puts on shoes (or finishes a morning step alone)
2. Child looks **up at the parent** — not at a phone
3. Parent smiles
4. **Child smiles back** — mutual eye contact
5. No caption. Score ducked or out. Zipper SFX carries the moment.

That beat says more than any slogan.

## What we do NOT show

- First star / reward animation
- Readable app UI (tomorrow film: one blurred glimpse max)
- Product features or star economy
- Parent–phone eye contact as the hero moment

The phone is rekvisita. The child is protagonist. Understanding comes from **behaviour**, not UI.

## Product truth (internal, not ending slogan)

**Kvällen skapar morgonen.**

Parent plans in the evening. Child succeeds in the morning. *Tomorrow Starts Here* carries this in the hope beat — not in the closing line.

The old closing line *"Lugnare morgnar börjar kvällen innan."* is smart but **process**, not **feeling**. Keep it as variant B only if A/B testing needs it.

## Ending taglines — test all five

Default export: **Variant E** (logo only).

| ID | Copy | Role |
|----|------|------|
| **A** | Morgnar kan kännas så här. | Feeling — invitation |
| **B** | Mer lugn. Mindre tjat. | Feeling — relief |
| **C** | En bättre morgon börjar tillsammans. | Togetherness |
| **D** | Det här är bara början. | Forward momentum |
| **E** | *(ingen slogan)* | Family exits → door closes → 2s silence → brand logo |

Render A–D for comparison:

```bash
npm run video:render -- --film a-morning-without-nagging --placeholders --tagline B
```

Variant E is the default when `--tagline` is omitted.

## Pika validation (~$0.35)

One scene only — **shoes + eye contact**:

```bash
npm run video:generate -- \
  --film a-morning-without-nagging \
  --scene scene-05-shoes-alone \
  --confirm
```

Ask:

- Does the child feel real?
- Is eye contact **parent ↔ child**, not child ↔ phone?
- Does the parent's smile arrive naturally?
- Does the child smile back?
- Two seconds of silence after the smile?

If yes → generate remaining scenes. If no → iterate prompt and reference still.

## Pre-Pika parent test (mandatory)

When the first Pika clip exists, show it to **10 parents** — not developers, not the team.

**Question 1:** Vad tror du den här filmen handlar om?

| Pass | Fail |
|------|------|
| En lugnare morgon | En app |
| En familj | Smart produkt |
| Morgonstress som löser sig | Bra idé / snygg design |

**Question 2:** Hur fick filmen dig att känna?

| Pass | Fail |
|------|------|
| lugn, hoppfull, igenkänd, "det där är vi" | impressed by tech, curious about features |

## Storyboard review rule

Before any Pika spend: **forget the app entirely** when reviewing the storyboard.

If the film still works as a small story about a family → ready.

If it only works because the viewer sees a phone → simplify more.

## Sound

`audioCues` in manifests are mix notes.

- Validation / shoes: **zipper SFX**, score out (`duckMusic: true` on scene)
- Brand: door latch, then **2s silence** before logo (held via `renderDuration: 7`)
- Chaos: VO + clock; recognition: birds + silence

## POS

- Child protagonist (P-02)
- Parent supports, does not nag on screen
- Reality before celebration (G-01) — no star reward in ad
- Evening handoff supports product truth without dashboard patterns
