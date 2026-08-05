# R0 — Child Reliability gate (founder smoke)

**Epic:** [`product-roadmap-r0-epic.md`](../product-roadmap-r0-epic.md)  
**Kör efter:** R0-01 … R0-06 mergade; R0-07 PR innehåller eventuella sista fixar + denna checklista.

Miljö: **prod eller staging med founder QA-konto** ([`docs/founder-qa-test-account.md`](../founder-qa-test-account.md)). Portrait, en hand, morgonscenario (~07:15).

---

## Automatiserat (före manuell smoke)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
NODE_ENV=test npm run test:child-core-harness
```

- [ ] Båda exit 0 på release-SHA
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

- [ ] Om implementerad: export innehåller version/SW, **inte** e-post eller barnnamn

---

## Aktivitetstimer (regression only — inte R0-leverans)

- [ ] Med `activity_timers_enabled=false` (default): R0-smoke ovan oförändrad grön
- [ ] Om R2 redan live: separat rad — timer start/stop utan att bryta completion

---

## Signoff

| Roll | Namn | Datum | SHA |
|------|------|-------|-----|
| Founder / QA | | | |
| Engineering | | | |

**Epic R0 klar:** alla rader ovan kryssade + signoff.
