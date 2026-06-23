# Polsia kan inte pusha till repo — så deploy funkar ändå

**Problem:** Polsia engineering-agent har Render-access men **inte** skrivrättighet till GitHub.

**Lösning:** All Release OS-kod ligger redan på **`main`** hos Pontus. Polsia ska **hämta + deploya**, inte committa ny kod.

---

## Var koden finns (källa)

| Repo | Roll |
|------|------|
| `https://github.com/pontusburman-papabravo/MyStarday-Polsia` branch **`main`** | **Sanning** — Cursor har mergat sprint 1–26 hit |
| `https://github.com/Polsia-Inc/stjarndag` | Polsias host-repo (kan ligga efter) |

**Senaste commit (referens):** se `main` på MyStarday-Polsia (t.ex. `b35ff82` eller nyare).

---

## Tre sätt att få kod till prod (välj ett)

### A) Render deploy från MyStarday-Polsia (rekommenderat om du äger Render)

1. Render Dashboard → Web Service → **Settings → Build & Deploy**
2. **Repository:** koppla `pontusburman-papabravo/MyStarday-Polsia`
3. **Branch:** `main`
4. **Manual Deploy** → Deploy latest commit

Polsia behöver bara köra migrate/test **på servern** efter deploy (SSH/console om Polsia har det) — eller du kör det.

### B) Du synkar till Polsia-Inc/stjarndag (om Render måste peka på Polsia-repo)

Pontus (med push-rättighet):

```bash
git clone https://github.com/pontusburman-papabravo/MyStarday-Polsia.git
cd MyStarday-Polsia
git push https://github.com/Polsia-Inc/stjarndag.git main:main
```

Sedan: Polsia/Render deployar `Polsia-Inc/stjarndag` `main` som vanligt.

### C) Polsia engineering-agent: clone + deploy utan push

Task till agenten:

1. `git clone --depth 1 -b main https://github.com/pontusburman-papabravo/MyStarday-Polsia.git /tmp/stjarndag-release`
2. Deploy **innehållet** till Render (rsync / Polsias deploy-pipeline / rebuild från connected repo efter B)
3. Kör på server: `npm run migrate && npm test && npm run polsia:gate0`
4. **Pusha inte** till GitHub — rapportera commit-hash som deployades

---

## Vad Polsia INTE ska göra

- ❌ Implementera sprint 1–26 igen (redan på `main`)
- ❌ Förvänta sig git push till Polsia-Inc
- ❌ Vänta på nya commits från Polsia-chat

## Vad Polsia SKA göra

- ✅ Deploya exakt `main` från MyStarday-Polsia (eller synkad kopia)
- ✅ Env i Dashboard ([`ENV_FOR_POLSIA_DASHBOARD.md`](ENV_FOR_POLSIA_DASHBOARD.md))
- ✅ Browser smoke efter deploy ([`BROWSER_SMOKE_TASK.md`](BROWSER_SMOKE_TASK.md))
- ✅ Rapportera: deploy klar när `/api/app-config` 200 + SW **v167**

---

## Meddelande till Polsia (copy-paste)

```
Ni behöver INTE pusha till GitHub.

All kod för Release OS sprint 1–26 finns redan på:
https://github.com/pontusburman-papabravo/MyStarday-Polsia
branch: main

Er engineering-task:
1) Deploya den committen till Render (clone + deploy ELLER jag synkar repo / jag byter Render-källa)
2) Kör på servern efter deploy: npm run migrate && npm test && npm run polsia:gate0
3) Verifiera: GET /api/app-config → 200, sw.js → stjarndag-v167

Om Render idag bara lyssnar på Polsia-Inc/stjarndag: säg till — jag (Pontus) pushar main dit, ELLER vi pekar Render mot MyStarday-Polsia.
```
