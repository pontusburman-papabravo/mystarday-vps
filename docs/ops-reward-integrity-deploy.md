# Ops — reward integrity deploy (migration `1810000000013`)

Deploy för PR som introducerar `reward_name` / `reward_icon`, pending-unikhet och fulfilled-unikhet per `reward_id`.

**Ordning:** precheck → migration → applikationsdeploy. Kör **inte** ny app-kod före migrationen — nya routes läser snapshot-kolumner som måste finnas.

Migrationen är **expand-only** (nya kolumner, backfill, index, CHECK) och är normalt säker mot **gammal** app-kod som fortfarande kör under migrationen.

## Före merge

- Bekräfta att inget annat öppet PR tar migrationsnummer `1810000000013`.
- GitHub CI **grön** på merge-SHA (inkl. `test:gate`).

## Produktion — före migration (read-only)

Kör på prod-databasen. **Stoppa** om något av resultaten är oväntat; rätta data innan `npm run migrate`.

### 1. Fler än en fulfilled redemption per belöning

```sql
SELECT
  reward_id,
  COUNT(*) AS fulfilled_count,
  ARRAY_AGG(id ORDER BY created_at) AS redemption_ids,
  ARRAY_AGG(status ORDER BY created_at) AS statuses
FROM reward_redemption
WHERE status IN ('approved', 'auto')
GROUP BY reward_id
HAVING COUNT(*) > 1;
```

**Förväntat:** 0 rader.

### 2. Statusfördelning (innan CHECK `reward_redemption_status_valid`)

```sql
SELECT status, COUNT(*)
FROM reward_redemption
GROUP BY status
ORDER BY status;
```

**Förväntat:** endast `pending`, `approved`, `denied`, `auto` (inga NULL eller legacy-värden).

### 3. Negativa snapshot-priser

```sql
SELECT id, reward_id, child_id, star_cost, status
FROM reward_redemption
WHERE star_cost < 0;
```

**Förväntat:** 0 rader.

Dokumentera resultat (datum, vem, 0-rader eller åtgärd) i deploy-logg eller PR-kommentar.

## Produktion — deploysekvens

1. Verifiera att prod kör senaste **stabila** SHA (innan reward-integrity-merge).
2. Kör de tre precheck-frågorna ovan.
3. På VPS (app root enligt deploy-regler i repot): `npm run migrate` — bekräfta att `1810000000013_reward_integrity_constraints` är registrerad i `pgmigrations`.
4. Deploya **exakt** grön merge-SHA (GitHub Actions eller manuell pull + omstart av produktionstjänsten enligt deploy-reglerna).
5. `sleep 3` → `curl -s http://127.0.0.1:3000/health` och verifiera deploy-SHA om tillgängligt.
6. Smoke: barn begär belöning → förälder nekar (belöning ska kunna begäras igen) → godkänn (stjärnor dras, `redeemed_at` satt, andra barn 409 om exklusiv belöning).
7. Bevaka apploggar (systemd för produktionstjänsten) samt 409/5xx på redemption-endpoints.

## Semantik (referens)

| Status | Konsumerar belöning | `redeemed_at` |
|--------|---------------------|---------------|
| `pending` | Reserverar (ingen permanent förbrukning) | NULL |
| `denied` | Frigör helt | NULL |
| `approved` / `auto` | Permanent familjeförbrukning | Sätts vid godkännande |

Stjärnor dras vid godkännande, inte vid begäran. Snapshot-fält bevarar historik om belöningen ändras eller inaktiveras.
