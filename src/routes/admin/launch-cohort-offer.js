'use strict';

/**
 * Admin control for the first-25 launch cohort.
 * Enabling a country does not open registration. Disabling stops new grants
 * and leaves families who already have a place untouched.
 */

const express = require('express');
const { normalizeCountryCode } = require('../../lib/market-region');
const { isLaunchCohortFlagEnabled } = require('../../../db/launch-cohort-offer');
const {
  LAUNCH_COHORT_FLAG_KEY,
  LAUNCH_COHORT_EXPIRING_SOON_DAYS,
} = require('../../lib/launch-cohort-offer');
const {
  listLaunchCohortConfigs,
  setLaunchCohortCountryEnabled,
  listLaunchCohortFamilies,
  listLaunchCohortExpiring,
} = require('../../../db/launch-cohort-offer');

const router = express.Router();

function mapError(err, res, next) {
  if (err && err.code === 'LAUNCH_COHORT_EXCLUDED') {
    return res.status(403).json({
      error: 'Sverige, Irland och Kanada kan inte få det här erbjudandet.',
      code: err.code,
    });
  }
  if (err && (err.code === 'LAUNCH_COHORT_INELIGIBLE' || err.code === 'LAUNCH_COHORT_NOT_CONFIGURED')) {
    return res.status(404).json({ error: 'Landet ingår inte i erbjudandet.', code: err.code });
  }
  if (err && err.code === 'LAUNCH_COHORT_ENABLED_REQUIRED') {
    return res.status(400).json({ error: 'enabled krävs (boolean).', code: err.code });
  }
  return next(err);
}

router.get('/launch-cohort-offer/expiring', async (req, res, next) => {
  try {
    const raw = Number.parseInt(String(req.query.within_days || ''), 10);
    const withinDays = Number.isInteger(raw) ? raw : LAUNCH_COHORT_EXPIRING_SOON_DAYS;
    const families = await listLaunchCohortExpiring(withinDays);
    res.json({
      within_days: Math.min(90, Math.max(1, withinDays)),
      families,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/launch-cohort-offer', async (req, res, next) => {
  try {
    const [flagEnabled, countries] = await Promise.all([
      isLaunchCohortFlagEnabled(),
      listLaunchCohortConfigs(),
    ]);
    res.json({
      flag_key: LAUNCH_COHORT_FLAG_KEY,
      flag_enabled: flagEnabled,
      countries,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/launch-cohort-offer/:countryCode/families', async (req, res, next) => {
  try {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    const families = await listLaunchCohortFamilies(countryCode);
    res.json({ country_code: countryCode, families });
  } catch (err) {
    next(err);
  }
});

router.get('/launch-cohort-offer/:countryCode', async (req, res, next) => {
  try {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    const countries = await listLaunchCohortConfigs();
    const row = countries.find((item) => item.country_code === countryCode) || null;
    if (!row) {
      return res.status(404).json({ error: 'Landet ingår inte i erbjudandet.', code: 'LAUNCH_COHORT_NOT_CONFIGURED' });
    }
    res.json({ flag_enabled: await isLaunchCohortFlagEnabled(), ...row });
  } catch (err) {
    next(err);
  }
});

router.put('/launch-cohort-offer/:countryCode', async (req, res, next) => {
  try {
    const countryCode = normalizeCountryCode(req.params.countryCode);
    const enabled = req.body && req.body.enabled;
    const row = await setLaunchCohortCountryEnabled(countryCode, enabled);
    res.json({
      ok: true,
      flag_key: LAUNCH_COHORT_FLAG_KEY,
      flag_enabled: await isLaunchCohortFlagEnabled(),
      ...row,
      note: 'Redan tilldelade familjer behåller sin period. Nya platser delas bara ut när både flaggan och landet är på.',
    });
  } catch (err) {
    mapError(err, res, next);
  }
});

module.exports = router;
