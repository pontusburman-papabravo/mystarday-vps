# B. Start page spec (Fas 2A)

The Start page replaces the passive "Översikt" as the operational landing screen. It answers,
in order: (1) what must I respond to? (2) has growth moved? (3) what happened recently?
(4) what do I want to do next?

## 1. Block order (top → bottom)

Per the north star ("first I want to see growth and whether messages came in"), Block A and
Block B sit at the top.

- **Block A — Inkorg / kräver svar** (top)
- **Block B — Tillväxt senaste 7 dagar**
- **Block C — Senaste aktivitet**
- **Block D — Genvägar** (right column on desktop, bottom on mobile)

The legacy KPI/utveckling grid (families/parents/children, period filter) is kept lower on the
page so no existing data is lost.

## 2. Block A — Inkorg

KPI cards: `Olästa meddelanden`, `Att hantera` (proxy for "obesvarade"; see §6 gap).
List: latest 5 messages (name/email, snippet, relative time, read/unread dot).
CTAs: `Öppna Meddelanden`, `Visa olästa`.

## 3. Block B — Tillväxt (7 dagar)

KPI cards, each with: value (last 7d), delta vs previous 7d (▲/▼/–), and a CTA to the section.

- `Nya paketintressen` → `#paketintresse`
- `Nya pedagogintressen` → `#pedagogintresse`
- `Nya waitlist-signups` → `#waitlist`
- `Nya familjer` → `#familjer`

## 4. Block C — Senaste aktivitet

A merged, reverse-chronological feed (max ~10 rows) built from available signals:
new package interests, new professional interests, new waitlist signups, new families, new
contact messages. Each row: icon-less label + relative timestamp. Read-only in MVP.

## 5. Block D — Genvägar

Buttons: Meddelanden, Paketintresse, Pedagogintresse, Waitlist, Nyhetsbrev, Skapa nyhet
(`#dagens-nyhet`), Sök familj (`#familjer`).

## 6. States

- **loading**: skeleton text "Laddar…" per block (never indefinite — see error).
- **empty**: Block A "Inga olästa meddelanden 🎉" (text only, no emoji in final per naming rule →
  use "Inga olästa meddelanden just nu."). Block B shows `0` with `–` delta. Block C: "Inga
  händelser de senaste dagarna."
- **error**: each block shows "Kunde inte ladda. Försök igen." with a retry link; never a
  perpetual "Laddar…".

## 7. API contract — `GET /api/admin/start-summary`

Single aggregator (one round-trip) returning:

```json
{
  "messages": {
    "unread": 5,
    "toHandle": 2,
    "recent": [
      { "id": 12, "name": "Anna", "email": "a@x.se", "snippet": "Hej, vi undrar…",
        "isRead": false, "createdAt": "2026-06-20T10:00:00Z" }
    ]
  },
  "growth": {
    "packageInterest": { "current": 12, "previous": 8 },
    "educatorInterest": { "current": 3, "previous": 1 },
    "waitlist": { "current": 5, "previous": 2 },
    "newFamilies": { "current": 7, "previous": 4 }
  },
  "activity": [
    { "type": "package_interest", "label": "Nytt paketintresse: Familj X (Rapportering)",
      "createdAt": "2026-06-20T09:00:00Z" }
  ]
}
```

Windows: `current` = last 7 days, `previous` = the 7 days before that.

## 8. Component structure (vanilla, matches current admin)

- `admin-start.js` (new): `loadStart()` → fetch aggregator → render the four blocks.
- Renderers: `renderStartMessages`, `renderStartGrowth`, `renderStartActivity`, plus static
  shortcuts already in HTML.
- Wired into the refresh registry under `refreshKey: 'overview'` so the existing
  families/parents/children KPI loaders keep running too.

## 9. MVP vs later

- **MVP**: unread + toHandle, growth 4 KPIs with deltas, activity feed, shortcuts.
- **Later (Fas 3E)**: trend recommendations ("paketintresse +38% efter landning X"),
  "families needing follow-up", saved filters, risk cards.

## 10. Gap: "obesvarade trådar"

`contact_message` has no answered/thread concept and no `family_id`. Definitions used:

- **toHandle** = `is_read = true AND internal_note IS NULL` (read but not yet noted/acted on).
  Rationale: an internal note is the closest existing signal of "handled".
- Message → family linking is best-effort by matching `contact_message.email` to a parent email
  (used in Fas 3 object links, not required for Start).

A future migration could add `answered_at`/`status` to `contact_message` to make this exact.
