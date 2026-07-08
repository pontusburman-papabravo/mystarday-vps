# QA — Barnets samling v1 (hela flödet)

Slutlig constitution-test för `barnets_samling` efter Fas A–E.

**Konto:** [`docs/qa-test-account.md`](../qa-test-account.md) (barn Anna + förälder enligt demo-dokumentet).

**Automatiserat (kör före manuell QA):**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
npm run check:css
```

Relevanta suites: `barnets-samling-*.test.js`, `idag-*.test.js`, `mina-personer-*.test.js`, `skattkammaren-*.test.js`.

---

## Gate ON — fyra flikar

### ☀️ Idag (`/child/today`)

| # | Kontroll |
|---|----------|
| 1 | Primär handling synlig (nästa aktivitet) |
| 2 | Bockning fungerar; kort firande ≤2 s |
| 3 | Ingen toast som tvingar till ”Min värld”/hub |
| 4 | Stjärnor i rutinen; ingen shop-copy |
| 5 | Nav: fyra flikar (Idag · Min samling · Skattkammaren · Mina personer) |

### 🏆 Min samling (`/child/collection`)

| # | Kontroll |
|---|----------|
| 1 | Rubrik + ”Titta vad du har samlat” |
| 2 | Stjärnglas: **lifetime_stars** (inte spendable) |
| 3 | Trofévägg från achievements |
| 4 | Streak-kedja; neutral tomstatus |
| 5 | Minneskort + belöningshylla från redemptions (read-only) |
| 6 | Diplom (klientgenererade) |
| 7 | **Min årsbok:** månadsuppslag, snap-bläddring, varm tomstatus |
| 8 | Ingen `ChildCollections`, shop, köp, loot |

### 🎁 Skattkammaren (`/child/treasure`)

| # | Kontroll |
|---|----------|
| 1 | Spendable saldo i header |
| 2 | Aktivt mål + progress |
| 3 | Statusar: Sparar · Kan lösas in · Väntar · Genomförd |
| 4 | Inlösen (`requestRedeem`) oförändrat |
| 5 | Historik i kista-estetik; kort på hylla |
| 6 | Tillbaka → Idag (inte hub/Morgonhus) |

### ❤️ Mina personer (`/child/family`)

| # | Kontroll |
|---|----------|
| 1 | Familjemedlemmar visas |
| 2 | Ingen syskonjämförelse/leaderboard |
| 3 | Nav och tillbaka fungerar |

---

## Gate OFF — legacy

| # | Kontroll |
|---|----------|
| 1 | Flik **Min värld** (inte Min samling) |
| 2 | Hub/Morgonhus som ingång där legacy förväntas |
| 3 | Legacy Skattkammaren: saldo, inlösen, pending |
| 4 | Ingen forced route till `/child/collection` eller `/child/treasure` |
| 5 | Idag och belöningsloop oförändrad |

---

## Korsnavigering

| Från | Till | Förväntat |
|------|------|-----------|
| Idag | Skattkammaren | Saldo kvar; inget extra steg |
| Skattkammaren | Idag | Inlösen-state bevarad |
| Min samling | Idag | Ingen redeem/saldo-läcka |
| Alla flikar | Logga ut / byt barn | Fungerar |

---

## Passkriterier

- [ ] Alla gate ON-flikar testade på mobil portrait
- [ ] Gate OFF legacy smoke OK
- [ ] `npm run test:gate` grön
- [ ] Ingen shop/köp/loot-copy i Min samling
- [ ] Redeem/API oförändrat

**Follow-up (ej blocker):** #631 persistent Godkänd ≠ Genomförd (`fulfilled_at`).
