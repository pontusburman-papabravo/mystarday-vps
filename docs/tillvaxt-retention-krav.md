# Tillväxt, retention & konkurrens — kravdokument (utkast v0.5)

**Skapad:** 2026-06-24  
**Status:** Första utkast — samlar beslut, data och prioriteringar från produkt-/tillväxtdiskussion.  
**Ägare:** Produkt (Pontus)  
**Baslinje:** 189 familjer (ej arkiverade), prod-diagnostik 2026-06-24

**Relaterade dokument:**

| Dokument | Innehåll |
|----------|----------|
| [`aktivering-exekveringsplan.md`](./aktivering-exekveringsplan.md) | Operativ 90-dagarsplan: P0-aktivering, build-ordning, KPI:er |
| [`act-1-ai-startschema-spec.md`](./act-1-ai-startschema-spec.md) | ACT-1 implementationsspec (template-first + AI-assist) |
| [`act-1-cursor-tasklist.md`](./act-1-cursor-tasklist.md) | Cursor-arbetsorder — epics och tickets |
| [`foraldaraktivering-7-dagar-spec.md`](./foraldaraktivering-7-dagar-spec.md) | 7-dagars aktiveringsprogram (A/B, Day 14 North Star) |
| [`referral-program.md`](./referral-program.md) | Värvningsprogram (ej byggt) |
| [`seo-handoff.md`](./seo-handoff.md) | SEO-strategi, indexerbara sidor, sitemap |
| [`kravspec-app-webb.md`](./kravspec-app-webb.md) | Produkt- & säkerhetskrav (plattform, roller) |
| `scripts/diagnose-churn.js` | Read-only churn/aktiveringsdiagnostik (prod) |

---

## 0. Sammanfattning (TL;DR)

Min Stjärndag har **189 familjer** men **hög churn** mätt som inaktivitet. Prod-data (2026-06-24) visar att problemet i första hand är **aktivering**, inte retention vecka 3+:

| Mått | Värde | Implikation |
|------|-------|-------------|
| Aktiva senaste 30 dagar | 51 % (97/189) | ~hälften borta |
| Någonsin aktiverade (första stjärnan) | **17 %** (32/189) | Största läckaget |
| Aldrig någon aktivitetssignal | **43 %** (81/189) | Registrerade men startade aldrig |
| Retention wall (≥14 dagar) | 26 % med aha vs 6,5 % utan | **4×** — aktivering är avgörande |

**North Star (oförändrad):** Family Day 14-retention — familj aktiv (förälderlogin *eller* barncompletion) dag 13–15 efter start.

**Strategisk prioritering (nästa 90 dagar):**

1. **Aktivering till första stjärnan** — AI-startschema, tydlig barn-inloggning, guidad första completion.
2. **Mätning & experiment** — aktiveringsprogram live, veckovis `diagnose-churn.js`, följ juni-kohorter vid dag 14.
3. **Tillväxt utan bloat** — SEO/copy (pågår), referral, co-parent-loop; feature-flaggade konkurrentsvar (varannan vecka, AI-bilder).
4. **Inte nu:** solo-läge, veckopeng, Apple Watch — löser inte 43 % “aldrig startat”.

---

## 1. Problembeskrivning

### 1.1 Symptom

- ~189 registrerade familjer; ~49 % inaktiva 30+ dagar.
- Entusiastisk feedback från **aktiva** familjer (särskilt NPF) står i kontrast till låg total aktivering.
- Juni 2026-signups (~73 familjer på ~2 veckor) visar 100 % “alive” i 14-dagarsfönster — **smekmånad**, inte bevis på löst retention.

### 1.2 Rotorsak (datadriven hypotes)

```
Registrering
    ↓
Onboarding känns tung / oklar (“tom canvas”)
    ↓
Barn loggar aldrig in / inget färdigt schema
    ↓
Ingen första stjärna (“aha”)
    ↓
App glöms (81 familjer utan aktivitetssignal)
```

**Sekundärt problem:** Bland de ~19 aktiverade familjer som varit med ≥14 dagar behålls bara ~26 % — retention efter aha behöver också förbättras, men **funneln till aha är smalare** och ska fixas först.

### 1.3 Affärskontext

- Merparten av befintliga familjer är `lifetime_free` → churn = **engagemangs-churn**, inte betal-churn.
- Konkurrenter (Oddrobo, Routined) attackerar samma NPF/rutin-nisch; vår differentiering är synk, belöning, pedagog-spår och multiplattform — men värdet nås bara om familjer **aktiverar**.

