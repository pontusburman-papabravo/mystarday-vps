# Migrera Min Stjärndag till ny databas

## Vad du ska använda för **import** (rekommenderat)

| Metod | Kommando / väg | Importerbar? |
|--------|----------------|--------------|
| **Hel databas SQL** | `DATABASE_URL=<källa> npm run export:database:sql` | Ja → `psql` på mål |
| **Familjer SQL** | `DATABASE_URL=<källa> npm run export:families:sql` | Ja → `psql` på mål |
| **Familjer JSON** | `DATABASE_URL=<källa> npm run export:families` | Ja → `npm run import:families` |
| **Admin SQL** | Admin → Exportera hela databasen (kräver deploy + `MIGRATION_EXPORT_ENABLED=true`) | Ja → `psql` |
| **Harvest + GDPR** | `npm run migration:harvest` (+ `npm run migration:harvest:gdpr`) | **Nej** — arkiv / manuell återställning |

Harvest (`harvest.json` + `gdpr-export.zip`) ersätter **inte** en databasexport om målet är att köra appen på ny miljö med samma data.

---

## Harvest + GDPR (utan DATABASE_URL)

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
