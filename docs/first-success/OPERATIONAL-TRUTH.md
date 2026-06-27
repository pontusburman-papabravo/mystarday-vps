# Operational truth — vad det här systemet är

> Tio rader. Ingen arkitektur-jargon. Använd vid onboarding av L1-ägare.

1. Systemet är ett multi-authority UX- och beslutssystem där Engine, readiness och UI-lager samexisterar men inte får ha implicit beslutsmonopol.
2. Engine är normativ signalgenerator (intent/policy), inte exekverande beslutsfattare.
3. Frontend är en renderer + observability layer, inte en plats för produktbeslut.
4. Alla användarflöden tolkas genom tre beslutslägen: competition, ambiguity och non-adoption.
5. Osäkerhet är förstaklass: "unknown" är giltigt tillstånd och kräver explicita beslutstyper (HOLD, ACCEPT-UNKNOWN, INVESTIGATE, ACT).
6. STABLE är ett mänskligt beslut, inte ett statistiskt resultat, och kräver loggrad + L1-godkännande.
7. Systemet optimerar inte för sanningsvärde utan för kontrollerad beslutshantering under osäkerhet.
8. Rekommendationer är endast förslag; människa är alltid sista beslutspunkt via ja/nej + override.
9. Governance (L1) styr tempo, beslutsklassificering och ansvarsfördelning, inte produktsanning.
10. Systemets mål är inte att eliminera osäkerhet utan att göra den beslutsbar utan att skapa falsk precision.

**Invariant:** Rekommendationer får aldrig bli beslut — bara komprimerad osäkerhet.

Relaterat: [L1-OPERATOR-CARD.md](L1-OPERATOR-CARD.md), [PROD-STABILITY-MODEL.md](PROD-STABILITY-MODEL.md).

---

## Första skarpa loopen (dag 1–14)

| Dag | Gör | Gör inte |
|-----|-----|----------|
| 1 | Första loggrad i admin (`#l1beslut`) | Justera modell/regler |
| 7 | Sanity check (nedan) | STABLE / ACT |
| 14 | Beslut: ACCEPT-UNKNOWN, INVESTIGATE eller ACT | Förlänga LEARNING utan motivering |

Under hela perioden: låt rekommendationer finnas, men **inga produktändringar** baserat på tidiga signaler.

---

## Dag 7 — sanity check (övertolka inte)

Syfte: se om **processen** fungerar — inte om coachen "vinner".

### Titta på (ja/nej)

| # | Fråga | Grönt | Gul | Rött (process, inte produkt) |
|---|--------|-------|-----|------------------------------|
| 1 | Minst 1 beslut loggat? | Ja | — | Nej → processfel |
| 2 | Veckoreview genomförd (~15 min)? | Ja | — | Nej |
| 3 | Metrics syns i admin (ej alla noll p.g.a. fel)? | Data finns | Låg volym | API/migrate fel |
| 4 | Override använt minst en gång *eller* medvetet val att följa ★? | Medvetet val | — | Autopilot utan tanke |
| 5 | ACCEPT-UNKNOWN inte enda typ utan att du läst frågorna? | Varierat / HOLD | — | Alltid ★-ja utan läsning |

### Titta inte på (ännu)

- Om coach CTR är "bra"
- Om conflict är noll
- Om non-adoption "bevisar" något
- Om STABLE "borde" deklareras tidigt

### Dag 7-beslut (endast)

| Utfall | Nästa steg |
|--------|------------|
| Process OK | **HOLD** — fortsätt till dag 14 |
| Migrate/admin trasigt | Fix teknik, starta om dagräkning |
| Recommendation gravity (>90% ★-ja utan läsning) | Blind review nästa gång: dölj rekommendation en vecka |

**Regel:** Dag 7 är **aldrig** STABLE eller ACT-SURFACE.

---

## Dag 14 — första riktiga L1-beslut

### Mät tre saker (inte fler)

| Metric | Vad det säger | Var |
|--------|---------------|-----|
| **A. Decision gravity** | Följs rekommendation utan override? | Admin → governance health |
| **B. Unknown rate** | ACCEPT-UNKNOWN aktivt (komplett logg) vs default-ja? | Beslutslogg |
| **C. Non-adoption mismatch** | Hög non-adoption + intent uppfyllt ändå? | Metrics + funnel |

### Beslutsträd

```
Korsvaliderad DRIFT (qualitative eller competition)?
├─ Ja → INVESTIGATE eller ACT-SURFACE
└─ Nej
   ├─ Intent ok + baseline + ingen qualitative?
   │  └─ ACCEPT-UNKNOWN → STABLE (med loggrad)
   └─ Annars → INVESTIGATE (7d) eller edge-HOLD
```

### Röda flaggor (verklig justering börjar här)

- STABLE känns rätt i logg men beteende divergerar (mismatch C)
- ACCEPT-UNKNOWN i >70% utan variation
- Override rate → 0 över flera beslut (**recommendation gravity**)
- Rekommendationer systematiskt ignorerade (du override varje gång) → regler/metrics fel, inte "användaren"

---

## Recommendation gravity — håll systemet friskt

| Signal | Åtgärd |
|--------|--------|
| >80–90% följer ★ utan override | Governance-review — inte produktändring |
| Override → 0 | Blind decision-vecka (dölj rekommendation) |
| Alla beslut ACCEPT-UNKNOWN | Granska om det är aktivt val eller escape hatch |

---

## En rad

> Sluta bygga — låt systemet göra fel i verkligheten så du ser vilka fel som faktiskt betyder något.
