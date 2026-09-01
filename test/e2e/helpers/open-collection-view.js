'use strict';

/**
 * Open Min samling with first-star dismissed and the collection layer visible.
 * showTab('collection') is a no-op while first-star mode is active.
 */

async function waitForDailyLogSettled(page) {
  await page.waitForFunction(() => {
    const schedule = document.getElementById('scheduleView');
    if (!schedule) return false;
    if (document.getElementById('firstStarChromeMount')) return true;
    return !!(
      schedule.querySelector('.first-star-mission-wrap')
      || schedule.querySelector('[data-item-id]')
      || (schedule.textContent || '').trim().length > 20
    );
  }, { timeout: 45000 });
}

async function dismissFirstStarMode(page) {
  await page.waitForFunction(() => !!window.ChildFirstStarMode, { timeout: 15000 });
  await page.evaluate(() => {
    if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
      ChildFirstStarMode.exit();
    }
  });
  await page.waitForFunction(() => {
    return !window.ChildFirstStarMode || !ChildFirstStarMode.isActive();
  }, { timeout: 15000 });
}

function collectionViewReady() {
  const view = document.getElementById('collectionView');
  const loading = document.getElementById('collectionViewLoading');
  const title = view && view.querySelector('.bsp-title');
  const active = view
    && (view.getAttribute('data-active') === 'true' || !view.classList.contains('hidden'));
  if (!active || !title) return false;
  if (loading) {
    const loadingStyle = window.getComputedStyle(loading);
    const loadingVisible = !loading.classList.contains('hidden')
      && loadingStyle.display !== 'none'
      && loadingStyle.visibility !== 'hidden';
    if (loadingVisible) return false;
  }
  return /collection/i.test((title.textContent || '').trim());
}

async function openCollectionView(page) {
  await waitForDailyLogSettled(page);
  await dismissFirstStarMode(page);

  const viewTimeout = process.env.CI ? 90000 : 60000;
  const perAttemptTimeout = Math.floor(viewTimeout / 2);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.evaluate(() => {
      if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
        ChildFirstStarMode.exit();
      }
      const navBtn = document.querySelector('#childBottomNav [data-child-world="collection"]');
      if (navBtn) navBtn.click();
      if (window.ChildLayerRouter && ChildLayerRouter.navigateToLayer) {
        ChildLayerRouter.navigateToLayer('collection');
      } else if (typeof window.showTab === 'function') {
        window.showTab('collection');
      }
      if (window.ChildSamlingView && ChildSamlingView.refresh) {
        ChildSamlingView.refresh({ force: true });
      }
    });

    try {
      await page.waitForFunction(collectionViewReady, { timeout: perAttemptTimeout });
      await page.waitForFunction(() => {
        const view = document.getElementById('collectionView');
        if (!view) return false;
        const text = (view.textContent || '').trim();
        if (/Laddar/i.test(text) && !/Loading/i.test(text)) return false;
        return /First week|Collection/i.test(text);
      }, { timeout: perAttemptTimeout });
      return;
    } catch (err) {
      if (attempt === 1) throw err;
      await dismissFirstStarMode(page);
    }
  }
}

module.exports = {
  waitForDailyLogSettled,
  dismissFirstStarMode,
  collectionViewReady,
  openCollectionView,
};
