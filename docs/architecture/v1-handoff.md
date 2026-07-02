# v1 Architecture Handoff

**Från:** v1 Completion Program (2026-07-02)  
**Till:** Nästa fas (ACT-1 PR 5, Journey Fas 2, FEAT-1B, Child Worlds v1.1)  
**Prod:** `8cc9f17` (2026-07-02) · SW v477 · smoketest OK

---

## v1-programmet — stängt

Alla åtta agenter (PR #497–#504) är mergade. Se `docs/v1-release-notes.md` och `docs/qa/v1-release-candidate.md`.

---

## Vad v1 levererade

| Domän | Tillstånd | Källsanning |
|-------|-----------|-------------|
| FEAT-1 v1 | Closed (Phase 5) | `custody_home_id`, engine, migration `1809210000000` |
| Parent Hubs | Complete | `docs/qa/hub-integration-sweep.md` v2 |
| Child Worlds | Idag + Skatt shipped; Mina personer V0 | `docs/child-worlds-index.md` |
| Assets | Registry synkad | `docs/child-image-assets.md`, SW v467–468 |
| ACT-1 PR 1–4 | **Live** (migration `180922`, #506) | `docs/act-1-rollout-runbook.md` |
| Slim signup + Journey | **Live** (#508, `activation_signup_slim_v1` ON) | `docs/signup-slim-prod-checklist.md` |
| Hem snabbknappar | **Live** (#509–#510) | `public/js/dashboard-home-hub.js`, SW v476–477 |
| För dig | **v1 Complete** | Sprint 3–5; Sprint 4 defer |

---

## Shippat till prod (2026-07-02)

```
✅ #506 ACT-1 PR 1–4 flags → main → migrate (180922)
✅ #508 slim signup + Journey + power-user → main → migrate (180923–180924)
✅ #509–#510 Hem snabbknappar (återställning + klick/etikett) → main
```

Verifiering: [`docs/signup-slim-prod-checklist.md`](../signup-slim-prod-checklist.md) (alla punkter klara).

## Rekommenderad ordning (nästa ship)

```
1. ACT-1 PR 5 (nudges — flaggor OFF tills go-live)
2. Journey Fas 2 (registry + handoff v2 + parent-ack)
3. FEAT-1B / Child Worlds v1.1 (efter produktbeslut)
```

---

## Plocka härnäst

### 1. ~~Journey event-first onboarding~~ ✅ (#508, prod `8cc9f17`)

- ADR: [`docs/decisions/journey-event-first-onboarding.md`](../decisions/journey-event-first-onboarding.md)
- Signup standard: 3 frågor → auto-schema → Hem (`activation_signup_slim_v1`)
- Power-user: välj färdigt schema / 7-frågor wizard (handoff + first-star kvar)
- Journey = event-first, day-second (1, 2, 3, tyst 4–6, 7, 14)
- **Nästa:** Journey **Fas 2** — `docs/family-journey-fas2-5-roadmap.md`

### 2. ~~ACT-1 PR 1–4~~ ✅ (migration `180922`)

- Template-first, handoff, first star guide, AI (fallback till mall)
- PR 5 (nudges) + `activation_first_star_mode_v1` kvar OFF

### 3. FEAT-1B — `custom` boendemönster

- Spec: `docs/boendeschema-spec.md` (ej v1)
- Separat branch; kräver ADR om scope ändras

### 4. FEAT-1C — `custody_override`

- Pipeline-stub finns; produkt ej definierad

### 5. ~~För dig Sprint 3–5~~ ✅ v1 Complete (#504)

### 6. Child Worlds v1.1

- Mina personer: interaktiv berättelse, avatarer

---

## Fil-låsning (fortsatt)

| Område | Ägare nästa fas |
|--------|-----------------|
| `migrations/*custody*`, `custody-*` | FEAT-1B agent |
| `onboarding*.js`, `src/lib/journey/*` | Journey / signup agent |
| `for-dig.js`, `nav-config.js` | För dig agent |
| `public/images/child/**` | Assets agent före wiring |
| `public/sw.js` | En bump per mergad PR |

---

## Drift

- Prod URL och VPS-värden: se deploy-regler i `.cursor/rules/` och root `AGENTS.md`
- Efter deploy: health check på lokal port 3000
- Kör **inte** full testsvit på prod med live e-postnycklar

---

## Öppna frågor

1. ACT-1 PR 5: när aktivera `activation_nudge_v1`?
2. För dig Sprint 4: nav-flytt när metrics möter tröskel?
3. FEAT-1B: prioritet vs ACT-1 PR 5?
