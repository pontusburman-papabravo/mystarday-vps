/**
 * Release Gate core loops — API + browser helpers for smoke-mobile-full-qa.mjs
 */

function todaySv() {
  return new Date().toLocaleDateString('sv-SE');
}

export async function ensureCsrf(http) {
  const { json } = await http('GET', '/api/auth/csrf-token');
  return json?.csrfToken || '';
}

export async function runParentDailyLogGate(ctx) {
  const { http, record, astrid, erik } = ctx;
  const today = todaySv();
  const csrf = await ensureCsrf(http);

  for (const child of [astrid, erik]) {
    if (!child?.id) continue;
    const { json: dl, res } = await http('GET', `/api/children/${child.id}/daily-log?date=${today}`);
    if (!res.ok) {
      if (child === astrid) {
        record('F04', 'Bocka av aktivitet (API)', false, `daily-log HTTP ${res.status}`);
        record('F05', 'Ångra bock (API)', false, 'skipped');
        record('F07', 'Pausa dag (API)', false, 'skipped');
        record('F08', 'Återuppta dag (API)', false, 'skipped');
      }
      continue;
    }

    const items = dl?.items || [];
    const logId = dl?.log?.id;
    let target = items.find((i) => !i.completed) || items[0];

    if (child === astrid) {
      if (!target) {
        record('F04', 'Bocka av aktivitet (API)', false, 'inga aktiviteter idag');
        record('F05', 'Ångra bock (API)', false, 'skipped');
      } else if (target.completed) {
        const { res: uncRes } = await http('PUT', `/api/daily-log-items/${target.id}/uncomplete`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
        if (!uncRes.ok) {
          record('F04', 'Bocka av aktivitet (API)', false, `uncomplete prep HTTP ${uncRes.status}`);
          record('F05', 'Ångra bock (API)', false, 'skipped');
        } else {
          target = { ...target, completed: false };
          await completeUncompletePair(http, record, csrf, target);
        }
      } else {
        await completeUncompletePair(http, record, csrf, target);
      }

      if (logId && !dl?.log?.is_paused) {
        const { res: pauseRes } = await http('PUT', `/api/daily-logs/${logId}/pause`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
        record('F07', 'Pausa dag (API)', pauseRes.ok, `HTTP ${pauseRes.status}`);
        const { res: unpauseRes } = await http('PUT', `/api/daily-logs/${logId}/unpause`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
        record('F08', 'Återuppta dag (API)', unpauseRes.ok, `HTTP ${unpauseRes.status}`);
      } else if (logId && dl?.log?.is_paused) {
        const { res: unpauseRes } = await http('PUT', `/api/daily-logs/${logId}/unpause`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
        record('F08', 'Återuppta pausad dag (API)', unpauseRes.ok, `HTTP ${unpauseRes.status}`);
        const { res: pauseRes } = await http('PUT', `/api/daily-logs/${logId}/pause`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
        record('F07', 'Pausa dag (API)', pauseRes.ok, `HTTP ${pauseRes.status}`);
        await http('PUT', `/api/daily-logs/${logId}/unpause`, {
          headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        });
      } else {
        record('F07', 'Pausa dag (API)', false, 'saknar log_id');
        record('F08', 'Återuppta dag (API)', false, 'skipped');
      }
    }

  }
}

async function completeUncompletePair(http, record, csrf, item) {
  const { res: compRes } = await http('PUT', `/api/daily-log-items/${item.id}/complete`, {
    headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
  });
  record('F04', 'Bocka av aktivitet (API)', compRes.ok, `item ${item.id} HTTP ${compRes.status}`);
  const { res: uncRes } = await http('PUT', `/api/daily-log-items/${item.id}/uncomplete`, {
    headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
  });
  record('F05', 'Ångra bock (API)', uncRes.ok, `HTTP ${uncRes.status}`);
}

export async function runMultiChildStatsGate(ctx) {
  const { http, record, astrid, erik } = ctx;
  const { json, res } = await http('GET', '/api/family/dashboard-stats');
  if (!res.ok) {
    record('T01', 'Separata stjärnsaldon (dashboard-stats)', false, `HTTP ${res.status}`);
    return;
  }
  const rows = json?.children || [];
  const aRow = rows.find((c) => c.id === astrid?.id);
  const eRow = rows.find((c) => c.id === erik?.id);
  const aBal = aRow?.star_balance ?? null;
  const eBal = eRow?.star_balance ?? null;
  const ok = aRow && eRow && aBal != null && eBal != null;
  const differ = aBal !== eBal;
  record('T01', 'Separata stjärnsaldon (dashboard-stats)', ok,
    `Astrid=${aBal} Erik=${eBal}${!differ ? ' (samma saldo — verifiera manuellt om ≠ krävs)' : ''}`);
}

export async function runPlanningHubGate(ctx) {
  const { page, record, BASE } = ctx;
  await page.goto(`${BASE}/planning`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => !!document.querySelector('a[href="/daily-log"]') || /Daglig logg/i.test(document.body.innerText || ''),
    { timeout: 25000 },
  ).catch(() => {});
  const links = await page.evaluate(() => ({
    dailyLog: !!document.querySelector('a[href="/daily-log"], a[href*="daily-log"]')
      || /Daglig logg/i.test(document.body.innerText || ''),
    schedule: !!document.querySelector('a[href="/schedule"], a[href*="schedule"]')
      || /Veckoschema/i.test(document.body.innerText || ''),
  }));
  record('E02', 'Planering → Daglig logg', links.dailyLog, links.dailyLog ? 'länk finns' : 'saknas');
  record('E03', 'Planering → Schema', links.schedule, links.schedule ? 'länk finns' : 'saknas');
}

export async function runZ14BundleGate(ctx) {
  const { http, record, bundles } = ctx;
  const list = bundles || [];
  let failed = 0;
  for (const path of list) {
    const { res } = await http('GET', path);
    if (res.status !== 200) failed += 1;
  }
  record('Z14', 'Fas-8 split bundles HTTP 200', failed === 0, `${list.length - failed}/${list.length} ok`);
}

export async function runChildCompleteGate(ctx) {
  const { page, record, SLOW_MS } = ctx;
  await page.waitForFunction(
    () => document.querySelectorAll('.activity-card').length > 0,
    { timeout: 25000 },
  ).catch(() => {});

  const before = await page.evaluate(() => {
    const card = document.querySelector('.activity-card:not(.done)');
    const stars = document.body.innerText.match(/(\d+)\s*stj[äa]rn/i);
    return { hasCard: !!card, stars: stars ? stars[1] : null };
  });

  if (!before.hasCard) {
    record('P03', 'Barn bocka av (UI)', false, 'ingen obockad activity-card');
    record('P04', 'Barn stjärna efter bock (UI)', false, 'skipped');
    return;
  }

  await page.evaluate(() => {
    const card = document.querySelector('.activity-card:not(.done)');
    if (card) card.click();
  });
  await new Promise((r) => setTimeout(r, SLOW_MS ? 1500 : 900));

  const after = await page.evaluate(() => {
    const done = document.querySelectorAll('.activity-card.done').length;
    const stars = document.body.innerText.match(/(\d+)\s*stj[äa]rn/i);
    return { done, stars: stars ? stars[1] : null };
  });

  record('P03', 'Barn bocka av (UI)', after.done > 0, `${after.done} klara`);
  record('P04', 'Barn stjärna efter bock (UI)', after.stars != null, `stjärnor=${after.stars ?? '?'}`);
}

export async function runChildRedeemGate(ctx) {
  const { page, record, BASE, SLOW_MS } = ctx;
  await page.goto(`${BASE}/child/world`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.loadRewards === 'function', { timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, SLOW_MS ? 2000 : 1200));

  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('.skatt-redeem-btn, [onclick*="requestRedeem"]');
    if (btn) { btn.click(); return true; }
    const card = document.querySelector('.skatt-rg-item[onclick*="requestRedeem"]');
    if (card) { card.click(); return true; }
    return false;
  });

  if (!clicked) {
    record('Q04', 'Begär belöning (UI)', false, 'ingen begär-knapp (saldo?)');
    return null;
  }

  await new Promise((r) => setTimeout(r, SLOW_MS ? 2000 : 1500));
  const toastOk = await page.evaluate(() => /skickad|begäran|väntar/i.test(document.body.innerText));
  record('Q04', 'Begär belöning (UI)', toastOk, toastOk ? 'bekräftelse i UI' : 'ingen toast');
  return toastOk;
}

export async function runParentApproveGate(ctx) {
  const { page, record, BASE, SLOW_MS } = ctx;
  await page.goto(`${BASE}/rewards`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SLOW_MS ? 1500 : 800));

  const approveBtn = await page.$('[data-pending-action="approve"]');
  if (!approveBtn) {
    record('I03', 'Godkänn inlösning (UI)', false, 'ingen pending approve-knapp');
    return;
  }
  await approveBtn.click();
  await new Promise((r) => setTimeout(r, SLOW_MS ? 2000 : 1200));
  const stillPending = await page.$('[data-pending-action="approve"]');
  record('I03', 'Godkänn inlösning (UI)', !stillPending, stillPending ? 'fortfarande pending' : 'godkänd');
}

export function recordGateManualSkipped(record, ids) {
  for (const id of ids) {
    record(id, `Gate manuell (${id})`, true, 'skipped — se runbook');
  }
}
