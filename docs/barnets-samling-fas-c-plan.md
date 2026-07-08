# Fas C — Skattkammaren v1 (plan)

**Status:** Pågår — första slice #606 mergad · C1–C7 enligt nedan  
**Epic:** GitHub **#585**  
**Spec:** [barnets-samling-vision.md](barnets-samling-vision.md) §3 · [npf-arkitektur-v1.md](npf-arkitektur-v1.md) § Fem belöningsstatusar  
**Förutsättning:** Fas A klar (#588–#593) · Fas B klar (#621–#626)

---

## Produktmål (v1)

När barnet öppnar **🎁 Skattkammaren** ska det direkt förstå:

1. Hur många stjärnor jag har **att använda**
2. Vad jag **sparar till**
3. Hur **långt** jag har kvar
4. Vilka belöningar jag **kan lösa in**
5. Vad som **väntar på vuxen**
6. Vad som är **godkänt**
7. Vad som redan är **genomfört**
8. Vad som hänt **historiskt**

Känsla: varm belöningsplats — inte shop, casino eller loot.

### In scope (smal v1)

| Pillar | Känsla |
|--------|--------|
| **Aktivt mål** | Tydlig belöning barnet sparar till |
| **Progress** | Spendable saldo, kostnad, kvar — visuellt + text |
| **Fem statusar** | Sparar · Kan lösas in · Väntar på vuxen · Godkänd · Genomförd |
| **Historik** | Inlösta/godkända belöningar som varma kort |
| **NPF-copy** | Trygga tomstatusar, inga skamord |

### Out of scope (Fas C)

- Ny valuta, shop, lootbox, avatar/pet-shop
- WorldHub / Morgonhus / Garden som ingång
- Min samling-ändringar (Fas B)
- Årsbok, foto-minneskort, diplom (Fas D #586)
- Stor DB-migration / ny reward-motor
- Robust streak-räddning
- Kistor/hyllor polish (Fas E #587)
- **Godkänd ≠ Genomförd i persistent data** — kräver `fulfilled_at` (follow-up issue, ej blocker för v1)

### Princip

**Befintligt före nytt.** Återanvänd `resolveSkattState`, redeem-API, goal-API, redemption-rader.

---

## Befintlig kod att återanvända

| Behov | Källa idag | Fas C |
|-------|------------|-------|
| Spendable saldo | `GET /api/me/rewards` → `starBalance` | Header + progress |
| Belöningar | `rewards[]` | Kortlista |
| Aktivt mål | `GET /api/me/goal` | Målsektion |
| Redeem | `POST /api/me/rewards/:id/redeem` | Oförändrad |
| Pending/approved | `redemptions[].status` | Statusar + banners |
| Presentation (gate ON) | `child-treasure-present.js` (#606) | Utöka |
| State machine | `resolveSkattState` i `child-dashboard-rewards.js` | Oförändrad kärna |
| Route | `/child/treasure`, `ChildTreasureView` (#591) | Oförändrad |

### Godkänd vs Genomförd (datamodell)

NPF kräver skillnad. Idag:

| UI-läge | Data | Presentation v1 |
|---------|------|-----------------|
| Godkänd | `approved`/`auto` inom 2 s efter godkännande | `COMPLETED`-banner: ”Godkänd” |
| Genomförd | `approved`/`auto` i historik | Historikkort: ”Genomförd” |
| Persistent Godkänd | Saknas (`fulfilled_at` ej i DB) | **Follow-up** — ej DB i Fas C |

---

## Ticket-breakdown

### C0 — Epic: Skattkammaren v1 (#585)

**Tickets (ordning):**

- [ ] C1 Plan (detta dokument)
- [ ] C2 Aktivt mål
- [ ] C3 Progress mot mål
- [ ] C4 Fem statusar
- [ ] C5 Historik
- [ ] C6 NPF-copy + tomstatus
- [ ] C7 Regression/gate-test

---

### C1 — Plan + issue-breakdown

**Scope:** Detta dokument + roadmap-uppdatering.

**Acceptance:** Plan på main; #585 refererar hit.

---

### C2 — Aktivt mål

**Scope:** `renderGoalSection` — mål från `goalData.goal`; tomstatus ”Välj en belöning att spara till”; `openGoalPicker()`.

**Acceptance:** Gate ON visar mål eller varm tomstatus. Gate OFF legacy oförändrat.

---

### C3 — Progress mot aktivt mål

**Scope:** Spendable `starBalance`, `progress_pct`, progressbar, stjärngrid (`ChildRewardsEngine.starGridHtml`), copy ”X av Y stjärnor”, ”Bara N kvar”, ”Du kan lösa in den här nu”.

**Acceptance:** Ingen `lifetime_stars`. Tydlig skillnad mot Min samling.

---

### C4 — Fem statusar

**Scope:** `rewardPresentStatus` + banners; `resolveSkattState` priority ladder.

| Status | Villkor |
|--------|---------|
| Sparar | Inte råd / samlar |
| Kan lösas in | `ready` |
| Väntar på vuxen | `pending` |
| Godkänd | `COMPLETED` flash (2 s) |
| Genomförd | `approved`/`auto` i historik |

**Acceptance:** CTA bara när tillåtet. Pending lugnt, inte stressande.

---

### C5 — Historik

**Scope:** `renderHistory` — approved/auto som kort; tomstatus ”Här kommer belöningar du sparat ihop till att synas.”

**Acceptance:** Varm historik; ingen teknisk logg.

---

### C6 — NPF-copy + tomstatus

**Scope:** Copy-pass; förbjud shop/köp/loot/skam; copy-tester.

**Förbjudet:** shop, köp, loot, claim, misslyckades, förlorade, du har inga, skynda.

---

### C7 — Regression / gate-test

**Scope:** `test/barnets-samling-treasure-v1.test.js`; utökad QA-checklista; `test:gate`.

**Acceptance:** Gate ON/OFF; redeem oförändrat; Idag + Min samling opåverkade.

---

## Definition of Done (Fas C)

- [ ] C1–C7 acceptance criteria
- [ ] `npm run test:gate` grön
- [ ] `npm run check:css` om CSS ändrats
- [ ] SW bump om statiska assets ändrats
- [ ] Self-review (180) — UX + Game + NPF
- [ ] Inga redeem/API/DB-ändringar (eller dokumenterad anledning)

---

## PR-strategi

| PR | Tickets | Innehåll |
|----|---------|----------|
| 1 | C1 | Plan + roadmap |
| 2 | C2–C6 | Presentation polish |
| 3 | C7 | Regression + QA + epic close doc |

**Befintlig bas:** #606 (route + första gated slice), #591 (canonical route).

---

## Follow-up (ej Fas C)

- **Issue:** Skilj Godkänd från Genomförd i `reward_redemption` (`fulfilled_at` + förälder ”markera genomförd”)
- **Fas D (#586):** Minneskort i Min samling efter Genomförd
- **Fas E (#587):** Kistor/hyllor polish
