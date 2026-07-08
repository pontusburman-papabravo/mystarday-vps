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

## Min samling (Fas B, gate ON)

1. Öppna **Min samling** via `/child/collection` eller fliken 🏆.
2. **Shell:** Rubrik ”Min samling”, undertext ”Titta vad du har samlat”.
3. **Stjärnglas:** Lifetime-stjärnor (inte spendable saldo). Vid 0 — varm tomstatus, ingen skam-copy.
4. **Trofévägg:** Befintliga achievements som kort; tom vägg har uppmuntrande copy.
5. **Streak-kedja:** Dagar i rad från universe; neutral vid 0, guldton vid lång kedja.
6. **Ingen shop:** Ingen köp-UI, loot eller `ChildCollections` i vyn.

**Automatiserat:** `node --test test/barnets-samling-collection.test.js` (ingår i `npm run test:gate`).

## Min samling Fas D (gate ON)

1. **Minneskort:** genomförda belöningar (approved/auto) som varma kort.
2. **Belöningshylla:** samma minnen som objekt — inte shop.
3. **Diplom:** utmärkelser från achievements, streak, lifetime, minnen.
4. **Tomstatus:** varm copy om inga minnen.
5. **Ingen spendable saldo** i Min samling.

**Automatiserat:** `node --test test/barnets-samling-memory.test.js` (ingår i `npm run test:gate`).

## Skattkammaren v1 (Fas C, gate ON)

1. Öppna **Skattkammaren** via `/child/treasure` eller fliken 🎁.
2. **Saldo:** ”Du har X stjärnor att använda” (spendable, inte lifetime).
3. **Aktivt mål:** ”Du sparar till …”, progress ”X av Y stjärnor”, ”Bara N kvar” eller ”Du kan lösa in den här nu”.
4. **Statusar på kort:** Sparar · Kan lösas in · Väntar på vuxen · Genomförd.
5. **Godkänd:** Kort flash-banner efter förälder godkänner (≤2 s).
6. **Historik:** ”Belöningar jag sparat ihop till” — varm tomstatus om tom.
7. **Inlösen:** `requestRedeem` oförändrat; pending blockerar ny inlösen.
8. **Back:** Till Idag — inte WorldHub/Morgonhus.

**Automatiserat:** `node --test test/barnets-samling-treasure-v1.test.js` (ingår i `npm run test:gate`).

## Fas E — Årsbok + polish (gate ON)

1. Öppna **Min samling** (`/child/collection`).
2. **Årsbok:** Sektion ”Min årsbok” — horisontell bläddring mellan månadsuppslag (snap).
3. **Tomstatus:** Varm copy om inga månader med aktivitet ännu.
4. **Skattkammaren:** Belöningskort på visuell hylla; historik i kista-estetik.
5. **Ingen beteendeändring:** Inlösen, saldo, redeem oförändrat.

**Automatiserat:** `node --test test/barnets-samling-yearbook.test.js` (ingår i `npm run test:gate`).

## Passkriterier

- Gate ON och OFF: saldo, inlösen, pending, godkänd/historik fungerar.
- Gate ON: Min samling visar glas + trofévägg + streak + minneskort/hylla/diplom + årsbok utan shop-copy.
- Gate ON: Skattkammaren visar mål + progress + statusar + historik utan shop-copy.
- Gate OFF: legacy Min värld oförändrat.
- Inga ändringar i API `/api/me/rewards/:id/redeem`.
- Route/back/exit påverkar inte inlösenlogik.
