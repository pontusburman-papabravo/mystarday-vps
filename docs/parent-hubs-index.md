# Föräldrahubbar 10/10 — Kravdokument (index)

**Status:** Kravdokument (2026-07) — **ingen implementation i denna PR**  
**Mall:** samma struktur som [För dig 10/10](for-dig-vision.md)  
**Branch (implementation):** `cursor/for-dig-10-10-2c04`  
**Arkitekturreferens:** [vuxenmeny-v2.md](vuxenmeny-v2.md)

---

## Kopiera till agent — hela uppsättningen

Kopiera länkarna nedan till en ny agent, eller peka agenten hit:

| Område | Vision | Agent-uppdrag |
|--------|--------|---------------|
| **Hem** | [hem-vision.md](hem-vision.md) | [hem-agent-prompt.md](hem-agent-prompt.md) |
| **Planering** | [planering-vision.md](planering-vision.md) | [planering-agent-prompt.md](planering-agent-prompt.md) |
| **Belöningar** | [beloningar-vision.md](beloningar-vision.md) | [beloningar-agent-prompt.md](beloningar-agent-prompt.md) |
| **Familj** | [familj-vision.md](familj-vision.md) | [familj-agent-prompt.md](familj-agent-prompt.md) |

**Referens (För dig — redan byggt):**

- [for-dig-vision.md](for-dig-vision.md)
- [for-dig-agent-prompt.md](for-dig-agent-prompt.md)
- [for-dig-spec.md](for-dig-spec.md)

---

## Snabbkopiering (råa sökvägar)

```
docs/hem-vision.md
docs/hem-agent-prompt.md
docs/planering-vision.md
docs/planering-agent-prompt.md
docs/beloningar-vision.md
docs/beloningar-agent-prompt.md
docs/familj-vision.md
docs/familj-agent-prompt.md
```

---

## Vad varje dokument innehåller

| Fil | Syfte |
|-----|-------|
| `*-vision.md` | Produktkompass, Jenny-test, informationshierarki, anti-patterns |
| `*-agent-prompt.md` | Definition of Done, mandat, scope, teknisk vägledning, arbetsflöde |

---

## Gemensam Definition of Done (alla hubbar)

Varje hub ska klara **sitt Jenny-test** (se respektive vision) **plus**:

- Mobil först (iPhone portrait, parent-magic dark theme)
- Inga POS-brott (se `.cursor/rules/010-product.mdc`, `040-parent-experience.mdc`)
- `npm run test:gate` grön vid implementation
- Commit + PR med POS-citat och Jenny-test-resultat

---

## Avgränsning mot För dig

| Flik | Roll | Inte |
|------|------|------|
| **Hem** | *Här är läget* — status, ett nästa steg | Coach-katalog, byggverktyg |
| **Planering** | *Jag vill planera* — bygga och justera | Daglig status, rekommendationer |
| **Belöningar** | *Stjärnor och belöningar* — hantera och följa | Schema, familjeadmin |
| **Familj** | *Vilka är med?* — barn, vuxna, pedagoger | Inställningar, prenumeration |
| **För dig** | *Här är vad jag rekommenderar* — problem → rutin | (se [for-dig-vision.md](for-dig-vision.md)) |

---

## Jenny-test — översikt

| Hub | Tre frågor (inom 5 sek, utan scroll) |
|-----|--------------------------------------|
| Hem | Hur går det idag? · Vad ska jag göra nu? · Var hittar jag barnet? |
| Planering | Vad kan jag göra här? · Var går jag för veckoschema? · Var skapar jag aktivitet? (+ Veckoschema/Bibliotek/Kalender ovanför folden) |
| Belöningar | Vad väntar på mig? · Var hanterar jag belöningar? · Hur ser barnets stjärnor ut? |
| Familj | Vem ingår? · Hur lägger jag till någon? · Var ser jag ett barns detaljer? |

Detaljer och godkända målbilder finns i respektive `*-vision.md`.

---

*Senast uppdaterad: 2026-07-01*