---

## 2. Mål & framgångsmått

### 2.1 Primära KPI:er

| KPI | Baslinje (2026-06-24) | Mål 30 dagar | Mål 90 dagar |
|-----|------------------------|--------------|--------------|
| Aktiveringsgrad (ever completed) | 16,9 % | **30 %** | **40 %** |
| Aktiva senaste 14 dagar | 46,6 % | 55 % | 65 % |
| Family D14-retention (aktiveringsprogram-kohort) | TBD (mät) | +10 pp absolut *eller* +20 % relativt kontroll | Bekräfta lovande experiment |
| Organiska klick (GSC) | 0 | Första klick | Trend uppåt |

### 2.2 Sekundära KPI:er

- Co-parent-inbjudan: andel familjer med ≥2 vuxna aktiva.
- Värvning: kvalificerade referrals/månad (när programmet är live).
- Win-back: återaktivering inom 7 dagar efter mejl.
- App Store: ranking i kategori Utbildning (Sverige) — baseline saknas.

### 2.3 Mätning

- **Veckovis:** `node scripts/diagnose-churn.js` på prod (read-only).
- **Admin:** Aktiveringsprogram → Retention (`GET /api/admin/activation-program/retention`).
- **Analytics:** `signup_completed`, onboarding-events, `cta_invite_co_parent_*`, landnings-CTA:er (whitelist i `src/routes/analytics.js`).
- **GSC:** sökord, indexering, klick (månatlig review).

---

## 3. Konkurrentlandskap

### 3.1 Oddrobo — “Veckoschema med bildstöd”

| Dimension | De | Vi |
|-----------|----|----|
| Synk förälder↔barn | ❌ (erkänner arkitekturbegränsning) | ✅ Kärnfunktion |
| Deluppgifter, timers | ✅ | ✅ |
| Sluttid | ❌ | ✅ `start_time` + `end_time` |
| Upprepning “varannan vecka” | ❌ (önskat i recensioner) | ❌ **Lucka — FEAT-1 boendeschema** |
| Utskrift + synk tillbaka | Papper/tavla (ingen digital synk) | Delvis (dagbok-utskrift, enkelriktad) → **FEAT-6** |
| Plattform | iOS | Web + iOS + Android |
| Belöningssystem | ❌ | ✅ Skattkammaren |

**Positionering:** “De är enkla men ensamma på en enhet — vi synkar hela familjen.”

### 3.2 Routined (DropDev AB)

| Dimension | De | Vi |
|-----------|----|----|
| Realtidssynk, barnvy, timers, stjärnor | ✅ Paritet | ✅ |
| AI-genererade bilder | ✅ | ❌ **Lucka — prio 2** |
| Solo-läge (vuxnas egna rutiner) | ✅ | ❌ Medvetet ej nu |
| Automatisk veckopeng | ✅ | ❌ Senare, flagga |
| Pedagog/proffs, rapporter | ❌ | ✅ |
| Recensionsvolym | ~2 (ny) | Etablerad bas |
| ASO | #191 Utbildning (SE) | Okänd — behöver baseline |

**Positionering:** “Samma kärna, plus pedagog-spår, webb/Android och mognad.”

### 3.3 NPF-guiden

- **Inte konkurrent** — innehålls-/coachingtjänst för föräldrar.
- **Partner/kanal:** deras målgrupp = vår målgrupp; deras produkt = förståelse, vår = verktyg.
- **Copy-lärdom:** validerat smärtspråk — *“mindre tjat, färre konflikter, lugnare vardag”* (implementerat på `/rutiner-npf-barn` 2026-06-24).

### 3.4 Konkurrensmatris (sammanfattning)

| Feature | Efterfrågan | Bloat-risk | Prioritet |
|---------|-------------|------------|-----------|
| Synk multi-användare | Hög | — | ✅ Finns |
| Varannan vecka / boendeschema | Hög (växelvis boende, Oddrobo-recensioner) | Låg | **P1** |
| AI-bildgenerering aktiviteter | Hög (differentiering + SEO) | Låg | **P2** |
| AI-startschema onboarding | Hög (churn-data) | Medel | **P0** |
| Skannbart utskriftsschema (foto → synk) | Hög (NPF, fysisk tavla) | Medel | **P2** |
| Automatisk veckopeng | Medel | Medel | P3 (flagga) |
| Solo-läge vuxna | Medel | **Hög** (positionering) | **Skippa** |
| Apple Watch | Låg | Låg | P4 |

