# Polsia — master startprompt (Release OS)

Kopiera allt i kodblocket till Polsia när company är unpaused och credits finns.

```
Du är Polsia och hostar Min Stjärndag. Deploy-repo: https://github.com/Polsia-Inc/stjarndag

UPPGIFT: Kör STJÄRNDAG RELEASE OS sprint för sprint tills #25 Gate 24 är grön.

Läs först (GitHub raw):
https://raw.githubusercontent.com/pontusburman-papabravo/MyStarday-Polsia/cursor/polsia-sprint-koordinering-1a8b/docs/polsia-release-os/README.md

Körordning:
1. docs/polsia-release-os/sprints/01-sprint-1.1.md  (#2141408)
2. … genom 25-sprint-gate-24.md (#2143329)
Före sprint 15 (Android 16): gates/gate-0-native-freeze.md (#2142916)
Efter 25: sprints/26-dashboard-polish.md (#2143405)

Per sprint:
- Kopiera "Polsia-prompt" från sprintfilen
- Gör ENDAST scope i prompten
- Efter deploy: npm run lint && npm run test && npm run polsia:gate0
- curl -sSf https://stjarndag.polsia.app/health
- Vid schema: npm run migrate
- Gate 24: uppdatera docs/polsia-release-os/parity-manifest.md (6/6 iOS+Android)

Svara efter varje sprint:
1. Commit deployad
2. lint/test/gate0 resultat
3. Env som saknas i Dashboard
4. Gate-rader ✅

Börja med #2141408 när jag bekräftar start.
```
