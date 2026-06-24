# Kodgranskning — Refaktor Fas 0–11

> **Granskat:** `main` @ `ad9a895` · **Datum:** 2026-06-24
> **Verktyg:** lint (`eslint src/ server.js`), full testsvit (`node --test`, mock-DB), route-inventory-diff, manuell läsning av säkerhetskritisk kod.

## Sammanfattande omdöme

Refaktorn (Fas 0–11: Stripe-rensning, middleware-pipeline, backend-split, frontend-split,
Tailwind-build, paywall, CSRF, authz) är i **gott skick. Inga funktionella regressioner hittade.**

De röda testerna är **6 stale tester** (pekar på raderade monolitfiler efter E-/F-split) +
**1 kosmetisk UX-detalj**. Inga säkerhets- eller routingregressioner.

| Kontroll | Resultat |
|---|---|
| Lint | **0 errors**, 72 warnings (pre-existing unused-vars) |
| Testsvit (mock-DB) | **870 tester · 853 pass · 7 fail · 10 skipped** |
| Route-inventory | 607 routes — enda diff = en *tillagd* route (`GET /kontakt`) |
| Säkerhet (D1/D2/D4/C2b) | Alla verifierade på disk (se §3) |

De 10 skippade är DB-integrationstester (auth, child-access, maintenance, paywall,
messages-CSRF, setup-db) som korrekt skippar utan lokal Postgres — **körs skarpt i CI**.

---

## 1. De 7 röda testerna — diagnos + exakt fix

Samtliga är **stale tester** (läser filsökvägar som E-/F-split tagit bort eller flyttat innehåll ur),
utom #7 som är en äkta liten UX-detalj. Logiken finns kvar och är verifierad i de nya modulerna.

### 1–3. `/api/family/readiness` (×3) — flyttad till `src/routes/family/core.js`

Logiken är intakt: route @`core.js:569`, `child_reward_goal_change_request` @613,
`COUNT(*)`+`parseInt` @629/647, `pending_invite` @663, `incomplete_past_days` @689.
Testerna läser den **raderade** `src/routes/family.js`.

**Fix:** byt sökväg i tre tester.

- `test/meny-v2-review-fixes.test.js:25`
  ```diff
  - const src = fs.readFileSync(path.join(ROOT, 'src/routes/family.js'), 'utf8');
  + const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/core.js'), 'utf8');
  ```
- `test/meny-v21.test.js:116` — samma ändring (`src/routes/family.js` → `src/routes/family/core.js`).
- `test/meny-v22.test.js:27` — samma ändring (`src/routes/family.js` → `src/routes/family/core.js`).

### 4. `child-dashboard.js still calls the extracted functions` — `launchMilestoneConfetti` flyttad

`child-dashboard.js` anropar fortfarande `checkMilestones(total, completed)` (rad 624) och
`launchDopaminBurst(checkEl)` (rad 1390). `launchMilestoneConfetti()` anropas numera ur
`child-dashboard-rewards.js:608` (funktionen definieras + exponeras på `window` i
`child-dashboard-celebrations.js:179-181`). Testet kräver felaktigt alla tre i huvudfilen.

**Fix:** `test/child-dashboard-celebrations.test.js:34-39` — flytta confetti-assertionen till rätt fil.
```diff
  it('child-dashboard.js still calls the extracted functions', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /checkMilestones\(total, completed\)/);
    assert.match(src, /launchDopaminBurst\(checkEl\)/);
-   assert.match(src, /launchMilestoneConfetti\(\)/);
+   // launchMilestoneConfetti() anropas ur rewards-modulen efter F-split
+   const rewards = read('public/js/child-dashboard-rewards.js');
+   assert.match(rewards, /launchMilestoneConfetti\(\)/);
  });
```

### 5. `child-dashboard shows denied redemptions kindly` — flyttad till rewards-modul

`deniedRecent` + "Inte den här gången" finns i `child-dashboard-rewards.js:98,288`.

**Fix:** `test/meny-v22.test.js:83`
```diff
- const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
+ const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
```

### 6. `dump-routes --check matches committed inventory` — snapshot ej regenererad

Enda skillnaden mot `docs/route-inventory-pre-split.md` är en **tillagd** route `GET /kontakt`
(nya kontaktsidan). **Inga tappade eller dubblerade routes** — backend-splitten bevarade hela
route-ytan (607 routes).

**Fix:** regenerera och committa snapshoten.
```bash
node scripts/dump-routes.js --write
git add docs/route-inventory-pre-split.md
```

### 7. `landing page links to skattkammaren demo` — äkta liten UX-detalj

