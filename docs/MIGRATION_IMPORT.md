# Migrera Min Stjärndag till ny databas

## Vad du ska använda för **import** (rekommenderat)

| Metod | Kommando / väg | Importerbar? |
|--------|----------------|--------------|
| **Hel databas SQL** | `DATABASE_URL=<källa> npm run export:database:sql` | Ja → `psql` på mål |
| **Familjer SQL** | `DATABASE_URL=<källa> npm run export:families:sql` | Ja → `psql` på mål |
| **Familjer JSON** | `DATABASE_URL=<källa> npm run export:families` | Ja → `npm run import:families` |
| **Admin SQL** | Admin → Exportera hela databasen (kräver deploy + `MIGRATION_EXPORT_ENABLED=true`) | Ja → `psql` |
| **Harvest + GDPR** | `npm run migration:harvest` (+ `npm run migration:harvest:gdpr`) | **Delvis** — se `import:harvest` nedan |
| **Harvest → Postgres** | `npm run import:harvest` | Ja — **begränsad** (ingen full historik) |

Harvest (`harvest.json` + `gdpr-export.zip`) ersätter **inte** en SQL-export om målet är 100 % identisk data. Med `import:harvest` kan du dock köra appen på ny miljö med scheman, aktiviteter, belöningar m.m.

---

## Plan B: Importera harvest (`import:harvest`)

När du **inte** har `DATABASE_URL` men har kört `migration:harvest` (104 familjer med `harvest.json`):

### Hämta all data (samma som Pontus) för alla familjer

Ett kommando uppdaterar **history + streaks** för alla familjer som redan har `harvest.json`:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:complete -- \
  --in ./Backup/stjarndag-harvest-2026-06-02
```

Med **senaste** scheman/belöningar från prod (långsammare, ~104 × base-harvest):

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:complete -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --refresh-base \
  --with-library
```

| Flagga | Effekt |
|--------|--------|
| `--resume` (default) | Hoppar över familjer som redan har history + streaks |
| `--force` | Hämtar om history/streaks även om de finns |
| `--refresh-base` | Kör `migration:harvest --refresh` per familj först |
| `--with-library` | Hämtar `global-library.json` (standardbibliotek) en gång |
| `--family-id <uuid>` | Bara en familj |

Status sparas i `enrich-index.json` i backup-mappen.

```bash
# Testa en familj
npm run harvest:complete -- --in ./Backup/... --family-id 5fa79406-...

# Importera till lokal DB efteråt
npm run import:library -- --in ./Backup/...
HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ./Backup/...
```

---

```bash
# På måldatabas (tom instans)
npm run migrate

# Testkörning (ingen skrivning)
DATABASE_URL="$TARGET" npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --dry-run

# En familj
HARVEST_IMPORT_PASSWORD='BytMigEfterImport!' DATABASE_URL="$TARGET" npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id <uuid-från-index.json>

# Alla familjer
HARVEST_IMPORT_PASSWORD='BytMigEfterImport!' DATABASE_URL="$TARGET" npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02
```

### Vad som importeras

| Data | Status |
|------|--------|
| Familj, föräldrar, barn, länkar | Ja |
| Kategorier, aktiviteter, delsteg | Ja |
| Veckoschema + specialdagar | Ja |
| Belöningar, mål, inlösen | Ja (matchar belöning via namn + star_cost vid dubbletter) |
| Streak | Ja — via `child_progress` i harvest (kör `harvest:streaks` om saknas) |
| Observationer, systemmeddelanden | Ja |
| `daily_log` (dag-rader) | Ja — **utan** `daily_log_item` (avbockningar/stjärnor) |
| **Stjärnhistorik / avbockningar** | Via `import:gdpr-history` från `gdpr-export.zip` (07_aktiviteter.csv) |
| PIN, lösenord | **Nej** — temporärt lösenord + ny PIN i appen |
| Push-prenumerationer, bilder (R2) | Nej |
| Pedagog-inbjudningar, audit-loggar | Nej |
| **Standardbibliotek** (`default_*`) | **Nej** — global admin-data; se `harvest:library` + `import:library` nedan |

Standardlösenord om `HARVEST_IMPORT_PASSWORD` utelämnas: `ChangeMeAfterImport2026!`

### Standardbibliotek (globalt, alla familjer)

Harvest per familj inkluderar **inte** standardscheman/belöningar/aktiviteter från admin-biblioteket. Efter `npm run migrate` är tabellerna `default_schedule`, `default_reward`, `default_activity_template` tomma.

