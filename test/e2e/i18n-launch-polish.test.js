'use strict';

/**
 * Launch-polish E2E: existing sv-SE family switches to English at login.
 * Verifies the legacy-language notice (+ persistent dismissal), untouched
 * Swedish user data, final bonus-stars terminology, en-GB date labels and
 * that modal CTAs are not covered by help bubbles or the bottom nav.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createE2eContext } = require('./helpers/e2e-context');
const { seedEnglishJourneyFamily } = require('./helpers/seed-family');
const { skipUnlessI18nStack } = require('./helpers/prerequisites');
const {
  launchBrowser,
  newPage,
  acceptCookies,
  selectLoginLocale,
  VIEWPORTS,
} = require('./helpers/puppeteer-browser');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function viewportsToRun() {
  const raw = process.env.E2E_VIEWPORTS || 'desktop,mobile';
  return raw.split(',').map((s) => s.trim()).filter((v) => VIEWPORTS[v]);
}

describe('i18n launch polish E2E', () => {
  for (const viewport of viewportsToRun()) {
    it(`legacy notice + terminology + en-GB dates (${viewport})`, async (t) => {
      const ctx = await createE2eContext();
      if (ctx.skip) {
        t.skip(ctx.reason);
        return;
      }
      if (!skipUnlessI18nStack(t)) {
        await ctx.close();
        return;
      }

      const browser = await launchBrowser();
      try {
        // Existing family registered in Swedish — content seeded in Swedish
        const seed = await seedEnglishJourneyFamily(ctx.baseUrl, ctx.query, {
          registerLocale: 'sv-SE',
        });

        const svNamesBefore = await ctx.query(
          `SELECT at.name FROM activity_template at
           JOIN parent p ON p.family_id = at.family_id
           WHERE LOWER(p.email) = $1 AND at.name ~ '[åäöÅÄÖ]' ORDER BY at.name`,
          [seed.email.toLowerCase()]
        );
        assert.ok(svNamesBefore.rows.length > 0, 'family should have Swedish-seeded activities');

        const page = await newPage(browser, viewport);

        // Switch to English at login (sets family.previous_locale = sv-SE)
        await page.goto(`${ctx.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
        await acceptCookies(page);
        await selectLoginLocale(page, 'en-GB');
        await page.type('#email', seed.email);
        await page.type('#password', seed.password);
        await page.evaluate(() => document.getElementById('loginForm').requestSubmit());
        await page.waitForFunction(() => location.pathname !== '/login', { timeout: 30000 });
        await sleep(2500);

        await page.goto(`${ctx.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
        await sleep(2500);
        // Dismiss the one-time dashboard tour overlay if present
        await page.evaluate(() => {
          const skip = Array.from(document.querySelectorAll('button'))
            .find((b) => /skip|hoppa över/i.test(b.textContent) && b.offsetParent !== null);
          if (skip) skip.click();
        });
        await sleep(800);
        await page.waitForSelector('.legacy-language-notice', { timeout: 20000 });
        const noticeText = await page.$eval('.legacy-language-notice', (el) => el.textContent);
        assert.match(noticeText, /Existing activities stay in their original language/);
        assert.match(noticeText, /New activities use English/);

        // Swedish user data untouched by the switch
        const svNamesAfter = await ctx.query(
          `SELECT at.name FROM activity_template at
           JOIN parent p ON p.family_id = at.family_id
           WHERE LOWER(p.email) = $1 AND at.name ~ '[åäöÅÄÖ]' ORDER BY at.name`,
          [seed.email.toLowerCase()]
        );
        assert.deepEqual(svNamesAfter.rows, svNamesBefore.rows);

        // Final bonus-stars terminology in the modal chrome
        const giveStarsTitle = await page.$eval(
          '#giveStarsModal h3',
          (el) => el.textContent.trim()
        ).catch(() => '');
        assert.equal(giveStarsTitle, 'Give bonus stars');

        // en-GB date labels from the app's own formatter (not device locale)
        const dateLabel = await page.evaluate(() =>
          window.LocaleDateTime ? LocaleDateTime.monthDayShort(new Date('2026-07-20T12:00:00')) : null);
        assert.equal(dateLabel, '20 Jul');

        // New activity flow uses English system chrome (once-task modal)
        const hasOnce = await page.evaluate(() => typeof window.openOnceTaskModal === 'function');
        assert.equal(hasOnce, true, 'openOnceTaskModal should exist on dashboard');
        await page.evaluate(() => window.openOnceTaskModal());
        await sleep(1200);
        const onceTitle = await page.$eval('#addActivityModal h3', (el) => el.textContent.trim()).catch(() => '');
        assert.match(onceTitle, /One-off activity$/);

        if (viewport === 'mobile') {
          // Help bubble must sit below modal overlays; bottom nav hidden while modal open
          const overlay = await page.evaluate(() => {
            const hb = document.getElementById('hbBtn');
            const hbZ = hb ? Number(getComputedStyle(hb).zIndex) : null;
            const nav = document.querySelector('.parent-bottom-nav');
            const navHidden = nav ? getComputedStyle(nav).visibility === 'hidden' : null;
            const btn = document.getElementById('addActivityBtn');
            let ctaHit = null;
            if (btn) {
              const r = btn.getBoundingClientRect();
              const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
              ctaHit = el ? (el.closest('#addActivityModal') !== null) : null;
            }
            return { hbZ, navHidden, ctaHit };
          });
          if (overlay.hbZ !== null) assert.ok(overlay.hbZ < 50, `hbBtn z-index ${overlay.hbZ} must be < 50`);
          if (overlay.navHidden !== null) assert.equal(overlay.navHidden, true, 'bottom nav should hide behind open modal');
          if (overlay.ctaHit !== null) assert.equal(overlay.ctaHit, true, 'modal CTA must be tappable (not covered)');
        }
        await page.evaluate(() => window.closeAddModal && window.closeAddModal());

        // Dismiss persists across reload
        const [dismissRes] = await Promise.all([
          page.waitForResponse((r) => r.url().includes('/legacy-language-notice/dismiss'), { timeout: 10000 }),
          page.click('.legacy-language-notice__dismiss'),
        ]);
        assert.equal(dismissRes.status(), 200, 'dismiss endpoint should return 200');
        await sleep(600);
        const dismissed = await ctx.query(
          `SELECT legacy_language_notice_dismissed_at FROM family WHERE id = $1`,
          [seed.familyId]
        );
        assert.ok(dismissed.rows[0].legacy_language_notice_dismissed_at, 'dismissal stored on family');

        await page.reload({ waitUntil: 'domcontentloaded' });
        await sleep(2500);
        const noticeAfterReload = await page.$('.legacy-language-notice');
        assert.equal(noticeAfterReload, null, 'notice must not reappear after dismissal');
      } finally {
        await browser.close();
        await ctx.close();
      }
    });
  }
});
