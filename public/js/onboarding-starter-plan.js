/**
 * onboarding-starter-plan.js — ACT-1 PR3 template-first question flow + preview.
 * Flag: activation_onboarding_v1
 */
(function () {
  'use strict';

  const QUESTIONS = [
    { id: 'child_name', type: 'text', label: 'Barnets namn', placeholder: 't.ex. Ella' },
    {
      id: 'age_band', type: 'choice', label: 'Hur gammalt är barnet?',
      options: [
        { value: '3-5', label: '3–5 år' },
        { value: '6-8', label: '6–8 år' },
        { value: '9-12', label: '9–12 år' },
        { value: '13+', label: '13+' },
      ],
    },
    {
      id: 'routine_type_ui', type: 'choice', label: 'Vilken rutin vill ni börja med?',
      options: [
        { value: 'morgon', label: '☀️ Morgon' },
        { value: 'kvall', label: '🌙 Kväll' },
        { value: 'efter-skola', label: '🏫 Efter skolan' },
        { value: 'laxor', label: '📚 Läxor' },
        { value: 'gora-sig-klar', label: '🎒 Göra sig klar' },
      ],
    },
    {
      id: 'main_challenge', type: 'choice', label: 'Vad är svårast just nu?',
      options: [
        { value: 'getting_started', label: 'Komma igång' },
        { value: 'focus', label: 'Hålla fokus' },
        { value: 'conflicts', label: 'Konflikter' },
        { value: 'forgetting', label: 'Glömmer steg' },
        { value: 'transitions', label: 'Övergångar' },
      ],
    },
    {
      id: 'support_ui', type: 'choice', label: 'Behöver barnet extra tydligt stöd?',
      options: [
        { value: 'ja', label: 'Ja' },
        { value: 'lite', label: 'Lite' },
        { value: 'nej', label: 'Nej' },
      ],
    },
    {
      id: 'length_ui', type: 'choice', label: 'Hur många steg vill ni börja med?',
      options: [
        { value: 'kort', label: 'Kort (3–4)' },
        { value: 'normal', label: 'Normal (5)' },
        { value: 'detaljerad', label: 'Detaljerad (6–7)' },
      ],
    },
    {
      id: 'free_text', type: 'textarea', label: 'Något viktigt vi ska ta hänsyn till? (valfritt)',
      placeholder: 't.ex. tandborstning är det svåraste',
      optional: true,
    },
  ];

  const state = {
    enabled: false,
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

  function api(path, opts) {
    return window.apiFetch(path, opts);
  }

  function track(eventType, metadata) {
    api('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(function () {});
  }

  function trackQuestionAnswered(questionId) {
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
    if (label) label.textContent = 'Skapa schema ' + (state.qIndex + 1) + ' av ' + QUESTIONS.length;
  }

  function renderQuestion() {
    const container = document.getElementById('starterPlanQuestions');
    const preview = document.getElementById('starterPlanPreview');
    if (!container) return;
    if (preview) preview.classList.add('hidden');
    container.classList.remove('hidden');

    const q = QUESTIONS[state.qIndex];
    const html = [
      '<div class="text-center mb-6">',
      '  <div class="text-5xl mb-3">✨</div>',
      '  <h1 class="text-2xl font-heading font-bold text-navy mb-2">Skapa ert första schema</h1>',
      '  <p class="text-text-soft text-sm">Svarar på några frågor — tar under en minut.</p>',
      '</div>',
      '<label class="block font-semibold text-navy mb-2">' + esc(q.label) + '</label>',
    ];

    if (q.type === 'text') {
      html.push('<input type="text" id="spAnswer" class="form-input mb-4" maxlength="80" placeholder="' + esc(q.placeholder || '') + '" value="' + esc(state.answers[q.id] || '') + '">');
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
      html.push('<button type="button" id="spBack" class="px-5 py-3.5 bg-lavender text-navy font-semibold rounded-xl text-sm">← Tillbaka</button>');
    }
    html.push('<button type="button" id="spNext" class="flex-1 bg-gold hover:bg-gold-dark text-white font-semibold py-3.5 rounded-xl">' +
      (state.qIndex === QUESTIONS.length - 1 ? 'Visa schema →' : 'Nästa →') + '</button>');
    html.push('</div>');

    container.innerHTML = html.join('');

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
  }

  function readCurrentAnswer() {
    const q = QUESTIONS[state.qIndex];
    if (q.type === 'choice') return state.answers[q.id];
    const input = document.getElementById('spAnswer');
    return input ? input.value.trim() : '';
  }

  async function onQuestionNext() {
    hideError();
    const q = QUESTIONS[state.qIndex];
    const val = readCurrentAnswer();
    if (!val && !q.optional) {
      showError('Välj eller fyll i ett svar');
      return;
    }
    if (val) {
      state.answers[q.id] = val;
      trackQuestionAnswered(q.id);
    }

    if (state.qIndex < QUESTIONS.length - 1) {
      state.qIndex++;
      renderQuestion();
      showStarterStep();
      return;
    }

    await loadPreview();
  }

  async function loadPreview() {
    const btn = document.getElementById('spNext');
    if (btn) { btn.disabled = true; btn.textContent = 'Laddar…'; }

    try {
      track('activation_onboarding_started', { source: 'starter_plan_wizard' });

      const suggestBody = {
        age_band: state.answers.age_band,
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
      if (!suggestRes.ok) throw new Error(suggestData.error || 'Kunde inte välja mall');
      state.plan = suggestData;

      const lengthMap = { kort: 'short', normal: 'normal', detaljerad: 'detailed' };
      const desiredLength = lengthMap[state.answers.length_ui] || 'normal';

      const previewRes = await api(
        '/api/onboarding/starter-plan/preview?scheduleName=' + encodeURIComponent(suggestData.scheduleName) +
        '&desiredLength=' + encodeURIComponent(desiredLength)
      );
      const previewData = await previewRes.json();
      if (!previewRes.ok) throw new Error(previewData.error || 'Kunde inte ladda schema');

      state.previewItems = previewData.items || [];

      const personalizeBody = {
        child_name: state.answers.child_name || '',
        schedule_name: suggestData.scheduleName,
        base_items: state.previewItems,
        age_band: state.answers.age_band,
        routine_type_ui: state.answers.routine_type_ui,
        support_ui: state.answers.support_ui,
        length_ui: state.answers.length_ui,
        main_challenges: state.answers.main_challenge ? [state.answers.main_challenge] : [],
        free_text: state.answers.free_text || '',
      };

      if (state.flags.activation_ai_starter_plan) {
        if (btn) btn.textContent = 'Anpassar schema…';
        const persRes = await api('/api/onboarding/starter-plan/personalize', {
          method: 'POST',
          body: JSON.stringify(personalizeBody),
        });
        const persData = await persRes.json();
        if (!persRes.ok) throw new Error(persData.error || 'Kunde inte anpassa schema');
        state.previewItems = persData.items || state.previewItems;
        state.planTitle = persData.plan_title || suggestData.scheduleName;
        state.introText = persData.intro_text || '';
        state.usedAi = !!persData.used_ai;
        state.plan.used_ai = state.usedAi;
      } else {
        state.planTitle = suggestData.scheduleName;
        state.introText = '';
        state.usedAi = false;
      }

      renderPreview();
    } catch (err) {
      showError(err.message || 'Något gick fel');
      if (btn) { btn.disabled = false; btn.textContent = 'Visa schema →'; }
    }
  }

  function renderPreview() {
    const container = document.getElementById('starterPlanQuestions');
    const preview = document.getElementById('starterPlanPreview');
    if (!container || !preview) return;
    container.classList.add('hidden');
    preview.classList.remove('hidden');

    const childName = state.answers.child_name || 'Barnet';
    const title = state.planTitle || (state.plan && state.plan.scheduleName) || 'Ert schema';
    const html = [
      '<div class="text-center mb-4">',
      '  <div class="text-4xl mb-2">📋</div>',
      '  <h2 class="text-xl font-heading font-bold text-navy">' + esc(title) + '</h2>',
      '  <p class="text-text-soft text-sm">För ' + esc(childName) + ' · ' + state.previewItems.length + ' aktiviteter' +
        (state.usedAi ? ' · ✨ AI-anpassat' : '') + '</p>',
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
        '<button type="button" class="sp-remove text-text-soft text-xs" data-idx="' + idx + '">Ta bort</button></li>');
    });

    html.push('</ul>');
    html.push('<p class="text-xs text-text-soft mb-4">Du kan ta bort steg — lägg till fler i inställningar senare.</p>');
    html.push('<button type="button" id="spSavePlan" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3.5 rounded-xl mb-3">Använd detta schema →</button>');
    html.push('<button type="button" id="spBackToQuestions" class="w-full text-text-soft text-sm font-semibold">← Ändra svar</button>');

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
    if (btn) { btn.disabled = true; btn.textContent = 'Sparar…'; }

    const name = (state.answers.child_name || '').trim();
    if (!name) {
      showError('Ange barnets namn');
      if (btn) { btn.disabled = false; btn.textContent = 'Använd detta schema →'; }
      return;
    }

    try {
      const childRes = await api('/api/onboarding/child', {
        method: 'POST',
        body: JSON.stringify({ name: name, emoji: state.selectedEmoji }),
      });
      const childData = await childRes.json();
      if (!childRes.ok) throw new Error(childData.error || 'Kunde inte skapa barn');

      const schedRes = await api('/api/onboarding/schedule', {
        method: 'POST',
        body: JSON.stringify({
          child_id: childData.id,
          template_group: state.plan.template_group,
          custom_items: state.previewItems,
          // starter_plan_saved — server-side via schedule POST → activation schema_saved
          plan_edited_before_save: state.planEdited,
          activity_count: state.previewItems.length,
        }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error || 'Kunde inte spara schema');

      window.dispatchEvent(new CustomEvent('onboarding:child-created', {
        detail: {
          id: childData.id,
          name: childData.name,
          username: childData.username,
          pin: childData.pin,
          birthday: null,
        },
      }));

      if (typeof window.selectedDayPref !== 'undefined') {
        window.selectedDayPref = state.plan.template_group;
      }

      document.getElementById('stepStarterPlan').classList.remove('active');
      if (typeof window.goToStep === 'function') {
        // PR3: schema sparat → handoff (steg 5). Belöningar seedas vid registrering.
        window.goToStep(5);
      }
    } catch (err) {
      showError(err.message || 'Något gick fel');
      if (btn) { btn.disabled = false; btn.textContent = 'Använd detta schema →'; }
    }
  }

  function hideLegacyStep1() {
    const step1 = document.getElementById('step1');
    if (step1) step1.classList.add('hidden');
  }

  function isEnabled() {
    return state.enabled === true;
  }

  async function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;

    try {
      const res = await api('/api/family/activation-config');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.flags || !data.flags.activation_onboarding_v1) return;

      state.enabled = true;
      state.flags = data.flags || {};
      hideLegacyStep1();
      ensureCard();
      renderQuestion();
      showStarterStep();
      track('activation_onboarding_started', { source: 'onboarding_entry' });
    } catch (_) {}
  }

  window.OnboardingStarterPlan = { init: init, isEnabled: isEnabled };
})();
