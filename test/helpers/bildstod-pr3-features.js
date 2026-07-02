'use strict';

/**
 * Seed PR3 feature rows after setupTestDb truncate (features table is wiped each test).
 */
async function seedBildstodPr3Features(db) {
  await db.query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES
       ('emotion_tracking', 'Känslostöd', 'Känsloregistrering efter aktivitet', 'live',
        ARRAY['features','barn']::text[], 'medium', 4, 10.0),
       ('transition_support', 'Övergångsstöd', 'Inline övergångstext i NU-kortet', 'dev',
        ARRAY['features','barn','teacch']::text[], 'high', 5, 12.0)
     ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status`
  );
}

module.exports = { seedBildstodPr3Features };
