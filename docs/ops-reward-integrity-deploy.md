# Ops — reward integrity deploy (migration `1810000000013`)

Deploy för reward redemption integrity: snapshots, pending-unikhet, atomisk approve/deny, `redeemed_at` endast vid godkännande.

**Belöningssemantik:** Aktiva belöningar är **återanvändbara**. Varje godkänd inlösen är en egen historikrad; stjärnor dras per godkännande. Endast **en pending** per `reward_id` i familjen samtidigt. **Nekad** pending frigör reservationen. Det finns **ingen** `is_exclusive` / engångsfält i datamodellen.

**Ordning:** precheck → migration → applikationsdeploy. Kör **inte** ny app-kod före migrationen — nya routes läser snapshot-kolumner som måste finnas.

Migrationen är **expand-only** (nya kolumner, backfill, pending-index, CHECK) och är normalt säker mot **gammal** app-kod under migrationen.

## Före merge / deploy

- Bekräfta att inget annat öppet PR tar migrationsnummer `1810000000013`.
- GitHub CI **grön** på deploy-SHA.

## Produktion — före migration (read-only)

Kör på prod-databasen. **Stoppa** om oväntade statusvärden eller negativa kostnader hittas.

### 1. Statusfördelning (innan CHECK `reward_redemption_status_valid`)

```sql
SELECT status, COUNT(*)
FROM reward_redemption
GROUP BY status
ORDER BY status;
```

**Förväntat:** endast `pending`, `approved`, `denied`, `auto` (inga NULL eller legacy-värden).

### 2. Negativa snapshot-priser

```sql
SELECT id, reward_id, child_id, star_cost, status
FROM reward_redemption
WHERE star_cost < 0;
```

**Förväntat:** 0 rader.

### 3. (Informativt) Flera godkända rader per samma `reward_id`

```sql
SELECT reward_id, COUNT(*) AS approved_count
FROM reward_redemption
WHERE status IN ('approved', 'auto')
GROUP BY reward_id
HAVING COUNT(*) > 1;
```

**Detta är inte fel data** — det speglar återanvändbara belöningar (samma barn eller syskon har löst in samma belöning vid flera tillfällen). Migreringen skapar **inte** unikt index på fulfilled rader.

Dokumentera resultat (datum, vem) i deploy-logg eller PR-kommentar.

## Produktion — deploysekvens

1. Verifiera att prod kör senaste **stabila** SHA (innan reward-integrity-deploy).
2. Kör precheck-frågorna ovan (1–2 obligatoriska; 3 informativ).
3. På VPS (app root enligt deploy-regler i repot): `npm run migrate` — bekräfta att `1810000000013_reward_integrity_constraints` och (vid behov) `1810000000014_drop_reward_fulfilled_unique` finns i `_migrations`.
4. Deploya **exakt** grön merge-SHA.
5. `sleep 3` → `curl -s http://127.0.0.1:3000/health` och verifiera deploy-SHA om tillgängligt.
6. Smoke: barn begär → förälder nekar → begär igen (samma eller syskon) → godkänn → ny begäran efter godkännande ska **lyckas** om belöningen fortfarande är aktiv och barnet har stjärnor; samtidiga pending ska ge 409.
7. Bevaka apploggar samt 409/5xx på redemption-endpoints.

## Semantik (referens)

| Status | Betydelse | `redeemed_at` |
|--------|-----------|---------------|
| `pending` | Reserverar (ingen stjärnavdragning) | NULL |
| `denied` | Frigör reservation | NULL |
| `approved` / `auto` | Historik + stjärnor dras vid godkännande | Sätts vid godkännande |

Stjärnor dras vid godkännande, inte vid begäran. Snapshot-fält bevarar historik om belöningen ändras eller inaktiveras.
