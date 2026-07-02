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

---

## Kopiera till agent

| Värld | Vision | Agent-uppdrag | Status |
|-------|--------|---------------|--------|
| **Idag** (rutin) | [idag-vision.md](idag-vision.md) | [idag-agent-prompt.md](idag-agent-prompt.md) | **Shipped** |
| **Skattkammaren** (belöningar) | [skattkammaren-vision.md](skattkammaren-vision.md) | [skattkammaren-agent-prompt.md](skattkammaren-agent-prompt.md) | **Shipped** |
| **Mina personer** (familj) | [mina-personer-vision.md](mina-personer-vision.md) | [mina-personer-agent-prompt.md](mina-personer-agent-prompt.md) | **Shipped** |

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
- Commit + PR med POS-citat och Olle-test-resultat

---

## Snabbkopiering (råa sökvägar)

```
docs/idag-vision.md
docs/skattkammaren-vision.md
docs/mina-personer-vision.md
docs/informationsarkitektur-barnapp.md
```

---

*Senast uppdaterad: 2026-07-02*
