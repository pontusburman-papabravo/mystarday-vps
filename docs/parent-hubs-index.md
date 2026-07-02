# Föräldrahubbar 10/10 — Kravdokument (index)

**Status:** Operativ produktkonstitution (2026-07) — **Parent Hubs Complete (v1)**  
**Mall:** [parent-hub-vision-template.md](parent-hub-vision-template.md) (låst format)  
**Referens (För dig):** [for-dig-vision.md](for-dig-vision.md)  
**Branch (implementation):** `cursor/hem-vision-docs-6752`

---

## Kopiera till agent — hela uppsättningen

| Område | Vision | Agent-uppdrag | Status |
|--------|--------|---------------|--------|
| **Hem** | [hem-vision.md](hem-vision.md) | [hem-agent-prompt.md](hem-agent-prompt.md) | **Complete** |
| **Planering** | [planering-vision.md](planering-vision.md) | [planering-agent-prompt.md](planering-agent-prompt.md) | **Complete** |
| **Belöningar** | [beloningar-vision.md](beloningar-vision.md) | [beloningar-agent-prompt.md](beloningar-agent-prompt.md) | **Complete** |
| **Familj** | [familj-vision.md](familj-vision.md) | [familj-agent-prompt.md](familj-agent-prompt.md) | **Complete** |

**Referens (För dig — redan byggt):**

- [for-dig-vision.md](for-dig-vision.md)
- [for-dig-agent-prompt.md](for-dig-agent-prompt.md)
- [for-dig-spec.md](for-dig-spec.md)

---

## Gemensam konstitutionsstruktur

Alla hubbar följer [parent-hub-vision-template.md](parent-hub-vision-template.md):

| Byggsten | Syfte |
|----------|--------|
| **Filterregel** | Varje komponent måste motivera sin existens |
| **Beslutsregel** | Högst en primär handling per domän |
| **Priority Ladder** | Objektiv ordning vid konkurrens |
| **Exit Rule** | När användaren är "klar" |
| **Success Metrics** | PR-granskning utan subjektiv smak |
| **Copy-regel** | Rätt ton per hub |

Hubb-specifikt innehåll — inte ordagranna kopior. Se mallen för per-hub-filter och beslutsregler.

---

## Snabbkopiering (råa sökvägar)

```
docs/parent-hub-vision-template.md
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

## Gemensam Definition of Done (alla hubbar)

Varje hub ska klara **sitt Jenny-test** (se respektive vision) **plus**:

- Filterregel och beslutsregel verifierade
- Exit rule uppfylld
- Success metrics ifyllda i PR
- Mobil först (iPhone portrait, parent-magic dark theme)
- Inga POS-brott (se `.cursor/rules/010-product.mdc`, `040-parent-experience.mdc`)
- `npm run test:gate` grön vid implementation
- Commit + PR med POS-citat och Jenny-test-resultat
- **[Parent Hub Acceptance Checklist](qa/parent-hub-acceptance-checklist.md)** ifylld före merge

---

## QA & integration

| Dokument | Syfte |
|----------|--------|
| [qa/parent-hub-acceptance-checklist.md](qa/parent-hub-acceptance-checklist.md) | Återanvändbar checklista per hubb-PR |
| [qa/hub-integration-sweep.md](qa/hub-integration-sweep.md) | Integrationssweep efter parallell utveckling |


## Avgränsning mellan hubbar

| Flik | Roll | Filterregel (kort) | Inte |
|------|------|-------------------|------|
| **Hem** | *Här är läget* | Besvara tre frågor om dagen | Coach-katalog, byggverktyg |
| **Planering** | *Jag vill planera* | Hitta rätt byggverktyg | Daglig status, rekommendationer |
| **Belöningar** | *Stjärnor och belöningar* | Godkänna, hantera, följa | Schema, familjeadmin |
| **Familj** | *Vilka är med?* | Hitta, administrera, öppna person | Inställningar, prenumeration |
| **För dig** | *Här är vad jag rekommenderar* | Problem → rutin | (se [for-dig-vision.md](for-dig-vision.md)) |

---

## Jenny-test — översikt

| Hub | Tre frågor (inom 5 sek, utan scroll) |
|-----|--------------------------------------|
| Hem | Hur går det idag? · Vad ska jag göra nu? · Var hittar jag barnet? |
| Planering | Vad kan jag göra här? · Var går jag för schema? · Var skapar jag aktivitet? |
| Belöningar | Vad väntar på mig? · Var hanterar jag belöningar? · Hur ser barnets stjärnor ut? |
| Familj | Vem ingår? · Hur lägger jag till någon? · Var ser jag ett barns detaljer? |

Detaljer, priority ladder och godkända målbilder finns i respektive `*-vision.md`.

---

*Senast uppdaterad: 2026-07-01*
