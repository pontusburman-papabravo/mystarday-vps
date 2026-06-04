/**
 * Bootstrap full application schema on empty Postgres (no prod dump).
 * See db/baseline-schema.sql — inferred from codebase for import:harvest + local dev.
 */
const fs = require('fs');
const path = require('path');

module.exports = {
  name: '1780000000000_baseline_schema',

  up: async (client) => {
    const sqlPath = path.join(__dirname, '..', 'db', 'baseline-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
  },
};
