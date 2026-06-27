# L1 under press — träning och edge cases

> **Stängt system i modellform.** Ytterligare design ökar inte korrekthet — bara driftdisciplin gör det.

Relaterat: [L1-GOVERNANCE.md](L1-GOVERNANCE.md), [PROD-STABILITY-MODEL.md](PROD-STABILITY-MODEL.md).

---

## Vad som återstår (inte i kod)

| Framgångsfaktor | Mät |
|-----------------|-----|
| L1 håller SLA under press | Decision lag ≤2d efter d14 |
| ACCEPT-UNKNOWN är aktivt val | Komplett loggmall, inte escape hatch |
| STABLE är beslut, inte bekvämlighet | Variation i beslutstyper över releases |

---

## Meta-risk: governance overfitting

Hårda SLA:er + strikt logg kan skapa **forced classification pressure** när verkligheten inte passar rent i en beslutstyp.

**Skydd som redan finns:**

- ACCEPT-UNKNOWN kräver inte orsak — bara fyra fält
- INVESTIGATE har tidsbox — tvingar avslut, inte evig analys
- HOLD är giltigt under LEARNING

**Ny regel för edge cases:**

> Om ingen typ passar rent → **HOLD** med `edge:yes` + en mening *varför klassificering är oklar*. Förläng inte LEARNING; eskalera inte till falsk precision.

```
HOLD | release_id | edge:yes | reason:"metrics contradict, need one more week traffic" | review:+7d | @owner
```

Edge-HOLD räknas som **beslut** — inte uteblivet beslut.

---

## L1-träning (30 min, en gång före första prod-release)

### Övning 1 — Dag 14 på papper (10 min)

Ge deltagare fiktiva metrics (flat ambiguity, baseline non-adoption, intent ok).  
**Output:** en loggrad ACCEPT-UNKNOWN på ≤3 min.

### Övning 2 — DRIFT vs ACCEPT-UNKNOWN (10 min)

Samma metrics + stigande bypass i Z1.  
**Output:** INVESTIGATE eller ACT-SURFACE — **inte** ACCEPT-UNKNOWN.

### Övning 3 — Edge case (10 min)

Metrics flat men qualitative hint "förvirrande hem", låg volym.  
**Output:** INVESTIGATE med 7d deadline **eller** edge-HOLD med motivering.

**Mål:** beslutstempo, inte perfekt klassificering.

---

## Snabba beslut under osäkerhet (heuristik)

| Om du känner… | Gör |
|---------------|-----|
| "Vi förstår inte tillräckligt" | Kolla intent outcome → om ok: ACCEPT-UNKNOWN |
| "Vi behöver mer data" efter d14 | ACCEPT-UNKNOWN eller edge-HOLD (+7d) — inte tyst LEARNING |
| "Allt ser bra ut" utan loggrad | Inte STABLE — skriv raden först |
| "Det passar inte i en låda" | edge-HOLD |
| "Användare lider" | ACT-KILL övervägs före analys |

**Tempo > precision** när epistemiken redan säger unknown cause.

---

## Formell korrekthet vs operativ tröghet

| Tröghet (undvik) | Korrekt (behåll) |
|------------------|------------------|
| Vänta på orsak före STABLE | STABLE med ACCEPT-UNKNOWN utan orsak |
| Rapport istället för loggrad | En rad i beslutslogg |
| Ny analys varje vecka utan beslutstyp | HOLD med review-datum |
| Auto-STABLE från dashboard | Människa väljer beslutstyp |

**Kvartals-check:** Finns releases med >7d utan beslutstyp trots SLA? → processfel, inte modellfel.

---

## Används systemet korrekt under stress? (governance audit)

Utöver produktmetrics — granska **beslutsbeteende**:

| Signal | Frisk | Stress |
|--------|-------|--------|
| Decision lag efter d14 | ≤2d | >5d |
| Loggmall completeness | >90% | <50% |
| ACCEPT-UNKNOWN-andel | Varierar | >80% i 3 releases |
| edge-HOLD | Sällsynt, motiverad | Aldrig använd trots oklara case |
| Veckoreview missad | 0 | ≥2 i rad |

Audit = 30 min/kvartal. Ingen koppling till Engine eller auto-policy.

---

## Backup L1

| Fält | Värde |
|------|--------|
| Primär | (produktägare) |
| Backup | (eng/PM — måste kunna skriva loggrad) |
| Eskalering | Backup beslutar inom 48h om primär missar d14 |

Backup ska genomföra samma 30-min träning.

---

## Stängt system — vad som inte ska läggas till

| Temptation | Varför nej |
|------------|------------|
| Fler beslutstyper | Forced classification ↑ |
| Auto-STABLE | Bryter epistemik |
| Fler axlar i PDS | Signal closure |
| L1 ersätts av algoritm | Unknown cause kräver människa |
| Permanent LEARNING | Governance-fel — redan förbjudet |

Nästa förbättring kommer från **hur L1 använder mallen**, inte från fler dokument.

---

## En mening vid release till prod

> **Systemet säger vad som händer och vad som är okänt. L1 säger vad vi gör med det — senast dag 14, i en rad, med namn på ägare.**
