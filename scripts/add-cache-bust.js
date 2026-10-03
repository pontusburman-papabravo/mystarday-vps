#!/usr/bin/env node
// Add cache-busting query params to all /js/ and /css/ asset references in HTML files
const fs = require('fs');
const path = require('path');

const VERSION = process.argv[2] || '2.3.1';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const htmlFiles = [
  'onboarding.html', 'payment-success.html', 'privacy.html', 'register.html',
  'reset-password.html', 'schedule.html', 'settings.html', 'skattkammaren-parent.html',
  'skattkammaren.html', 'verify-email.html', 'library.html', 'login.html',
  'notifications.html', 'offline.html', 'index.html', 'admin/index.html',
  'assign-schedule.html', 'beta.html', 'calendar.html', 'child-dashboard.html',
  'child-login.html', 'child-settings.html', 'child-wizard.html', 'daily-log.html',
  'dashboard.html', 'family-week.html', 'family.html', 'forgot-password.html',
  'accept-invite.html',
];

let totalChanges = 0;

for (const file of htmlFiles) {
  const filePath = path.join(PUBLIC_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Add ?v=VERSION to all /css/ and /js/ asset references (src and href)
  // Match: src="/js/..." or href="/css/..." and add ?v=VERSION before the closing quote
  // Avoid double-busting existing query params
  content = content.replace(/(src|href)="(\/(?:js|css)\/[^"]+?)(\")/g, (match, attr, url, quote) => {
    // Don't add if already has a query param
    if (url.includes('?')) return match;
    return `${attr}="${url}?v=${VERSION}${quote}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const changes = (originalContent.match(/\/js\/|\/css\//g) || []).length;
    totalChanges += changes;
    console.log(`Updated ${file}: ${changes} asset(s) → ?v=${VERSION}`);
  } else {
    console.log(`No changes in ${file}`);
  }
}

console.log(`\nTotal: ${totalChanges} assets busterized with ?v=${VERSION}`);