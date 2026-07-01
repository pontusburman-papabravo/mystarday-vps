# Parent Hubs — Product Baseline 10/10

**Tagg:** `parent-hubs-10-10`  
**Datum:** 2026-07-01  
**Status:** Officiell produktkonstitution för föräldrahubbar — **implementation ska verifieras mot denna baseline**

---

## Vad detta är

En fryst referenspunkt där visioner, agent-promptar, gränsdragningar och Jenny-test är konsekventa **innan** hubbimplementation påbörjas.

**Index:** [parent-hubs-index.md](parent-hubs-index.md)

| Hub | Vision | Agent |
|-----|--------|-------|
| Hem | [hem-vision.md](hem-vision.md) | [hem-agent-prompt.md](hem-agent-prompt.md) |
| Planering | [planering-vision.md](planering-vision.md) | [planering-agent-prompt.md](planering-agent-prompt.md) |
| Belöningar | [beloningar-vision.md](beloningar-vision.md) | [beloningar-agent-prompt.md](beloningar-agent-prompt.md) |
| Familj | [familj-vision.md](familj-vision.md) | [familj-agent-prompt.md](familj-agent-prompt.md) |

**Referens (redan byggd):** [for-dig-vision.md](for-dig-vision.md)

---

## Hubbgränser (låst)

| Hub | Äger | Delar data med |
|-----|------|----------------|
| **Hem** | Läge idag, **undantag**, ett nästa steg, handoff | Belöningar (`pending_approval`), Familj (`pending_invite`) |
| **Planering** | Byggverktyg (schema, bibliotek, kalender) | — |
| **Belöningar** | **Pending** i belöningsdomänen, hantera utbud, stjärnöverblick | Hem (samma pending-rader) |
| **Familj** | Medlemmar, inbjudan, barnprofil | Hem (samma inbjudningsrader) |

**Regel:** Samma underliggande data — aldrig dubbel logik mellan hubbar.

---

## Implementationsordning (rekommenderad)

En hubb per PR. Jenny-test + `test:gate` + visuell kontroll mot vision **innan** nästa hubb.

```
1. Hem         →  undantag, coach, handoff (störst användarpåverkan)
2. Planering   →  hubbmönster, avgränsad domän
3. Belöningar  →  pending-UI, synk med Hem readiness
4. Familj      →  barnprofil kopplad till övriga hubbar
```

**Implementationsbranch:** `cursor/for-dig-10-10-2c04`

---

## Definition of Done per implementations-PR

- [ ] Hubbens Jenny-test (5 sek, utan scroll) — se respektive `*-vision.md`
- [ ] Filterregel och copy-regel respekterade
- [ ] Prioritetsordning enligt vision
- [ ] `npm run test:gate` grön
- [ ] POS-sektioner citerade i commit/PR
- [ ] Ingen regression i hubbgränser (undantag vs pending vs medlemmar)

---

## Ändra inte baseline utan ADR

Nya produktbeslut som bryter mot denna baseline kräver uppdatering av respektive `*-vision.md` **och** ny tagg — inte ad hoc i implementations-PR.
