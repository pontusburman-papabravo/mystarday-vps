# För dig 10/10 — Kort agent-prompt

Använd när den fulla prompten (`docs/for-dig-agent-prompt.md`) gör att agenten bockar checklista istället för att lösa Jennys problem.

**Läs också:** `docs/for-dig-vision.md`, `docs/for-dig-spec.md`, `AGENTS.md`

---

Bygg **För dig** till 10/10.

## Vision

> För dig ska få föräldern att känna: *"Det här hade jag aldrig orkat sätta upp själv – men nu är det redan klart."*

För dig är en **guide från problem till fungerande rutin** — inte bibliotek, schema eller onboarding.

## Definition of Done — Jenny-test

Inom **5 sekunder**, **utan detaljer/scroll**, ska en ny förälder svara på:

1. Vilket problem löser detta?
2. Vad händer om jag trycker Aktivera?
3. Är det tryggt?

Plus: `npm run test:gate` grön. Mobil först. POS OK.

## Mandat

- Produktvision > befintlig kod. **Stop Rule:** ändra arkitektur om legacy hindrar visionen — aldrig sämre produkt för kodens skull.
- **Scope:** endast För dig. Annat → TODO, implementera inte.
- Anti-patterns: fler steg/modaler/block — **ta bort något om du lägger till**.
- Självgranskning: skulle Jenny fortfarande skriva *"jag förstår inte vad som händer"*?

## Riktning (du avgör hur)

- `headline` utfallscopy i config + UI (inte mål-slug som rubrik)
- Bekräftelse = **beslutsskärm** (✓ lägger till / ⚠️ ersätter / 👧 gäller / ✓ ändra senare) — detaljer bakom *Visa detaljer*
- Backend plan-preview → beslutspunkter, inte rå schema-lista i standardvy
- *Bra nästa steg för [namn]* i rekommendationer

**Filer:** `src/lib/for-dig-config.js`, `src/lib/for-dig-activate.js`, `src/routes/for-dig.js`, `public/js/for-dig.js`

**Branch:** `cursor/for-dig-10-10-2c04`

## Sista raden

Bygg den **enklaste** lösningen — inte checklistan. Målet: *"Nu förstår jag exakt vad som kommer hända."*
