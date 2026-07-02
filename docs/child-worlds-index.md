# Barnvärldar 10/10 — Kravdokument (index)

**Status:** Operativ produktkonstitution (2026-07)  
**Referens (föräldrar):** [parent-hubs-index.md](parent-hubs-index.md)  
**Arkitektur:** [informationsarkitektur-barnapp.md](informationsarkitektur-barnapp.md) · [barnmeny-v2.md](barnmeny-v2.md)  
**Bilder (register):** [child-image-assets.md](child-image-assets.md)

---

## Produktgrund vs teknisk grund

> **Teknisk grund får göra framtida produktbeslut billigare — men aldrig fatta dem i förväg.**
>
> Vid granskning: fråga om ändringen är teknisk förberedelse eller produktbeslut. Produktbeslut för en barnvärld väntar tills dess vision är godkänd.

### Min värld — läsordning

1. **[World Constitution](../.ai/product/bibles/WORLD_BIBLE.md)** (§1, 2–3 sidor) — **första läsning** för allt Min värld-arbete  
2. **[World Bible Part I — Topology](../.ai/product/bibles/WORLD_BIBLE.md#part-i--world-topology--spatial-design)** — var nya områden/rum ska ligga; **Nytt område-checklistan** (11 frågor) obligatorisk före implementation  
3. [PRODUCT_CONTENT_BIBLE.md](../.ai/product/PRODUCT_CONTENT_BIBLE.md) — världssjäl  
4. [WORLD_DESIGN_BIBLE.md](../.ai/product/WORLD_DESIGN_BIBLE.md) — progression nodes  
5. [LIVING_WORLD_ENGINE_SPEC.md](../.ai/product/LIVING_WORLD_ENGINE_SPEC.md) — runtime + **Part X WQS** (Appendix K)  
6. **[bibles/rooms/](../.ai/product/bibles/rooms/README.md)** — room blueprints (RBS YAML, Part IV)

---

## Kopiera till agent

| Värld | Vision | Agent-uppdrag | Status |
|-------|--------|---------------|--------|
| **Idag** (rutin) | [idag-vision.md](idag-vision.md) | [idag-agent-prompt.md](idag-agent-prompt.md) | **GO** |
| **Min värld** (levande värld) | [World Constitution](../.ai/product/bibles/WORLD_BIBLE.md) §1 · [LWES Parts I–X](../.ai/product/LIVING_WORLD_ENGINE_SPEC.md) | [bibles/rooms/](../.ai/product/bibles/rooms/README.md) — `home_hall.yaml` först | **Part III RBS complete** · catalog started |
| **Skattkammaren** (belöningar) | [skattkammaren-vision.md](skattkammaren-vision.md) | [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md) | **Shipped** |
| **Mina personer** (familj) | barnmeny-v2 §3.5 | — | Tidig |

**Förälder Belöningar (parallell domän):**

- [beloningar-vision.md](beloningar-vision.md)
- [beloningar-agent-prompt.md](beloningar-agent-prompt.md)

---

## Gemensam Definition of Done (barnvärldar)

Varje barnvärld ska klara **sitt Olle-test** (se respektive vision) **plus**:

- Filterregel och beslutsregel verifierade
- Exit rule uppfylld
- Success metrics ifyllda i PR
- Mobil först (portrait, 44pt barnmål)
- Inga POS-brott (`.cursor/rules/030-child-experience.mdc`, `050-game-design.mdc`)
- `npm run test:gate` grön vid implementation
- Min värld child-facing ship: **LWES Part X** WQS-A001–J005 + Appendix K + WDB applicable WQS rows

---

## Snabbkopiering (råa sökvägar)

```
docs/skattkammaren-vision.md
docs/skattkammaren-agent-prompt.md
docs/mockups/beloningar.html
docs/informationsarkitektur-barnapp.md
```

---

*Senast uppdaterad: 2026-07-02 — Part III RBS complete; room catalog `bibles/rooms/` started*
