/**
 * Maps report data into a view model for the playful PDF export.
 * Owns: data transformation for playful report layout.
 * Does NOT own: DB queries, PDF rendering, HTML rendering.
 */

const { getIsoWeekNumber } = require('./date-utils');

const MONTHS_SV = ['januari','februari','mars','april','maj','juni',
                   'juli','augusti','september','oktober','november','december'];
const MONTHS_SV_SHORT = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.getDate() + ' ' + MONTHS_SV_SHORT[d.getMonth()];
}

function fmtDateUpper(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return (d.getDate() + ' ' + MONTHS_SV[d.getMonth()]).toUpperCase();
}

/**
 * @param {{ link, blocks, fields, dateFrom, dateTo }} opts
 * @returns {{ viewModel }} — ready for renderPlayfulReport()
 */
function mapReportToPlayful({ link, blocks, fields, dateFrom, dateTo }) {
  const vm = {};

  // Title
  vm.childName = (!link.anonymous && link.child_name) ? link.child_name : null;
  vm.childEmoji = (!link.anonymous && link.child_emoji) ? link.child_emoji : null;
  vm.anonymous = !!link.anonymous;
  vm.title = vm.childName
    ? ('SAMMANFATTNING FÖR ' + vm.childName.toUpperCase())
    : 'SAMMANFATTNING';

  // Period band
  vm.period = fmtDateUpper(dateFrom) + ' – ' + fmtDateUpper(dateTo);

  // Stars medal
  vm.showStars = fields.includes('stars') && blocks.stars && blocks.stars.total != null;
  vm.starsTotal = vm.showStars ? blocks.stars.total : 0;

  // Completion stats
  const completion = blocks.completion || [];
  const withData = completion.filter(r => r.total > 0);
  vm.daysWithData = withData.length;
  vm.avgPct = 0;
  vm.bestDay = null;
  vm.bestPct = 0;
  vm.worstDay = null;
  vm.worstPct = 0;

  if (withData.length > 0) {
    let sumPct = 0, bestPct = -1, worstPct = 101, bestDay = null, worstDay = null;
    withData.forEach(r => {
      const pct = Math.round((r.completed / r.total) * 100);
      sumPct += pct;
      if (pct >= bestPct) { bestPct = pct; bestDay = r.date; }
      if (pct <= worstPct) { worstPct = pct; worstDay = r.date; }
    });
    vm.avgPct = Math.round(sumPct / withData.length);
    vm.bestDay = fmtDate(bestDay);
    vm.bestPct = bestPct;
    vm.worstDay = fmtDate(worstDay);
    vm.worstPct = worstPct;
  }

  // Parent summary
  vm.parentSummary = (link.parent_summary && link.parent_summary.trim()) ? link.parent_summary.trim() : null;

  // Rewards
  vm.showRewards = fields.includes('rewards') && blocks.rewards && blocks.rewards.counts && blocks.rewards.counts.length > 0;
  vm.rewardsCounts = [];
  if (vm.showRewards) {
    const statusLabel = (s) => s === 'approved' ? 'Godkända' : s === 'pending' ? 'Väntande' : s === 'denied' ? 'Avslagna' : s;
    vm.rewardsCounts = blocks.rewards.counts.map(r => ({
      label: statusLabel(r.status),
      count: r.count,
    }));
  }

  // Top 5 activities
  vm.top5 = [];
  if (fields.includes('activities') && blocks.activities) {
    const activityCounts = {};
    Object.values(blocks.activities).forEach(items => {
      items.forEach(item => {
        const name = item.activity_name || '(okänd)';
        if (!activityCounts[name]) activityCounts[name] = { done: 0, total: 0, icon: item.activity_icon };
        if (item.completed) activityCounts[name].done++;
        activityCounts[name].total++;
      });
    });
    vm.top5 = Object.entries(activityCounts)
      .map(([name, c]) => ({ name, done: c.done, total: c.total, icon: c.icon || '⭐' }))
      .sort((a, b) => b.done - a.done)
      .slice(0, 5);
  }

  // Section summary (dagdelar)
  vm.sections = [];
  if (fields.includes('section_summary') && blocks.section_summary) {
    const sectionMap = { fm: 'Morgon', morgon: 'Morgon', em: 'Dag', dag: 'Dag', kvall: 'Kväll', evening: 'Kväll', natt: 'Natt' };
    const order = ['Morgon', 'Dag', 'Kväll', 'Natt'];
    vm.sections = blocks.section_summary
      .map(s => ({
        label: sectionMap[s.section?.toLowerCase()] || s.section || 'Övrigt',
        pct: s.completion_pct || 0,
        completed: s.completed || 0,
        total: s.total || 0,
      }))
      .sort((a, b) => {
        const ai = order.indexOf(a.label);
        const bi = order.indexOf(b.label);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }

  // Weekly data — human-readable labels "6–10 maj"
  vm.weeks = [];
  if (completion.length > 0) {
    const weekMap = {};
    completion.forEach(r => {
      if (r.total === 0) return;
      const d = new Date(r.date + 'T00:00:00');
      const wk = getIsoWeekNumber(d);
      const yr = d.getFullYear();
      const key = yr + '-v' + String(wk).padStart(2, '0');
      if (!weekMap[key]) weekMap[key] = { done: 0, total: 0, dates: [] };
      weekMap[key].done += r.completed;
      weekMap[key].total += r.total;
      weekMap[key].dates.push(r.date);
    });
    Object.entries(weekMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([, data]) => {
        const sorted = [...data.dates].sort();
        const startD = new Date(sorted[0] + 'T00:00:00');
        const endD = new Date(sorted[sorted.length - 1] + 'T00:00:00');
        const label = startD.getDate() + '–' + endD.getDate() + ' ' + MONTHS_SV_SHORT[endD.getMonth()];
        const pct = Math.round((data.done / data.total) * 100);
        vm.weeks.push({ label, done: data.done, total: data.total, pct });
      });
  }

  // Notes (parent + child, max 4 lines)
  vm.notes = [];
  if (blocks.activities) {
    Object.entries(blocks.activities).forEach(([date, items]) => {
      items.forEach(item => {
        if (item.parent_note) {
          vm.notes.push({ date: fmtDate(date), text: item.parent_note, type: 'parent' });
        }
        if (item.child_note) {
          vm.notes.push({ date: fmtDate(date), text: item.child_note, type: 'child' });
        }
      });
    });
  }
  vm.notes = vm.notes.slice(0, 4).map(n => ({
    ...n,
    text: n.text.length > 80 ? n.text.slice(0, 77) + '...' : n.text,
  }));

  // Pedagog notes
  vm.showPedagog = fields.includes('pedagog_notes') && blocks.pedagog_notes && blocks.pedagog_notes.length > 0;
  vm.pedagogNotes = [];
  if (vm.showPedagog) {
    vm.pedagogNotes = blocks.pedagog_notes.slice(0, 3).map(n => ({
      date: fmtDate(String(n.date)),
      pedagog: n.pedagog_name || null,
      mood: n.mood ? n.mood + '/5' : null,
      notes: n.notes ? (n.notes.length > 80 ? n.notes.slice(0, 77) + '...' : n.notes) : null,
    }));
  }

  // Quote bubble
  vm.quote = vm.parentSummary
    || (vm.avgPct > 0 ? 'Genomsnittligt genomförande: ' + vm.avgPct + '% under perioden.' : null);

  return vm;
}

module.exports = { mapReportToPlayful };
