/**
 * onboarding-activity-guide.js — Parent picks how the child completes activities.
 * Sets child defaults (editable later in child settings). Not "NPF-läge".
 */
(function () {
  'use strict';

  const PRESETS = {
    free_order: {
      require_sequential_completion: false,
      show_now_next: false,
      activity_timers_enabled: false,
    },
    one_at_a_time: {
      require_sequential_completion: true,
      show_now_next: true,
      activity_timers_enabled: false,
    },
    time_and_order: {
      require_sequential_completion: true,
      show_now_next: true,
      activity_timers_enabled: true,
    },
  };

  let selectedMode = null;

  function presetForMode(mode) {
    return PRESETS[mode] || null;
  }

  function selectActivityGuide(mode) {
    if (!PRESETS[mode]) return;
    selectedMode = mode;
    document.querySelectorAll('.activity-guide-card').forEach(function (card) {
      card.classList.toggle('selected', card.getAttribute('data-mode') === mode);
    });
    const err = document.getElementById('stepActivityGuideError');
    if (err) err.classList.add('hidden');
  }

  function goToActivityGuideStep() {
    document.querySelectorAll('.step-card').forEach(function (c) {
      c.classList.remove('active');
    });
    const step = document.getElementById('stepActivityGuide');
    if (!step) return;
    step.classList.add('active');

    const nameEl = document.getElementById('activityGuideChildName');
    if (nameEl && typeof childName !== 'undefined' && childName) {
      nameEl.textContent = childName;
    }

    const label = document.getElementById('stepLabel');
    if (label) label.textContent = 'Steg 2 av 3';

    [1, 2, 3, 4, 5, 6].forEach(function (i) {
      const pb = document.getElementById('pb' + i);
      if (!pb) return;
      pb.classList.remove('active', 'done');
      if (i === 1) pb.classList.add('done');
      else if (i === 2) pb.classList.add('active');
    });

    window.scrollTo(0, 0);
  }

  async function saveAndContinue() {
    const errorEl = document.getElementById('stepActivityGuideError');
    if (errorEl) errorEl.classList.add('hidden');

    if (!selectedMode) {
      if (errorEl) {
        errorEl.textContent = 'Välj ett alternativ';
        errorEl.classList.remove('hidden');
      }
      return;
    }
    if (!childId) {
      if (typeof goToStep === 'function') goToStep(5);
      return;
    }

    const btn = document.getElementById('stepActivityGuideBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sparar…';
    }

    try {
      const res = await window.apiFetch('/api/onboarding/child-activity-guide', {
        method: 'POST',
        body: JSON.stringify({ child_id: childId, mode: selectedMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara valet');

      if (typeof populateStep5LoginInfo === 'function') populateStep5LoginInfo();
      if (window.OnboardingHandoffFilm && typeof OnboardingHandoffFilm.goToHandoffAfterSchema === 'function') {
        OnboardingHandoffFilm.goToHandoffAfterSchema('activity_guide');
      } else if (typeof window.enterChildHandoff === 'function') {
        await window.enterChildHandoff('activity_guide');
      } else if (typeof goToStep === 'function') {
        goToStep(5);
        const label = document.getElementById('stepLabel');
        if (label) label.textContent = 'Steg 3 av 3';
        const pb2 = document.getElementById('pb2');
        const pb5 = document.getElementById('pb5');
        if (pb2) { pb2.classList.remove('active'); pb2.classList.add('done'); }
        if (pb5) pb5.classList.add('active');
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Något gick fel. Försök igen.';
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Fortsätt →';
      }
    }
  }

  function bind() {
    const btn = document.getElementById('stepActivityGuideBtn');
    if (btn) btn.addEventListener('click', saveAndContinue);
    document.querySelectorAll('.activity-guide-card').forEach(function (card) {
      card.addEventListener('click', function () {
        selectActivityGuide(card.getAttribute('data-mode'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.OnboardingActivityGuide = {
    PRESETS: PRESETS,
    presetForMode: presetForMode,
    selectActivityGuide: selectActivityGuide,
    goToActivityGuideStep: goToActivityGuideStep,
  };
  window.selectActivityGuide = selectActivityGuide;
})();
