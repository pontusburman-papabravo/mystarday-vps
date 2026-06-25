# QA Mobil — v1.2 review (v1.1 → v1.2)

**Datum:** 2026-06-25  
**Bas:** `docs/QA-mobil-fullstandig-protokoll.md` v1.1  
**Status:** Implementerad i v1.2 (scripts + runbook)

---

## Sammanfattning

v1.1 är **release-gate-klar som masterplan**. v1.2 stänger gapet mot automation: synkade ID (Z-kategori), `QA_MODE=gate`, gate core-loops, seed-kontrakt och 1-sida runbook.

---

## 1. Dokument ↔ automation — drift (fixad)

| Doc v1.1 | Script v1.0 | v1.2 |
|----------|-------------|------|
| Z01 (NavConfig) | `C03` | `Z01` |
| Z02–Z04 | `D04`, `D05`, `D08` | `Z02`–`Z04` |
| Z06 | `G10`, `G11` | `Z06` (en rad) |
| Z07 | `H12` | `Z07` |
| Z08–Z09 | `O09`, `O10` | `Z08`–`Z09` |
| Z10, Z12 | `P12`, saknades | `Z10`, `Z12` |
| Z11 | `Q11` | `Z11` |
| Z13 | `S08`, `S09` | `Z13` |
| A02 (manifest+ikon) | `A02` + `A04` | `A02` kombinerad |
| C05 auth API | `C05` + `C06` | `C05` kombinerad (full mode) |
| C10 logout | `/login` eller `/` | **Endast** `/login` |

**Single source of truth:** `scripts/lib/qa-gate-ids.mjs`

---

## 2. Release Gate — automation efter v1.2

| Kategori | Auto (v1.2) | Manuell (runbook) |
|----------|-------------|-------------------|
| Infra A01, A05–A08 | ✓ API | — |
| Auth C01–C02, C04, C10 | ✓ UI | — |
| Boot Z01, Z04–Z06 | ✓ UI | — |
| Hem D01–D02, D11 | ✓ UI | — |
| Planering E01–E03 | ✓ UI + hub-länkar | — |
| Daglig logg F01, F04–F08 | ✓ load + API toggle/pause | — |
| Schema G01 | ✓ load | **G04–G05** UI |
| Belöningar I01, I03 | ✓ load + approve | **I04** neka |
| Familj K01–K02 | ✓ UI | **K03** klickprofil |
| Barnprofil L01–L02 | ✓ UI | **L07–L08** tabs |
| Barn O01, O03, O06, P01, P03–P04, Q01, Q04, R01 | ✓ PIN + UI | — |
| Barn system | — | **S02, S04–S05, S07** PG |
| Flerbarn T01 | ✓ dashboard-stats | **T02, T04–T05** |
| Mobil U01–U02 | ✓ per läge | — |

**Gate auto target:** ~43 ID · **Manuell runbook:** 13 ID

---

## 3. M1–M8 → explicit A/U-rader (rekommendation)

Global baseline M1–M8 förblir **implicit oracle** för `[M]`-rader. v1.2 mappar M1/M8 till explicita **`U01`/`U02`** i gate och full auto.

---

## 4. Top 30 manuella (prioriterad regression)

1. G04 — Lägg till schemaaktivitet  
2. G05 — Redigera schemaaktivitet  
3. I04 — Neka belöning  
4. S02 — Parental Gate (PIN)  
5. S04 — Byt barn (UI-flöde)  
6. S05 — Förälder-meny bakom gate  
7. S07 — Barn logout  
8. T02 — Separata scheman  
9. T04 — Byte barn isolerar data  
10. T05 — Erik PIN efter Astrid-session  
11. K03 — Familj → barnprofil  
12. L07 — Setup-tab  
13. L08 — Barnvy-handoff  
14. F02 — Retroaktiv logg  
15. F03 — Ge stjärnor manuellt  
16. I05 — Skapa belöning  
17. N02 — Notisinställningar  
18. O02 — Fel PIN  
19. P02 — Sub-steps  
20. Q02 — Mål i Skattkammaren  
21. V01 — Tom dag  
22. V04 — Ogiltig deep link  
23. M02 — Rapport export (gated)  
24. E07 — Kalender specialdag  
25. H02 — Aktivitetsbibliotek CRUD  
26. J02 — För dig mål  
27. N07 — Radera konto (staging only)  
28. X03 — Keyboard overlap (exploratory)  
29. X13 — Barn/forälder-gräns  
30. B06 — Registrering ny familj (staging)

---

## 5. Automatiseringsmatris (v1.2)

| Lager | Antal | Kommando |
|-------|-------|----------|
| Release Gate §0 | 56 explicit ID | `npm run qa:mobile-gate` |
| Gate auto | ~43 | `artifacts/mobile-full-qa/gate-results.json` |
| Gate manuell | 13 | `docs/QA-mobil-release-gate-runbook.md` |
| Full §3 | 225 | `npm run qa:mobile-full` |
| §Z boot | 14 | Ingår i full; Z01/Z04–Z06 i gate |
| §8 Exploratory | 15 | Manuell |

---

## 6. Seed/data-kontrakt (profiler)

| Profil | Syfte | Krav |
|--------|-------|------|
| **happy** (default) | Gate + regression | 2 barn, PIN OK, aktiviteter idag, ≥1 belöning |
| **empty-day** | V01 | Barn utan schema idag — separat seed (ej default) |
| **pending-reward** | I03/I04 | Barn med saldo + affordable reward — happy-profil räcker |

Default: `scripts/seed-smoke-family.mjs` = **happy**.

---

## 7. Known flaky areas

| Område | Symptom | Mitigation |
|--------|---------|------------|
| Onboarding redirect | Fastnar på `/onboarding` | Script hoppar till `/dashboard` |
| Child-login utan session | Lista tom | Manual name fallback |
| Q04 redeem | Ingen affordable reward | Seed stjärnor manuellt / gate skip I03 |
| T01 samma saldo | Båda barn 0 stjärnor | OK för smoke; manuell ≠ om krävs |
| Prod PIN 1112 | Globalt upptagen | Använd 4829/7391 |
| Cookie-banner | Täcker CTA | `acceptCookies()` i script |
| PWA cache | Gammal bundle | Hard refresh / SW bump |

---

## 8. Duplicat / trim (v1.2)

- **U01/U02:** Gate kör en aggregerad rad per roll; full kör per route.
- **A02+A04, C05+C06:** Sammanslagna i full mode.
- **Z vs användarflöde:** Boot-kontrakt endast i §Z — inte dubblerade som D04 i §3.

---

*Referens: `scripts/lib/qa-gate-ids.mjs`, `scripts/smoke-mobile-full-qa.mjs`*
