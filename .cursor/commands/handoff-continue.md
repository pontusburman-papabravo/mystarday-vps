# /handoff-continue — fortsätt från sparad handoff

Du tar över efter en tidigare agent-session.

## Gör

1. Läs **`.cursor/handoff/latest.md`** (obligatoriskt).
2. Om filen saknas eller är tom: be användaren köra `/handoff` i föregående session först.
3. Om **`.cursor/handoff/transcript-snapshot.txt`** finns och `latest.md` saknar detaljer: läs snapshot för komplettering — inte som primär källa.
4. Bekräfta kort: mål, vad som är klart, vad du ska göra härnäst (1–3 punkter).
5. Fortsätt arbetet. Uppdatera `latest.md` när du pausar eller avslutar.

## Regler

- Ändra inte scope utan att användaren godkänner.
- Håll sessionen smal — en logisk deluppgift i taget.
- Kör inte `npm run test:gate` om inte handoff-filen eller användaren uttryckligen ber om det.
