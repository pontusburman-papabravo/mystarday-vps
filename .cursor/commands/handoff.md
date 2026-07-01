# /handoff — spara session för ny agent

Skriv eller uppdatera **`.cursor/handoff/latest.md`** så en ny agent kan fortsätta utan att läsa hela chatten.

## Gör

1. Läs **`.cursor/handoff/context-state.json`** om den finns — inkludera **kontext %** i handoff-filen.
2. Läs `.cursor/handoff/TEMPLATE.md` som struktur.
3. Skriv `.cursor/handoff/latest.md` på svenska, kort och konkret (max ~80 rader).
4. Inkludera:
   - **Kontext** — `percent`, tokens, källa (`preCompact` = exakt, `estimated` = uppskattning)
   - **Mål** — vad sessionen skulle lösa
   - **Klart** — filer ändrade, tester körda, PR-status
   - **Kvar** — exakt vad som återstår (med filvägar)
   - **Beslut** — val du gjort som nästa agent inte ska riva upp
   - **Nästa steg** — max 3 punkter, en uppgift i taget
5. Svara med en kort bekräftelse som **börjar med kontext %** + text för nästa agent:

```
Kontext: XX% — handoff sparad.
Fortsätt enligt .cursor/handoff/latest.md. Scope: [en rad]
```

## Regler

- Skriv inte hela chatloggen — bara det nästa agent behöver.
- Peka på specifika filer, inte "hela codebasen".
- Om uppgiften är klar: skriv det tydligt under **Klart** och töm **Kvar**.
- Om kontext ≥60%: rekommendera ny agent efter handoff.
