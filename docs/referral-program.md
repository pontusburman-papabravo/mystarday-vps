# Värvningsprogram (Referral) — specifikation

Status: **v0 låst** — spårning + admin, ingen belöning. Uppdaterad 2026-06-24.

Mål: göra delning **mätbar** så att vi vet om någon registrerar sig via en delning.
Idag finns bara "dela appen" via `navigator.share` utan attribution.

---

## 0. v0 — låst scope (bygg parallellt med ACT-1)

**Produktägarens beslut:** Ingen belöning i v0 — bara statistik och admin-vy.

| Ingår i v0 | Ingår **inte** i v0 |
|------------|---------------------|
| Personlig `?ref=`-kod per förälder | Trial-förlängning, premiumkomponent |
| Fånga kod vid registrering | Midnight-belöningsjobb |
| Spåra: delning → signup → qualified | Push/e-post “du fick belöning” |
| Admin: lista värvare, antal signups/qualified | Kvartalstak (kan vänta) |
| Analytics-events | Dubbelsidig belöning |

**Kvalificerad värvning (mätvärde, ingen utbetalning):** ny familj via `?ref=` + P0-aktivering (`child_access_completed` + first completion inom 7 d).

**Uppskattning v0:** ~2 dagar (migration, register-hook, delnings-UI, admin-lista, events).

**Belöningar (v1):** Bygg när `activation_rate_48h` > 25 % och v0-data visar att någon faktiskt delar. Se §2 nedan.

---

## 1. Översikt

Varje förälder får en **personlig värvningskod/länk**. När en ny familj registrerar sig
via länken och når aktivering (första barnet skapat + onboarding klar), belönas **både**
värvaren och den nya familjen.

Modell: **dubbelsidig belöning** (double-sided) — högst konverterande formen för
konsumentappar och bygger på ömsesidighet.

---

## 2. Belöning (v1 — ej v0)

> **v0:** Ingen belöning. Detta avsnitt gäller först när spårning visar att delning sker.

Vi har redan en komponentbaserad prenumerationsmodell (`family_subscriptions.components`
JSONB + `has_component()`), vilket gör belöningar enkla att dela ut utan att röra betalning.

| Mottagare | Belöning (förslag) |
|-----------|--------------------|
| Värvaren (befintlig familj) | +30 dagar förlängd trial **eller** en premiumkomponent upplåst i 60 dagar per lyckad värvning |
| Ny familj | Förlängd trial 30 → 45 dagar |

Tak: max **5 belönade värvningar** per värvare och kvartal (anti-missbruk).

> Beslut som krävs av produktägaren: exakt belöning. Default i specen ovan är säkert
> (kostar inget i hårda pengar eftersom de flesta familjer är `lifetime_free`/trial).

---

## 3. Aktiveringskriterium ("kvalificerad värvning")

En värvning räknas **inte** vid registrering, utan när den nya familjen är genuint aktiverad:

1. Ny familj registrerad via giltig referral-kod, OCH
2. `funnel_first_child_created` uppnådd, OCH
3. minst 1 avklarad rutin (`daily_log_item.completed = true`) inom 7 dagar.

Detta hindrar fejk-konton och belönar bara värvningar som ger riktiga användare.

---

## 4. Datamodell (ny migration)

```sql
-- referral_code: en kod per förälder
CREATE TABLE referral_code (
  parent_id   UUID PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE,
  code        VARCHAR(12) UNIQUE NOT NULL,      -- t.ex. "STJ-7QK2"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- referral: en rad per värvad familj
CREATE TABLE referral (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  referred_family_id UUID REFERENCES family(id) ON DELETE SET NULL,
  code            VARCHAR(12) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','qualified','rejected')),
  qualified_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_referrer ON referral(referrer_parent_id);
CREATE INDEX idx_referral_status ON referral(status);
```

`status`-flöde (v0): `pending` (registrerad via kod) → `qualified` (aktiveringskriteriet uppfyllt) | `rejected` (självvärvning m.m.).

`rewarded` läggs till i v1 när belöningar byggs.

---

## 5. Flöde

### 5a. Generera/visa kod
- Lazy-skapa raden i `referral_code` första gången föräldern öppnar delningsvyn.
- Länkformat: `https://mystarday.se/register?ref=STJ-7QK2`
- UI: utöka `public/js/dashboard-cta.js` (dela-appen-bannern) med koden + förifylld
  delningstext via `navigator.share`.

### 5b. Fånga koden vid registrering
- `register.html`/`onboarding.js`: läs `?ref=` → spara i `localStorage` (överlever
  e-postverifiering) och skicka med i `POST /api/auth/register`.
- `src/routes/auth/register.js`: om giltig kod (och inte egen) → skapa `referral`
  (`status='pending'`). **v0:** ingen trial-förlängning.

### 5c. Kvalificering (v0)
- I midnight-schemaläggaren eller vid completion: hitta `pending`-värvningar vars familj
  uppfyller aktiveringskriteriet → sätt `qualified`. **v0:** ingen belöning, inget mejl.

### 5c-v1. Belöning (senare)
- Efter `qualified`: dela ut värvarbelöning, sätt `rewarded`, push/e-post.

### 5d. Anti-missbruk
- Ingen självvärvning (samma e-postdomän + samma IP heuristik → `rejected`).
- Kvartalstak per värvare.
- Kräv verifierad e-post på den nya familjen innan `qualified`.

---

## 6. Mätning (analytics_events)

Lägg till event_types i whitelisten (`src/routes/analytics.js`) och spåra:

| Event | När |
|-------|-----|
| `referral_link_shared` | förälder delar sin kod |
| `referral_signup` | ny familj registrerar via `?ref=` |
| `referral_qualified` | aktiveringskriteriet uppfyllt |

KPI v0: **delningar → signups → qualified** (K-faktor när volym finns).
Admin-vy (`GET /api/admin/referrals`): tabell per värvare — kod, delningar, signups, qualified, senaste signup.

---

## 7. Feature flag

Lägg `referral_program` i `scripts/seed-features.js` (status `dev`, taggar `growth`,
`referral`), gate UI + register-hook bakom den. Rulla ut till en testkohort först via
`family_features`.

---

## 8. Leveransordning

### v0 (låst — ~2 dagar)

1. Migration + `db/referral.js` (kod-generering, CRUD)
2. Register-hook (fånga `?ref=`, skapa `pending` — **ingen trial-ändring**)
3. Dashboard-UI: visa kod + delning (utöka `dashboard-cta.js`)
4. Kvalificeringsjobb → `qualified` (utan belöning)
5. Analytics-events + **admin-vy**

### v1 (senare)

6. Belöningsjobb + `rewarded`
7. Anti-missbruk-heuristik + kvartalstak

---

## 9. Öppna beslut (v1)

1. Exakt belöning (trial-dagar vs komponent)?
2. Tak per värvare/period?
3. Kräver vi köp för belöning, eller räcker aktivering? (Förslag: aktivering.)

*v0-beslut är låsta — se §0.*
