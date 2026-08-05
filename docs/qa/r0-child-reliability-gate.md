# R0 — Child Reliability gate (founder smoke)

**Epic:** [`product-roadmap-r0-epic.md`](../product-roadmap-r0-epic.md)  
**Kör efter:** R0-01 … R0-07 mergade (R0 **COMPLETE** när founder-signering nedan är ifylld).

Miljö: **prod eller staging med founder QA-konto** ([`docs/founder-qa-test-account.md`](../founder-qa-test-account.md)). Portrait, en hand, morgonscenario (~07:15). **Ingen ny lång manuell omgång** om agent-gate nedan är grön — founder bekräftar bara signoff-tabellen.

---

## Automatiserat (före manuell smoke)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:r0-mobile-gate
NODE_ENV=test npm run test:child-core-harness
```

- [x] `test:gate` exit 0 på release-SHA (CI)
- [x] `test:r0-mobile-gate` exit 0 — R0-01…R0-06 kedja, 390×844 + 412×915, syntetiska konton (Cursor Cloud Agent, 2026-08-05)
- [ ] `test:child-core-harness` exit 0 på release-SHA (valfritt parallellt; ingår inte i R0-07-kedjan)
- [ ] `GET /health` — `cache_version` matchar `config/cache-version.json`

---

## R0-01 Schemaordning

- [ ] Förälder ändrar ordning på minst 3 aktiviteter (samma sektion)
- [ ] Barn: Idag visar samma ordning (namn eller känd ordning)
- [ ] Hard refresh barnvy — ordning kvar
- [ ] Barn logout → login — ordning kvar
- [ ] (Om `allow_child_reorder`) Barn ändrar ordning — förälder ser samma dag

**Fail:** registrera aktivitets-ID/namn + skärmdump + tidpunkt.

---

## R0-02 Delsteg

- [ ] Aktivitet med ≥2 delsteg expanderar utan JS-fel
- [ ] Hel rad togglar delsteg; progress tydlig (t.ex. 2/4)
- [ ] Sista delsteg → aktivitet klar; stjärna enligt regel
- [ ] Reduced motion på: ingen lång blockande animation

---

## R0-03 Prestanda (upplevelse)

- [ ] Efter PIN: något meningsfullt på skärmen inom ~1 s (subjektivt)
- [ ] Idag användbar utan >3 s tom spinner
- [ ] (Valfritt) notera tid login → första NU-kort (sekunder)

---

## R0-04 Offline

- [ ] Flygpläge: Idag visar senaste rutin (eller tydlig offline-copy)
- [ ] Complete en aktivitet offline → online: en stjärna, ingen dubbel
- [ ] Logout tömmer inte felaktigt synlig rutin på nästa barn

---

## R0-05 Tillgänglighet (spot)

- [ ] PIN-siffror läsbara (kontrast)
- [ ] Största NU-knapp tryckbar med tumme
- [ ] (Valfritt) VoiceOver på ett NU-kort + ett delsteg

---

## R0-06 Supportdiagnostik

- [x] Inställningar → kopiera teknisk info: version/cache/correlation, **inte** e-post eller barnnamn (R0-06 smoke + `test/support-diagnostics.test.js`)

---

## Aktivitetstimer (regression only — inte R0-leverans)

- [ ] Med `activity_timers_enabled=false` (default): R0-smoke ovan oförändrad grön
- [ ] Om R2 redan live: separat rad — timer start/stop utan att bryta completion

---

## Signoff

**R0 godkänd när:** CI grön · `npm run test:r0-mobile-gate` grön · inga öppna R0-blockers · founder rad nedan ifylld.

| Roll | Namn | Datum | SHA |
|------|------|-------|-----|
| Founder / QA | | | |
| Engineering (agent mobilgate) | Cursor Cloud Agent | 2026-08-05 | `8c35486a` (post #887) |

**Epic R0 klar:** R0-01…R0-07 merged + agentmobilgate grön + founder-signering.
