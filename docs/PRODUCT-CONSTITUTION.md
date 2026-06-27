# Product Constitution

> Fem regler som alla produktbeslut ska kunna testas mot — som Reacts designprinciper, men för denna produkt.

Använd i PR-beskrivningar: *"Hur uppfyller denna ändring konstitutionen?"*

---

## 1. Produkten leder

Användaren ska aldrig behöva lista ut nästa steg. Appen visar alltid vad som är meningsfullt härnäst — inte en meny av möjligheter.

**Test:** Kan en ny förälder öppna Hem och veta vad de ska göra utan att läsa instruktioner?

---

## 2. Produkten överraskar inte

Inget ska kännas oväntat eller kräva förklaring. Varje skärm ska kännas som en naturlig fortsättning på det som hände innan.

**Test:** Skulle en förälder undra "varför ser jag det här nu?" — om ja, har vi misslyckats.

---

## 3. Produkten visar alltid nästa steg

Det finns alltid ett tydligt nästa steg — eller en tydlig anledning till att inget behövs just nu. Tomma tillstånd är förbjudna.

**Test:** Finns det en tom skärm, en död knapp eller en väg utan fortsättning?

---

## 4. Produkten minskar osäkerhet

Efter varje handling ska föräldern känna: *"Jag verkar göra rätt."* Om användaren undrar "gör jag rätt?" har produkten inte gjort sitt jobb.

**Test:** Bekräftar copy eller UI att familjen är på rätt väg?

---

## 5. Produkten känns färdig

Efter registrering ska appen kännas mer komplett än före — inte som ett tomt verktyg som väntar på konfiguration.

**Test:** Känns det som att något redan är gjort åt familjen, inte som att de fått ett blankt formulär?

---

## Relation till andra dokument

| Dokument | Roll |
|----------|------|
| [FIRST-SUCCESS.md](FIRST-SUCCESS.md) | Mission, lagar, DoD |
| [first-success/brain.md](first-success/brain.md) | Domänlogik (användaren) |
| [first-success/coach.md](first-success/coach.md) | Produktlogik (presentation) |
| [first-success/day0.md](first-success/day0.md) | Dag 0-flöde |
| [first-success/landing.md](first-success/landing.md) | Landningscopy |

Konstitutionen är **över** implementation. Den ändras sällan. Brain-regler och coach-strategi ändras ofta — se Learning Loop i [brain.md](first-success/brain.md).
