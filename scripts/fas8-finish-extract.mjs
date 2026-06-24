#!/usr/bin/env node
/**
 * One-shot extractor for Fas 8 finish: build activity-modal from current dashboard.js,
 * strip moved functions from host files, patch dnd preventOnFilter.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content);
}

function removeFunctionBlocks(source, names) {
  let result = source;
  for (const name of names) {
    const re = new RegExp(`(^|\n)(async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    let m;
    while ((m = re.exec(result)) !== null) {
      const start = m.index + (m[1] === '\n' ? 1 : 0);
      const braceStart = result.indexOf('{', m.index);
      let depth = 0;
      let end = braceStart;
      for (; end < result.length; end++) {
        const ch = result[end];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { end++; break; }
        }
      }
      // trim trailing blank line
      while (result[end] === '\n') end++;
      result = result.slice(0, start) + result.slice(end);
      re.lastIndex = Math.max(0, start - 1);
    }
  }
  return result;
}

function removeLetBlock(source, pattern) {
  return source.replace(pattern, '');
}

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Markers not found: ${startMarker} / ${endMarker}`);
  return source.slice(start + startMarker.length, end).trim();
}

// ── 1. Build dashboard-activity-modal from CURRENT dashboard (preserves substeps etc.)
const dash = read('public/js/dashboard.js');
const activityBody = extractBetween(
  dash,
  '// ── Activity template modal ───────────────────────────────\n',
  '// ── Copy/delete/confirm modals ────────────────────────────'
);
const activityHeader = `/**
 * Dashboard activity modals (Fas 8 F2e).
 * Add/edit/recurrence/once-task modals extracted from dashboard.js.
 * Reads/writes dashboard.js globals; handlers on window for inline onclick.
 */
