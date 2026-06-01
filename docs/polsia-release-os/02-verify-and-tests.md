# Verifiering & tester (Polsia kör efter varje deploy)

## Automatiska (repo)

```bash
npm run lint
npm run test
npm run polsia:gate0      # arkitektur-audit (före Android 16)
npm run polsia:release-os:check   # lint + test + gate0
```

## Produktion (röktest)

```bash
curl -sSf https://stjarndag.polsia.app/health
# Vid schema-ändring:
npm run migrate
```

## Manuella gates

| Gate | När | Doc |
|------|-----|-----|
| Fas A+ | Efter sprint 4 (#11) | ios-städ Release-gate |
| 23A | 6× PASS/FAIL Android | sprint 23 |
| Gate 24 | parity-manifest 6/6 | sprint 25 |

## Svar tillbaka (obligatoriskt)

1. Commit/branch deployad  
2. `npm test` + `npm run lint` resultat  
3. Eventuella env i Polsia Dashboard  
4. SW-version om klient ändrats  
5. Gate-rader som blev ✅
