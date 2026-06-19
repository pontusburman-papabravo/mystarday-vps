/**
 * Admin: package interest list + export (§9.10.5).
 */

const express = require('express');
const packageInterest = require('../../../db/package-interest');
const { INTEREST_COMPONENTS, INTEREST_SOURCES, PACKAGE_LABELS } = require('../../lib/package-interest-constants');

const router = express.Router();

function parseFilters(query) {
  return {
    component: INTEREST_COMPONENTS.includes(query.component) ? query.component : undefined,
    source: INTEREST_SOURCES.includes(query.source) ? query.source : undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    limit: query.limit ? parseInt(query.limit, 10) : 50,
    offset: query.offset ? parseInt(query.offset, 10) : 0,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const { rows, total } = await packageInterest.listInterest(filters);
    res.json({
      rows: rows.map((row) => ({
        ...row,
        component_label: PACKAGE_LABELS[row.component] || row.component,
      })),
      total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const counts = await packageInterest.getInterestCountsByComponent();
    const map = { reporting: 0, pedagog: 0, teacch: 0, total: 0 };
    for (const row of counts) {
      map[row.component] = row.families;
      map.total += row.families;
    }
    res.json(map);
  } catch (err) {
    next(err);
  }
});

router.get('/export.csv', async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const rows = await packageInterest.listInterestForExport(filters);

    const header = 'created_at,family_name,component,source,parent_name,comment\n';
    const csv = rows.map((row) => {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [
        row.created_at?.toISOString?.() || row.created_at,
        row.family_name,
        row.component,
        row.source,
        row.parent_name,
        row.comment,
      ].map(esc).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="package-interest.csv"');
    res.send('\uFEFF' + header + csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
