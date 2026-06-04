'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, buildGdprHistoryBundles } = require('../src/lib/gdpr-history-import');

describe('gdpr-history-import', () => {
  it('parses CSV with quoted fields', () => {
    const csv = 'barn,datum,aktivitet,avbockad,tjänade_stjärnor,section\nAstrid,2026-05-15,Tänder,true,1,morgon\n';
    const rows = parseCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].barn, 'Astrid');
    assert.equal(rows[0].aktivitet, 'Tänder');
  });

  it('builds daily_log_item rows from GDPR activities CSV', () => {
    const csv = `barn,datum,aktivitet,avbockad,tjänade_stjärnor,avbockad_kl,section
Astrid,2026-05-15,Tänder,true,2,2026-05-15T08:00:00.000Z,morgon
Olle,2026-05-16,Frukost,false,1,,morgon`;

    const childId = '770e8400-e29b-41d4-a716-446655440002';
    const olleId = '770e8400-e29b-41d4-a716-446655440003';
    const logAstrid = 'aa0e8400-e29b-41d4-a716-446655440005';
    const logOlle = 'bb0e8400-e29b-41d4-a716-446655440006';
    const actId = '880e8400-e29b-41d4-a716-446655440003';

    const { bundles, meta } = buildGdprHistoryBundles(
      {
        childByName: new Map([
          ['astrid', childId],
          ['olle', olleId],
        ]),
        activityByName: new Map([
          ['tänder', actId],
          ['frukost', actId],
        ]),
        activityIconByName: new Map([['tänder', '🦷']]),
        logByChildDate: new Map([
          [`${childId}:2026-05-15`, logAstrid],
          [`${olleId}:2026-05-16`, logOlle],
        ]),
        primaryParentId: '660e8400-e29b-41d4-a716-446655440001',
      },
      { activities: csv, manualStars: 'barn,stjarnor,anledning,datum\nAstrid,3,Bra jobbat,2026-05-15T10:00:00.000Z\n' }
    );

    assert.equal(meta.items, 2);
    assert.equal(meta.manualStars, 1);

    const items = bundles.find((b) => b.table === 'daily_log_item').rows;
    assert.equal(items[0].completed, true);
    assert.equal(items[0].star_value, 2);
    assert.equal(items[0].activity_template_id, actId);
    assert.equal(items[1].completed, false);
  });
});
