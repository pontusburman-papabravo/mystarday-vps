'use strict';

const crypto = require('crypto');
const { hashPassword } = require('../../../src/lib/hash');
const { setFamilyEnglishFlags } = require('./i18n-flags');
const { cookieHeader, getSetCookieHeaders, mergeCookies } = require('../../helpers/http');

function uniqueTag() {
  return `e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Seed an isolated English-ready family via HTTP API + direct DB tweaks.
 */
async function seedEnglishJourneyFamily(baseUrl, query, opts = {}) {
  const tag = uniqueTag();
  const email = `${tag}@example.com`;
  const password = 'E2eTestPass-1';
  const childName = opts.childName || 'Alex';
  const childUsername = opts.childUsername || `u${crypto.randomBytes(6).toString('hex')}`;
  const childPin = opts.childPin || '2468';
  const familyName = opts.familyName || `E2E Family ${tag}`;

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'E2E Parent',
      family_name: familyName,
      preferred_locale: opts.registerLocale || 'sv-SE',
    }),
  });
  const registerText = await registerRes.text();
  if (registerRes.status !== 201) {
    throw new Error(`register failed ${registerRes.status}: ${registerText}`);
  }

  const parentRow = await query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  const parentId = parentRow.rows[0].id;
  const familyId = parentRow.rows[0].family_id;

  await query(
    `UPDATE parent SET onboarding_completed = true, name = $1 WHERE id = $2`,
    ['E2E Parent', parentId]
  );

  if (opts.dbLocale) {
    await query('UPDATE family SET preferred_locale = $1 WHERE id = $2', [opts.dbLocale, familyId]);
  }

  await setFamilyEnglishFlags(query, familyId, {
    childExperience: opts.childExperience !== false,
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = JSON.parse(await loginRes.text());
  if (loginRes.status !== 200) {
    throw new Error(`login failed ${loginRes.status}: ${JSON.stringify(loginBody)}`);
  }

  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }

  const childRes = await fetch(`${baseUrl}/api/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': loginBody.csrfToken,
    },
    body: JSON.stringify({
      name: childName,
      emoji: '⭐',
      birthday: '2016-05-01',
    }),
  });
  const childText = await childRes.text();
  if (childRes.status !== 201) {
    throw new Error(`create child failed ${childRes.status}: ${childText}`);
  }
  const childBody = JSON.parse(childText);
  const childId = childBody.id;

  const pinHash = await hashPassword(childPin);
  await query(
    `UPDATE child SET username = $1, pin = $2, view_type = 'day_sections' WHERE id = $3`,
    [childUsername, pinHash, childId]
  );

  const activities = await query(
    `SELECT name FROM activity_template WHERE family_id = $1 LIMIT 20`,
    [familyId]
  );
  const activityNames = activities.rows.map((r) => r.name);

  const log = await query(
    `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
    [childId]
  );
  await query(
    `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
     VALUES ($1, 'Brush teeth', 'morgon', 0, 1, false)`,
    [log.rows[0].id]
  );

  return {
    tag,
    email,
    password,
    familyId,
    parentId,
    childId,
    childName,
    childUsername,
    childPin,
    familyName,
    allowlist: [childName, familyName, 'E2E Parent', email, childUsername, 'Brush teeth', ...activityNames],
  };
}

module.exports = { seedEnglishJourneyFamily, uniqueTag };
