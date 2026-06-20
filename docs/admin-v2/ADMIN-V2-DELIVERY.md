# Admin v2 — leveransstatus

**Status:** Levererat (Fas 1–3, PR 1–10)  
**Senast verifierat:** 2026-06-20  
**Bas:** `main`  
**PR-historik:** #184 (Fas 1–2), #192 (Fas 3), #194 (Start SQL-fix), efterföljande bugfixar på `main`

---

## Sammanfattning

Admin-panelen har migrerats från platt 23-punktsnav till **6 grupper**, **canonical routing**, **Start-dashboard**, **meddelande-inbox**, **lead-pipeline**, **familj-hub** och **⌘K-sök**.

All planerad funktionalitet i `C-ADMIN_REFACTOR_TICKETS.md` (PR 1–10) är implementerad och mergad.

---

## Fasöversikt

| Fas | PR | Levererat | Nyckelfiler |
|-----|-----|-----------|-------------|
| **1** | 1, 2A, 2B | ✅ | `admin-nav.js`, `admin-core.js`, `test/admin-nav-fas1.test.js` |
| **2** | 3, 4, 5 | ✅ | `db/start-summary.js`, `admin-start.js`, `admin-produktanalys-shell.js`, `admin-landning-shell.js`, `admin-prenumeration-shell.js` |
| **3** | 6–10 | ✅ | `contact-messages.js`, `growth-leads.js`, `family-overview.js`, `admin-search.js`, inbox/pipeline/hub/palette JS |

---

## Databasmigrationer (prod)

Kör vid varje deploy efter pull:

| Migration | Innehåll |
|-----------|----------|
| `1807800000000_contact_message_inbox_model` | `status`, `answered_at`, `assigned_to`, `family_id` på `contact_message` |
| `1807900000000_lead_pipeline_fields` | `lead_status`, `owner`, m.m. på tillväxttabeller |

```bash
cd "$APP_ROOT"
git pull origin main
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --legacy-peer-deps
set -a && source .env && set +a
npm run migrate
sudo systemctl restart "$SERVICE"
```

Sätt `APP_ROOT` och `SERVICE` till app-katalog och systemd-tjänst på VPS innan körning.

**Kör inte** `npm test` på produktionsservern med riktig `RESEND_API_KEY` — testdata (`anna@example.com`) kan annars skicka adminmejl.

---

## API-endpoints (nya)

| Endpoint | Syfte |
|----------|--------|
| `GET /api/admin/start-summary` | Start-dashboard (tillväxt, meddelanden, aktivitet, genvägar) |
| `GET/PATCH /api/admin/contact-messages` | Inbox med statusflikar |
| `GET/PATCH /api/admin/growth-pipeline` | Enhetlig lead-pipeline |
| `GET /api/admin/families/:id/overview` | Familj-hub |
| `GET /api/admin/search?q=` | Kommandopalett (⌘K) |

---

## Kända post-leverans-fixar (main)

| Datum | Problem | Fix |
|-------|---------|-----|
| 2026-06-20 | Start: SQL-fel (`cm`-alias, UNION uuid/integer) | `db/contact-messages.js`, `db/start-summary.js` |
| 2026-06-20 | Upprepade testmejl (Anna Test / pedagogintresse) | `isTestMailbox()` + skip i publika formulär |

---

## Medvetet utanför scope (ej planerat i v2)

- Omskrivning av **Familjer-list-UX**
- **CRM / kampanjmotor** (kommunikationsmotor)
- **`admin_activity`-tabell** (Start-aktivitet = sammansatt SQL-feed)
- **`#tillvaxt` gruppsida** (valfri översikt; pipeline täcker arbetsflödet)
- Omdöpning av alla legacy `*Section` DOM-id:n

---

## Verifiering (utveckling)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export DATABASE_URL="postgresql://USER:PASS@localhost:5432/stjarndag"
export JWT_SECRET="minst-32-tecken"
export REQUIRE_EMAIL_VERIFICATION=false
NODE_ENV=test npm test
node --check public/admin/admin-nav.js public/admin/admin-start.js
```

Förväntat: alla tester gröna; Start laddar utan fel efter migrationer.
