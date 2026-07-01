# Parent Hub Acceptance Checklist

**Syfte:** Återanvändbar QA före merge av varje hubb-PR (Hem, Planering, Belöningar, Familj).  
**När:** Efter implementation, före merge till `cursor/for-dig-10-10-2c04` (och senare till `main`).  
**Relaterat:** [hub-integration-sweep.md](hub-integration-sweep.md) · [parent-hubs-index.md](../parent-hubs-index.md) · respektive `*-vision.md`

---

## Snabbchecklista (klistra in i PR)

```
□ Jenny-test passerar (tre frågor, <5 sek, utan scroll, iPhone SE)
□ Filterregel passerar (hubbens verb + kärnfråga)
□ Beslutsregel / priority ladder följs (högst en primär handling)
□ Exit rule följs (användaren vet vad som är klart)
□ iPhone SE utan scroll för primärt innehåll
□ npm run test:gate grön
□ Inga dubbla CTA eller parallella "gör det här nu"
□ Inga gamla banners / döda mount-points / legacy-duplicat
□ Copy följer vision (hubbens begrepp — se tabell nedan)
□ Navigation följer hubbansvar (länkar, inte duplicerar)
□ Inga scope-brott mot filterregeln
□ Gemensamma filer oförändrade eller medvetet koordinerade
□ SW-version bumpad om statiska assets ändrats
□ Screenshot eller kort inspelning bifogad (mobil)
```

---

## Per hubb — Jenny-test

| Hub | Tre frågor (utan scroll) | Vision |
|-----|--------------------------|--------|
| **Hem** | Hur går det idag? · Vad ska jag göra nu? · Var hittar jag barnet? | [hem-vision.md](../hem-vision.md) |
| **Planering** | Vad kan jag göra här? · Var går jag för schema/bibliotek? · Känns det överbefolkat? | [planering-vision.md](../planering-vision.md) |
| **Belöningar** | Vad väntar på mig? · Var hanterar jag belöningar? · Hur ser barnets stjärnor ut? | [beloningar-vision.md](../beloningar-vision.md) |
| **Familj** | Vem ingår? · Hur lägger jag till någon? · Var ser jag ett barns detaljer? | [familj-vision.md](../familj-vision.md) |

---

## Begrepp (får inte blandas)

| Hub | Äger begrepp | Datakälla | Inte här |
|-----|--------------|-----------|----------|
| **Hem** | undantag | `GET /api/family/readiness` | pending-UI, byggverktyg |
| **Belöningar** | pending | `GET /api/rewards/pending-requests` | undantags-copy på hub |
| **Familj** | medlemmar / personer / barnprofil | `family`, invites | push, GDPR, prenumeration |
| **Planering** | bygga innehåll / planera vardagen | hub-länkar | daglig status, coach |

---

## Scope — filterregel (snabbreferens)

| Hub | Får inte innehålla |
|-----|-------------------|
| **Hem** | Byggverktyg, schemaeditor, analytics-dashboard, flera coacher |
| **Planering** | Daglig status, coachning, rekommendationer (→ För dig) |
| **Belöningar** | `/skattkammaren` som primär förälder-CTA; schema; familjeadmin |
| **Familj** | Inställningar, push, GDPR, prenumeration (→ `/settings`) |

---

## Gemensamma filer — kontrollera vid varje PR

| Fil / område | Risk |
|--------------|------|
| `public/js/nav-config.js` | Dubbla paths, fel hub-ägare |
| `public/js/parent-magic-page-hubs.js` | Hero/mount-konflikt |
| `public/js/home-readiness.js` vs `pending-approvals.js` | Begreppsblandning |
| `public/sw.js` + `config/cache-version.json` | Version ur synk / bakåt |
| `public/css/parent-magic-common.css` | Magic-regression |
| Family routes / barnprofil | Redirect och canonical URL |

---

## Testkommando

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

## Plattforms-QA (efter alla fyra hubbar)

Manuellt användarflöde — inga enhetstester ersätter detta.

```
Hem → barnrad → daglig logg → tillbaka
     → Planering → Bibliotek → tillbaka
     → Belöningar → (pending?) → barnprofil / stjärnöversikt → tillbaka
     → Familj → barnprofil → tillbaka
```

**Mål:** Inga döda länkar, inga dubbla vägar till samma jobb, tillbaka-knappar landar rätt.

**Rapport (efter alla fyra hubbar):** [parent-hubs-platform-qa.md](parent-hubs-platform-qa.md)

---

## PR-mall (kort)

```markdown
## Jenny-test
- [ ] Tre frågor besvarade utan scroll (iPhone SE)
- Screenshot: …

## Scope
- Filterregel: …
- POS: …

## Tekniskt
- [ ] test:gate grön
- [ ] SW bump (om frontend)
- [ ] Acceptance checklist: docs/qa/parent-hub-acceptance-checklist.md
```

---

*Senast uppdaterad: 2026-07-01*
