/**
 * Dashboard activation program banner (onboarding_7d, treatment only).
 */

(function () {
  const BANNER_ID = 'activationProgramBanner';

  function ensureBanner() {
    let el = document.getElementById(BANNER_ID);
    if (el) return el;

    const anchor = document.getElementById('dagensNyhetAppBanner');
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.className = 'hidden mx-4 mt-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-4';
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(el, anchor);
    } else {
      const main = document.querySelector('main') || document.body;
      main.prepend(el);
    }
    return el;
  }

  function renderPreview(preview) {
    if (!preview || !preview.activities || !preview.activities.length) {
      return '<p class="text-xs text-indigo-600 mt-2">Öppna barninloggningen för att se schemat.</p>';
    }
    const items = preview.activities.map((a) => {
      const icon = a.completed ? '✅' : '⭐';
      return `<li class="flex items-center gap-2 text-sm text-indigo-900"><span>${icon}</span><span>${escapeHtml(a.name)}</span></li>`;
    }).join('');
    return `<ul class="mt-3 space-y-1 bg-white/60 rounded-lg p-3">${items}</ul>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderReflection(data) {
    return `
      <div class="mt-3" id="activationReflectionForm">
        <p class="text-sm font-medium text-indigo-900 mb-2">Har appen gjort vardagen enklare?</p>
        <div class="flex justify-center gap-2 mb-3" id="activationReflectionScores">
          ${[1, 2, 3, 4, 5].map((n) => `
            <button type="button" data-score="${n}"
              class="activation-reflection-score w-10 h-10 rounded-full border-2 border-indigo-300 text-indigo-800 font-bold hover:bg-indigo-100">${n}</button>
          `).join('')}
        </div>
        <textarea id="activationReflectionText" rows="2" maxlength="500" placeholder="Valfritt: berätta mer…"
          class="w-full text-sm rounded-lg border border-indigo-200 p-2 mb-2"></textarea>
        <button type="button" id="activationReflectionSubmit"
          class="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm disabled:opacity-40" disabled>
          Skicka
        </button>
      </div>`;
  }

  let _selectedScore = null;

  function bindReflectionHandlers(data) {
    const scores = document.querySelectorAll('.activation-reflection-score');
    const submitBtn = document.getElementById('activationReflectionSubmit');
    scores.forEach((btn) => {
      btn.addEventListener('click', () => {
        _selectedScore = parseInt(btn.dataset.score, 10);
        scores.forEach((b) => b.classList.remove('bg-indigo-600', 'text-white'));
        btn.classList.add('bg-indigo-600', 'text-white');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!_selectedScore) return;
        const text = document.getElementById('activationReflectionText')?.value || '';
        submitBtn.disabled = true;
        try {
          const res = await window.apiFetch('/api/me/activation-program/reflection', {
            method: 'POST',
            body: JSON.stringify({ score: _selectedScore, text }),
          });
          if (res.ok) {
            const banner = document.getElementById(BANNER_ID);
            if (banner) banner.classList.add('hidden');
          }
        } catch (_) {}
      });
    }
  }

  async function handleCta(data) {
    const content = data.content || {};
    const day = data.effective_day;
    const preview = data.preview;

    await window.apiFetch('/api/me/activation-program/cta-clicked', {
      method: 'POST',
      body: JSON.stringify({
        day,
        cta_type: content.cta_type,
        destination: content.cta_url || null,
        child_id: preview?.child_id || null,
        source: 'day1_preview',
      }),
    });

    if (content.cta_type === 'open_child_view' && preview?.child_id) {
      return;
    }
    if (content.cta_type === 'submit_reflection') {
      document.getElementById('activationReflectionForm')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (content.cta_url) {
      window.location.href = content.cta_url;
    }
  }

  async function handleSolo() {
    await window.apiFetch('/api/me/activation-program/solo-day', { method: 'POST' });
    await load();
  }

  async function handleSkip() {
    await window.apiFetch('/api/me/activation-program/skip-day', { method: 'POST' });
    await load();
  }

  async function handleOptOut() {
    if (!confirm('Vill du avsluta 7-dagarsprogrammet?')) return;
    await window.apiFetch('/api/me/activation-program/opt-out', { method: 'POST' });
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.classList.add('hidden');
  }

  function render(data) {
    const banner = ensureBanner();
    if (!data || !data.active) {
      banner.classList.add('hidden');
      return;
    }

    const content = data.content || {};
    const day = data.effective_day;
    const total = 7;
    const advancedClass = data.day_advanced ? ' activation-day-advanced' : '';

    let previewHtml = '';
    if (content.show_preview && data.preview) {
      previewHtml = renderPreview(data.preview);
    }

    let reflectionHtml = '';
    if (data.show_reflection && !data.reflection_score) {
      reflectionHtml = renderReflection(data);
    }

    const soloBtn = day === 6 && content.solo_label
      ? `<button type="button" id="activationSoloBtn" class="text-xs text-indigo-600 underline">${content.solo_label}</button>`
      : '';

    banner.className = `mx-4 mt-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-4${advancedClass}`;
    banner.innerHTML = `
      <div class="flex items-start justify-between gap-2 mb-1">
        <p class="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Dag ${day} av ${total}</p>
        <button type="button" id="activationOptOutBtn" class="text-indigo-400 hover:text-indigo-700 text-lg leading-none" title="Avsluta program">✕</button>
      </div>
      <h2 class="font-heading font-bold text-indigo-900 text-base mb-1">${escapeHtml(content.title || '')}</h2>
      <p class="text-sm text-indigo-800 leading-relaxed">${escapeHtml(content.body || '')}</p>
      ${previewHtml}
      ${reflectionHtml}
      <div class="flex flex-wrap items-center gap-3 mt-4">
        ${content.cta_label && !data.show_reflection ? `
          <button type="button" id="activationCtaBtn"
            class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            ${escapeHtml(content.cta_label)}
          </button>` : ''}
        ${soloBtn}
        <button type="button" id="activationSkipBtn" class="text-xs text-indigo-500 underline">Hoppa över idag</button>
      </div>
      ${content.cta_type === 'open_child_view' && data.preview ? `
        <p class="mt-2 text-xs text-indigo-500">
          <a href="/child-login" class="underline">Eller öppna barninloggningen</a>
        </p>` : ''}
    `;

    banner.classList.remove('hidden');

    document.getElementById('activationCtaBtn')?.addEventListener('click', () => handleCta(data));
    document.getElementById('activationSkipBtn')?.addEventListener('click', handleSkip);
    document.getElementById('activationOptOutBtn')?.addEventListener('click', handleOptOut);
    document.getElementById('activationSoloBtn')?.addEventListener('click', handleSolo);

    if (data.show_reflection && !data.reflection_score) {
      bindReflectionHandlers(data);
    }

    if (window.ActivationProgramAha && data.aha_moments?.length) {
      window.ActivationProgramAha.enqueue(data.aha_moments);
    }
  }

  async function load() {
    try {
      const res = await window.apiFetch('/api/me/activation-program');
      if (!res.ok) return;
      const data = await res.json();
      render(data);
    } catch (_) {}
  }

  async function init() {
    if (!window.apiFetch) return;
    await load();
  }

  window.ActivationProgramBanner = { init, load };
})();
