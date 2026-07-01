# För dig 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Feature slug:** `for_dig`  
**Relaterat:** `docs/for-dig-spec.md` (engineering), `docs/for-dig-agent-prompt.md` (implementation)

---

## Kompassen

> **För dig ska få föräldern att känna: "Det här hade jag aldrig orkat sätta upp själv – men nu är det redan klart."**

---

## Varför finns För dig?

De flesta föräldrar vet **vilket problem** de har.

De vet däremot inte vilken rutin, vilket schema eller vilka aktiviteter som faktiskt hjälper.

**För dig översätter vardagsproblem till färdiga lösningar som kan börja fungera direkt.**

Föräldern ska aldrig behöva fundera över:

- vilken rutin som passar
- vilka aktiviteter som behövs
- hur schemat ska byggas

**Det arbetet gör appen.**

---

## Problemet vi löser

Föräldrar förstår **vad målet heter**, men inte **vad som faktiskt händer när de aktiverar det**.

> *"Jag förstår inte vad som händer när man aktiverar Samarbeta hemma?"* — Jenny

Det är inte ett UI-problem. Det är ett **förtroendeproblem**.

---

## Produktprincip

> **För dig ska göra det självklart vilket vardagsproblem som löses, vad som kommer att hända och varför det är tryggt att trycka Aktivera.**

Om användaren behöver fundera har vi misslyckats.

---

## Framgångskriterium

> **När en förälder lämnar För dig ska hen känna att appen redan gjort det svåraste arbetet.**

Vid varje ny funktion:

| Fråga | Om nej → bygg inte |
|--------|---------------------|
| Hjälper det här föräldern? | |
| Flyttar vi tillbaka jobbet till föräldern? | |

---

## Den mentala modellen

```
Jag har ett problem
        ↓
Appen förstår mitt problem
        ↓
Appen visar exakt vad som kommer att hända
        ↓
Jag känner mig trygg
        ↓
Jag aktiverar
        ↓
Mitt schema uppdateras
        ↓
Barnet får en tydligare vardag
```

Det får **aldrig** finnas ett glapp mellan *"problem"* och *"aktivera"*.

---

## Vad För dig är

**En guide från problem till fungerande rutin.**

| För dig är **inte** | För dig **är** |
|---------------------|----------------|
| Ett bibliotek | Guide från problem → rutin |
| Ett schema | |
| Onboarding | |

---

## För dig i produkten

| Steg | Roll |
|------|------|
| Landningssidan | Säljer hopp |
| Onboarding | Lär känna familjen |
| **För dig** | Gör det svåra arbetet åt föräldern |
| Schemat | Driver vardagen |
| Barnets vy | Gör barnet självständigt |
| Skattkammaren | Håller motivationen levande |

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Vad löser det? | *Få lugnare läggningar* | *Trygga kvällar* |
| 2 | Vad händer om jag trycker? | *Fyra aktiviteter läggs till i Astrids schema* | Tystnad / jargong |
| 3 | Är det säkert? | *Du kan ändra eller anpassa senare* | Inget svar |

**Designregel:** Beslut ska kunna fattas **utan att öppna detaljer**.

---

## Informationshierarki

```
1. Problemet        →  Få hjälp med dukning och städning
2. Vad som händer   →  Lägger till fyra aktiviteter i Astrids schema
3. Handling         →  [Lägg till aktiviteterna]
4. Detaljer         →  Visa mer (dagar, tider, lista, belöningar)
```

---

## Utfallscopy (`headline`)

Föräldrar köper inte mål. De köper en bättre vardag.

| Slug (internt) | Headline (förälder ser) |
|----------------|-------------------------|
| `trygga-kvallar` | Få lugnare läggningar |
| `bra-morgnar` | Kom iväg utan morgontjat |
| `sjalvstandighet` | Få barnet att klä sig själv |
| `skolansvar` | Få läxor och väska att funka |
| `samarbete-hemma` | Få hjälp med dukning och städning |
| `motivation` | Hålla motivationen uppe med belöningar |

Behåll `title` internt. `tagline` som sekundär rad. Ålder diskret.

---

## Bekräftelse — beslutsskärm (inte schema-preview-block)

Standardvy: max ~3 **beslutspunkter** + knappar. Ingen scroll krävs på mobil.

| Signal | När | Exempel |
|--------|-----|---------|
| ⚠️ Ersätter | Helrutin + befintligt schema | *Ersätter kvällsrutinen* |
| ✓ Lägger till | Aktivitetsmål (append) | *Lägger till aktiviteter i schemat* |
| ✓ Behåller | Append | *Befintligt schema behålls* |
| 👧 Gäller | Alltid | *Gäller Astrid* |
| ✓ Ändra senare | Alltid | *Du kan ändra efteråt* |

**Löfte-rad:** t.ex. *Kvällsrutinen för Astrid blir klar på mindre än en minut.*

**Visa detaljer** (stängd default): dagar, sektion, tid, aktivitetslista, per-barn-påverkan.

Backend plan-preview behövs tekniskt men ska **översättas** till beslutspunkter — visas inte rå i standardvy.

---

## Vad som ska bort

- Långa aktivitetslistor i standardvy
- Tekniska begrepp i föräldratext
- Mål-namn som primär rubrik
- Schema-preview som informationsblock före Aktivera
- Fler steg, modaler, val eller block utan att ta bort något annat
- Funktioner som flyttar byggjobbet tillbaka till föräldern

---

## Definition av 10/10

En helt ny användare öppnar För dig och kan, **utan hjälp**, inom fem sekunder svara på:

1. Vilket problem löser det här?
2. Vad händer om jag trycker?
3. Är det tryggt att göra det?

Och när hen lämnar sidan känns det som att **det svåraste redan är gjort**.

---

## Nuläge vs mål (implementation)

**Redan på plats (main):** barnväljare, multi-child activate, append/replace per måltyp, Aktivera/Anpassa/Avbryt, ett post-aktiveringssteg, rekommendationer före katalog, mål-badges, fokusfråga i magic view.

**Kvar för 10/10:** `headline` i config + UI, beslutsskärm, dold plan-preview, dynamiska CTA-labels, rekommendationsrubrik *Bra nästa steg för [namn]*.

Se `docs/for-dig-agent-prompt.md` för agent-uppdrag.
