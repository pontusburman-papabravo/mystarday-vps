/**
 * onboarding-starter-plan.js — ACT-1 PR3 template-first + slim signup (ADR).
 * ACT-1 PR3 template-first + slim signup (ADR).
 */
(function () {
  'use strict';

  const QUESTION_IDS = [
    'child_name',
    'child_birthday',
    'age_band',
    'routine_type_ui',
    'main_challenge',
    'support_ui',
    'length_ui',
    'free_text',
  ];

  const CHOICE_OPTION_KEYS = {
    age_band: ['3-5', '6-8', '9-12', '13+'],
    routine_type_ui: ['morgon', 'kvall', 'efter-skola', 'laxor', 'gora-sig-klar'],
    main_challenge: ['getting_started', 'focus', 'conflicts', 'forgetting', 'transitions'],
    support_ui: ['ja', 'lite', 'nej'],
    length_ui: ['kort', 'normal', 'detaljerad'],
  };

  const SLIM_QUESTION_IDS = ['child_name', 'child_birthday', 'routine_type_ui'];

  const state = {
    enabled: false,
    slim: false,
    /** null | 'slim' | 'full_wizard' | 'legacy_template' */
    signupPath: null,
    flags: {},
    qIndex: 0,
    answers: {},
    plan: null,
    previewItems: [],
    planEdited: false,
    planTitle: '',
    introText: '',
    usedAi: false,
    selectedEmoji: '🌟',
  };

  function ot(key, params) {
    return window.ot ? window.ot(key, params) : key;
  }

  function getQuestions() {
    return QUESTION_IDS.map(function (id) {
      const base = 'onboarding.starter.questions.' + id;
      if (id === 'child_name') {
        return {
          id,
          type: 'text',
          label: ot(base + '.label'),
          placeholder: ot(base + '.placeholder'),
        };
      }
      if (id === 'child_birthday') {
        return {
          id,
          type: 'birthday',
          label: ot('onboarding.child.birthdayLabel'),
          hint: ot('onboarding.starter.birthdayHint'),
        };
      }
      if (id === 'free_text') {
        return {
          id,
          type: 'textarea',
          label: ot(base + '.label'),
          placeholder: ot(base + '.placeholder'),
          optional: true,
        };
      }
      const options = (CHOICE_OPTION_KEYS[id] || []).map(function (value) {
        return { value, label: ot(base + '.options.' + value) };
      });
      return { id, type: 'choice', label: ot(base + '.label'), options };
    });
  }

  function api(path, opts) {
    return window.apiFetch(path, opts);
  }

  function syncOnboardingCompleteInAuth() {
    if (window.Auth && typeof Auth.getUser === 'function') {
      const user = Auth.getUser();
      if (user) {
        user.onboarding_completed = true;
        Auth.setAuth(Auth.getToken(), user);
      }
    }
  }

  function track(eventType, metadata) {
    api('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(function () {});
  }

  function activeQuestions() {
    const questions = getQuestions();
    if (state.slim) {
      return questions.filter(function (q) { return SLIM_QUESTION_IDS.indexOf(q.id) >= 0; });
    }
    return questions.filter(function (q) { return q.id !== 'child_birthday'; });
  }

  function resolveAgeBand() {
    if (state.answers.age_band) return state.answers.age_band;
    if (state.answers.child_birthday && typeof window.ageBandFromBirthday === 'function') {
      return window.ageBandFromBirthday(state.answers.child_birthday);
    }
    return '6-8';
  }

  function readBirthdayAnswer() {
    const yearEl = document.getElementById('spBirthdayYear');
    const monthEl = document.getElementById('spBirthdayMonth');
    const dayEl = document.getElementById('spBirthdayDay');
    if (!yearEl || !monthEl || !dayEl) return '';
    const y = yearEl.value;
    const m = monthEl.value;
    const d = dayEl.value;
    return (y && m && d) ? y + '-' + m + '-' + d : '';
  }

  let onboardingStartedTracked = false;

  function trackOnboardingStartedOnce(source) {
    if (onboardingStartedTracked) return;
    onboardingStartedTracked = true;
    track('activation_onboarding_started', { source: source || 'starter_plan' });
  }

  function trackQuestionAnswered(questionId) {
    trackOnboardingStartedOnce(state.slim ? 'signup_slim_first_answer' : 'starter_plan_first_answer');
    track('activation_question_answered', { question_id: questionId });
  }

  function esc(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s);
  }

  function ensureCard() {
    let card = document.getElementById('stepStarterPlan');
    if (card) return card;
    const main = document.querySelector('.max-w-lg.mx-auto.px-4');
    if (!main) return null;
    card = document.createElement('div');
    card.className = 'step-card hidden';
    card.id = 'stepStarterPlan';
    card.innerHTML = [
      '<div id="starterPlanQuestions"></div>',
      '<div id="starterPlanPreview" class="hidden"></div>',
      '<div id="starterPlanError" class="hidden error-box mb-4"></div>',
    ].join('');
    const step1 = document.getElementById('step1');
    if (step1 && step1.parentNode) {
      step1.parentNode.insertBefore(card, step1);
    } else {
      main.appendChild(card);
    }
    return card;
  }

  function showError(msg) {
    const el = document.getElementById('starterPlanError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError() {
    const el = document.getElementById('starterPlanError');
    if (el) el.classList.add('hidden');
  }

  function showStarterStep() {
    document.querySelectorAll('.step-card').forEach(function (c) { c.classList.remove('active'); });
    const card = ensureCard();
    if (!card) return;
    card.classList.remove('hidden');
    card.classList.add('active');
    const label = document.getElementById('stepLabel');
    const questions = activeQuestions();
    if (label) {
      label.textContent = ot('onboarding.starter.stepLabel', {
        current: state.qIndex + 1,
        total: questions.length,
      });
    }
  }

  function renderQuestion() {
    const container = document.getElementById('starterPlanQuestions');
    const preview = document.getElementById('starterPlanPreview');
    if (!container) return;
    if (preview) preview.classList.add('hidden');
    container.classList.remove('hidden');

    const questions = activeQuestions();
    const q = questions[state.qIndex];
    if (!q) return;

    const intro = state.slim
      ? ot('onboarding.starter.slimIntro')
      : ot('onboarding.starter.fullIntro');
    const html = [
      '<div class="text-center mb-6">',
      '  <div class="text-5xl mb-3">✨</div>',
      '  <h1 class="text-2xl font-heading font-bold text-navy mb-2">' + esc(state.slim ? ot('onboarding.starter.slimTitle') : ot('onboarding.starter.fullTitle')) + '</h1>',
      '  <p class="text-text-soft text-sm">' + esc(intro) + '</p>',
      '</div>',
      '<label class="block font-semibold text-navy mb-2">' + esc(q.label) + '</label>',
    ];

    if (q.type === 'text') {
      html.push('<input type="text" id="spAnswer" class="form-input mb-4" maxlength="80" placeholder="' + esc(q.placeholder || '') + '" value="' + esc(state.answers[q.id] || '') + '">');
    } else if (q.type === 'birthday') {
      html.push(
        '<p class="text-xs text-text-soft mb-3">' + esc(q.hint || '') + '</p>',
        '<div class="grid grid-cols-3 gap-2 mb-4">',
        '<select id="spBirthdayYear" class="form-input py-3 min-h-[44px] text-base" aria-label="' + esc(ot('onboarding.child.birthYearAria')) + '"><option value="">' + esc(ot('onboarding.child.yearPlaceholder')) + '</option></select>',
        '<select id="spBirthdayMonth" class="form-input py-3 min-h-[44px] text-base" aria-label="' + esc(ot('onboarding.child.birthMonthAria')) + '"><option value="">' + esc(ot('onboarding.child.monthPlaceholder')) + '</option></select>',
        '<select id="spBirthdayDay" class="form-input py-3 min-h-[44px] text-base" aria-label="' + esc(ot('onboarding.child.birthDayAria')) + '"><option value="">' + esc(ot('onboarding.child.dayPlaceholder')) + '</option></select>',
        '</div>'
      );
    } else if (q.type === 'textarea') {
      html.push('<textarea id="spAnswer" class="form-input mb-4" rows="3" maxlength="200" placeholder="' + esc(q.placeholder || '') + '">' + esc(state.answers[q.id] || '') + '</textarea>');
    } else if (q.type === 'choice') {
      html.push('<div class="grid grid-cols-1 gap-2 mb-4">');
      q.options.forEach(function (opt) {
        const sel = state.answers[q.id] === opt.value ? ' border-gold bg-gold-light' : ' border-lavender';
        html.push('<button type="button" class="sp-choice text-left px-4 py-3 rounded-xl border-2' + sel + '" data-value="' + esc(opt.value) + '">' + esc(opt.label) + '</button>');
      });
      html.push('</div>');
    }

    html.push('<div class="flex gap-3">');
    if (state.qIndex > 0) {
      html.push('<button type="button" id="spBack" class="px-5 py-3.5 bg-lavender text-navy font-semibold rounded-xl text-sm">' + esc(ot('onboarding.common.back')) + '</button>');
    }
    const isLast = state.qIndex === questions.length - 1;
    const nextLabel = isLast
      ? (state.slim ? ot('onboarding.starter.createRoutine') : ot('onboarding.starter.showSchedule'))
      : ot('onboarding.starter.buttons.next');
    html.push('<button type="button" id="spNext" class="flex-1 bg-gold hover:bg-gold-dark text-white font-semibold py-3.5 rounded-xl">' + esc(nextLabel) + '</button>');
    html.push('</div>');

    if (state.slim) {
      html.push(
        '<div class="mt-6 pt-5 border-t border-lavender/70">',
        '  <p class="text-xs text-text-soft text-center mb-3">' + esc(ot('onboarding.starter.powerPathLead')) + '</p>',
        '  <div class="flex flex-col gap-2">',
        '    <button type="button" id="spChooseTemplate" class="w-full px-4 py-3 rounded-xl border-2 border-lavender text-navy text-sm font-semibold text-left">' + esc(ot('onboarding.starter.chooseTemplate')) + '</button>',
        '    <button type="button" id="spFullWizard" class="w-full px-4 py-3 rounded-xl border-2 border-lavender text-navy text-sm font-semibold text-left">' + esc(ot('onboarding.starter.fullWizard')) + '</button>',
        '  </div>',
        '</div>'
      );
    }

    container.innerHTML = html.join('');

    if (q.type === 'birthday' && typeof window.initBirthdayPicker === 'function') {
      window.initBirthdayPicker('spBirthday');
      if (state.answers.child_birthday && typeof window.setBirthdayValue === 'function') {
        window.setBirthdayValue(state.answers.child_birthday, 'spBirthday');
      }
      const yearEl = document.getElementById('spBirthdayYear');
      const monthEl = document.getElementById('spBirthdayMonth');
      if (yearEl) yearEl.addEventListener('change', function () { window.updateBirthdayDays('spBirthday'); });
      if (monthEl) monthEl.addEventListener('change', function () { window.updateBirthdayDays('spBirthday'); });
    }

    container.querySelectorAll('.sp-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.answers[q.id] = btn.getAttribute('data-value');
        container.querySelectorAll('.sp-choice').forEach(function (b) {
          b.classList.remove('border-gold', 'bg-gold-light');
          b.classList.add('border-lavender');
        });
        btn.classList.add('border-gold', 'bg-gold-light');
        btn.classList.remove('border-lavender');
      });
    });

    const back = document.getElementById('spBack');
    if (back) back.addEventListener('click', function () {
      state.qIndex--;
      renderQuestion();
      showStarterStep();
    });

    document.getElementById('spNext').addEventListener('click', onQuestionNext);

    const chooseTemplate = document.getElementById('spChooseTemplate');
    if (chooseTemplate) chooseTemplate.addEventListener('click', enterLegacyTemplate);
    const fullWizard = document.getElementById('spFullWizard');
    if (fullWizard) fullWizard.addEventListener('click', enterFullWizard);
  }

  function prefillLegacyFromSlimAnswers() {
    const name = (state.answers.child_name || '').trim();
    if (!name) return;
    const input = document.getElementById('childName');
    if (input && !input.value.trim()) input.value = name;
    if (state.answers.child_birthday && typeof window.setBirthdayValue === 'function') {
      if (typeof window.initBirthdayPicker === 'function') window.initBirthdayPicker();
      window.setBirthdayValue(state.answers.child_birthday);
      if (typeof window.updateBirthdayHidden === 'function') window.updateBirthdayHidden();
    }
  }

  function showLegacyStep1() {
    const card = document.getElementById('stepStarterPlan');
    if (card) {
      card.classList.remove('active');
      card.classList.add('hidden');
    }
    const step1 = document.getElementById('step1');
    if (step1) {
      step1.classList.remove('hidden');
      step1.classList.add('active');
    }
    if (typeof window.goToStep === 'function') {
      window.goToStep(1);
    }
  }

  function enterLegacyTemplate() {
    state.signupPath = 'legacy_template';
    track('signup_power_path_selected', { path: 'legacy_template' });
    prefillLegacyFromSlimAnswers();
    showLegacyStep1();
  }

  function enterFullWizard() {
    state.signupPath = 'full_wizard';
    state.slim = false;
    state.qIndex = 0;
    track('signup_power_path_selected', { path: 'full_wizard' });
    renderQuestion();
    showStarterStep();
  }

  function readCurrentAnswer() {
    const questions = activeQuestions();
    const q = questions[state.qIndex];
    if (q.type === 'birthday') return readBirthdayAnswer();
    if (q.type === 'choice') return state.answers[q.id];
    const input = document.getElementById('spAnswer');
    return input ? input.value.trim() : '';
  }

  async function onQuestionNext() {
    hideError();
    const questions = activeQuestions();
    const q = questions[state.qIndex];
    const val = readCurrentAnswer();
    if (!val && !q.optional) {
      showError(ot('onboarding.starter.answerRequired'));
      return;
    }
    if (val) {
      state.answers[q.id] = val;
      trackQuestionAnswered(q.id);
    }

    if (state.qIndex < questions.length - 1) {
      state.qIndex++;
      renderQuestion();
      showStarterStep();
      return;
    }

    if (state.slim) {
      await autoSaveSlimAndFinish();
      return;
    }

    await loadPreview();
  }

  async function autoSaveSlimAndFinish() {
    const btn = document.getElementById('spNext');
    if (btn) { btn.disabled = true; btn.textContent = ot('onboarding.starter.creatingRoutine'); }

    try {
      trackOnboardingStartedOnce('signup_slim');

      const suggestBody = {
        age_band: resolveAgeBand(),
        routine_type_ui: state.answers.routine_type_ui,
        support_ui: 'lite',
        length_ui: 'normal',
        main_challenges: [],
        free_text: '',
      };

      const suggestRes = await api('/api/onboarding/starter-plan/suggest', {
        method: 'POST',
        body: JSON.stringify(suggestBody),
      });
      const suggestData = await suggestRes.json();
      if (!suggestRes.ok) throw new Error(suggestData.error || ot('onboarding.starter.templateFailed'));

      const previewRes = await api(
        '/api/onboarding/starter-plan/preview?scheduleName=' + encodeURIComponent(suggestData.scheduleName) +
        '&desiredLength=normal'
      );
      const previewData = await previewRes.json();
      if (!previewRes.ok) throw new Error(previewData.error || ot('onboarding.starter.previewFailed'));

      state.plan = suggestData;
      state.previewItems = previewData.items || [];
      state.planEdited = false;
      state.usedAi = false;

      if (state.flags.activation_ai_starter_plan) {
        if (btn) btn.textContent = ot('onboarding.starter.personalizing');
        await maybePersonalizeWithAi(suggestData, 'normal');
      }

      const name = (state.answers.child_name || '').trim();
      if (!name) throw new Error(ot('onboarding.starter.nameRequired'));

      const childRes = await api('/api/onboarding/child', {
        method: 'POST',
        body: JSON.stringify({
          name: name,
          emoji: state.selectedEmoji,
          birthday: state.answers.child_birthday || null,
        }),
      });
      const childData = await childRes.json();
      if (!childRes.ok) throw new Error(childData.error || ot('onboarding.starter.childCreateFailed'));

      const schedRes = await api('/api/onboarding/schedule', {
        method: 'POST',
        body: JSON.stringify({
          child_id: childData.id,
          template_group: state.plan.template_group,
          custom_items: state.previewItems,
          plan_edited_before_save: false,
          activity_count: state.previewItems.length,
        }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error || ot('onboarding.starter.scheduleSaveFailed'));
      if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
        MetaAppEvents.handleServerMilestones(schedData && schedData.meta_milestones);
      }

      syncOnboardingCompleteInAuth();

      window.dispatchEvent(new CustomEvent('onboarding:child-created', {
        detail: {
          id: childData.id,
          name: childData.name,
          username: childData.username,
          pin: childData.pin,
          birthday: state.answers.child_birthday || null,
        },
      }));

      if (typeof window.selectedDayPref !== 'undefined') {
        window.selectedDayPref = state.plan.template_group;
      }

      state.signupPath = 'slim';

      track('signup_slim_completed', {
        activity_count: state.previewItems.length,
        routine_type: state.answers.routine_type_ui,
      });

      showSlimSuccessAndGoHome();
    } catch (err) {
      showError(err.message || ot('onboarding.common.genericError'));
      if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.createRoutine'); }
    }
  }

  async function completeSignupAndRedirect(targetHref) {
    const res = await api('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error(ot('onboarding.starter.completeFailed'));
    if (window.Auth) {
      const user = Auth.getUser();
      if (user) {
        user.onboarding_completed = true;
        Auth.setAuth(Auth.getToken(), user);
      }
    }
    window.location.href = targetHref;
  }

  function showSlimSuccessAndGoHome() {
    const container = document.getElementById('starterPlanQuestions');
    const preview = document.getElementById('starterPlanPreview');
    if (container) container.classList.add('hidden');
    if (preview) {
      preview.classList.remove('hidden');
      const childName = state.answers.child_name || ot('onboarding.common.childFallback');
      preview.innerHTML = [
        '<div class="text-center py-6">',
        '  <div class="text-5xl mb-3" aria-hidden="true">✨</div>',
        '  <h2 class="text-2xl font-heading font-bold text-navy mb-2">' + esc(ot('onboarding.starter.slimSuccessTitle')) + '</h2>',
        '  <p class="text-text-soft text-sm mb-1">' + esc(ot('onboarding.starter.previewForChild', { childName: childName, count: state.previewItems.length })) + '</p>',
        '  <p class="text-navy text-sm font-medium mt-4">' + esc(ot('onboarding.starter.slimSuccessTonight')) + '</p>',
        '  <button type="button" id="slimGoHome" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3.5 rounded-xl mt-6 min-h-[44px]">' + esc(ot('onboarding.starter.goHome')) + '</button>',
        '  <button type="button" id="slimCustomize" class="w-full text-sm font-semibold text-navy py-3 mt-2 min-h-[44px]">' + esc(ot('onboarding.starter.customizeFirst')) + '</button>',
        '</div>',
      ].join('');

      document.getElementById('slimGoHome').addEventListener('click', function () {
        const btn = document.getElementById('slimGoHome');
        if (btn) { btn.disabled = true; btn.textContent = ot('onboarding.starter.openingHome'); }
        completeSignupAndRedirect('/dashboard').catch(function (err) {
          showError(err.message || ot('onboarding.starter.completeFailed'));
          if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.goHome'); }
        });
      });
      document.getElementById('slimCustomize').addEventListener('click', function () {
        const btn = document.getElementById('slimCustomize');
        if (btn) { btn.disabled = true; btn.textContent = ot('onboarding.starter.openingSchedule'); }
        completeSignupAndRedirect('/schedule').catch(function (err) {
          showError(err.message || ot('onboarding.starter.completeFailed'));
          if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.customizeFirst'); }
        });
      });
    }
  }

  async function fetchPreviewItems(scheduleName, desiredLength) {
    const previewRes = await api(
      '/api/onboarding/starter-plan/preview?scheduleName=' + encodeURIComponent(scheduleName) +
      '&desiredLength=' + encodeURIComponent(desiredLength)
    );
    const previewData = await previewRes.json();
    if (!previewRes.ok) throw new Error(previewData.error || ot('onboarding.starter.previewFailed'));
    return previewData.items || [];
  }

  async function maybePersonalizeWithAi(suggestData, desiredLength) {
    const personalizeBody = {
      child_name: state.answers.child_name || '',
      schedule_name: suggestData.scheduleName,
      base_items: state.previewItems,
      age_band: resolveAgeBand(),
      routine_type_ui: state.answers.routine_type_ui,
      support_ui: state.answers.support_ui || 'lite',
      length_ui: state.answers.length_ui || desiredLength,
      main_challenges: state.answers.main_challenge ? [state.answers.main_challenge] : [],
      free_text: state.answers.free_text || '',
    };

    if (!state.flags.activation_ai_starter_plan) {
      state.planTitle = suggestData.scheduleName;
      state.introText = '';
      state.usedAi = false;
      return;
    }

    const persRes = await api('/api/onboarding/starter-plan/personalize', {
      method: 'POST',
      body: JSON.stringify(personalizeBody),
    });
    const persData = await persRes.json();
    if (!persRes.ok) throw new Error(persData.error || ot('onboarding.starter.personalizeFailed'));
    state.previewItems = persData.items || state.previewItems;
    state.planTitle = persData.plan_title || suggestData.scheduleName;
    state.introText = persData.intro_text || '';
    state.usedAi = !!persData.used_ai;
    state.plan.used_ai = state.usedAi;
  }

  async function loadPreview() {
    const btn = document.getElementById('spNext');
    if (btn) { btn.disabled = true; btn.textContent = ot('onboarding.starter.loading'); }

    try {
      trackOnboardingStartedOnce('starter_plan_wizard');

      const suggestBody = {
        age_band: resolveAgeBand(),
        routine_type_ui: state.answers.routine_type_ui,
        support_ui: state.answers.support_ui,
        length_ui: state.answers.length_ui,
        main_challenges: state.answers.main_challenge ? [state.answers.main_challenge] : [],
        free_text: state.answers.free_text || '',
      };

      const suggestRes = await api('/api/onboarding/starter-plan/suggest', {
        method: 'POST',
        body: JSON.stringify(suggestBody),
      });
      const suggestData = await suggestRes.json();
      if (!suggestRes.ok) throw new Error(suggestData.error || ot('onboarding.starter.templateFailed'));
      state.plan = suggestData;

      const lengthMap = { kort: 'short', normal: 'normal', detaljerad: 'detailed' };
      const desiredLength = lengthMap[state.answers.length_ui] || 'normal';

      state.previewItems = await fetchPreviewItems(suggestData.scheduleName, desiredLength);

      if (state.flags.activation_ai_starter_plan) {
        if (btn) btn.textContent = ot('onboarding.starter.personalizing');
      }
      await maybePersonalizeWithAi(suggestData, desiredLength);

      renderPreview();
    } catch (err) {
      showError(err.message || ot('onboarding.common.genericError'));
      if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.showSchedule'); }
    }
  }

  function renderPreview() {
    const container = document.getElementById('starterPlanQuestions');
    const preview = document.getElementById('starterPlanPreview');
    if (!container || !preview) return;
    container.classList.add('hidden');
    preview.classList.remove('hidden');

    const childName = state.answers.child_name || ot('onboarding.common.childFallback');
    const title = state.planTitle || (state.plan && state.plan.scheduleName) || ot('onboarding.starter.defaultPlanTitle');
    const previewMeta = ot('onboarding.starter.previewForChild', {
      childName: childName,
      count: state.previewItems.length,
    }) + (state.usedAi ? ot('onboarding.starter.previewAiTail') : '');
    const html = [
      '<div class="text-center mb-4">',
      '  <div class="text-4xl mb-2">📋</div>',
      '  <h2 class="text-xl font-heading font-bold text-navy">' + esc(title) + '</h2>',
      '  <p class="text-text-soft text-sm">' + esc(previewMeta) + '</p>',
      '</div>',
    ];
    if (state.introText) {
      html.push('<p class="text-sm text-navy bg-gold-light border border-gold rounded-xl p-3 mb-4">' + esc(state.introText) + '</p>');
    }
    html.push('<ul id="spActivityList" class="space-y-2 mb-4">');

    state.previewItems.forEach(function (item, idx) {
      html.push('<li class="flex items-center gap-2 bg-sky rounded-xl px-3 py-2" data-idx="' + idx + '">' +
        '<span class="text-xl">' + esc(item.icon || '⭐') + '</span>' +
        '<span class="flex-1 text-sm font-medium text-navy">' + esc(item.name) + '</span>' +
        '<button type="button" class="sp-remove text-text-soft text-xs" data-idx="' + idx + '">' + esc(ot('onboarding.starter.removeStep')) + '</button></li>');
    });

    html.push('</ul>');
    html.push('<p class="text-xs text-text-soft mb-4">' + esc(ot('onboarding.starter.previewHint')) + '</p>');
    html.push('<button type="button" id="spSavePlan" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3.5 rounded-xl mb-3">' + esc(ot('onboarding.starter.useSchedule')) + '</button>');
    html.push('<button type="button" id="spBackToQuestions" class="w-full text-text-soft text-sm font-semibold">' + esc(ot('onboarding.starter.changeAnswers')) + '</button>');

    preview.innerHTML = html.join('');

    preview.querySelectorAll('.sp-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        state.previewItems.splice(idx, 1);
        state.planEdited = true;
        renderPreview();
      });
    });

    document.getElementById('spBackToQuestions').addEventListener('click', function () {
      state.qIndex = 0;
      renderQuestion();
      showStarterStep();
    });

    document.getElementById('spSavePlan').addEventListener('click', savePlan);
  }

  async function savePlan() {
    hideError();
    const btn = document.getElementById('spSavePlan');
    if (btn) { btn.disabled = true; btn.textContent = ot('onboarding.starter.saving'); }

    const name = (state.answers.child_name || '').trim();
    if (!name) {
      showError(ot('onboarding.starter.nameRequired'));
      if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.useSchedule'); }
      return;
    }

    try {
      const childRes = await api('/api/onboarding/child', {
        method: 'POST',
        body: JSON.stringify({
          name: name,
          emoji: state.selectedEmoji,
          birthday: state.answers.child_birthday || null,
        }),
      });
      const childData = await childRes.json();
      if (!childRes.ok) throw new Error(childData.error || ot('onboarding.starter.childCreateFailed'));

      const schedRes = await api('/api/onboarding/schedule', {
        method: 'POST',
        body: JSON.stringify({
          child_id: childData.id,
          template_group: state.plan.template_group,
          custom_items: state.previewItems,
          plan_edited_before_save: state.planEdited,
          activity_count: state.previewItems.length,
        }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error || ot('onboarding.starter.scheduleSaveFailed'));
      if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
        MetaAppEvents.handleServerMilestones(schedData && schedData.meta_milestones);
      }

      syncOnboardingCompleteInAuth();

      window.dispatchEvent(new CustomEvent('onboarding:child-created', {
        detail: {
          id: childData.id,
          name: childData.name,
          username: childData.username,
          pin: childData.pin,
          birthday: state.answers.child_birthday || null,
        },
      }));

      if (typeof window.selectedDayPref !== 'undefined') {
        window.selectedDayPref = state.plan.template_group;
      }

      document.getElementById('stepStarterPlan').classList.remove('active');
      if (window.OnboardingHandoffFilm && typeof OnboardingHandoffFilm.goToHandoffAfterSchema === 'function') {
        OnboardingHandoffFilm.goToHandoffAfterSchema('starter_plan');
      } else if (typeof window.enterChildHandoff === 'function') {
        window.enterChildHandoff('starter_plan');
      } else if (typeof window.goToStep === 'function') {
        window.goToStep(5);
      }
    } catch (err) {
      showError(err.message || ot('onboarding.common.genericError'));
      if (btn) { btn.disabled = false; btn.textContent = ot('onboarding.starter.useSchedule'); }
    }
  }

  function hideLegacyStep1() {
    const step1 = document.getElementById('step1');
    if (step1) step1.classList.add('hidden');
  }

  function isEnabled() {
    return state.enabled === true;
  }

  function isSlimFastPath() {
    if (state.signupPath === 'slim') return true;
    if (state.signupPath === 'full_wizard' || state.signupPath === 'legacy_template') return false;
    return state.slim && state.enabled;
  }

  function getSignupPath() {
    return state.signupPath;
  }

  let initResult = 'inactive';

  function refreshStarterPlanUI() {
    const card = document.getElementById('stepStarterPlan');
    if (!card || !state.enabled || card.classList.contains('hidden')) return;
    const preview = document.getElementById('starterPlanPreview');
    if (preview && !preview.classList.contains('hidden') && state.previewItems.length) {
      renderPreview();
    } else if (document.getElementById('starterPlanQuestions') && !document.getElementById('starterPlanQuestions').classList.contains('hidden')) {
      renderQuestion();
      showStarterStep();
    }
  }

  async function tryResumeAct1(data, isAddChild) {
    const funnelStep = data.funnel_step || 'signup';
    if (funnelStep === 'signup' || isAddChild) return false;

    const flags = data.flags || {};
    const dayZero = flags.activation_first_success_v1 || flags.activation_signup_slim_v1;
    const act1Live = flags.activation_onboarding_v1 || dayZero;
    if (!act1Live) return false;

    state.enabled = true;
    state.flags = flags;
    if (data.primary_child_id && window.OnboardingActivation &&
        typeof OnboardingActivation.setChildId === 'function') {
      OnboardingActivation.setChildId(data.primary_child_id);
      window.dispatchEvent(new CustomEvent('onboarding:child-created', {
        detail: { id: data.primary_child_id },
      }));
    }
    if (funnelStep === 'child_created') {
      if (dayZero) {
        state.slim = true;
        hideLegacyStep1();
        ensureCard();
        renderQuestion();
        showStarterStep();
      } else if (typeof window.resumeAct1Onboarding === 'function') {
        await window.resumeAct1Onboarding(funnelStep);
      }
      return true;
    }
    if (typeof window.resumeAct1Onboarding === 'function') {
      await window.resumeAct1Onboarding(funnelStep);
    }
    return true;
  }

  async function init() {
    const isAddChild = typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD;

    try {
      const res = await api('/api/family/activation-config');
      if (!res.ok) {
        initResult = 'inactive';
        return initResult;
      }
      const data = await res.json();
      if (await tryResumeAct1(data, isAddChild)) {
        initResult = 'resumed';
        return initResult;
      }
      const flags = data.flags || {};

      if (flags.activation_first_success_v1 && !isAddChild) {
        state.slim = true;
        state.enabled = true;
        state.flags = flags;
        hideLegacyStep1();
        ensureCard();
        renderQuestion();
        showStarterStep();
        track('activation_onboarding_screen_viewed', { source: 'first_success_v1_entry' });
        initResult = 'active';
        return initResult;
      }

      if (flags.activation_signup_slim_v1 && !isAddChild) {
        state.slim = true;
        state.enabled = true;
        state.flags = flags;
        hideLegacyStep1();
        ensureCard();
        renderQuestion();
        showStarterStep();
        track('activation_onboarding_screen_viewed', { source: 'signup_slim_entry' });
        initResult = 'active';
        return initResult;
      }

      if (!flags.activation_onboarding_v1) {
        initResult = 'inactive';
        return initResult;
      }

      state.enabled = true;
      state.flags = flags;
      hideLegacyStep1();
      ensureCard();
      renderQuestion();
      showStarterStep();
      track('activation_onboarding_screen_viewed', {
        source: isAddChild ? 'add_child_entry' : 'onboarding_entry',
      });
      initResult = 'active';
      return initResult;
    } catch (_) {
      initResult = 'inactive';
      return initResult;
    }
  }

  document.addEventListener('onboarding-i18n-ready', refreshStarterPlanUI);

  window.OnboardingStarterPlan = {
    init: init,
    isEnabled: isEnabled,
    getInitResult: function () { return initResult; },
    isSlim: function () { return state.slim; },
    isSlimFastPath: isSlimFastPath,
    getSignupPath: getSignupPath,
  };
})();
