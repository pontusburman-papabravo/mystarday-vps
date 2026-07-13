# Emotional brand films — creative brief

These manifests are **brand films**, not product demos.

## Story arc (all three films)

```
kaos → känsla → lösning
```

Not: family → app → stars → calm.

| Beat | Purpose | On-screen text |
|------|---------|----------------|
| **hook** | Stress the viewer recognises — no app, no logo | None |
| **breath** | Silence + question on black (ffmpeg, no Pika cost) | One emotional question |
| **story** | Child + parent + home — faces, hands, eye contact | Sparse |
| **app-glimpse** | Phone peripheral, UI unreadable (~5 s total) | None |
| **payoff** | Pride, stolthet, first star moment | One line max |
| **brand** | Feeling they want for their mornings | Brand line |

## Rules

1. **Child is protagonist.** Phone is rekvisita.
2. **≤25% app on screen** — exactly one `app-glimpse` scene per film (~18% of ~28 s).
3. **No readable UI in Pika prompts** — extreme shallow DOF, blurred screens.
4. **Hook has no captions** — sound design carries the first five seconds (`audioCues` in manifest).
5. **App is invisible helper** — never the hero shot.

## Pika validation (before full film)

Generate **one scene only** — the first-star / pride moment:

```bash
npm run video:dry-run -- --film a-morning-without-nagging --scene scene-05-first-star
npm run video:generate -- --film a-morning-without-nagging --scene scene-05-first-star --confirm
```

Ask: Does the child feel real? Is motion natural? Are colours on-brand? If yes → generate remaining scenes.

~$0.35 validates the entire visual style.

## Sound notes

`audioCues` in each manifest are sound-mix notes (VO, SFX, silence). Wire to `audio/` files when licensed assets exist.

## POS alignment

- Child protagonist (P-02) — child acts, parent supports
- Reality before celebration (G-01) — pride after real completion
- No surprise modals — emotional hook earns attention, not UI
