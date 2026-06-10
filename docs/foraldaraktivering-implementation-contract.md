# Föräldraaktivering 7D — Implementation Contract

Version: MVP v1.5

Syfte:
Detta dokument är den tekniska sanningen för implementationen.
Om detta dokument och PRD:n motsäger varandra gäller detta dokument.

**Relaterat:** [Spec](./foraldaraktivering-7-dagar-spec.md) · [Invariants](./activation-program-invariants.md) · [Execution plan](./cursor-execution-plan.md)

---

# Scope

**Bygg Fas 1–6C innan go live.** Användare ser inget förrän alla faser är klara och produktägare säger till (§ Go live).

Ingår (implementeras före go live):

| Fas | Innehåll |
|-----|----------|
| **1** | Datamodell, daglogik |
| **2** | Aha-tracking, celebratory modal |
| **3** | Banner, inline preview, reflektion |
| **4** | Enrollment väg A (onboarding-val) + väg B (e-post 7+ dagar inaktiv) |
| **5** | Push scheduler (dag 2–7) |
| **6A** | Retention engine (Day 14/30/60-beräkningar) |
| **6B** | Analytics API (opportunity, conversion, retention wall) |
| **6C** | Admin UI (funnel, kohort, export) |

Ingår inte:

- Slumpmässig A/B (50/50) — **efter go live**, när inflödet ökar
- Reactivation_3d (separat programtyp; samma motor möjlig senare)
- Win-back (befintligt flöde — ej samma som aktiveringsutskick)
- Summer programs
- School restart programs

**Admin Day 30/60-vyer:** beräknas i 6A; visas i 6C först när kohort har mognad (samma regel som spec).

---

# Programtyper

Tillåt endast:

onboarding_7d

Ingen annan programtyp får skapas i MVP.

---

# Datamodell

Tabeller:

- parent_activation_program
- parent_seen_completion

Måste innehålla:

- status
- cohort_arm
- program_type
- started_at
- first_banner_seen_at
- last_seen_day
- reflection_score
- reflection_text
- enroll_source (varifrån enroll triggades — se nedan)

---

# Enrollment — två vägar in (samma program, samma val-skärm)

Båda vägarna är **live vid go live** (inte fasad). Båda kräver **aktivt val** — ingen tyst enroll.

| Väg | Målgrupp | Trigger |
|-----|----------|---------|
| **A — Onboarding** | Nya familjer | Sista steget efter onboarding complete |
| **B — E-post** | Befintliga inaktiva | Personlig inbjudan med länk till val-skärm |

Samma `onboarding_7d`-motor, samma copy och CTA-par. Skillnad: `enroll_source` och analytics-segment.

| `enroll_source` | Väg |
|-----------------|-----|
| `onboarding_complete` | A |
| `email_reactivation` | B |

---

# Enrollment (Fas 4 — föräldraval, väg A)

Alla nya föräldrar som slutför onboarding ska få välja — **ingen tvingad enroll**.

Placering: sista steget i onboarding, **innan** dashboard.

| Val (CTA) | System | UI |
|-----------|--------|-----|
| **Ja, hjälp oss första veckan** | Skapa `onboarding_7d`, `cohort_arm = treatment`, `status = active` | Banner, modal, programinnehåll |
| **Vi kör själva** | **Ingen** programrad | Vanlig dashboard — inget program |

Regler:

- Default: kort 1 (rekommenderas) är förvalt
- **Ingen slumpmässig A/B vid go live** — alla som väljer ja får `cohort_arm = treatment`
- A/B-tester (CTA-text, 50/50 control, etc.) införs **senare** när inflödet motiverar det
- Jämförelsegrupp vid launch = familjer som valde "Vi kör själva" (observationell)
- `cohort_arm = control` finns i schemat men tilldelas **inte** förrän explicit A/B-fas beslutas
- Opt-out i bannern kvarstår för enrolled familjer ("Avsluta när ni vill")

---

# E-postinbjudan — befintliga föräldrar (väg B, Fas 4)

## Målgrupp (eligibility — låst)

**Får mail:**

- `onboarding_completed = true`
- Minst ett barn med schema (`has_weekly_schedule`)
- **Ingen förälder-inlogg på 7+ hela dagar** (familj `timezone`, räknat från senaste `parent`-login)
- Inget aktivt `parent_activation_program` (`status = active`)
- Post-launch (`NOW >= ACTIVATION_PROGRAM_LAUNCH_AT`) vid utskick

**Får INTE mail:**

- **Aktiva familjer** — någon förälder loggat in inom de senaste **7 dagarna**
- Familjer utan schema / ofullständig onboarding
- Familjer med pågående program
- Administratörer / testkonton (exkludera i export)

## Flöde

```
E-post med personlig länk
        ↓
Inloggning (om behövs)
        ↓
Samma val-skärm som onboarding (§ Onboarding-val — copy)
        ↓
"Ja, hjälp oss första veckan" → enroll, enroll_source = email_reactivation
"Vi kör själva"             → ingen programrad
```

**Ingen enroll vid klick på länk** — endast vid aktivt val på skärmen.

