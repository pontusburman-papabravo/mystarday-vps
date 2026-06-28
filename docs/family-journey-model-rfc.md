# Family Journey Model — RFC

**Status:** Utkast — workshop-underlag  
**Version:** 1.0-rc  
**Appendix (efter godkännande):** [Implementation contract](./family-journey-implementation-contract.md)

---

## Kärnan i en mening

> **Produkten ska inte organisera sig kring skärmar, flöden eller program — den ska organisera sig kring var familjen befinner sig i sin resa och vilket nästa meningsfulla steg som hjälper dem framåt.**

Om den principen accepteras blir onboarding, handoff, dashboard, notiser, experiment och analytics konsekvenser av samma modell — inte separata system som var och en försöker avgöra *vad händer härnäst?*

---

# 1. Problemet

Produkten behöver inte *ännu ett system*. Den består idag av **flera parallella modeller av samma verklighet**.

```
Onboarding tror...        → onboarding_completed = true betyder "klar"
Dashboard tror...           → readiness, CTAs och handoff-banner avgör "nästa steg"
7-dagarsprogrammet tror...  → dag 1–7, aha-modal, cohort
Analytics tror...           → skärmflöden och funnel-events
Notiser tror...             → egna schedulers med egna trösklar
Produktlogik (Engine) tror... → parallella behov, policy och milstolpar
```

Alla försöker besvara samma fråga:

> **Vad behöver familjen just nu?**

Det är grundproblemet. Inte att onboarding är fel, utan att **ingen delad domän** finns om var familjen befinner sig och vad som är meningsfullt härnäst.

Konsekvensen är att varje ny funktion lägger till ännu ett beslutssystem — och att produkten känns fragmenterad för familjen även när varje del fungerar tekniskt.

---

# 2. Observationerna

Konkreta symptom i dagens produkt och kod:

| Symptom | Var det syns | Varför det skadar |
|---------|--------------|-------------------|
| Onboarding avslutas innan barnet använt produkten | `onboarding.js` → `onboarding_completed = true` → `/dashboard` | Familjen "är klar" utan North Star |
| Handoff ligger utanför onboardingens klimax | `dashboard-child-handoff.js` på Hem; `onboarding-activation.js` flag-gated | Barnet ska börja *i* onboarding, inte som sidospår |
| Dashboard innehåller specialfall | `home-readiness.js`, `dashboard-cta.js`, `encouragementCopy()` | Flera parallella beslut på samma skärm |
| 7-dagarsprogrammet är ett separat system | `parent_activation_program`, `/api/me/activation-program/*` | Egen motor — kopplad till program, inte resan |
| Analytics mäter skärmflöden | `funnel_onboarding_completed`, `activation_program_*` | Svårt att se familjens utveckling |
| Fel framgångsmått | `onboarding_completed` vs `child_first_completion` + `parent_first_completion_seen` | Fel KPI som "lyckades" |
| Firande kopplat till program | `activation-program-aha-card.js` kräver aktivt program | Aha missas utanför experiment |
| Flera sanningar om "aktivering" | `family_activation_state`, Engine facts, program-analytics | Samma familj, olika svar |

**North Star (förslag):** `first_success` = barnet har slutfört minst en aktivitet **och** föräldern har sett resultatet. Det är inte `onboarding_completed`.

---

# 3. Designprinciper

## 1. En domän, många kanaler

Webb, native, push, e-post och admin ska läsa **samma Journey Context** — inte var sin tabell, flagga eller if-sats.

## 2. Klienter frågar, domänen svarar

Alla klienter frågar samma sak: *vad bör vi göra nu?* De läser inte rå DB och fattar inte egna produktbeslut.

## 3. Livsfas beskriver var familjen befinner sig

En familj har exakt **en** livsfas (Phase) åt gången. Fasen svarar på: *var är vi i resan?* — inte *vad ska vi göra härnäst?*

## 4. Milstolpar är historik

Milstolpar (Milestones) är **append-only**: vad som hänt. De försvinner inte när fasen ändras. De är bevis, inte navigation.

## 5. Journey Context beskriver vad som behövs härnäst

Context svarar på: *vad bör produkten göra nu?* — rekommenderade upplevelser, blockering, firande, prioritet. Det är **inte** samma sak som livsfas.

## 6. Context är tunt — copy lever separat

Context innehåller nycklar till upplevelser, inte rubriker och brödtext. Copy och presentation hämtas från **Experience Registry** (versionerbar innehållskatalog).

## 7. Kanaler renderar, domänen avgör

Dashboard, onboarding, push och modaler **projicerar** Context. De ska inte härleda fas, prioritera upplevelser eller välja firande själva.

## 8. Livscykeln beskriver vad familjen behöver härnäst — inte bara vad de gjort

Historik: *skapat barn, lagt schema, loggat in.*

Rekommendation: *nästa viktigaste sak är att barnet provar.*

Det är den princip som förklarar varför **livsfas**, **milstolpe** och **Journey Context** är tre olika begrepp.