CTA:n pekar korrekt på demo (`public/index.html:357` → `/skattkammaren?demo=1`), men den
omskrivna landningssidans **footer** länkar till den inloggningsgatade `/skattkammaren`
(`public/index.html:553`). En utloggad besökare som klickar i footern bouncas till login.
Testet (`test/skattkammaren-public-route.test.js:20`) har `assert.doesNotMatch(.../skattkammaren"/)`.

**Fix (rekommenderad — rätta produkten, inte testet):** peka om footer-länken till demo.
```diff
- <a href="/skattkammaren">Skattkammaren</a>
+ <a href="/skattkammaren?demo=1">Skattkammaren</a>
```
(Alternativt, om bar länk i footern är ett medvetet val: uppdatera testet att tillåta footer-länken.)

---

## 2. Routing — verifierad, inga regressioner

`scripts/dump-routes.js` jämför körd app mot committad inventory via sha256.
Diff mot baseline = endast `+ GET /kontakt`. Detta är E0-skyddsnätets själva poäng:
den stora backend-splitten (`auth.js`, `family.js`, `account.js`, `daily-logs.js`, `surveys.js`
→ kataloger) tappade eller dubblerade **inga** routes.

---

## 3. Säkerhet — alla D-mål verifierade på disk

| Mål | Status | Bevis |
|---|---|---|
| **D1** authz `revoked_at` | ✓ | Alla child-access-queries + primary-parent-koll i `src/middleware/authz.js` har `revoked_at IS NULL` (rad 44/60/77/96/122/300) |
| **D2** Google `aud` | ✓ | `src/lib/google-auth.js` skickar multi-client `audience`-array (web/android/ios) till `verifyIdToken`; kastar fel om inga client-ID:n |
| **D4** CSRF på messages | ✓ | `/messages/` är **inte** i `CSRF_EXEMPT_*` i `src/middleware/csrf.js`; mutationer kräver double-submit-token (konstant-tidsjämförelse, `sameSite=strict`) |
| **C2b** global paywall | ✓ | `requireActiveSubscription` definieras i `subscription.js` men **monteras ingenstans** i `app.js`/`server.js`; kanonisk modell = per-route `requireComponent` |

---

## 4. Migration (Fas 6) — säker

`migrations/1808300000000_drop_family_stripe_columns.js`: `up` droppar med `IF EXISTS`
(idempotent), `down` återskapar med `IF NOT EXISTS`. Schema-säker rollback. (Datatappet är
inneboende i en kolumn-drop, men kolumnerna var döda sedan Fas 1.)

---

## 5. Frontend (Fas 8–9) — verifierad

- Split-moduler (`dashboard-*`, `schedule-*`, `child-dashboard-*`) wirade — täcks av dussintals
  **passerande** tester (script-laddningsordning + window-exponering).
- **Tailwind-CDN helt borttagen** från serverade sidor (`cdn.tailwindcss.com` finns endast i
  migrations-/test-/QA-smoke-script som *kontrollerar frånvaro*). Alla sidor länkar `tailwind.build.css`.
- SW `CACHE_NAME = 'stjarndag-v315'` matchar `config/cache-version.json` — konsekvent.

---

## 6. Valfri städning (ej brådskande)

- `src/middleware/subscription.js` exporterar oanvänd `requireActiveSubscription` — kan tas bort.
- 72 pre-existerande lint-warnings (unused vars, mestadels `_`-prefixade) — kan städas vid tillfälle.

---

## 7. Förbehåll (kunde inte verifieras i granskningsmiljön)

- **10 DB-integrationstester skippades** (ingen lokal Postgres). De är det enda som testar
  authz/paywall/CSRF-beteende vid **runtime** — bekräfta att de är gröna i CI.
- **Node 20 saknades lokalt** (kördes på v24); CI använder 20.
- **`gh` saknas** → Actions-status för `ad9a895` ej avläst.

---

## 8. "Definition of done" — för helt grön svit

- [ ] §1.1–1.3: byt `src/routes/family.js` → `src/routes/family/core.js` i tre readiness-tester
- [ ] §1.4: flytta `launchMilestoneConfetti()`-assert till `child-dashboard-rewards.js`
- [ ] §1.5: byt till `child-dashboard-rewards.js` i denied-redemptions-testet
- [ ] §1.6: `node scripts/dump-routes.js --write` + committa inventory
- [ ] §1.7: peka om footer-länk till `/skattkammaren?demo=1` (eller justera testet)
- [ ] Kör `npm run lint` (0 errors) och `NODE_ENV=test npm test` (förväntat: 0 fail, ~10 skip lokalt)
- [ ] Bekräfta grön CI (Node 20 + Postgres-integrationstester) före deploy

> Allt ovan är low-severity och rör test-/dokumenthygien + en kosmetisk UX-länk.
> Ingen produktionskodregression kräver åtgärd.
