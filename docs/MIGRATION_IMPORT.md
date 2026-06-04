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
| Belöningar, mål, inlösen | Ja (matchar belöning via namn om `reward_id` saknas) |
| Observationer, systemmeddelanden | Ja |
| `daily_log` (dag-rader) | Ja — **utan** `daily_log_item` (avbockningar/stjärnor) |
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

**Alternativ:** SQL-export från prod med endast `default_activity_template`, `default_reward`, `default_schedule`, `default_schedule_item` → `psql` på mål.

Familjens **egna** belöningar (`reward`-tabellen) importeras via `import:harvest` — det är inte samma sak som standardbiblioteket.


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