---

# 4. Journey Context — huvudidén

Journey Context är det gemensamma kontrakt som förenar alla ytor.

> **Alla klienter frågar samma sak.**  
> Inte: alla klienter läser samma tabell.

Dashboard, onboarding, push, e-post och barnvy ska alla kunna säga: *"Vad säger Context just nu?"* — och rendera svaret via Registry.

## Tre begrepp — håll isär dem

| Begrepp | Fråga det besvarar | Exempel |
|---------|-------------------|---------|
| **Livsfas (Phase)** | Var befinner sig familjen i resan? | `FIRST_USE` |
| **Milstolpe (Milestone)** | Vad har familjen uppnått? | `routine_ready`, `first_success` |
| **Journey Context** | Vad bör produkten göra nu? | `blocking_experience: handoff_to_child` |

`FIRST_USE` beskriver *var* familjen är. Context beskriver att *handoff* är det som behöver hända härnäst. Blanda inte ihop dem.

## Kontrakt (tunt — ingen copy)

```ts
interface JourneyContext {
  phase: Phase;

  /** Milstolpar som inträffat (nyckel → ISO-8601) */
  milestones: Record<MilestoneKey, string>;

  /** Prioriterade upplevelser (nycklar till Experience Registry) */
  recommended_experiences: ExperienceKey[];

  /** Det som måste hända innan resten (t.ex. handoff) */
  blocking_experience: ExperienceKey | null;

  /** Firande att visa (nyckel till Registry), eller null */
  celebration: CelebrationKey | null;

  /** Ordning vid konkurrens mellan upplevelser */
  priority: 'handoff' | 'celebration' | 'coach' | 'none';
}
```

**Medvetet utelämnat:** `headline`, `body`, `cta`, `route`, `theme` — dessa kommer från Experience Registry.

## Experience Registry

Versionerbar katalog: nyckel → copy + presentationshints. Copy kan ändras utan att domänkontraktet ändras.

## Exempel: `FIRST_USE` — handoff behövs

Familjen har schema och belöningar men barnet har inte loggat in.

```json
{
  "phase": "FIRST_USE",
  "milestones": {
    "routine_ready": "2026-06-28T10:00:00Z",
    "rewards_ready": "2026-06-28T10:05:00Z"
  },
  "recommended_experiences": ["handoff_to_child"],
  "blocking_experience": "handoff_to_child",
  "celebration": null,
  "priority": "handoff"
}
```

Klienten slår upp `handoff_to_child` i Registry → "Låt barnet börja".

## Exempel: `first_success` — firande som klimax

```json
{
  "phase": "BUILDING_ROUTINE",
  "milestones": {
    "child_first_completion": "2026-06-28T18:00:00Z",
    "parent_saw_completion": "2026-06-28T18:05:00Z",
    "first_success": "2026-06-28T18:05:00Z"
  },
  "recommended_experiences": ["celebrate_first_success"],
  "blocking_experience": null,
  "celebration": "celebrate_first_success",
  "priority": "celebration"
}
```

Firandet är klimax — inte redirect till dashboard.

## Ägarskap

Journey Context ägs av **en central domäntjänst**. Inga klienter implementerar egen journey-logik.

---

# 5. Domänmodellen

Först här — som svar på problemet, inte som utgångspunkt.

## 5.1 Livsfaser (Phase)

Var familjen befinner sig i sin relation till produkten. **Exakt en** fas åt gången.

| Fas | Betydelse |
|-----|-----------|
| `DISCOVERING` | Känner till produkten, inget konto |
| `SETTING_UP` | Konto och konfiguration pågår |
| `FIRST_USE` | Rutin finns; barnet ska börja använda |
| `BUILDING_ROUTINE` | `first_success` uppnått; vanor etableras |
| `ESTABLISHED_ROUTINE` | Stabil vardagsloop |
| `EXPANDING` | Utökar: syskon, kväll, medförälder, pedagog |
| `INDEPENDENCE` | Barnet driver själv; förälder följer lätt |

Fasövergångar är deterministiska: samma milstolpar + regler → samma fas.

### Första leverans (förslag)

```
SETTING_UP  →  FIRST_USE  →  first_success  →  BUILDING_ROUTINE
```

Övriga faser definieras för helhetsbild; detaljer i implementation contract efter godkännande.

## 5.2 Milstolpar (Milestone)

Append-only historik — vad familjen har uppnått.

| Milstolpe | Betydelse |
|-----------|-----------|
| `account_created` | Konto registrerat |
| `child_created` | Barnprofil skapad |
| `routine_ready` | Schema sparat |
| `rewards_ready` | Belöningar sparade |
| `handoff_started` | Förälder initierade barninloggning |
| `handoff_deferred` | Förälder valde senare |
| `child_logged_in` | Barn autentiserat |
| `child_first_completion` | Barn checkade av första aktivitet |
| `parent_saw_completion` | Förälder såg resultat |
| `first_success` | `child_first_completion` ∧ `parent_saw_completion` — **North Star** |
| `co_parent_invited` | Inbjudan skickad |
| `streak_3` | Tre dagars streak |

