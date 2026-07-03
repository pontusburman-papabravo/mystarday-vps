/**
 * activity-timer-session.js — localStorage sessions (spec v0.3).
 * Key: daily_log_item_id + child + schedule date.
 */
(function (global) {
  'use strict';

  const PREFIX = 'activity_timer_session:';

  function storageKey(childId, scheduleDate, dailyLogItemId) {
    return PREFIX + childId + ':' + scheduleDate + ':' + dailyLogItemId;
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function write(key, session) {
    try {
      localStorage.setItem(key, JSON.stringify(session));
    } catch (_) { /* quota */ }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) { /* ignore */ }
  }

  /** @returns {'idle'|'running'|'finished'} */
  function resolveStatus(session, durationSeconds) {
    if (!session || !session.started_at) return 'idle';
    if (session.status === 'finished' || session.ended_at) return 'finished';
    const remaining = computeRemainingSeconds(session, durationSeconds);
    if (remaining <= 0) return 'finished';
    return 'running';
  }

  function computeRemainingSeconds(session, durationSeconds) {
    const duration = session.duration_seconds != null ? session.duration_seconds : durationSeconds;
    if (!session || !session.started_at || !duration) return durationSeconds || 0;
    const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
    return Math.max(0, Math.ceil(duration - elapsed));
  }

  function formatDisplay(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m + ':' + String(r).padStart(2, '0');
    }
    return '0:' + String(s).padStart(2, '0');
  }

  function ringProgress(remaining, total) {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  }

  function ringColor(remaining, total) {
    const ratio = total > 0 ? remaining / total : 0;
    if (ratio > 0.5) return '#22C55E';
    if (ratio > 0.2) return '#F97316';
    return '#EF4444';
  }

  function getSession(childId, scheduleDate, dailyLogItemId) {
    return read(storageKey(childId, scheduleDate, dailyLogItemId));
  }

  function startSession(childId, scheduleDate, dailyLogItemId, durationSeconds) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId);
    const session = {
      daily_log_item_id: dailyLogItemId,
      child_id: childId,
      schedule_date: scheduleDate,
      duration_seconds: durationSeconds,
      status: 'running',
      started_at: new Date().toISOString(),
      ended_at: null,
      end_sound_played: false,
    };
    write(key, session);
    return session;
  }

  function markFinished(childId, scheduleDate, dailyLogItemId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId);
    const session = read(key);
    if (!session) return null;
    session.status = 'finished';
    session.ended_at = session.ended_at || new Date().toISOString();
    write(key, session);
    return session;
  }

  function setEndSoundPlayed(childId, scheduleDate, dailyLogItemId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId);
    const session = read(key);
    if (!session) return;
    session.end_sound_played = true;
    write(key, session);
  }

  function clearSession(childId, scheduleDate, dailyLogItemId) {
    remove(storageKey(childId, scheduleDate, dailyLogItemId));
  }

  /** Remove sessions for items no longer in today's NU set. */
  function pruneSessions(childId, scheduleDate, activeDailyLogItemIds) {
    const active = new Set(activeDailyLogItemIds || []);
    const prefix = PREFIX + childId + ':' + scheduleDate + ':';
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const itemId = k.slice(prefix.length);
        if (!active.has(itemId)) remove(k);
      }
    } catch (_) { /* ignore */ }
  }

  global.ActivityTimerSession = {
    getSession,
    startSession,
    markFinished,
    clearSession,
    pruneSessions,
    resolveStatus,
    computeRemainingSeconds,
    formatDisplay,
    ringProgress,
    ringColor,
    setEndSoundPlayed,
  };
})(window);
