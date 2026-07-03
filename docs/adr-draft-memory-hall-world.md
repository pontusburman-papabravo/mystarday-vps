# ADR Draft — World 3 (Memory Hall)

**Status:** Draft — awaiting human creative decision (BL-012)  
**Not merged to `product-operating-system/14_DECISION_LOG.md` until approved.

---

## Context

Min Värld has two playable worlds: Morgonhuset (`routine_home`) and Trädgården (`garden`). A third world is planned. Multiple code paths already use the word "museum" for different concepts (skatt stats room, parent aggregate, WDB export frame).

---

## Options (no recommendation — product chooses)

### A — Separate world `memory_hall`

Third illustrated scene; entered via garden path or future gate. Exhibits = server-driven slots (trophies, milestones). **Pros:** Clear architecture reuse. **Cons:** New art + narrative scope.

### B — Morgonhus feature `routine_home_museum_frame`

Museum lives inside morgonhus as unlocked prop/frame, not a full world. **Pros:** Smaller scope, WDB node exists. **Cons:** Less exploration/discovery; different from garden world pattern.

### C — Skattkammaren room evolution

Upgrade existing `child-museum.js` stats room to illustrated playable diorama. **Pros:** Asset exists. **Cons:** Conflates skatt house with outdoor living worlds; IA mismatch.

---

## Reversible prep already done

Scaffold assumes **Option A** as the default integration path but does **not** enable navigation or final copy. Switching to B or C mainly affects pack + entry wiring, not the feature-gate pattern.

---

## Constraints (POS)

- Child protagonist — child taps, world responds
- No guilt / FOMO for missing days
- Celebration ≤2s, reduced-motion safe
- No parent dashboard on child Hem
