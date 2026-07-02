# ADR — För dig Sprint 4 navigation defer (v1.1)

**Datum:** 2026-07-02  
**Status:** Accepted  
**Beslut:** Defer Sprint 4 nav-flytt till v1.1  
**POS:** Constitution §1 (one next step), PA-01 (no surprise nav)

---

## Kontext

Sprint 4 flyttar För dig till primär bottom nav och Bibliotek under *Mer* när metrics motiverar det (`docs/for-dig-spec.md` §9.1). vuxenmeny v2 använder `nav-config.js` med annan IA än legacy dashboard.

## Beslut

**Implementera inte Sprint 4 i v1 Completion Program.**

Skäl:

1. Metrics-trösklar (§9.1) är inte verifierade i prod-data
2. Nav-byte påverkar alla `live`-användare samtidigt — risk för förvirring utan mätunderlag
3. Legacy dashboard har redan För dig i bottom nav; vuxenmeny v2 har Planering-hub med bibliotek — omläggning kräver separat ADR + kommunikation (§22.4)

## Konsekvens

- `nav-config.js` oförändrad i v1
- Sprint 4 checkboxar i `for-dig-spec.md` förblir öppna tills metrics + flag-beslut
- Nästa fas: mäta 4 veckor → go/no-go enligt §9.1

## Alternativ som avvisades

- **A/B nav-test:** Förvirrande för föräldrar (spec §22)
- **Ship utan metrics:** Bryter mot spec §9.1 och POS no-surprise
