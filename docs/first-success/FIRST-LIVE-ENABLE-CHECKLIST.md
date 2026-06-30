# First Live Enable — checklist (~10 min)

**Konto:** `Pontus@burman.cc` · **Flagga:** global `platform_runtime_enabled` · **Detaljer:** [PLATFORM-RUNTIME-PROD-SAFE-VALIDATION.md](PLATFORM-RUNTIME-PROD-SAFE-VALIDATION.md)

**Systemstatus (verifierad, ingen aktivering gjord):** migration seedar OFF · env `PLATFORM_RUNTIME_ENABLED=false` vinner över DB · runtime OFF = legacy Journey oförändrat · 18/18 runtime-tester gröna.

---

## Före fönster (3 min) — STOPPA om något failar

- [ ] **Post-deploy SQL** — måste vara `false` (migration `ON CONFLICT DO NOTHING` återställer inte befintlig ON):

```sql
SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = false
-- Om true: UPDATE … false FÖRE test (se Stäng nedan)
```

- [ ] **`GET /health`** → `healthy`
- [ ] **Rollback redo:** SQL OFF + env `PLATFORM_RUNTIME_ENABLED=false` i `.env` (testat i kod: env vinner över DB `true`)
- [ ] **Konto finns:** `Pontus@burman.cc` + minst ett barn med schema idag
- [ ] **Tid:** ej morgonrusning (07:00–08:30 CET)
- [ ] **Beslut:** READY signerat i prod-safe runbook

---

## Slå ON (30 sek) — max 15 min fönster

```sql
UPDATE feature_flag SET enabled = true WHERE key = 'platform_runtime_enabled';
SELECT enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
```

Notera starttid: __________ UTC

---

## Smoke (5 min) — endast `Pontus@burman.cc`

| # | Gör | OK? |
|---|-----|-----|
| 1 | Förälder inloggad, Hem laddar | ☐ |
| 2 | Barn (PIN) markerar **en** aktivitet klar | ☐ |
| 3 | Barn: dopamin-burst + **whisper** (ingen dubbel toast) | ☐ |
| 4 | Förälder: parent-ack med relief-copy + **"Det ser jag"** | ☐ |
| 5 | Celebration: "tillsammans"-ton, inte stjärn-grind | ☐ |

**Avvikelse?** → hoppa till **Stäng** direkt. Analysera efteråt.

---

## Stäng (1 min) — obligatoriskt

```sql
UPDATE feature_flag SET enabled = false WHERE key = 'platform_runtime_enabled';
SELECT enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: false
```

- [ ] Barn `/api/me/platform-feedback` → **503** (eller ingen whisper vid ny completion)
- [ ] Ingen `PLATFORM_RUNTIME_ENABLED=false` kvar i `.env` (om inte incident)

Sluttid: __________ UTC · Resultat: ☐ PASS ☐ FAIL

---

## Under test — titta på dessa loggar

```bash
# VPS (senaste 30 min under fönstret)
sudo journalctl -u app -S "30 min ago" --no-pager | rg 'platform-runtime|platform-feedback|journey-context'
```

| Signal | Betyder |
|--------|---------|
| `[platform-runtime] activity complete error` | **STOP** — stäng flagga, undersök |
| `[platform-runtime] flag DB error` | Runtime av (säkert) — fixa DB |
| `[platform-feedback] child GET error` | Whisper trasig — stäng flagga |
| `[platform-feedback] fetch failed` (klient) | 503/offline — OK om flag OFF |
| Inga runtime-rader + smoke OK | Bra |

**Metrics (minimal):** inga nya dashboards krävs för första testet — räcker med loggar + manuell smoke ovan.

---

## Nödbroms (utan SQL)

`.env`: `PLATFORM_RUNTIME_ENABLED=false` → omstart app → verifiera 503 på platform-feedback.

---

## Efter test (inom 1 h)

- [ ] SQL fortfarande `false`
- [ ] Inga felrapporter från andra familjer under fönstret
- [ ] Uppdatera prod-safe runbook med tid + PASS/FAIL
