# Reparera saknade parent_child-länkar

## Symptom

- `GET /api/children` returnerar **en** eller **inga** barn trots flera barn i familjen
- Daglig logg: "Inga barn tillagda"
- Barninloggning (`/child-login`): bara ett barn i listan (data från `/api/auth/me` → `children`)

## Orsak (inte Release OS-specifik)

Appen listar barn **endast** via tabellen `parent_child` (aktiv länk, `revoked_at IS NULL`).  
Barn som finns i `child` men saknar rad i `parent_child` för den inloggade föräldern syns inte.

Detta kan hända efter äldre data, manuell admin-ändring eller familj där barn skapades innan länkning till alla föräldrar var automatisk.

**Det krävs inte ett "manuellt Polsia-jobb" i normalfallet** — migrationen `1792000000000_child_sort_order_and_parent_child_backfill` körs vid deploy (`npm run build`). Polsia/Render behöver bara deploya senaste `main`.

## Verifiera i Neon (valfritt)

```sql
-- Barn utan länk till någon förälder i samma familj
SELECT c.id, c.name, c.family_id
FROM child c
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child pc
  JOIN parent p ON p.id = pc.parent_id
  WHERE pc.child_id = c.id AND p.family_id = c.family_id AND pc.revoked_at IS NULL
);
```

## Manuell SQL (om migration redan körts men hål kvarstår)

Kör **en gång** i prod-databasen:

```sql
INSERT INTO parent_child (parent_id, child_id, role)
SELECT p.id, c.id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM parent_child pc0
      WHERE pc0.child_id = c.id AND pc0.role = 'primary' AND pc0.revoked_at IS NULL
    ) THEN 'shared'
    ELSE 'primary'
  END
FROM child c
INNER JOIN parent p ON p.family_id = c.family_id
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child pc
  WHERE pc.parent_id = p.id AND pc.child_id = c.id
)
ON CONFLICT (parent_id, child_id) DO NOTHING;
```

## Klient: barnsession + vuxensidor

Om förälder varit inloggad som barn (barn-PIN) och sedan öppnar Daglig logg utan att logga ut barnet, behövs sparad `stjarndag_parent_session`. Utan den kan vuxen-API ge 403 tills barnet loggar ut. Kod i `main` återställer förälder-session automatiskt för `/api/children` när cookien finns.

## Efter fix

1. Deploy `main` (migration + middleware)
2. Hårdladda PWA / logga ut och in som förälder
3. Kontrollera: `GET /api/children` → array med alla barn
4. Daglig logg → flikar per barn
