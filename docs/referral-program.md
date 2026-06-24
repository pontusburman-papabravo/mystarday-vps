# Värvningsprogram (Referral) — förslag & specifikation

Status: **Förslag** (ej byggt). Skapad 2026-06-24.

Mål: göra delning mätbar och belönad så att befintliga familjer driver ny tillväxt.
Idag finns bara "dela appen" via `navigator.share` utan attribution — vi vet inte om
någon registrerar sig via en delning.

---

## 1. Översikt

Varje förälder får en **personlig värvningskod/länk**. När en ny familj registrerar sig
via länken och når aktivering (första barnet skapat + onboarding klar), belönas **både**
värvaren och den nya familjen.

Modell: **dubbelsidig belöning** (double-sided) — högst konverterande formen för
konsumentappar och bygger på ömsesidighet.

---

## 2. Belöning

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
                  CHECK (status IN ('pending','qualified','rewarded','rejected')),
  qualified_at    TIMESTAMPTZ,
  rewarded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_referrer ON referral(referrer_parent_id);
CREATE INDEX idx_referral_status ON referral(status);
```

`status`-flöde: `pending` (registrerad via kod) → `qualified` (aktiveringskriteriet uppfyllt)
→ `rewarded` (belöning utdelad) | `rejected` (misstänkt missbruk / självvärvning).

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
  (`status='pending'`), förläng nya familjens trial till 45 dagar.

### 5c. Kvalificering
- I midnight-schemaläggaren (`src/lib/midnight-scheduler.js`): hitta `pending`-värvningar
  vars familj uppfyller aktiveringskriteriet → sätt `qualified`, dela ut värvarbelöning,
  sätt `rewarded`. Skicka push/e-post: "Din vän kom igång — du fick 30 extra dagar! 🎉"

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
| `referral_rewarded` | belöning utdelad |

KPI: **K-faktor** = (delningar × konvertering per delning). Mål >0,15 i v1.
Admin-vy: lista per värvare (delningar → signups → qualified), i `src/routes/admin/`.

---

## 7. Feature flag

Lägg `referral_program` i `scripts/seed-features.js` (status `dev`, taggar `growth`,
`referral`), gate UI + register-hook bakom den. Rulla ut till en testkohort först via
`family_features`.

---

## 8. Leveransordning (förslag)

1. Migration + `db/referral.js` (kod-generering, CRUD)
2. Register-hook (fånga `?ref=`, skapa `pending`, förläng trial)
3. Dashboard-UI: visa kod + delning (utöka `dashboard-cta.js`)
4. Kvalificerings-/belöningsjobb i midnight-scheduler
5. Analytics-events + admin-vy
6. Anti-missbruk-heuristik + kvartalstak

Uppskattning: ~3–5 dagars arbete för v1 (utan admin-vy ~2–3 dagar).

---

## 9. Öppna beslut för produktägaren

1. Exakt belöning (trial-dagar vs komponent)?
2. Tak per värvare/period?
3. Kräver vi köp för belöning, eller räcker aktivering? (Förslag: aktivering, eftersom
   de flesta familjer är `lifetime_free`.)
