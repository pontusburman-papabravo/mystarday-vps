# Launch film gate — Together Through the Morning (v3)

**Locked before Pika generation.**

## 1. “Vad är nästa?” is the core

Scene `whats-next`. Not stressed, not overacted. Sara’s almost-answer and decision to stay silent matters more than the line itself. Generate dialogue in post — Pika is picture only.

## 2. Redeem needs 1s UI

Scene `app-redeem` — one second of Skattkammaren UI so *Jag får välja fredagsfilm!* lands. Then cut to Ella’s face. Stars get ~0.5s; the line gets 2–3s.

## 3. Hug is optional

Default: `ella-exit` = smile + run out. Hug is alt take only if Pika makes it natural.

## 4. Picture vs sound

Pika: movement and expression only. Swedish VO, breath, cry, app plings, music — all in post (`audio/vo/`, `audio/sfx/`).

## Generation order

```bash
npm run video:generate -- --film together-through-the-morning --scene whats-next --confirm
npm run video:generate -- --film together-through-the-morning --scene friday-movie-pride --confirm
npm run video:generate -- --film together-through-the-morning --scene sara-doorway-relief --confirm
# If all three pass → remaining scenes
npm run video:generate -- --film together-through-the-morning --confirm
```

## Gate (films 2–3)

Stop if: different people between scenes, theatrical faces, AI walk, feeling lost in edit.
