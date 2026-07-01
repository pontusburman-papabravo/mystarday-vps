# Cursor: /context och /handoff

Session-hantering för lokal Agent i Cursor IDE. Cloud Agents får inte `sessionStart`-hooken men kan läsa `.cursor/handoff/latest.md` manuellt.

## Kommandon

| Kommando | Syfte |
|----------|-------|
| `/context` | Visa kontextförbrukning utan agent-svar (hook returnerar `user_message`) |
| `/handoff` | Spara strukturerad sammanfattning i `.cursor/handoff/latest.md` |
| `/handoff-continue` | Ny agent läser `latest.md` och fortsätter |

## Verifiering i lokal Cursor IDE

1. **Hooks aktiva** — `.cursor/hooks.json` ska finnas i projektroten (committad).
2. **Kör `/context`** efter några meddelanden:
   - Förväntat: popup med `Kontext: XX%`, tokens, källa.
   - `continue: false` — ingen agent körs.
3. **Kör `/handoff`** innan du byter agent:
   - Förväntat: `.cursor/handoff/latest.md` skapas/uppdateras med mål/klart/kvar.
4. **Starta ny Agent** → kör `/handoff-continue`:
   - Förväntat: agent läser handoff och bekräftar nästa steg.
5. **Auto-snapshot vid hög kontext** — vid ≥75 % (eller manuell compaction) skriver `preCompact`-hooken auto-snapshot till `latest.md`.

## Kontextkällor (prioritet)

1. **preCompact** — exakt värde från Cursor vid compaction
2. **estimated** — transcript-filstorlek ÷ 4 + regel-overhead (default 80k tokens)
3. **cached** — senaste värde från `stop`- eller `preCompact`-hook (<30 min)
4. **cached_stale** — cachat värde äldre än 30 min (transcript saknas)

## Filer (session-lokala, gitignored)

```
.cursor/handoff/
  latest.md              # handoff-sammanfattning
  transcript-snapshot.txt # auto vid ≥75 % kontext
  context-state.json     # senaste kontextmätning
  TEMPLATE.md            # mall (committad)
```

## Usage-optimering

| Kontext | Rekommendation |
|---------|----------------|
| <60 % | Fortsätt i samma session |
| 60–74 % | Kör `/handoff` snart om arbetet fortsätter |
| ≥75 % | `/handoff` → ny agent → `/handoff-continue` |

**Tips för lägre kontextförbrukning:**

- `@`-referera specifika filer istället för att låta agenten söka brett
- Använd `/handoff` + ny agent vid stora refactors (slipper bära hela chatten)
- Stora filer (`schedule.js`, `dashboard.js`) — be agenten `grep` + chunk-read (se `.cursor/rules/large-files.mdc`)
- Undvik att läsa hela POS/runtime-dokument i varje session — peka på relevant sektion

## Env (valfritt)

| Variabel | Default | Beskrivning |
|----------|---------|-------------|
| `CURSOR_HANDOFF_RULES_OVERHEAD_TOKENS` | 80000 | Uppskattad regel-/system-overhead |
| `CURSOR_HANDOFF_THRESHOLD` | 75 | Auto-snapshot vid denna % |
| `CURSOR_HANDOFF_CACHE_MAX_AGE_MS` | 1800000 | Max ålder för cachad kontext (30 min) |
| `CURSOR_HANDOFF_CONTEXT_WINDOW` | 200000 | Fallback context window |

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test node --test test/handoff-context-lib.test.js
```
