#!/usr/bin/env node
'use strict';

/**
 * Verify rotated credentials via API (reads secrets from rotation report file path only).
 * Env: ROTATION_REPORT_PATH, APP_BASE_URL (required)
 */

const fs = require('fs');
const path = require('path');

async function login(base, email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.status;
}

async function main() {
  const reportPath = process.env.ROTATION_REPORT_PATH;
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    console.error('APP_BASE_URL required');
    process.exit(1);
  }
  if (!reportPath || !fs.existsSync(reportPath)) {
    console.error('ROTATION_REPORT_PATH missing or not found');
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const s = report.secrets || {};
  const founderEmail = report.founder_email;
  const reviewEmail = report.review_email;

  const founderOk = await login(base, founderEmail, s.FOUNDER_QA_PASSWORD);
  const reviewOk = await login(base, reviewEmail, s.APP_REVIEW_PASSWORD);

  console.log(JSON.stringify({
    founder_login_status: founderOk,
    review_login_status: reviewOk,
    ok: founderOk === 200 && reviewOk === 200,
  }));
  if (founderOk !== 200 || reviewOk !== 200) process.exit(1);
}

main();
