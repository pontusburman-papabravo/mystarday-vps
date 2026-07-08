# QA — Belöningsflöde regression (#592)

Verifierar att befintligt belöningsflöde fungerar efter #588–#591. Ingen ny produktfunktion — endast regression.

**Konto:** QA-testkonto enligt [`docs/qa-test-account.md`](../qa-test-account.md) (barn Anna + förälder).

**Automatiserat:** `node --test test/barnets-samling-rewards-regression.test.js` (ingår i `npm run test:gate`).

## Gate ON (`barnets_samling`)

1. Logga in som barn (Anna) med flaggan aktiv för familjen.
2. Öppna **Skattkammaren** via `/child/treasure` eller fliken 🎁.
3. **Saldo:** Stjärnor visas i header (”Du har X stjärnor att använda”).
4. **Aktivt mål:** Progress och ”Du sparar till …” syns om mål finns.
5. **Inlösen:** När saldo räcker — primär CTA ”Fråga om att lösa in” → toast om förfrågan skickad.
6. **Väntar på vuxen:** Efter inlösenförfrågan — banner/rad med ”Väntar på vuxen”, ingen ny inlösen-CTA för samma belöning.
7. **Godkänd/inlöst:** Efter förälder godkänner — historiksektion ”Belöningar jag sparat ihop till” med Genomförd.
8. **Route/back:** Tillbaka/exit från Skattkammaren → Idag (`/child/today`). Saldo och pending oförändrat efter navigering tillbaka.
9. **Ingen dubbel inlösen:** Försök lösa in samma belöning igen medan pending — ska blockeras (409/toast).

## Gate OFF (legacy)

1. Familj utan `barnets_samling` (eller flagga av).
2. Öppna **Min värld** / legacy Skattkammaren (`/child/world` eller rewards-flik).
3. **Saldo:** Stjärnburken visar antal stjärnor.
4. **Inlösen / pending / troféhylla:** Samma flöde som före #591 (legacy UI).
5. **Exit:** Tillbaka går till hub/Morgonhus enligt legacy — inlösen påverkas inte.

## Förälder (smoke)

1. Logga in som förälder, öppna godkännanden för väntande inlösen.
2. Godkänn eller neka — barnvy uppdateras vid refresh/navigering.

## Passkriterier

- Gate ON och OFF: saldo, inlösen, pending, godkänd/historik fungerar.
- Inga ändringar i API `/api/me/rewards/:id/redeem`.
- Route/back/exit påverkar inte inlösenlogik.
