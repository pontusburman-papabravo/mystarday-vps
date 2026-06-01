# Parity Manifest — iOS ↔ Android (SPOT)

**Single point of truth.** Engineering underhåller denna fil. Uppdateras vid varje **Gate 24**-körning och när **Gate 24 FAIL** (re-open).

**Polsia Gate 24:** #2143329 · **Förutsättning:** Sprint **23A** #2143273 = GREEN.

---

## Signering

| Fält | Värde |
|------|--------|
| Datum | YYYY-MM-DD |
| Git commit (prod) | |
| iOS-enhet | modell + iOS-version |
| Android-enhet | modell + Android-version (låg/mellanpris) |
| Signerad av | |

---

## Parity Manifest (6 områden)

| # | Område | iOS ✅/❌ | Android ✅/❌ | Owner | Senast verifierad | Anteckning |
|---|--------|----------|---------------|-------|-------------------|------------|
| 1 | Feature-paritet | | | | | schema, belöningar, barnvy, inställningar |
| 2 | Onboarding | | | | | samma slutläge (Apple / Google) |
| 3 | Push | | | | | token, notis <60s, tap → route |
| 4 | PG / device_mode | | | | | barnläge, PIN, back/switcher |
| 5 | Child mode | | | | | barnlogin, avbockning, stjärnor |
| 6 | Analytics | | | | | samma event-typer vid samma åtgärder |

**Gate 24 GREEN:** alla 6 rader ✅ på **båda** plattformar.

---

## Divergens-policy

| Typ | Åtgärd |
|-----|--------|
| **Beteende-bugg** (samma feature, fel på en plattform) | Omedelbar fix — **inte** ny feature |
| **Feature-gap** (finns bara på iOS) | Feature → **owner** + manifest-rad ❌ tills löst |
| **Gate 24 FAIL** | Re-open Gate 24 · uppdatera denna fil · ny signering |

**72h-regel:** Kända divergenser från Gate 24 ska ha plan inom **72 timmar** (fix deployad eller manifest uppdaterad med godkänd undantagsrad + owner).

---

## Kill switches (Release OS)

| Switch | ID / flag | När PÅ | Effekt |
|--------|-----------|--------|--------|
| **23A** | `KILL_SWITCH_23A` / `feature:android_smoke_gate` | Incident, 23A FAIL, eskalering | Blockerar **23B** · Android smoke-path stängd för bred release |
| **24** | `KILL_SWITCH_24` / `feature:parity_gate_bypass` | Akut 9B (sällsynt) | Kräver **produktägare-signering** + 72h remediation · 9B tillåten utan full manifest |

**Policy:** Kill switches dokumenteras i PR + `ios-städ.md` rollback-tabell. Stäng AV när 23A GREEN / Gate 24 GREEN.

---

## Koppling 23A ↔ Gate 24

| 23A-status | Gate 24 | 23B |
|------------|---------|-----|
| **FAIL** | Ej starta | **Blockerad** · 48h eskalering |
| **GREEN** | Kör parity + uppdatera manifest | Tillåten (bugfix containment) |
| **GREEN + Gate 24 FAIL** | Re-open · manifest | 23B endast parity-fixar |