(function () {
  const { DAYS, SECTIONS } = window.ScheduleCore;

`;
const activityExports = read('public/js/dashboard-activity-modal.js').match(/\/\/ Exposed[\s\S]*\)\(\);/)[0];
write('public/js/dashboard-activity-modal.js', activityHeader + activityBody + '\n\n  ' + activityExports.replace(/^/gm, '  ').trimStart() + '\n})();\n');

// ── 2. Patch dnd preventOnFilter
let dnd = read('public/js/dashboard-dnd.js');
dnd = dnd.replace('preventOnFilter: true,', 'preventOnFilter: false,');
write('public/js/dashboard-dnd.js', dnd);

// ── 3. Strip dashboard.js
const dndFns = [
  'initDragDrop', 'captureAndAskReorder', 'showReorderDialog', 'cancelReorderDialog',
  'confirmReorderAllDays', 'confirmReorderTodayOnly', 'moveItem', 'copyActivityToDay',
  'openDayDndModal', 'closeDayDndModal', 'doDayDndCopy', 'doDayDndSwap',
];
const activityFns = [
  'loadTemplates', 'openDashboardAddForChild', 'openOnceTaskModal', 'openAddModal', 'closeAddModal',
  'filterTemplates', 'renderTemplateList', 'renderTemplateItem', 'selectTemplate', 'clearSelectedTemplate',
  'pickSection', 'getActivityPickChildList', 'renderActivityChildPick', 'getSelectedActivityChildIds',
  'submitAddActivity', 'bindRecurrenceAddHandlers', 'bindRecurrenceDeleteHandlers', 'openRecurrenceModal',
  'updateRecurrenceChildHint', 'closeRecurrenceModal', 'showWeekdayPicker', 'toggleRecurrenceDay',
  'confirmRecurrence', 'addOnceTaskToDay', 'addActivityToDay', 'renderNewActSubsteps', 'addNewActSubstep',
  'removeNewActSubstep', 'openCreateActivityModal', 'closeCreateActivityModal', 'previewNewActEmoji',
  'pickStarVal', 'resolveActivityTargetChildIds', 'submitOnceTaskDirect', 'submitCreateActivity',
  'openEditItem', 'closeEditItemModal', 'setEditSection', 'submitEditItem', 'removeItem', 'deleteOnce',
  'deleteAll', 'resetRecurrenceModalTexts',
];

let newDash = dash;
newDash = removeLetBlock(newDash, /\n\/\/ ── Drag & Drop[\s\S]*?let _pendingReorderOrder = null;[^\n]*\n\n/);
newDash = removeFunctionBlocks(newDash, dndFns);
newDash = removeLetBlock(newDash, /\n\/\/ ── Activity template modal[\s\S]*?(?=\/\/ ── Copy\/delete\/confirm)/);
newDash = removeFunctionBlocks(newDash, activityFns);

// Remove module-level lets that moved to activity-modal (keep in dashboard if still referenced - check reference)
newDash = newDash.replace(/\nlet _pendingTemplateId = null;[\s\S]*?let _recurrenceSelectedDays = \[\];\n/, '\n');
newDash = newDash.replace(/\nconst EMOJI_QUICK_PICKS = \[[^\]]+\];\nlet _newActSubsteps = \[\];[^\n]*\n/, '\n');

newDash = newDash.replace(
  '// ── Drag & Drop (sortablejs) ───────────────────────────────',
  '// ── Drag & Drop ───────────────────────────────────────────\n// Extracted to /js/dashboard-dnd.js (Fas 8 F2g).\n\n// ── Activity modals ───────────────────────────────────────\n// Extracted to /js/dashboard-activity-modal.js (Fas 8 F2e).'
);

write('public/js/dashboard.js', newDash);

// ── 4. Strip schedule.js
const schedFns = [
  'renderSpecialDaysCalendar', 'sdNavMonth', 'sdOpenDay', 'closeSpecialDayModal', 'renderSdItems',
  'sdCopyFromTemplate', 'sdAddItem', 'sdRemovePendingItem', 'sdRemoveItem', 'sdClearAll', 'sdSave', 'sdDeleteSpecialDay',
  'loadSpecialDays',
  'loadTemplate', 'renderTemplate', 'renderTemplateScheduleItem', 'deleteTemplateItem',
  'openAddTemplateItemModal', 'renderTemplateSearchResults', 'selectTemplateItem', 'loadActivities',
  'openTemplateModal', 'closeTemplateModal', 'createScheduleWithTemplate',
  'loadFamilyScheduleTemplates', 'renderInsertDaySchemaList', 'openInsertDayModal', 'closeInsertDayModal',
  'doInsertDayFromTemplate', 'doInsertDayFromStandardSchedule', 'doInsertDay', 'doInsertDayExecute',
  'openNewScheduleTemplateModal', 'closeNewScheduleTemplateModal', 'submitNewScheduleTemplate',
  'confirmDeleteScheduleTemplate', 'executeDeleteScheduleTemplate', 'fetchChildSchedules', 'loadAllCategories',
  'openFillWeekModal', 'closeFillWeekModal', 'fillWeekSelectSchema', 'fillWeekBackToStep1',
  'toggleFillWeekDay', 'submitFillWeek', 'fillWeekBlank',
];

let sched = read('public/js/schedule.js');
sched = removeFunctionBlocks(sched, schedFns);
write('public/js/schedule.js', sched);

// ── 5. Strip child-dashboard.js
const childFns = [
  'loadRewards', 'renderSkattkammaren', 'playCoinSound', 'coinEntryRipple',
  'requestRedeem', 'redeemReward', 'openGoalPicker', 'closeGoalPicker', 'setGoal',
];
let child = read('public/js/child-dashboard.js');
child = removeFunctionBlocks(child, childFns);
write('public/js/child-dashboard.js', child);

console.log('dashboard.js lines:', newDash.split('\n').length);
console.log('schedule.js lines:', sched.split('\n').length);
console.log('child-dashboard.js lines:', child.split('\n').length);
