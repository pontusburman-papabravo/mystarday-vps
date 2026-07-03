/**
 * Child dashboard day loader (Fas 8 F3g).
 * loadDay, coalesced refresh, ratings batch fetch.
 * Reads host state: me, currentDate, todayStr, subStepCache, itemRatings, view flags.
 */
(function () {
  'use strict';

  let _pendingLoadDay = null;

  async function loadRatingsForItems(itemIds) {
    if (!itemIds.length) return;
    const results = await Promise.allSettled(
      itemIds.map(id =>
        Auth.api(`/api/me/daily-log-items/${id}/rating`)
          .then(r => ({ id, r }))
          .catch(() => null)
      )
    );
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const { id, r } = res.value;
        if (r) itemRatings[id] = r;
      }
    }
  }

  async function loadDay(dateStr, showLoader = true) {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
      dateStr = todayStr || getLocalDate();
    }
    if (!me) return;

    currentDate = dateStr;
    subStepCache = {};
    renderDayTabs();
    updateDateLine();

    const container = document.getElementById('scheduleView');
    let skeletonTimer;

    if (!navigator.onLine) {
      const cached = await (window.OfflineStore
        ? OfflineStore.getDailyLog(me?.id, dateStr)
        : Promise.resolve(null));
      if (skeletonTimer) skeletonTimer.stop();
      if (cached) {
        renderActivities(cached, null);
        showOfflineBanner('📶 Offline — visar sparat schema');
      } else {
        showOfflineEmptyState(container);
      }
      return;
    }

    if (showLoader) {
      if (window.Skeleton && window.Skeleton.isNative()) {
        skeletonTimer = window.Skeleton.createTimer(function () {
          window.Skeleton.showChildScheduleSkeleton();
        });
      } else {
        container.innerHTML = `
        <div class="text-center py-16">
          <p class="text-4xl mb-3 animate-pulse">⏳</p>
          <p class="text-text-soft">Laddar ditt schema...</p>
        </div>`;
      }
    }

    try {
      const focusLayer = isTodayFocusLayer();
      const [data, rwdData, goalData] = await Promise.all(
        focusLayer
          ? [
              Auth.api(`/api/me/daily-log?date=${dateStr}`),
              Promise.resolve(null),
              Auth.api('/api/me/goal').catch(() => null),
            ]
          : [
              Auth.api(`/api/me/daily-log?date=${dateStr}`),
              Auth.api('/api/me/rewards').catch(() => null),
              Auth.api('/api/me/goal').catch(() => null),
            ]
      );
      if (skeletonTimer) skeletonTimer.stop();

      if (window.OfflineStore && me?.id) {
        OfflineStore.saveDailyLog(me.id, dateStr, data).catch(() => {});
        if (rwdData) OfflineStore.saveRewards(me.id, rwdData).catch(() => {});
        if (data.child_profile) OfflineStore.saveChildProfile(me.id, data.child_profile).catch(() => {});
      }

      hideOfflineBanner();

      const items = data.items || [];
      for (const item of items) {
        if (item.rating && (item.rating.child_score != null || item.rating.child_emotion_key)) {
          itemRatings[item.id] = {
            child_score: item.rating.child_score,
            child_emotion_key: item.rating.child_emotion_key,
            child_comment: item.rating.child_comment || null,
          };
        }
      }
      const unfetched = items.filter(i => !itemRatings[i.id]).map(i => i.id);
      if (unfetched.length > 0) {
        await loadRatingsForItems(unfetched);
      }
      allowChildReorder = !!data.allow_child_reorder;
      showNowNext = data.show_now_next === true;
      requireSequentialCompletion = data.require_sequential_completion === true;
      if (!viewTypeLocalOverride) {
        viewType = data.view_type || 'day_sections';
      }
      showMoodRating = data.show_mood_rating !== false;
      moodInputMode = data.mood_input_mode || 'slider';
      if (Array.isArray(data.transition_lead_minutes) && data.transition_lead_minutes.length > 0) {
        transitionLeadMinutes = data.transition_lead_minutes;
      }
      dopaminAnimation = data.dopamin_animation !== false;
      visualTimer = data.visual_timer !== false;
      hideClock = !!data.hide_clock;
      colorCoding = data.color_coding !== false;
      if (window.ChildSevenQuestions?.ready) {
        await ChildSevenQuestions.ready();
      }
      renderActivities(data, rwdData?.starBalance);
      updateGoalBar(goalData);
      if (window.ChildActivityEngine) {
        ChildActivityEngine.setLastDayData(data);
        ChildActivityEngine.mountPausedBannerIfNeeded();
      }
      if (window.ChildRewardsEngine && goalData && !(window.ChildFirstStarMode && ChildFirstStarMode.isActive())) {
        ChildRewardsEngine.setGoalData(goalData);
        ChildRewardsEngine.mountGoalProgress();
      }
    } catch (err) {
      if (skeletonTimer) skeletonTimer.stop();
      console.error('Load day error:', err);
      const cached = await (window.OfflineStore
        ? OfflineStore.getDailyLog(me?.id, dateStr)
        : Promise.resolve(null));
      if (cached) {
        renderActivities(cached, null);
        showOfflineBanner('📶 Offline — visar sparat schema');
      } else if (window.Skeleton) {
        window.Skeleton.showChildScheduleError(container, dateStr);
      } else {
        showOfflineErrorState(container, dateStr);
      }
    }
  }

  async function coalescedLoadDay() {
    if (_pendingLoadDay) {
      return _pendingLoadDay;
    }
    const dateStr = currentDate || todayStr || getLocalDate();
    _pendingLoadDay = loadDay(dateStr, false).finally(() => {
      _pendingLoadDay = null;
    });
    return _pendingLoadDay;
  }

  window.loadDay = loadDay;
  window.coalescedLoadDay = coalescedLoadDay;
})();