`first_success` är en milstolpe, inte en livsfas. När den inträffar → fas blir `BUILDING_ROUTINE`.

## 5.3 Fasövergångar (förslag)

```
account_created                              → DISCOVERING / SETTING_UP
routine_ready ∧ rewards_ready                → FIRST_USE
first_success                                → BUILDING_ROUTINE
(stabil streak + regelbunden användning)     → ESTABLISHED_ROUTINE  (senare)
```

## 5.4 Metrics — familjens resa, inte skärmar

| Metric | Definition |
|--------|------------|
| `first_success_within_48h` | `first_success` inom 48h från `account_created` |
| `handoff_completion_rate` | `handoff_started` → `child_logged_in` |
| `phase_distribution` | Andel familjer per livsfas |
| `phase_transition_latency` | Median tid mellan två livsfaser |
| `milestone_funnel` | account → routine → handoff → first_success |

Befintliga analytics-events (`child_login_success`, `child_first_completion`, `parent_first_completion_seen`) behålls och kan mata milstolpar.

## 5.5 Terminologi

| Använd i domändokument | Undvik i domändokument |
|------------------------|------------------------|
| Livsfas (Phase) | state, status, coreState |
| Milstolpe (Milestone) | achievement (som domänbegrepp) |
| Journey Context | readiness, activation (som domän) |
| Family Journey Model | Journey Engine (i RFC) |

Implementation får ha egna modulnamn internt. RFC:n beskriver **domänen**.

---

# 6. Mapping från dagens kod

Hur befintliga system hör hemma i modellen.

| Dagens system | Roll i ny modell |
|---------------|------------------|
| `parent.onboarding_completed` | **Infrastruktur** (auth/routing) — inte produktframgång |
| `onboarding.js` steg 1–4 | `SETTING_UP` — skapar milstolpar |
| `onboarding.js` steg 5–6 | Ska rendera Context under `FIRST_USE` |
| `dashboard-child-handoff.js` | Handoff-**action** — triggas av Context, inte egen gate |
| `activation-program-aha-card.js` | Firande via `celebration` i Context |
| `parent_activation_program` | Avvecklas → innehållsregler i `BUILDING_ROUTINE` |
| `home-readiness` (coach-del) | Ersätts av Context + Registry |
| `family_activation_state` | Ersätts gradvis av livsfas + milstolpar |
| `GET /api/family/first-success` (Engine) | Parallell under övergång; facts kan mata domänen |
| `dashboard-home-hub.js` `encouragementCopy()` | Produktbeslut ska via Context, inte `stars >= 5` (visuella effekter undantagna) |

### Kanaler blir projektorer

| Kanal | Gör |
|-------|-----|
| Onboarding 5–6 | Renderar `blocking_experience` |
| Dashboard | Renderar Context |
| Barnvy | Rutin från data; firande från milstolpe/Context |
| Push / e-post | Registry-copy utifrån Context |
| 7-dagarsinnehåll (mål) | `recommended_experiences` i `BUILDING_ROUTINE` |
| Admin | Läser fas + milstolpar |

---

# 7. Öppna frågor och beslut

## Öppna frågor

| # | Fråga |
|---|-------|
| 1 | Per-barn eller per-familj för `FIRST_USE` / handoff när flera barn? |
| 2 | Add-child-flöde: vilken fas och vilka milstolpar? |
| 3 | Befintliga enrollees i 7-dagarsprogram — tvångsmigrera eller låta löpa ut? |
| 4 | Hur slås Product Engine och Journey Model ihop på sikt? |
| 5 | Pedagog-only föräldrar — egen fas eller undantag? |

## Beslut som behövs (workshop)

| # | Beslut | Förslag |
|---|--------|---------|
| 1 | North Star | `first_success` = completion ∧ parent saw |
| 2 | Onboarding-klimax | "Låt barnet börja" — inte "Gå till dashboarden" |
| 3 | Context utan copy | Registry som separat lager |
| 4 | Första leverans | SETTING_UP → FIRST_USE → first_success |
| 5 | 7-dagarsprogram | Avvecklas till BUILDING_ROUTINE-innehåll |
| 6 | `onboarding_completed` | Kvar för auth; inte produkt-KPI |
| 7 | Äger Journey Context | Central domäntjänst — inga klienter med egen journey-logik |

---

# Nästa steg

1. **Halvdags workshop** — enas om: problembilden (§1–2), principerna (§3), livsfaserna (§5.1), Journey Context (§4).
2. **Godkänn RFC** — bump till v1.0.
3. **Skriv/finalisera implementation contract** — tabeller, API, teknisk arkitektur (appendix).
4. **Först därefter:** Fas 1-kod (onboarding 5–6, handoff-milstolpar, first_success-firande).

**Ingen ny journey-logik implementeras innan workshop och RFC är godkända. Buggfixar och orelaterade förändringar påverkas inte.**
