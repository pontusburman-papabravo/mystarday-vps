(function () {
  'use strict';
  function t(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }
  function activityCount(n) {
    return Number(n) === 1 ? t('schedule.activityCount.one') : t('schedule.activityCount.other', { count: n });
  }
  window.ScheduleI18n = { t: t, activityCount: activityCount };
})();
