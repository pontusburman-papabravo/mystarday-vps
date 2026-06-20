# B. Start page spec v2 (Fas 2A — honest MVP)

**Start = operativ startsida, inte “sann CRM” i MVP.**

Start helps the admin **prioritise** work using composed/proxy data. It is **not** a source of
truth for inbox status or lead pipeline until Fas 3 migrations land.

---

## 0. Two truth levels

| Level | When | What |
|-------|------|------|
| **Nivå 1 — MVP (PR 3)** | Fas 2 | Aggregator + proxy heuristics + synthetic activity feed |
| **Nivå 2 — Full** | After Fas 3A–3C | Real message status, family links, lead pipeline signals |

---

## 1. North star at login

Primary question order (matches product priority):

1. **Har tillväxten rört sig?** → Block A (top)
2. **Finns meddelanden att ta hand om?** → Block B
3. **Vad har hänt sedan sist?** → Block C (synthetic feed)
4. **Vad vill jag göra härnäst?** → Block D (shortcuts)

Legacy KPI grid (families/parents/children, period filter) stays **below** the new blocks so
nothing is removed.

---

## 2. Block layout

### Block A — Tillväxt idag (top)

KPI cards (each: `last7d`, `prev7d`, `deltaAbs`, `deltaPct`, `total` where available):

| KPI | CTA route |
|-----|-----------|
| Nya paketintressen | `#paketintresse` |
| Nya pedagogintressen | `#pedagogintresse` |
| Nya waitlist-signups | `#waitlist` |

Optional fourth card: **Nya familjer** (`#familjer`) if cheap to query from existing
`overview-stats` logic.

**Requires new period queries** in the aggregator — today's `/package-interest/summary` is
**totals only**, not 7d vs prev7d.

### Block B — Meddelanden att följa upp

**Do not label:** “Obesvarade trådar” (no thread/answered model exists).

**Do label:** “Meddelanden att följa upp” or “Nya / ej hanterade meddelanden”.

#### MVP heuristic (transparent in UI)

A message **needs follow-up** if:

- `is_read = false` **OR**
- `is_read = true AND internal_note IS NULL`

Show KPIs: `unreadCount`, `needsFollowUpCount`.

List: latest 5 messages with name, email preview, relative time, reason badge
(`Oläst` / `Saknar anteckning`).

CTAs: `Öppna Meddelanden` (`#meddelanden`), `Visa att följa upp` (filter query param or hash
`#meddelanden?followup=1` — implementation choice in PR 3).

> **Disclaimer (shown in block footer):**  
> “Detta är en förenklad uppföljningsvy. Riktig inbox-status kommer i en senare version.”

Replaced by real status after **Fas 3A** (`answered_at`, `status`).

### Block C — Senaste aktivitet (synthetic)

**Not** a central activity model in MVP. A **composed admin-feed** built server-side from:

- `package_interest` created
- `professional_interest` created
- `waitlist` signup created
- `contact_message` created
- optional: `newsletters` sent, `dagens_nyhet` published (if easy)

Rules:

- max 10–20 items, reverse chronological
- each item: `type`, `title`, `meta?`, `createdAt`, `route` (canonical)
- best-effort — gaps are acceptable; document in API

### Block D — Genvägar

Stable links (no new data):

- Familjer (`#familjer`)
- Meddelanden (`#meddelanden`)
- Paketintresse (`#paketintresse`)
- Pedagogintresse (`#pedagogintresse`)
- Produktanalys (`#produktanalys`)
- Nyhetsbrev (`#nyhetsbrev`)

### Block E — Hälsa / varningar (optional, post-MVP)

Not in PR 3 scope: threshold alerts, webhook health, etc.

---

## 3. States

| State | Behaviour |
|-------|-----------|
| **loading** | Per-block “Laddar…” — never indefinite |
| **empty** | Growth: `0` + `–` delta. Messages: “Inga meddelanden att följa upp just nu.” Activity: “Inga händelser de senaste dagarna.” |
| **error** | “Kunde inte ladda. Försök igen.” + retry per block |

No emojis in copy (per naming standard).

---

## 4. API — composed summary endpoint

**Not** a CRUD resource. A **composed aggregator**:

```
GET /api/admin/start-summary
```

### Response contract

```ts
type StartSummaryResponse = {
  generatedAt: string;

  growth: {
    packageInterest: PeriodMetric;
    professionalInterest: PeriodMetric;
    waitlist: PeriodMetric;
    newFamilies?: PeriodMetric;
  };

  messages: {
    unreadCount: number;
    needsFollowUpCount: number;
    latest: Array<{
      id: number;
      name: string | null;
      email: string | null;
      messagePreview: string;
      createdAt: string;
      isRead: boolean;
      followUpReason: 'unread' | 'read_without_note';
      linkedFamily: {
        type: 'none' | 'email_match';
        familyId?: string;
        familyName?: string;
      };
    }>;
    disclaimer: string;
  };

  activity: Array<{
    type:
      | 'package_interest_created'
      | 'professional_interest_created'
      | 'waitlist_created'
      | 'contact_message_created'
      | 'newsletter_sent'
      | 'dagens_nyhet_published';
    id: string;
    title: string;
    meta?: string;
    createdAt: string;
    route: string;           // canonical hash
  }>;

  quickActions: Array<{ label: string; route: string }>;
};

type PeriodMetric = {
  last7d: number;
  prev7d: number;
  deltaAbs: number;
  deltaPct: number | null;  // null if prev7d === 0
  total: number;
};
```

### Query windows

- `last7d`: `created_at >= NOW() - 7 days`
- `prev7d`: `created_at >= NOW() - 14 days AND created_at < NOW() - 7 days`

### Family linking (MVP)

Best-effort `email_match` against `parent.email`. UI must show when link is inferred, not certain.
Real `family_id` comes in **Fas 3B**.

---

## 5. Frontend components

| File | Responsibility |
|------|----------------|
| `public/admin/admin-start.js` | `loadStartSummary()` → render blocks |
| `index.html` | Markup for blocks A–D inside `overviewSection` |
| Refresh registry | `refreshOverview` also calls `loadStartSummary()` |

Renderers: `renderStartGrowth`, `renderStartMessages`, `renderStartActivity`; shortcuts can be
static HTML.

---

## 6. MVP vs later

| In PR 3 (MVP) | Later |
|---------------|-------|
| Growth 7d/prev7d for 3 lead types | Trend recommendations (Fas 3E) |
| Message follow-up heuristic | Real `status` / `answered_at` (Fas 3A) |
| Synthetic activity feed | `admin_activity` table (Fas 3D optional) |
| Email-match family hint | Explicit `family_id` (Fas 3B) |
| Static shortcuts | Personalised / saved filters |

---

## 7. Data gaps this spec acknowledges

| Gap | MVP workaround | Proper fix |
|-----|----------------|------------|
| No `answered_at` / `status` on `contact_message` | follow-up heuristic | PR 6 (Fas 3A) |
| No `family_id` on messages | email match | PR 7 (Fas 3B) |
| No period deltas on package-interest API | new SQL in aggregator | PR 3 |
| No unified activity table | composed feed query | PR optional 3D |
| Flat messages, not threads | list latest N | PR 7 inbox |
| No lead status columns | show counts only on Start | PR 8 (Fas 3C) |
