/**
 * Schedule page family grid (Fas 8 PR-S1).
 * "Alla barn" week grid — extracted from schedule.js.
 * Reads shared globals from schedule.js (scheduleMode, fwWeekOffset, fwChildData,
 * children, currentChildId, currentDay) plus escHtml, renderChildAvatar, apiFetch,
 * selectChild, renderDayTabs, loadScheduleForDay.
 */
(function () {
  const FW_DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun
  const FW_DAYS_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const FW_DAYS_FULL = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

  function spt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function fwDayShort(dow) {
    return window.ScheduleCore?.dayShort ? window.ScheduleCore.dayShort(dow) : FW_DAYS_SHORT[dow];
  }

  function fwDayFull(dow) {
    return window.ScheduleCore?.dayName ? window.ScheduleCore.dayName(dow) : FW_DAYS_FULL[dow];
  }

  function setScheduleMode(mode) {
    scheduleMode = mode;
    document.getElementById('btnModeSingle').classList.toggle('active', mode === 'single');
    document.getElementById('btnModeFamily').classList.toggle('active', mode === 'family');

    const familyView = document.getElementById('familyGridView');
    const childrenList = document.getElementById('childrenListView');
    const editorView = document.getElementById('scheduleEditorView');
    const calNav = document.getElementById('calNavBar');
    const backBtn = document.getElementById('backToChildrenBtn');
    const rewardsBtn = document.getElementById('editorRewardsBtn');

    if (mode === 'family') {
      familyView.classList.remove('hidden');
      childrenList.classList.add('hidden');
      editorView.classList.add('hidden');
      calNav.classList.add('hidden');
      if (backBtn) backBtn.classList.add('hidden');
      if (rewardsBtn) rewardsBtn.classList.add('hidden');
      fwLoadAll();
    } else {
      familyView.classList.add('hidden');
      if (currentChildId) {
        childrenList.classList.add('hidden');
        editorView.classList.remove('hidden');
        calNav.classList.remove('hidden');
        if (backBtn) backBtn.classList.remove('hidden');
      } else {
        childrenList.classList.remove('hidden');
        editorView.classList.add('hidden');
      }
    }
    const url = new URL(window.location);
    if (mode === 'family') url.searchParams.set('view', 'family');
    else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }

  function fwGetWeekStart(offset) {
    const now = new Date();
    const dow = now.getDay();
    const mondayDiff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayDiff + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function fwGetWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function fwUpdateWeekLabel() {
    const ws = fwGetWeekStart(fwWeekOffset);
    const wn = fwGetWeekNumber(ws);
    document.getElementById('fwWeekLabel').textContent = spt('schedule.familyGrid.weekLabel', {
      week: wn,
      year: ws.getFullYear(),
    });
  }

  function fwGetDatesForWeek(offset) {
    const ws = fwGetWeekStart(offset);
    const dates = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      const dow = i < 6 ? i + 1 : 0;
      dates[dow] = d;
    }
    return dates;
  }

  async function fwLoadAll() {
    if (!children || children.length === 0) {
      document.getElementById('fwGridContainer').innerHTML =
        '<div class="text-center py-20"><p class="text-5xl mb-4">👨‍👩‍👧</p><p class="font-heading font-bold text-navy text-xl mb-2">' + spt('schedule.familyGrid.noChildrenTitle') + '</p><p class="text-sm text-text-soft">' + spt('schedule.familyGrid.noChildrenHint') + '</p></div>';
      return;
    }
    document.getElementById('fwGridContainer').innerHTML =
      '<div class="text-center py-12 text-text-soft"><span class="animate-spin text-xl">⏳</span> <span class="font-semibold">Laddar schema…</span></div>';
    await fwLoadScheduleData();
    fwRenderGrid();
  }

  async function fwLoadScheduleData() {
    const scheduleResults = await Promise.all(
      children.map(async c => {
        const r = await window.apiFetch(`/api/children/${c.id}/schedules`);
        return { childId: c.id, schedules: r.ok ? await r.json() : [] };
      })
    );

    const scheduleList = [];
    for (const { childId, schedules } of scheduleResults) {
      for (const s of schedules) {
        scheduleList.push({ childId, scheduleId: s.id, dow: s.day_of_week });
      }
    }

    const itemResults = await Promise.all(
      scheduleList.map(async ({ childId, scheduleId, dow }) => {
        const r = await window.apiFetch(`/api/schedules/${scheduleId}/items`);
        const data = r.ok ? await r.json() : { items: [] };
        return { childId, scheduleId, dow, items: data.items || [] };
      })
    );

    fwChildData = {};
    for (const child of children) fwChildData[child.id] = {};
    for (const { childId, scheduleId, dow, items } of itemResults) {
      fwChildData[childId][dow] = { scheduleId, items };
    }
  }

  function fwRenderGrid() {
    fwUpdateWeekLabel();
    const todayDow = new Date().getDay();
    const weekDates = fwGetDatesForWeek(fwWeekOffset);

    const headerCells = FW_DOW_ORDER.map(dow => {
      const date = weekDates[dow];
      const dateLabel = date ? `${date.getDate()}/${date.getMonth() + 1}` : '';
      const isToday = dow === todayDow && fwWeekOffset === 0;
      return `<th class="fw-day-header${isToday ? ' fw-today-hdr' : ''}">
      <div>${fwDayShort(dow)}</div>
      <div style="font-size:10px; font-weight:500; opacity:0.65; margin-top:1px;">${dateLabel}</div>
      ${isToday ? '<div style="width:6px;height:6px;border-radius:50%;background:#3B82F6;margin:3px auto 0;"></div>' : ''}
    </th>`;
    }).join('');

    const rows = children.map(child => {
      const cells = FW_DOW_ORDER.map(dow => {
        const dayData = fwChildData[child.id]?.[dow];
        const items = dayData?.items || [];
        const isToday = dow === todayDow && fwWeekOffset === 0;
        const hasAct = items.length > 0;

        let cellContent = '';
        if (hasAct) {
          const MAX_PILLS = 4;
          const shown = items.slice(0, MAX_PILLS);
          const rest = items.length - MAX_PILLS;
          cellContent = shown.map(item => {
            const sectionClass = item.section || 'dag';
            return `<div class="fw-pill">
            <span class="fw-section-dot ${sectionClass}"></span>
            <span class="fw-icon">${escHtml(item.activity_icon || '📌')}</span>
            <span class="fw-name">${escHtml(item.activity_name_display || item.activity_name || '')}</span>
          </div>`;
          }).join('');
          if (rest > 0) cellContent += `<div class="fw-more" title="${spt('schedule.familyGrid.showAllTitle', { count: rest })}">${spt('schedule.familyGrid.showAll', { count: rest })}</div>`;
        } else {
          cellContent = `<div class="fw-empty-ind">—</div>`;
        }

        const cellClass = `fw-day-cell${hasAct ? ' fw-has-act' : ' fw-empty'}${isToday ? ' fw-today' : ''}`;
        return `<td class="${cellClass}" onclick="fwGoToEdit('${child.id}', ${dow})" title="${fwDayFull(dow)} — ${escHtml(child.name)}">
        ${cellContent}
      </td>`;
      }).join('');

      return `<tr>
      <td class="fw-child-cell fw-child-col">
        <div class="flex flex-col items-center gap-0.5">
          <span style="display:inline-block;">${renderChildAvatar(child, 30)}</span>
          <span style="font-size:11px; font-weight:700; color:#1B2340; text-align:center; word-break:break-word; max-width:80px; line-height:1.2; margin-top:2px;">${escHtml(child.name)}</span>
        </div>
      </td>
      ${cells}
    </tr>`;
    }).join('');

    document.getElementById('fwGridContainer').innerHTML = `
    <div class="fw-scroll">
      <table class="fw-grid">
        <thead>
          <tr>
            <th class="fw-corner fw-child-col">${spt('schedule.familyGrid.childColumn')}</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
    document.getElementById('fwLegend').classList.remove('hidden');
  }

  function fwChangeWeek(delta) {
    fwWeekOffset += delta;
    fwLoadAll();
  }

  function fwGoToCurrentWeek() {
    fwWeekOffset = 0;
    fwLoadAll();
  }

  function fwGoToEdit(childId, dow) {
    setScheduleMode('single');
    selectChild(childId).then(() => {
      currentDay = dow;
      renderDayTabs();
      loadScheduleForDay();
    });
  }

  window.setScheduleMode = setScheduleMode;
  window.fwRenderGrid = fwRenderGrid;
  window.fwChangeWeek = fwChangeWeek;
  window.fwGoToCurrentWeek = fwGoToCurrentWeek;
  window.fwGoToEdit = fwGoToEdit;
})();