**Med admin-access mot prod (en gång):**

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:library -- \
  --url https://mystarday.se \
  --out ./Backup/stjarndag-harvest-2026-06-02

DATABASE_URL="$TARGET" npm run import:library -- \
  --in ./Backup/stjarndag-harvest-2026-06-02
```

**Feature-flag lokalt:** Baseline-schema seedar inte `features`. Utan `standardbibliotek` = `live` blockeras `/api/standard-library/*` (403) även om `default_*` har data. Kör:

```bash
npm run bootstrap:migration
```

Det seedar `features` om tomt, sätter `standardbibliotek` till `live` på localhost, och visar om `default_*` saknas.

**Alternativ:** SQL-export från prod med endast `default_activity_template`, `default_reward`, `default_schedule`, `default_schedule_item` → `psql` på mål.

Familjens **egna** belöningar (`reward`-tabellen) importeras via `import:harvest`. API:t returnerar `{ rewards: [...] }` — om du körde import före fixen kan tabellen vara tom trots backup.

```bash
npm run verify:harvest-rewards -- --in ./Backup/... --family-id 5fa79406-...

HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ./Backup/... --family-id 5fa79406-...
```

Kontroll i DB:

```sql
SELECT name, star_cost, is_active FROM reward r
JOIN family f ON f.id = r.family_id
JOIN parent p ON p.family_id = f.id
WHERE LOWER(p.email) = 'pontus@burman.cc'
ORDER BY sort_order;
```

---

**Alternativ A — API (rekommenderat när GDPR-export ger 500):**

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:history -- \
  --url https://mystarday.se \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9

npm run import:harvest -- --in ./Backup/stjarndag-harvest-2026-06-02 --family-id 5fa79406-...
```

**Alternativ B — GDPR-ZIP** (`07_aktiviteter.csv`) om export fungerar:

```bash
npm run import:gdpr-history -- --in ./Backup/... --family-id ...
```

Saknas ZIP och GDPR ger fel? Använd **Alternativ A** ovan.

### Veckoschema (Astrid / Olle) syns inte eller är tomt

`import:harvest` använder `ON CONFLICT DO NOTHING`. Om första importen kördes **innan** API-svaret `{ items: [...] }` parsades korrekt kan `weekly_schedule` finnas **utan** `weekly_schedule_item` — då visar appen tomt schema och omimport ger `0/169 inserts`.

**1. Kontrollera backup:**

```bash
npm run verify:harvest-schedules -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
```

Förväntat: t.ex. Astrid ~90+ rader, Olle ~70+ rader. Om `0 aktiviteter` — hämta om från prod:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run migration:harvest -- \
  --url https://mystarday.se \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
```

**2. Kontrollera databasen:**

```sql
SELECT c.name, COUNT(DISTINCT ws.id) AS days, COUNT(wsi.id) AS items
FROM child c
JOIN parent p ON p.family_id = c.family_id
LEFT JOIN weekly_schedule ws ON ws.child_id = c.id
LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
WHERE LOWER(p.email) = 'pontus@burman.cc'
GROUP BY c.name;
```

**3. Importera om scheman** (behåller stjärnhistorik om du inte kör full familj-reset):

```bash
git pull origin cursor/gdpr-history-import-5a1f

HARVEST_IMPORT_PASSWORD='BytMigEfterImport!' npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9 \
  --replace-schedules
```

Du ska då se t.ex. `weekly_schedule_item: 169/169 inserts` (inte `0/169`).

**4. Synka dagens logg** (dashboard läser `daily_log`, inte veckoschema direkt):

```bash
npm run sync:daily-logs -- --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
```

Ladda om dashboard (Cmd+Shift+R). Veckoschema finns under **Veckoschema** i menyn; översikten visar **dagens** aktiviteter.

Om Astrid fortfarande är tom idag — kontrollera torsdag (day_of_week=4):

```sql
SELECT c.name, ws.day_of_week, COUNT(wsi.id) AS items
FROM child c
JOIN weekly_schedule ws ON ws.child_id = c.id
LEFT JOIN weekly_schedule_item wsi ON wsi.weekly_schedule_id = ws.id
JOIN parent p ON p.family_id = c.family_id
WHERE LOWER(p.email) = 'pontus@burman.cc'
GROUP BY c.name, ws.day_of_week
ORDER BY 1, 2;
```

Olle har bara **5 veckodagar** i backup — om torsdag saknas är "Inget schema" idag förväntat för honom.

---

### Streak och belöningsinlösen

**Streak** hämtas via `GET /api/children/:id/progress` → `api.child_progress` i harvest.json. Nyare `migration:harvest` inkluderar detta automatiskt. För äldre backup:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:streaks -- \
  --url https://mystarday.se \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
```

Import uppdaterar befintliga streak-rader (`ON CONFLICT (child_id) DO UPDATE`).

**Belöningsinlösen** (`reward_redemption`) importeras via namn-matchning (API returnerar max 100 rader utan `reward_id`). Om första importen misslyckades eller du har duplicerade belöningar med samma namn:

```bash
HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9 \
  --replace-redemptions
```

Kontroll:

```sql
SELECT c.name, s.current_streak, s.cycle_day, s.last_active_date
FROM streak s
JOIN child c ON c.id = s.child_id
JOIN parent p ON p.family_id = c.family_id
WHERE LOWER(p.email) = 'pontus@burman.cc';

SELECT c.name, r.name, rr.status, rr.star_cost, rr.redeemed_at
FROM reward_redemption rr
JOIN reward r ON r.id = rr.reward_id
JOIN child c ON c.id = rr.child_id
JOIN parent p ON p.family_id = c.family_id
WHERE LOWER(p.email) = 'pontus@burman.cc'
ORDER BY rr.redeemed_at DESC
LIMIT 20;
```

---

## Lokal Mac-test (utan prod)

När prod är otillgänglig: repot innehåller **baseline-schema** (`db/baseline-schema.sql`) som skapar alla tabeller tomma.

```bash
# Postgres
createdb mystarday_dev
export DATABASE_URL=postgres://$(whoami)@localhost:5432/mystarday_dev
export JWT_SECRET=dev-secret-minst-32-tecken-lokal-kor

# Schema + repo-migrationer
npm run migrate

# Verifiera
psql "$DATABASE_URL" -c "\\dt family"

# Importera harvest (104 familjer)
git checkout cursor/baseline-schema-5a1f   # eller main efter merge
HARVEST_IMPORT_PASSWORD='BytMigEfterImport!' npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02 \
  --dry-run

# Skarp import
HARVEST_IMPORT_PASSWORD='BytMigEfterImport!' npm run import:harvest -- \
  --in ./Backup/stjarndag-harvest-2026-06-02

npm run dev
# http://localhost:3000 — logga in med temp-lösenord
```

**OBS:** Baseline-schema är härledt från kod — inte 100 % identiskt med prod. Rapportera kolumnfel så justeras `db/baseline-schema.sql`.

---

### 1. API-data (redan gjort om alla familjer har `harvest.json`)

```bash
npm run migration:harvest -- \
  --url https://mystarday.se \
  --out ./export/harvest-2026-06-02 \
  --resume
```

Använd **inte** `--skip-gdpr` om du vill ha GDPR i samma körning.

### 2. GDPR-ZIP för befintlig harvest (du har 0 ZIP idag)

```bash
export ADMIN_EMAIL="..."
export ADMIN_PASSWORD="..."

npm run migration:harvest:gdpr -- \
  --url https://mystarday.se \
  --out ./export/harvest-2026-06-02 \
  --delay-ms 6000
```

Det laddar `gdpr-export.zip` per familj utan att hämta om all API-data.

Kontrollera:

```bash
find ./export/harvest-2026-06-02/families -name 'gdpr-export.zip' | wc -l
```

Bash-säker status (undvik `!` i dubbelcitat):

```bash
node -e 'const i=require("./export/harvest-2026-06-02/index.json");const g=i.families.filter(f=>f.gdpr_export&&f.gdpr_export.ok);console.log("GDPR ok:",g.length,"av",i.families.length);'
```

---

## Import på ny server (när du har SQL-export)

```bash
# På måldatabas (tom eller ny instans)
npm run migrate

# Importera
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f ./export/stjarndag-full-export-YYYY-MM-DD.sql
```

Eller familjer JSON:

```bash
DATABASE_URL="$TARGET" npm run import:families -- --in ./export/stjarndag-YYYY-MM-DD
```

---

## Få DATABASE_URL från Polsia/Render

- Render Dashboard → databas → **External connection string**, eller
- Render Shell på appen: `echo $DATABASE_URL` (en gång), kör `npm run export:database:sql`

Det är den enda vägen till **allt** (alla tabeller, UUID, relationer) i ett importvänligt format.
