/**
 * Shared birthday picker module.
 * Handles year/month/day selects for child birthdates.
 * Supports two modes:
 *   - No arg: fixed IDs (onboarding)
 *   - prefix arg: dynamic IDs prefix+'Year'/'Month'/'Day' (dashboard, schedule, family)
 */

(function () {
  const MONTH_NAMES_SV = [
    'Januari','Februari','Mars','April','Maj','Juni',
    'Juli','Augusti','September','Oktober','November','December'
  ];

  /**
   * Initialize birthday year/month selects.
   * @param {string} [prefix] - ID prefix for dynamic lookup.
   *   If omitted, uses fixed IDs: childBirthdayYear/Month (onboarding).
   *   If provided, looks for: prefix+'Year', prefix+'Month', prefix+'Day'.
   */
  function initBirthdayPicker(prefix) {
    let yearSel, monthSel;

    if (prefix) {
      yearSel  = document.getElementById(prefix + 'Year');
      monthSel = document.getElementById(prefix + 'Month');
    } else {
      // Onboarding / no-prefix mode: fixed IDs for childBirthday
      yearSel  = document.getElementById('childBirthdayYear');
      monthSel = document.getElementById('childBirthdayMonth');
    }

    if (!yearSel) return;

    const now = new Date();
    const curYear = now.getFullYear();

    // Years: current year down to 30 years ago
    for (let y = curYear; y >= curYear - 30; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }

    // Months (full Swedish names)
    MONTH_NAMES_SV.forEach(function (name, i) {
      const opt = document.createElement('option');
      opt.value = String(i + 1).padStart(2, '0');
      opt.textContent = name;
      monthSel.appendChild(opt);
    });

    updateBirthdayDays(prefix);
  }

  /**
   * Populate day dropdown based on selected year+month.
   * Handles both prefix-based (dashboard/schedule) and fixed-ID (onboarding) modes.
   */
  function updateBirthdayDays(prefix) {
    let yearSel, monthSel, daySel;

    if (prefix) {
      yearSel  = document.getElementById(prefix + 'Year');
      monthSel = document.getElementById(prefix + 'Month');
      daySel   = document.getElementById(prefix + 'Day');
    } else {
      yearSel  = document.getElementById('childBirthdayYear');
      monthSel = document.getElementById('childBirthdayMonth');
      daySel   = document.getElementById('childBirthdayDay');
    }

    if (!daySel) return;

    const prevDay = daySel.value;
    const y = parseInt(yearSel.value) || new Date().getFullYear();
    const m = parseInt(monthSel.value) || 1;
    const daysInMonth = new Date(y, m, 0).getDate();

    daySel.innerHTML = '<option value="">Dag</option>';
    for (let d = 1; d <= daysInMonth; d++) {
      const opt = document.createElement('option');
      opt.value = String(d).padStart(2, '0');
      opt.textContent = d;
      daySel.appendChild(opt);
    }
    if (prevDay && parseInt(prevDay) <= daysInMonth) daySel.value = prevDay;
  }

  /**
   * Normalize birthday from API/DB to { year, month, day } strings.
   * Handles 'YYYY-MM-DD' and ISO datetimes like '2018-10-15T22:00:00.000Z'.
   */
  function parseBirthdayParts(birthday) {
    if (!birthday) return null;
    const dateOnly = String(birthday).split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return null;
    const dayNum = parseInt(parts[2], 10);
    if (!dayNum || dayNum < 1 || dayNum > 31) return null;
    return {
      year: parts[0],
      month: parts[1],
      day: String(dayNum).padStart(2, '0'),
    };
  }

  /**
   * Set the selected values of the birthday selects.
   * Call AFTER initBirthdayPicker so options exist.
   * @param {string} birthday - ISO date string 'YYYY-MM-DD' or null/undefined
   * @param {string} [prefix] - ID prefix (default: 'bd')
   */
  function setBirthdayValue(birthday, prefix) {
    const parsed = parseBirthdayParts(birthday);
    if (!parsed) return;
    const pre = prefix || 'bd';
    const yearEl = document.getElementById(pre + 'Year');
    const monthEl = document.getElementById(pre + 'Month');
    const dayEl = document.getElementById(pre + 'Day');
    if (yearEl) yearEl.value = parsed.year;
    if (monthEl) monthEl.value = parsed.month;
    // Repopulate days for the selected year+month before setting day value.
    updateBirthdayDays(prefix);
    if (dayEl) dayEl.value = parsed.day;
  }

  // Expose globally
  window.initBirthdayPicker = initBirthdayPicker;
  window.updateBirthdayDays = updateBirthdayDays;
  window.setBirthdayValue = setBirthdayValue;
})();