## E-post — copy (utkast, låst intent)

**Ämne:** *En mjuk start för [barn]s rutiner?* (eller personaliserat förnamn)

**Brödtext (kärna):**

> Hej [Förnamn],
>
> Ni har skapat konto och satt upp [barn]s schema — bra gjort.
>
> Många familjer berättar att det som kan vara svårast inte är att komma igång, utan att **hålla i rutinen** när vardagen tar vid.
>
> Nu kan ni prova vårt **7-dagars kom-igång-program**: korta dagliga steg som hjälper er som förälder hålla momentum. Barnets schema ändras inte.
>
> **[Ja, hjälp oss första veckan]** ← länk till val-skärm
>
> Vill ni inte ha guiden fungerar appen som vanligt — allt ni redan satt upp finns kvar.

Ton: stödjande, **inte** skuldbelagd ("ni har misslyckats").

## Analytics (väg B)

| Event | När |
|-------|-----|
| `activation_program_email_invite_sent` | E-post skickad |
| `activation_program_email_invite_clicked` | Länk klickad |
| `activation_program_enroll_choice` | Val på skärm — inkl. `enroll_source: email_reactivation` |

---

# Onboarding-val — copy (låst)

Gäller **väg A och väg B** (samma skärm).

## Intro

> **Hur vill ni börja?**
>
> Ni har satt upp barnets schema — bra start.
>
> Många familjer upptäcker att den största utmaningen inte är att komma igång, utan att hålla i rutinen de första dagarna när vardagen tar vid.
>
> Välj det som passar er:

## Kort 1 — rekommenderas (förvalt)

| Fält | Copy |
|------|------|
| **Rubrik** | Håll i rutinen första veckan |
| **Brödtext** | Många familjer uppskattar lite stöd efter att schemat är klart. Inte för att något är fel, utan för att nya vanor tar tid att sätta sig. |
| **Fördelar** | Korta dagliga påminnelser som hjälper er hålla igång · Se när barnet klarar uppgifter utan extra tjat · Barnets schema är redan klart — vi hjälper er få rutinen att fungera · Avsluta när ni vill |
| **CTA (primär)** | **Ja, hjälp oss första veckan** |

Rubriken säljer **utfallet**, inte produktnamnet ("guidad start" ska inte stå i kortrubriken).

## Kort 2

| Fält | Copy |
|------|------|
| **Rubrik** | Kör igång direkt |
| **Brödtext** | Ni känner er redo att köra på själva. Allt finns på plats och ni kan börja direkt. |
| **Fördelar** | Direkt till dashboarden · Samma schema, stjärnor och belöningar · Använd appen i er egen takt |
| **CTA (sekundär)** | **Vi kör själva** |

## Fotnot (under valen)

> Oavsett vilket ni väljer kan ni använda appen fullt ut. Guidad start ger bara lite extra stöd under den första veckan.

## UX-regler

- Primär knapp: fylld/stark (kort 1)
- Sekundär knapp: outline/text — "Vi kör själva" ska inte kännas som fel val
- Ingen "är du säker?"-dialog vid direkt-val
- Ton: stödjande, inte dömande (ingen skuldbelagd copy vid val av kort 2)
- Barnets schema påverkas inte av valet — endast förälderns stöd första veckan

## CTA A/B-test (senare — när inflödet ökar)

**Inte vid initial go live.** Testordning när A/B-fas aktiveras:

Testordning för primär knapp (håll sekundär konstant: "Vi kör själva"):

1. `Ja, hjälp oss första veckan` — primär hypotes
2. `Håll i rutinen`
3. `Välj guidad start` — kontroll

Mobil-backup (kortare par): `Få stöd första veckan` / `Vi kör själva`

---

# Cohort

Schema tillåter:

treatment
control

Vid go live (alla vägar):

- Val "Ja, hjälp oss första veckan" → `cohort_arm = treatment`, `enroll_source` enligt väg
- Val "Vi kör själva" → ingen rad

`cohort_arm = control` tilldelas inte förrän explicit A/B-fas.

Control / icke-enrolled ska INTE se:

- banner
- celebratory modal
- programinnehåll

---

# Daglogik

Två separata begrepp:

calendar_day
effective_day

calendar_day används för:

- expiry
- retention
- reflection window

effective_day används för:

- innehåll
- CTA
- progress

---

# Programlängd

onboarding_7d = 7 dagar

effective_day cap = 7

calendar_day fortsätter öka.

---

# Expiry

När:

calendar_day > 21

och

status = active

sätt:

status = expired

---

# Banner

Visa endast när:

status = active
AND cohort_arm = treatment

---

# Dag 1

Primär CTA:

inline preview

Fallback:

child-login

Track:

child_view_opened

---

# Dag 3

Om child_first_completion finns:

visa celebratory modal

Annars:

visa supportive fallback

Track:

trigger = aha
eller
trigger = supportive_fallback

---

# Celebratory modal

Måste vara modal.

Inte inline card.

Inte bannertext.

Måste kunna triggas dag 1–7.

---

# Reflection

Visas från:

calendar_day >= 7

Tills:

submitted
eller
expired

---

# Analytics