**Princip mot bloat:** Allt nytt bakom `feature_flag` / `family_features`; default enkelt; avancerat under “Avancerat” eller per-familj beta.

---

## 4. Kravområden

### 4.1 Aktivering (P0) — “Första stjärnan”

**Mål:** Öka andel familjer som når första barncompletion inom 48 h från registrering.

| ID | Krav | Acceptanskriterium |
|----|------|-------------------|
| ACT-1 | **AI-startschema i onboarding** | Förälder beskriver barn (ålder, utmaningar, typisk dag) → system föreslår färdigt veckoschema med delsteg; förälder kan godkänna/redigera innan sparning |
| ACT-2 | **Tydlig barn-inloggning i onboarding** | Efter schema: obligatorisk eller starkt guidad PIN-setup + “visa barnet sin vy” (QR/länk/instruktion) innan onboarding markeras klar |
| ACT-3 | **Guidad första stjärna** | Efter schema: CTA “Ge första stjärnan nu” med steg-för-steg (förälder eller barn) |
| ACT-4 | **Aktiveringsprogram live** | `ACTIVATION_PROGRAM_ENABLED=true`, launch-at satt; nya familjer enrollas i kohort; admin retention-rapport fylls |
| ACT-5 | **Aha-mätning** | `parent_first_seen` / child completion loggas; retention wall synlig i admin |

**Beroenden:** LLM-provider (valfri env, graceful degrade utan nyckel).  
**Ej i scope v0:** Full AI-bildgenerering (se 4.4).

**Relaterat:** [`foraldaraktivering-7-dagar-spec.md`](./foraldaraktivering-7-dagar-spec.md), `src/lib/activation-program-*.js`.

---

### 4.2 Retention (P1) — efter aktivering

| ID | Krav | Status |
|----|------|--------|
| RET-1 | Win-back vid 18 dagars inaktivitet | ✅ Byggt; auto-approve default PÅ, admin-toggle |
| RET-2 | Veckosammanfattning med delbar höjdpunkt | ✅ Byggt (WhatsApp + tipsa vän) |
| RET-3 | Push dag 3/7/14 för **aktiverade** som slutat logga in | Krav — utöka befintlig scheduler |
| RET-4 | Co-parent-inbjudan som retention-loop | Delvis — förstärk CTA + mätning |
| RET-5 | Streaks, milstolpar, fira-effekter | ✅ Finns — säkerställ synlighet i barnvy |

**Win-back för icke-aktiverade (RET-1b):** Separat mejl/copy: “Ditt schema väntar — ge första stjärnan på 2 min” (inte samma som återaktivering av tidigare aktiva).

---

### 4.3 Tillväxt & förvärv (P1–P2)

#### 4.3.1 SEO & innehåll

| ID | Krav | Status |
|----|------|--------|
| SEO-1 | Cornerstone-sidor: morgonrutin, belöning, NPF, bildschema, alternativ-tavla | ✅ Live |
| SEO-2 | `sitemap.xml` — alla indexerbara sidor (15 URL) | ✅ Live |
| SEO-3 | Internlänkning från startsida (Guider-kolumn) | ✅ Live |
| SEO-4 | Smärtspråk i NPF-copy | ✅ `/rutiner-npf-barn` v323 |
| SEO-5 | Automatisk sitemap från `SEO_INDEXABLE_PATHS` | **Låst (D5)** — `GET /sitemap.xml` genereras i kod |
| SEO-6 | GSC-uppföljning månatlig; URL-inspektion nya sidor | Process |

#### 4.3.2 Betald & attribution

| ID | Krav | Status |
|----|------|--------|
| ADS-1 | Google Ads `AW-7601142474` via marketing-consent | ✅ |
| ADS-2 | Signup-konvertering via GA4-import (ingen separat Ads-etikett) | ✅ Beslut |
| ADS-3 | UTM på alla delningslänkar (veckomejl, referral, co-parent) | Delvis |

#### 4.3.3 Virala loopar

| ID | Krav | Status |
|----|------|--------|
| VIR-1 | Värvning **v0:** personlig `?ref=`-länk, spårning, admin-vy — **ingen belöning** | Spec: [`referral-program.md`](./referral-program.md) |
| VIR-1b | Värvningsbelöningar (trial/komponent) | **Senare** — efter `activation_rate_48h` > 25 % |
| VIR-2 | Co-parent-inbjudan | ✅ Finns — KPI + copy |
| VIR-3 | Professionella delningslänkar (rapporter) | ✅ Finns |

