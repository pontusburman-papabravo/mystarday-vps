/**
 * Child dashboard check-off + mood rating (Fas 8 F3e).
 * toggleItem, check-off queue, rating modal, offline sync listeners.
 */
(function () {
  'use strict';

  const SCORE_LABELS = ['', 'Jättesvårt 😢', 'Svårt 😞', 'Lite svårt 😕', 'Okej 😐', 'Ganska bra 🙂', 'Bra 😊', 'Jättebra 😄', 'Superbra 😁', 'Nästan perfekt 🤩', 'Fantastiskt! 🌟'];

  const EMOTION_CARDS = [
    { key: 'happy', label: 'Glad', emoji: '😊' },
    { key: 'angry', label: 'Arg', emoji: '😠' },
    { key: 'sad', label: 'Ledsen', emoji: '😢' },
    { key: 'tired', label: 'Trött', emoji: '😴' },
    { key: 'worried', label: 'Orolig', emoji: '😟' },
    { key: 'proud', label: 'Stolt', emoji: '😌' },
    { key: 'scared', label: 'Rädd', emoji: '😨' },
    { key: 'stressed', label: 'Stressad', emoji: '😰' },
  ];

  const _checkOffQueue = [];
  let _checkOffRunning = false;
  let ratingItemId = null;
  let ratingItemIcon = null;
  let ratingItemName = null;
  let ratingScore = 0;
  let ratingEmotionKey = null;

  function shouldShowMoodModal() {
    return showMoodRating && moodInputMode && moodInputMode !== 'off';
  }

  function setRatingModalMode(mode) {
    const sliderBlock = document.getElementById('ratingSliderBlock');
    const cardsBlock = document.getElementById('ratingCardsBlock');
    const faceBlock = document.getElementById('ratingFaceBlock');
    if (!sliderBlock || !cardsBlock) return;
    const useCards = mode === 'cards';
    sliderBlock.classList.toggle('hidden', useCards);
    if (faceBlock) faceBlock.classList.toggle('hidden', useCards);
    cardsBlock.classList.toggle('hidden', !useCards);
  }

  function selectEmotionCard(key) {
    ratingEmotionKey = key;
    ratingScore = 0;
    const buttons = document.querySelectorAll('#ratingCardsGrid .emotion-card-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.emotionKey === key);
    });
  }

  function toggleNextInSection(sectionKey, event) {
    if (event) event.stopPropagation();
    const sectionEl = document.querySelector(`.dagdel-section[data-section="${sectionKey}"] .sortable-section`);
    if (!sectionEl) return;
    const cards = sectionEl.querySelectorAll('.activity-card:not(.done)');
    if (cards.length === 0) {
      showToast('✅ Alla aktiviteter i sektionen är klara!');
      return;
    }
    const firstUndone = cards[0];
    const itemId = firstUndone.dataset.itemId;
    if (itemId) {
      toggleItem(itemId, false);
    }
  }

  async function toggleItem(itemId, isCurrentlyDone) {
    if (!isCurrentlyDone) {
      let steps = subStepCache[itemId];
      if (!steps || steps.length === 0) {
        try {
          const data = await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps`);
          steps = data.sub_steps || [];
          subStepCache[itemId] = steps;
        } catch {
          steps = [];
        }
      }
      if (steps.length > 0) {
        const incomplete = steps.filter(s => !s.completed);
        if (incomplete.length > 0) {
          await Promise.allSettled(
            incomplete.map(step =>
              Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps/${step.id}/complete`, { method: 'PUT' })
                .then(() => { step.completed = true; })
                .catch(() => {})
            )
          );
          const done = steps.filter(s => s.completed).length;
          const badge = document.getElementById('substep-badge-' + itemId);
          if (badge) {
            badge.textContent = `${done}/${steps.length}`;
            if (done === steps.length) badge.className = 'substep-progress all-done';
          }
          if (subStepExpanded[itemId]) {
            renderSubStepList(itemId);
          }
        }
      }
    }

    const action = isCurrentlyDone ? 'uncomplete' : 'complete';
    const card = document.getElementById('card-' + itemId);
    const feedbackFor = card ? (card.dataset.feedbackFor || 'both') : 'both';
    const icon = card ? (card.dataset.itemIcon || '⭐') : '⭐';
    const name = card ? (card.dataset.itemName || 'Aktivitet') : 'Aktivitet';

    if (!isCurrentlyDone) {
      if (window.ChildActivityTimer) ChildActivityTimer.clearForItem(itemId);
      if (window.Platform && window.Platform.haptics) {
        window.Platform.haptics.medium();
      }
      const checkEl = document.querySelector(`#card-${itemId} .card-check`) ||
                      document.querySelector(`#card-${itemId} .photo-activity-card__check`) ||
                      document.querySelector(`#card-${itemId} .now-check`) ||
                      document.getElementById('card-' + itemId);
      if (window.ChildTodayWarmth && ChildTodayWarmth.shouldUseWarmthCheckoff()) {
        ChildTodayWarmth.microSpark(checkEl);
      } else {
        launchDopaminBurst(checkEl);
      }
    }

    _checkOffQueue.push({
      itemId, isCurrentlyDone, action, feedbackFor, icon, name,
      resolve() {},
    });
    if (!_checkOffRunning) {
      _drainCheckOffQueue();
    }
  }

  async function _drainCheckOffQueue() {
    _checkOffRunning = true;
    while (_checkOffQueue.length > 0) {
      const task = _checkOffQueue.shift();
      await _processCheckOff(task);
    }
    _checkOffRunning = false;
  }

  async function _processCheckOff({ itemId, isCurrentlyDone, action, feedbackFor, icon, name }) {
    let queueId = null;

    if (window.Platform && window.Platform.haptics) {
      window.Platform.haptics.light();
    }

    const apiPromise = Auth.api(`/api/me/daily-log-items/${itemId}/${action}`, { method: 'PUT' })
      .then((data) => {
        if (queueId && window.OfflineQueue) {
          window.OfflineQueue.markSynced(queueId);
        }
        if (
          action === 'complete' &&
          window.MetaAppEvents &&
          typeof MetaAppEvents.handleServerMilestones === 'function'
        ) {
          MetaAppEvents.handleServerMilestones(data && data.meta_milestones);
        }
      })
      .catch((err) => {
        const isOffline = !navigator.onLine ||
          (err && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.'));

        if (isOffline && window.OfflineQueue) {
          queueId = window.OfflineQueue.enqueue(itemId, action);
          if (!isCurrentlyDone) {
            showToast('📶 Sparas när nätverket är tillbaka', false);
          }
        } else {
          console.error('Toggle error:', err);
          if (window.Platform && window.Platform.haptics) {
            window.Platform.haptics.error();
          }
          coalescedLoadDay().catch(() => {});
          showToast('Kunde inte uppdatera. Försök igen.', true);
        }
      });

    try {
      await coalescedLoadDay();
      if (!isCurrentlyDone && window.ChildEventBus) {
        ChildEventBus.emitActivityCompleted({
          childId: me && me.id,
          activityId: itemId,
          itemId: itemId,
          timestamp: new Date().toISOString(),
        });
      }
      setTimeout(() => {
        const newNowCard = document.querySelector('.now-card');
        if (newNowCard) {
          newNowCard.style.animation = 'popIn 0.3s ease forwards';
          newNowCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      if (!isCurrentlyDone && shouldShowMoodModal() && feedbackFor !== 'parent' && feedbackFor !== 'none') {
        openRatingModal(itemId, icon, name);
      }
    } catch {
      // loadDay failed (e.g. fully offline) — optimistic state already shown
    }

    await apiPromise.catch(() => {});
  }

  function openRatingModal(itemId, icon, name) {
    ratingItemId = itemId;
    ratingItemIcon = icon;
    ratingItemName = name;
    ratingScore = 5;
    ratingEmotionKey = null;
    document.getElementById('ratingActivityIcon').textContent = icon;
    document.getElementById('ratingActivityName').textContent = name;
    document.getElementById('ratingComment').value = '';
    const mode = moodInputMode === 'cards' ? 'cards' : 'slider';
    setRatingModalMode(mode);
    const slider = document.getElementById('moodSlider');
    if (slider) slider.value = 5;
    if (mode === 'slider') {
      updateMoodSlider(5);
    } else {
      selectEmotionCard(null);
    }
    document.getElementById('ratingModal').classList.remove('hidden');
  }

  function updateMoodSlider(score) {
    ratingScore = score;
    ratingEmotionKey = null;
    const scoreDisplay = document.getElementById('scoreDisplay');
    const scoreLabel = document.getElementById('scoreLabel');
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (scoreLabel) scoreLabel.textContent = SCORE_LABELS[score] || '';

    const scoreColors = ['', '#EF4444', '#F97316', '#F97316', '#EAB308', '#EAB308', '#22C55E', '#22C55E', '#10B981', '#10B981', '#F5A623'];
    if (scoreDisplay) scoreDisplay.style.color = scoreColors[score] || '#F5A623';

    morphFace(score);
  }

  function morphFace(score) {
    const t = (score - 1) / 9;

    const mouthCY = Math.round(52 + t * 28);
    const mouth = document.getElementById('mouthPath');
    if (mouth) {
      const mouthX1 = Math.round(32 - t * 4);
      const mouthX2 = Math.round(68 + t * 4);
      mouth.setAttribute('d', `M ${mouthX1} 65 Q 50 ${mouthCY} ${mouthX2} 65`);
    }

    const browLeft = document.getElementById('browLeft');
    const browRight = document.getElementById('browRight');
    if (browLeft && browRight) {
      if (score <= 3) {
        const anger = (3 - score) / 2;
        browLeft.setAttribute('d', `M 27 ${28 + anger * 4} Q 35 ${30 + anger * 2} 43 ${28 - anger * 2}`);
        browRight.setAttribute('d', `M 57 ${28 - anger * 2} Q 65 ${30 + anger * 2} 73 ${28 + anger * 4}`);
      } else {
        const raise = Math.max(0, t - 0.6) * 2.5;
        browLeft.setAttribute('d', `M 27 ${30 - raise * 4} Q 35 ${26 - raise * 4} 43 ${30 - raise * 4}`);
        browRight.setAttribute('d', `M 57 ${30 - raise * 4} Q 65 ${26 - raise * 4} 73 ${30 - raise * 4}`);
      }
    }

    const cheekOpacity = Math.max(0, (score - 7) / 3).toFixed(2);
    const cheekLeft = document.getElementById('cheekLeft');
    const cheekRight = document.getElementById('cheekRight');
    if (cheekLeft) cheekLeft.setAttribute('opacity', cheekOpacity);
    if (cheekRight) cheekRight.setAttribute('opacity', cheekOpacity);

    const faceBg = document.getElementById('faceBg');
    if (faceBg) {
      if (score >= 9) faceBg.setAttribute('fill', '#FFF3D6');
      else if (score <= 2) faceBg.setAttribute('fill', '#EEF2FF');
      else faceBg.setAttribute('fill', '#FFF8E8');
    }

    const eyeSize = 5 + t * 1.5;
    const eyeLeft = document.getElementById('eyeLeft');
    const eyeRight = document.getElementById('eyeRight');
    if (eyeLeft) { eyeLeft.setAttribute('rx', eyeSize.toFixed(1)); eyeLeft.setAttribute('ry', eyeSize.toFixed(1)); }
    if (eyeRight) { eyeRight.setAttribute('rx', eyeSize.toFixed(1)); eyeRight.setAttribute('ry', eyeSize.toFixed(1)); }
  }

  function dismissRating() {
    document.getElementById('ratingModal').classList.add('hidden');
    ratingItemId = null;
    ratingEmotionKey = null;
  }

  async function submitRating() {
    if (!ratingItemId) return;
    const comment = document.getElementById('ratingComment').value.trim();
    const useCards = moodInputMode === 'cards';
    const payload = { comment: comment || null };
    if (useCards) {
      if (!ratingEmotionKey) {
        showToast('Välj en känsla först', true);
        return;
      }
      payload.emotion_key = ratingEmotionKey;
    } else {
      payload.score = ratingScore || 5;
    }

    const btn = document.getElementById('ratingSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sparar…'; }
    try {
      await Auth.api(`/api/me/daily-log-items/${ratingItemId}/rate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      itemRatings[ratingItemId] = useCards
        ? { child_emotion_key: ratingEmotionKey, child_comment: comment }
        : { child_score: payload.score, child_comment: comment };
      dismissRating();
      await loadDay(currentDate, false);
      showToast('⭐ Betyg sparat!');
    } catch (err) {
      console.error('Rating error:', err);
      if (!navigator.onLine && window.OfflineQueue) {
        window.OfflineQueue.queueChildRate(ratingItemId, payload);
        dismissRating();
        showToast('📶 Känsla sparas när nätverket är tillbaka', false);
      } else {
        dismissRating();
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Spara ⭐'; }
    }
  }

  function initEmotionCardsGrid() {
    const grid = document.getElementById('ratingCardsGrid');
    if (!grid || grid.dataset.built === '1') return;
    grid.dataset.built = '1';
    grid.innerHTML = EMOTION_CARDS.map((c) => `
      <button type="button" class="emotion-card-btn" data-emotion-key="${c.key}"
        onclick="selectEmotionCard('${c.key}')" aria-label="${c.label}">
        <span class="text-2xl" aria-hidden="true">${c.emoji}</span>
        <span class="text-xs font-semibold text-navy">${c.label}</span>
      </button>`).join('');
  }

  document.addEventListener('DOMContentLoaded', initEmotionCardsGrid);

  window.addEventListener('offlineQueue:allSynced', (e) => {
    const count = e.detail && e.detail.count || 0;
    if (count > 0) {
      showToast('✅ Allt uppdaterat ✓', false);
      if (typeof loadDay === 'function' && currentDate) {
        loadDay(currentDate, false).catch(() => {});
      }
    }
  });

  window.addEventListener('offlineQueue:synced', (e) => {
    const { type } = e.detail || {};
    if (type === 'REDEEM_REWARD' || type === 'ADD_STARS') {
      if (typeof loadRewards === 'function' && window.rewardsLoaded) {
        loadRewards().catch(() => {});
      }
    }
  });

  window.toggleItem = toggleItem;
  window.toggleNextInSection = toggleNextInSection;
  window.openRatingModal = openRatingModal;
  window.updateMoodSlider = updateMoodSlider;
  window.selectEmotionCard = selectEmotionCard;
  window.dismissRating = dismissRating;
  window.submitRating = submitRating;
})();