Måste implementeras:

activation_program_enroll_choice

activation_program_email_invite_sent

activation_program_email_invite_clicked

activation_program_started

activation_program_first_banner_seen

activation_program_cta_clicked

activation_program_day_done

activation_program_completed

child_first_completion

parent_first_completion_seen

parent_aha_moment_dismissed

## activation_program_enroll_choice (Fas 4)

När föräldern väljer på val-skärmen (väg A eller B).

```json
{
  "event_type": "activation_program_enroll_choice",
  "metadata": {
    "choice": "guided",
    "enroll_source": "onboarding_complete",
    "cta_variant": "help_us_week_one"
  }
}
```

| Fält | Värden |
|------|--------|
| `choice` | `guided` \| `direct` |
| `enroll_source` | `onboarding_complete` \| `email_reactivation` |
| `cta_variant` | `help_us_week_one` \| `hold_routine` \| `choose_guided_start` \| `get_support_week_one` (endast vid A/B-fas) |
| `direct_cta` | `we_run_ourselves` (konstant under CTA-test) |

`activation_program_started` loggas endast vid `choice = guided` (samma request eller direkt efter).

---

# Retention

North Star:

Family Day 14 Retention

Definition:

parent_login
OR
child_completion

under dag 13–15.

Definitionen får inte ändras.

---

# Launch

Val-skärm, e-postutskick och enroll tillåts endast efter:

ACTIVATION_PROGRAM_LAUNCH_AT

**Retroaktiv tyst enroll** (programrad utan förälderns val) är förbjuden.

E-post till befintliga är **inbjudan + opt-in** — inte retroaktiv enroll.

Före launch: ingen val-skärm, inget utskick, ingen programrad.

---

# Go live (sista steg — obligatoriskt)

**Inget av detta får nå användare förrän produktägare uttryckligen säger till.**

Kod i `main`, migrerad databas och mergade PR:er räknas **inte** som live. Användare ska inte se onboarding-val, banner, modal eller enrollment förrän hela checklistan nedan är uppfylld.

## Dubbel grind (båda krävs)

| Grind | Prod-värde före go-live | Effekt |
|-------|-------------------------|--------|
| `ACTIVATION_PROGRAM_ENABLED` | `false` (eller ej satt) | All programlogik och UI är av — även om kod finns deployad |
| `ACTIVATION_PROGRAM_LAUNCH_AT` | Ej satt / framtida ISO 8601 UTC | Ingen enroll, ingen val-skärm |

Implementation ska **alltid** kontrollera båda innan något användarsynligt eller enroll-relaterat körs.

## Go-live-checklista (körs en gång)

Produktägare godkänner uttryckligen ("go live" / "kör igång") **efter Fas 6C**:

- [ ] **Fas 1–4** verifierade (staging + intern testfamilj)
- [ ] **Väg A:** onboarding-val → banner → completion → modal
- [ ] **Väg B:** e-postmall + eligibility (7+ dagar inaktiv) + länk → val-skärm → enroll
- [ ] Aktiva familjer (<7 dagar login) **exkluderas** från utskick
- [ ] **Fas 5:** push dag 2–7 testad (max 1/dag)
- [ ] **Fas 6A:** Day 14-retention beräknas korrekt (Family North Star)
- [ ] **Fas 6B:** opportunity rate, conversion rate, retention wall API
- [ ] **Fas 6C:** admin-vy med funnel, Day 14 kohort, aha-gruppering, export
- [ ] Analytics-kedja end-to-end (inkl. `email_invite_*`, `enroll_source`, push)
- [ ] `ACTIVATION_PROGRAM_LAUNCH_AT` satt (ändras **aldrig** efter första riktiga enroll — invariant #13)
- [ ] `ACTIVATION_PROGRAM_ENABLED=true` i prod
- [ ] Deploy genomförd **efter** env-vars ovan

**Go live omfattar väg A + B samtidigt** — full produkt (inkl. push + admin internt), inte fasad per målgrupp.

## Före go-live (tillåtet)

- Dokumentation i repo
- Migrationer körda (tomma tabeller påverkar inte UX)
- Kod mergad bakom feature flag (`ENABLED=false`)
- Intern test med flagga på staging / testkonton

## Efter go-live (förbjudet utan ny PO-beslut)

- Ändra `ACTIVATION_PROGRAM_LAUNCH_AT`
- Tvinga enroll utan val-skärm
- Tyst programrad utan förälderns val (gäller både nya och e-post-mottagare)
- Maila aktiva familjer (<7 dagar sedan login)

## Roll

| Roll | Ansvar |
|------|--------|
| **Produktägare** | Enda som kan säga go live |
| **Implementation** | Bygger Fas 1–6C med flaggor av; aktiverar inte prod själv |

---

# Success

**Tekniskt klar** när Fas 1–6C uppfyller acceptanskriterierna.

**Produktionslive** när § Go live-checklistan är avbockad och produktägare godkänt.

Dessa är **två separata tillstånd**. Fas 4 klar ≠ go live. Fas 6C klar ≠ go live. Endast PO-beslut + flaggor = användare ser funktionen.
