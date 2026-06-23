'use strict';

/**
 * SMS shortlink routes (mounted at /tyck).
 */

const express = require('express');
const path = require('path');
const db = require('../../../db/surveys');

function requireFeaturePublic(slug) {
  return async (req, res, next) => {
    const { hasAccess } = require('../../../db/features');
    const allowed = await hasAccess(null, slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    next();
  };
}

// ── SMS shortlink router — handles /tyck (mounted at /tyck in server.js) ──
const shortlinkRouter = express.Router();
shortlinkRouter.use(requireFeaturePublic('enkater'));

// /tyck → redirect to first active popup-landing survey (SMS shortlink)
shortlinkRouter.get('/', async (req, res) => {
  try {
    const survey = await db.getActivePopupSurveyForLanding();
    if (survey) return res.redirect(302, `/tyck/${survey.slug}`);
    // Fallback: any active survey
    const surveys = await db.getAllSurveys();
    const active = surveys.find(s => s.status === 'active');
    if (active) return res.redirect(302, `/tyck/${active.slug}`);
    res.redirect(302, '/');
  } catch {
    res.redirect(302, '/');
  }
});

// /tyck/:slug → serve the survey SPA
shortlinkRouter.get('/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../public/tyck.html'));
});

module.exports = shortlinkRouter;
