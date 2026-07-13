# Emotional brand films — creative brief

These are **advertising**, not product demos. We sell an identity:

> Den familj vi vill vara på morgonen.

Not: an app that helps.

## Story arc (all films)

```
Kärlek → Kaos → Hopp → Lösning
```

| Beat | What the viewer feels | On-screen text |
|------|----------------------|----------------|
| **recognition** | Love first — parent watches sleeping child, birds, stillness | None |
| **chaos** | 07:08 reality — painful recognition, sigh | None |
| **hope** | Black + identity line (`Jag vill vara den föräldern.` / `Kvällen skapar morgonen.`) | One line |
| **payoff** | Child acts alone — toothbrush, shoes — parent surprised, smiles | None |
| **validation** | **Shoes scene** — iterate 20× on Pika before anything else | None |
| **brand** | Family out the door, backpack, coffee → fade → logo | Tagline |

## What we do NOT show

- First star / reward animation
- Readable app UI (tomorrow film: one blurred glimpse max)
- Product features or star economy

The phone is rekvisita. The child is protagonist. Understanding comes from **behaviour**, not UI.

## Product truth

**Kvällen skapar morgonen.**

Parent plans in the evening. Child succeeds in the morning. *Tomorrow Starts Here* is the flagship film for this idea.

## Tagline (all films)

```
Lugnare morgnar börjar kvällen innan.
```

Brand scene = family leaving. Logo + line in ffmpeg post — not in Pika.

## Pika validation (~$0.35)

One scene only — **not** first star, **not** UI:

```bash
npm run video:generate -- \
  --film a-morning-without-nagging \
  --scene scene-05-shoes-alone \
  --confirm
```

Ask: Does the child feel real? Does the parent's smile arrive naturally? Two seconds of silence?

If yes → generate remaining scenes. If no → iterate prompt and reference still.

## Sound

`audioCues` in manifests are mix notes. Hook chaos uses VO/SFX; recognition uses birds and silence.

## POS

- Child protagonist (P-02)
- Parent supports, does not nag on screen
- Reality before celebration (G-01) — no star reward in ad
- Evening handoff supports product truth without dashboard patterns
