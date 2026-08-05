/**
 * activity-timer-session.js — localStorage sessions (v2: ends_at, paused).
 * Key: daily_log_item_id + child + schedule date.
 */
(function (global) {
  'use strict';

  const PREFIX = 'activity_timer_session:';

  function sessionToken(dailyLogItemId, subStepId) {
    if (subStepId) return dailyLogItemId + ':sub:' + subStepId;
    return dailyLogItemId;
  }

  function storageKey(childId, scheduleDate, dailyLogItemId, subStepId) {
    return PREFIX + childId + ':' + scheduleDate + ':' + sessionToken(dailyLogItemId, subStepId);
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return normalizeSession(data);
    } catch {
      return null;
    }
  }

  function write(key, session) {
    try {
      localStorage.setItem(key, JSON.stringify(session));
    } catch { /* quota */ }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }

  /** Corrupt / legacy shapes → null (never throw). */
  function normalizeSession(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.daily_log_item_id || typeof raw.daily_log_item_id !== 'string') return null;
    const duration = Number(raw.duration_seconds);
    if (!Number.isFinite(duration) || duration < 5) return null;

    const session = {
      daily_log_item_id: raw.daily_log_item_id,
      child_id: raw.child_id,
      schedule_date: raw.schedule_date,
      duration_seconds: duration,
      status: raw.status,
      started_at: raw.started_at || null,
      ends_at: raw.ends_at || null,
      ended_at: raw.ended_at || null,
      paused_remaining_seconds: raw.paused_remaining_seconds != null
        ? Number(raw.paused_remaining_seconds)
        : null,
      end_sound_played: raw.end_sound_played === true,
      activity_sub_step_id: raw.activity_sub_step_id || null,
    };

    const allowed = ['idle', 'running', 'paused', 'finished'];
    if (!allowed.includes(session.status)) {
      if (session.ends_at || session.started_at) session.status = 'running';
      else return null;
    }

    if (session.status === 'paused') {
      if (!Number.isFinite(session.paused_remaining_seconds) || session.paused_remaining_seconds < 0) {
        return null;
      }
    }

    if (session.status === 'running' && !session.ends_at && session.started_at) {
      const startMs = new Date(session.started_at).getTime();
      if (!Number.isFinite(startMs)) return null;
      session.ends_at = new Date(startMs + duration * 1000).toISOString();
    }

    if (session.ends_at && Number.isNaN(new Date(session.ends_at).getTime())) {
      return null;
    }

    return session;
  }

  /** Sand elapsed fraction 0 (idle/full top) → 1 (finished). */
  function sandProgress(remainingSeconds, durationSeconds) {
    if (!durationSeconds || durationSeconds <= 0) return 0;
    const remaining = Math.max(0, remainingSeconds);
    return Math.max(0, Math.min(1, 1 - remaining / durationSeconds));
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

  function computeRemainingSeconds(session, durationSeconds) {
    const duration = session && session.duration_seconds != null
      ? session.duration_seconds
      : durationSeconds;
    if (!session || !duration) return durationSeconds || 0;

    if (session.status === 'finished' || session.ended_at) return 0;

    if (session.status === 'paused' && session.paused_remaining_seconds != null) {
      return Math.max(0, Math.ceil(session.paused_remaining_seconds));
    }

    if (session.ends_at) {
      const ms = new Date(session.ends_at).getTime() - Date.now();
      return Math.max(0, Math.ceil(ms / 1000));
    }

    if (session.started_at) {
      const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
      return Math.max(0, Math.ceil(duration - elapsed));
    }

    return duration;
  }

  /** @returns {'idle'|'running'|'paused'|'finished'} */
  function resolveStatus(session, durationSeconds) {
    const s = normalizeSession(session);
    if (!s) return 'idle';
    if (s.status === 'paused') return 'paused';
    if (s.status === 'finished' || s.ended_at) return 'finished';
    const remaining = computeRemainingSeconds(s, durationSeconds);
    if (remaining <= 0) return 'finished';
    if (s.status === 'running' || s.ends_at || s.started_at) return 'running';
    return 'idle';
  }

  function ringProgress(remaining, total) {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  }

  function ringColor(remaining, total) {
    const ratio = total > 0 ? remaining / total : 0;
    if (ratio > 0.5) return '#6B8F7A';
    if (ratio > 0.2) return '#C4A574';
    return '#9A8B7A';
  }

  function getSession(childId, scheduleDate, dailyLogItemId, subStepId) {
    return read(storageKey(childId, scheduleDate, dailyLogItemId, subStepId));
  }

  function startSession(childId, scheduleDate, dailyLogItemId, durationSeconds, subStepId, opts) {
    const force = !!(opts && opts.force);
    const key = storageKey(childId, scheduleDate, dailyLogItemId, subStepId);
    const existing = read(key);
    if (!force && existing) {
      const status = resolveStatus(existing, durationSeconds);
      if (status === 'running' || status === 'paused') {
        return existing;
      }
    }
    const now = Date.now();
    const session = {
      daily_log_item_id: dailyLogItemId,
      activity_sub_step_id: subStepId || null,
      child_id: childId,
      schedule_date: scheduleDate,
      duration_seconds: durationSeconds,
      status: 'running',
      started_at: new Date(now).toISOString(),
      ends_at: new Date(now + durationSeconds * 1000).toISOString(),
      ended_at: null,
      paused_remaining_seconds: null,
      end_sound_played: false,
    };
    write(key, session);
    return session;
  }

  function pauseSession(childId, scheduleDate, dailyLogItemId, durationSeconds, subStepId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId, subStepId);
    const session = read(key);
    if (!session || session.status !== 'running') return null;
    const remaining = computeRemainingSeconds(session, durationSeconds);
    session.status = 'paused';
    session.paused_remaining_seconds = remaining;
    session.ends_at = null;
    write(key, session);
    return session;
  }

  function resumeSession(childId, scheduleDate, dailyLogItemId, subStepId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId, subStepId);
    const session = read(key);
    if (!session || session.status !== 'paused') return null;
    const rem = Math.max(0, Math.ceil(session.paused_remaining_seconds || 0));
    const now = Date.now();
    session.status = 'running';
    session.ends_at = new Date(now + rem * 1000).toISOString();
    session.started_at = new Date(now).toISOString();
    session.paused_remaining_seconds = null;
    write(key, session);
    return session;
  }

  function stopSession(childId, scheduleDate, dailyLogItemId, subStepId) {
    clearSession(childId, scheduleDate, dailyLogItemId, subStepId);
  }

  function markFinished(childId, scheduleDate, dailyLogItemId, subStepId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId, subStepId);
    const session = read(key);
    if (!session) return null;
    session.status = 'finished';
    session.ended_at = session.ended_at || new Date().toISOString();
    session.ends_at = session.ends_at || session.ended_at;
    session.paused_remaining_seconds = null;
    write(key, session);
    return session;
  }

  function setEndSoundPlayed(childId, scheduleDate, dailyLogItemId, subStepId) {
    const key = storageKey(childId, scheduleDate, dailyLogItemId, subStepId);
    const session = read(key);
    if (!session) return;
    session.end_sound_played = true;
    write(key, session);
  }

  function clearSession(childId, scheduleDate, dailyLogItemId, subStepId) {
    remove(storageKey(childId, scheduleDate, dailyLogItemId, subStepId));
  }

  /** Rensa huvudaktivitet + alla delsteg-timers för samma daily_log_item. */
  function clearSessionsForDailyLogItem(childId, scheduleDate, dailyLogItemId) {
    const prefix = PREFIX + childId + ':' + scheduleDate + ':' + dailyLogItemId;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        remove(k);
      }
    } catch { /* ignore */ }
  }

  function pruneSessions(childId, scheduleDate, activeDailyLogItemIds) {
    const active = new Set(activeDailyLogItemIds || []);
    const prefix = PREFIX + childId + ':' + scheduleDate + ':';
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(prefix)) continue;
        const suffix = k.slice(prefix.length);
        const baseItemId = suffix.split(':sub:')[0];
        if (!active.has(baseItemId)) remove(k);
      }
    } catch { /* ignore */ }
  }

  global.ActivityTimerSession = {
    sessionToken,
    getSession,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    markFinished,
    clearSession,
    clearSessionsForDailyLogItem,
    pruneSessions,
    resolveStatus,
    computeRemainingSeconds,
    formatDisplay,
    sandProgress,
    ringProgress,
    ringColor,
    setEndSoundPlayed,
    normalizeSession,
  };
})(window);
