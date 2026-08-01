#!/usr/bin/env node
'use strict';

/**
 * One-time / pre-smoke: enable english_child_experience for the App Store review family only.
 * Uses admin API POST /api/admin/features/:slug/families (same as admin Development UI).
 *
 * Env: RC1_SMOKE_BASE_URL, RC1_REVIEW_EMAIL, RC1_REVIEW_PASSWORD,
 *      ADMIN_EMAIL, ADMIN_PASSWORD
 */
const { apiRequest, readJson, adminLogin } = require('./lib/migration-http');

const FEATURE_SLUG = 'english_child_experience';
const REVIEW_EMAIL = (process.env.RC1_REVIEW_EMAIL || '').trim().toLowerCase();

async function parentSession(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`review login failed: ${body.error || res.status}`);
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: cookies } });
  const me = await meRes.json();
  return { familyId: me.family_id, preferredLocale: me.preferred_locale, cookies };
}

async function fetchLocaleOptions(baseUrl, cookie) {
  const r = await fetch(`${baseUrl}/api/family/locale-options`, { headers: { cookie } });
  return r.ok ? r.json() : {};
}

async function fetchLoginPicker(baseUrl, cookie) {
  const r = await fetch(`${baseUrl}/api/auth/login-picker-children`, { headers: { cookie } });
  return r.ok ? r.json() : {};
}

async function main() {
  const baseUrl = (process.env.RC1_SMOKE_BASE_URL || process.env.E2E_BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    console.error('[rc1-prep] missing RC1_SMOKE_BASE_URL');
    process.exit(1);
  }
  if (!REVIEW_EMAIL || !process.env.RC1_REVIEW_PASSWORD) {
    console.error('[rc1-prep] missing RC1_REVIEW_EMAIL / RC1_REVIEW_PASSWORD');
    process.exit(1);
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('[rc1-prep] missing ADMIN_EMAIL / ADMIN_PASSWORD');
    process.exit(1);
  }

  const parent = await parentSession(baseUrl, REVIEW_EMAIL, process.env.RC1_REVIEW_PASSWORD);
  if (!parent.familyId) {
    console.error('[rc1-prep] could not resolve review family_id');
    process.exit(1);
  }

  const beforeOpts = await fetchLocaleOptions(baseUrl, parent.cookies);
  const beforePicker = await fetchLoginPicker(baseUrl, parent.cookies);

  console.log('[rc1-prep] review family', {
    familyId: parent.familyId,
    preferred_locale: parent.preferredLocale,
    english_app_enabled: beforeOpts.english_app_enabled,
    english_child_experience_enabled: beforeOpts.english_child_experience_enabled,
    picker_child_ui_locale: beforePicker.child_ui_locale,
  });

  const admin = await adminLogin(baseUrl, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  const detailRes = await apiRequest(baseUrl, `/api/admin/features/${encodeURIComponent(FEATURE_SLUG)}`, {
    jar: admin.jar,
    csrf: admin.csrfToken,
  });
  const detail = await readJson(detailRes);
  const assigned = (detail.assigned_families || []).some((f) => f.family_id === parent.familyId);

  if (!assigned) {
    const addRes = await apiRequest(baseUrl, `/api/admin/features/${encodeURIComponent(FEATURE_SLUG)}/families`, {
      method: 'POST',
      jar: admin.jar,
      csrf: admin.csrfToken,
      body: { family_id: parent.familyId },
    });
    const addBody = await readJson(addRes);
    if (!addRes.ok && addRes.status !== 201) {
      console.error('[rc1-prep] add family failed', addRes.status, addBody);
      process.exit(1);
    }
    console.log('[rc1-prep] enabled english_child_experience for review family');
  } else {
    console.log('[rc1-prep] english_child_experience already assigned');
  }

  const afterOpts = await fetchLocaleOptions(baseUrl, parent.cookies);
  const afterPicker = await fetchLoginPicker(baseUrl, parent.cookies);
  console.log('[rc1-prep] after', {
    english_app_enabled: afterOpts.english_app_enabled,
    english_child_experience_enabled: afterOpts.english_child_experience_enabled,
    picker_english_child: afterPicker.english_child_experience_enabled,
    picker_child_ui_locale: afterPicker.child_ui_locale,
  });

  if (afterOpts.english_child_experience_enabled !== true) {
    console.error('[rc1-prep] english_child_experience_enabled still false after admin assign');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[rc1-prep]', err.message);
  process.exit(1);
});
