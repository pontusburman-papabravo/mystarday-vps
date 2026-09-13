'use strict';

/**
 * SMS shortlink routes (mounted at /tyck).
 */

const express = require('express');
const path = require('path');
const db = require('../../../db/surveys');
const { isPublicSurveySlugAllowed } = require('../../lib/survey-public-access');

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

function sendTyckHtml(res) {
  res.sendFile(path.join(__dirname, '../../../public/tyck.html'));
}

const shortlinkRouter = express.Router();

// /tyck → redirect to first active popup-landing survey (SMS shortlink)
shortlinkRouter.get('/', requireFeaturePublic('enkater'), async (req, res) => {
  try {
    const survey = await db.getActivePopupSurveyForLanding();
    if (survey) return res.redirect(302, `/tyck/${survey.slug}`);
    const surveys = await db.getAllSurveys();
    const active = surveys.find(s => s.status === 'active');
    if (active) return res.redirect(302, `/tyck/${active.slug}`);
    res.redirect(302, '/');
  } catch {
    res.redirect(302, '/');
  }
});

// /tyck/:slug → serve the survey SPA (host-2026 is allowlisted even if enkater is off)
shortlinkRouter.get('/:slug', async (req, res) => {
  try {
    const allowed = await isPublicSurveySlugAllowed(req.params.slug);
    if (!allowed) {
      return res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
    }
    sendTyckHtml(res);
  } catch {
    res.status(403).json({ error: 'Enkäten är inte tillgänglig just nu' });
  }
});

module.exports = shortlinkRouter;