#### 4.3.4 ASO & partnerskap

| ID | Krav | Prioritet |
|----|------|-----------|
| ASO-1 | App Store-listning: titel/undertitel mot *bildschema, rutiner barn, NPF* | P2 |
| PART-1 | Utforska samarbete NPF-guiden (komplementär kanal) | P3 |

---

### 4.4 Produktfunktioner (konkurrenssvar, P1–P3)

| ID | Krav | Beskrivning | Prioritet |
|----|------|-------------|-----------|
| FEAT-1 | **Boendeschema** | Vecka A/B, varannan vecka, färg per hem, “mina dagar”, banner, handoff, notiser, utskrift “mina dagar”, synk för båda föräldrar. Barnvy: neutralt “idag”. **En release** — detalj: [`aktivering-exekveringsplan.md` §6.5.1](./aktivering-exekveringsplan.md#651-feat-1--boendeschema-p1) | P1 (efter ACT-1 A2) |
| FEAT-2 | **AI-bildgenerering** | Generera aktivitetsbild från titel/beskrivning; cache i R2; kvot per familj | P2 |
| FEAT-3 | **AI-delsteg** | “Gör dig klar” → föreslagna delsteg | P2 (kan ingå i ACT-1) |
| FEAT-4 | Automatisk veckopeng | Utöver stjärnor; kräver vuxengodkännande | P3, flagga |
| FEAT-5 | Solo-läge vuxna | Egna rutiner utan barn | **Avböjt** tillsvidare |
| FEAT-6 | **Skannbart utskriftsschema** | Kryssa på papper → fota i appen → bekräfta → stjärnor synkas online. **Paket: Basic** (`basic_app`). Detalj: [`aktivering-exekveringsplan.md` §6.5.2](./aktivering-exekveringsplan.md#652-feat-6--skannbart-utskriftsschema-p2) | P2 (efter `activation_rate_48h` > 30 %) |

---

### 4.5 AI-strategi

#### 4.5.1 AI i produkten

| Användning | Syfte | Koppling churn | Prioritet |
|------------|-------|----------------|-----------|
| Startschema onboarding | Ta bort tom canvas | Direkt P0 | **P0** |
| Bildgenerering aktiviteter | Differentiering, SEO | Indirekt (aktivering) | P2 |
| Delsteg-förslag | Mindre friktion vid skapande | Aktivering | P2 |
| Coach-rad i veckomejl | “Mindre tjat”-narrativ med data | Retention | P3 |

#### 4.5.2 AI i arbetsflöde (litet team)

- Churn/kohort-analys (script + tolkning).
- SEO-artiklar i skala (mall + review).
- App Store-recensionsbevakning.
- Support/feedback-triage.

#### 4.5.3 Tekniska krav AI

| ID | Krav |
|----|------|
| AI-INF-1 | Valfri integration — app fungerar utan `OPENAI_API_KEY` (eller vald provider) |
| AI-INF-2 | Feature-flagga per familj (`family_features`) för beta |
| AI-INF-3 | Kostnadskontroll: kvot per familj/dag; cache genererade bilder |
| AI-INF-4 | Inga barn-PII i prompts utan explicit samtycke; svenska som default-språk |
| AI-INF-5 | Admin: toggle + usage-logg |

---

### 4.6 Marknadsföring & copy

**Validerat smärtspråk** (NPF-guiden, Routined, egna användare):

> *Mindre tjat · Färre konflikter · Lugnare vardag*

| Yta | Krav | Status |
|-----|------|--------|
| `/rutiner-npf-barn` | H1, lead, meta, CTA med smärtspråk | ✅ |
| `/` hero | Redan “utan tjat” + lugnare vardag i eyebrow | Delvis — ev. förstärk subcopy |
| App Store / Play | Samma ram i beskrivning | Ej gjort |
| Win-back / aktiveringsmejl | Smärtspråk i ämnesrad | Krav |
| `/alternativ-bildschema-tavla` | Synk + belöning vs fysisk tavla/Oddrobo | ✅ Grund — kan vässas |
| FEAT-1 lanseringscopy | “Växelvis boende — båda föräldrar ser vems vecka det är” | Ej byggt |
| FEAT-6 lanseringscopy | “Häng upp på kylskåpet — fotografera när barnet är klart — stjärnorna hamnar i appen” | Ej byggt |

---

### 4.7 Teknisk grund (redan levererat i sprint)

| Område | Leverans | Version |
|--------|----------|---------|
| Analytics shim (`window.analytics`) | ✅ | platform-html |
| Analytics whitelist utökad | ✅ | analytics.js |
| Win-back auto-approve + admin toggle | ✅ | migration `1808500000000` |
| `diagnose-churn.js` | ✅ | scripts/ |

---

## 5. Leveransplan (förslag)

### Fas A — “Första stjärnan” (vecka 1–3)

- [ ] ACT-1 AI-startschema (MVP: text → schema-förslag, emoji-bilder)
- [ ] ACT-2–3 Barn-inloggning + guidad första stjärna i onboarding
- [ ] ACT-4 Verifiera aktiveringsprogram live för alla nya
- [ ] RET-1b Win-back-copy för icke-aktiverade
- [ ] VIR-1 v0 Referral-spårning + admin (ingen belöning)
- [ ] SEO-5 Auto-sitemap från `SEO_INDEXABLE_PATHS`
- [ ] Veckovis churn-rapport (process)

### Fas B — “Behåll & väx” (vecka 4–8)

- [ ] FEAT-1 Boendeschema (komplett: vecka A/B, färger, mina dagar, handoff, notiser, utskrift)
- [ ] VIR-1b Värvningsbelöningar (om v0-data motiverar)
- [ ] RET-3 Push för aktiverade som churnat
- [ ] ASO-1 App Store-optimering
- [ ] Utvärdera juni-kohorter vid dag 14 (go/no-go på ACT)

### Fas C — “Differentiera” (vecka 9–12)

- [ ] FEAT-2 AI-bildgenerering
- [ ] FEAT-6 Skannbart utskriftsschema (beta med 5–10 familjer)
- [ ] PART-1 Partner-utforskning NPF-guiden
- [ ] FEAT-4 Veckopeng (om data motiverar)

---

## 6. Beslut (låsta v0.3)

| # | Beslut | **Beslutat** |
|---|--------|--------------|
| D1 | LLM-provider för ACT-1 | **OpenAI v1** |
| D2 | Barn-PIN i onboarding | **Soft gate** + “hoppa över” |
| D3 | Referral | **v0 nu:** spårning + admin, ingen belöning. Belöningar → `activation_rate_48h` > 25 % |
| D4 | Solo-läge | **Skippa** tills aktivering ≥40 % |
| D5 | Auto-sitemap | **Bygg** — generera från `SEO_INDEXABLE_PATHS` |

---

## 7. Risker

| Risk | Sannolikhet | Åtgärd |
|------|-------------|--------|
| Juni-kohorter faller vid dag 14 utan ACT-fix | Hög | Prioritera Fas A före ny feature-bloat |
| AI-kostnad okontrollerad | Medel | Kvot + cache + flagga |
| “100 % alive” tolkas som framgång | Hög | Dokumentera i admin/dashboard |
| Konkurrent (Routined) växer snabbt i ASO | Medel | ASO + differentiation copy |
| Feature-bloat förvirrar nya användare | Medel | Flaggor + enkel default |

---

## 8. Bilaga A — Prod-baseline 2026-06-24

```
Total familjer: 189
Aktiva 7d:  52 (27,5%)
Aktiva 14d: 88 (46,6%)
Aktiva 30d: 97 (51,3%)
Churned 30d+: 92 (48,7%)

Ever activated: 32 (16,9%)
Never any signal: 81 (42,9%)

Retention wall (≥14d):
  WITH activation:    5/19 (26,3%)
  WITHOUT activation: 6/93 (6,5%)
```

Kör om månadsvis: `cd /var/www/mystarday && node scripts/diagnose-churn.js`

---

## 9. Bilaga B — Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-06-24 | 0.1 | Första utkast — churn-data, konkurrens, AI, SEO, prioritering |
| 2026-06-24 | 0.2 | FEAT-6 skannbart utskriftsschema (foto → synk) — konkurrensmatris, krav, Fas C |
| 2026-06-24 | 0.3 | D3 referral v0 (spårning, ingen belöning); D5 auto-sitemap låst |
| 2026-06-24 | 0.4 | FEAT-1 utökad till boendeschema (färger, mina dagar, banner) |
| 2026-06-24 | 0.5 | FEAT-1: hela scope i en release (handoff, notiser, utskrift inkluderade) |
| 2026-06-24 | 0.6 | D11: FEAT-6 foto-scan i Basic |

---

*Nästa steg: granska utkast v0.1 → lås P0-scope (ACT-1–4) → bryt ut implementationsspec för AI-startschema.*
