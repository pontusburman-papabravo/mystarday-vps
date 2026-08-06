/**
 * Global feedback button + modal for [REDACTED].
 * Include this script on any parent page AFTER auth.js.
 * Injects a fixed-position feedback button and a modal form.
 * Submits to POST /api/feedback (types: 'bug' | 'feedback' | 'language').
 */
(function() {
  'use strict';

  if (typeof Auth === 'undefined') return;

  let mounted = false;

  function fb(key) {
    const fullKey = 'home.globalFeedback.' + key;
    if (typeof window.pt === 'function') {
      const v = window.pt(fullKey);
      if (v && v !== fullKey) return v;
    }
  }

  function fbOr(key, fallback) {
    return fb(key) || fallback;
  }

  async function initFeedback() {
    if (!Auth.isLoggedIn()) return;
    const user = Auth.getUser();
    if (user && (user.type === 'child' || (!user.email && user.username))) return;

    try {
      const resp = await fetch('/api/features', { credentials: 'include' });
      if (resp.ok) {
        const features = await resp.json();
        const slugs = features.map(function(f) { return f.slug; });
        if (!slugs.includes('feedback_formular')) return;
      }
    } catch (_) { /* non-critical — proceed with init */ }

    ensureMountedWhenI18nReady();
    document.addEventListener('parent-i18n-ready', ensureMountedWhenI18nReady);
    document.addEventListener('locale-changed', applyFeedbackCopy);
  }

  function ensureMountedWhenI18nReady() {
    if (mounted) {
      applyFeedbackCopy();
      return;
    }
    if (!window.I18n || typeof window.pt !== 'function') return;
    if (!Auth.isLoggedIn()) return;
    injectButton();
    injectModal();
    bindEvents();
    applyFeedbackCopy();
    mounted = true;
  }

  function injectButton() {
    if (document.getElementById('globalFeedbackBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'globalFeedbackBtn';
    btn.setAttribute('aria-label', fbOr('fabAria', 'Give feedback'));
    btn.title = fbOr('fabTitle', 'Give feedback');
    btn.innerHTML = '💬';
    btn.className = 'global-feedback-fab fixed z-40 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95';
    Object.assign(btn.style, {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: '#F5A623',
      color: '#fff',
      fontSize: '20px',
      border: 'none',
      cursor: 'pointer',
      lineHeight: '1',
    });
    document.body.appendChild(btn);
  }

  function injectModal() {
    if (document.getElementById('globalFeedbackModal')) return;
    const modal = document.createElement('div');
    modal.id = 'globalFeedbackModal';
    modal.className = 'hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
      <div class="bg-white dark:bg-navy-soft rounded-2xl p-6 w-full max-w-md shadow-2xl" style="max-width:28rem;">
        <div class="flex items-center justify-between mb-4">
          <h3 id="globalFeedbackModalTitle" class="text-lg font-heading font-bold text-navy dark:text-white" style="font-family:'Outfit',sans-serif;">💬 Give feedback</h3>
          <button id="globalFeedbackClose" type="button" class="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg transition-colors text-xl" style="line-height:1;" aria-label="Close">&times;</button>
        </div>
        <form id="globalFeedbackForm" class="space-y-4" style="display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <label style="flex:1;min-width:7rem;display:flex;align-items:center;gap:8px;cursor:pointer;padding:12px;border-radius:12px;border:2px solid #EDE7F6;">
              <input type="radio" name="globalFeedbackType" value="bug" checked style="accent-color:#F5A623;">
              <span id="globalFeedbackTypeBug" class="text-navy dark:text-white" style="font-weight:600;font-size:14px;">🐛 Report a problem</span>
            </label>
            <label style="flex:1;min-width:7rem;display:flex;align-items:center;gap:8px;cursor:pointer;padding:12px;border-radius:12px;border:2px solid #EDE7F6;">
              <input type="radio" name="globalFeedbackType" value="feedback" style="accent-color:#F5A623;">
              <span id="globalFeedbackTypeSuggestion" class="text-navy dark:text-white" style="font-weight:600;font-size:14px;">💡 Suggestion</span>
            </label>
            <label style="flex:1;min-width:7rem;display:flex;align-items:center;gap:8px;cursor:pointer;padding:12px;border-radius:12px;border:2px solid #EDE7F6;">
              <input type="radio" name="globalFeedbackType" value="language" style="accent-color:#F5A623;">
              <span id="globalFeedbackTypeLanguage" class="text-navy dark:text-white" style="font-weight:600;font-size:14px;">🌐 Language</span>
            </label>
          </div>
          <input type="text" id="globalFeedbackTitle" placeholder="Title" required maxlength="100"
            class="dark:bg-navy dark:text-white"
            style="width:100%;padding:12px 16px;border:2px solid #EDE7F6;border-radius:12px;font-size:14px;outline:none;transition:border-color 0.2s;color:#1B2340;"
            onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#EDE7F6'">
          <textarea id="globalFeedbackMessage" placeholder="What happened?" required rows="4"
            class="dark:bg-navy dark:text-white"
            style="width:100%;padding:12px 16px;border:2px solid #EDE7F6;border-radius:12px;font-size:14px;outline:none;transition:border-color 0.2s;resize:none;color:#1B2340;"
            onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#EDE7F6'"></textarea>
          <div id="globalFeedbackMsg" style="font-size:14px;min-height:1.2em;"></div>
          <div style="display:flex;gap:12px;">
            <button type="button" id="globalFeedbackCancel"
              style="flex:1;padding:12px;background:#EDE7F6;color:#1B2340;border:none;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:background 0.2s;"
              onmouseover="this.style.background='#E8F0FE'" onmouseout="this.style.background='#EDE7F6'">Cancel</button>
            <button type="submit" id="globalFeedbackSubmit"
              style="flex:1;padding:12px;background:#F5A623;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:background 0.2s;font-family:'Outfit',sans-serif;"
              onmouseover="this.style.background='#e09500'" onmouseout="this.style.background='#F5A623'">Send report</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function applyFeedbackCopy() {
    const btn = document.getElementById('globalFeedbackBtn');
    if (btn) {
      btn.setAttribute('aria-label', fbOr('fabAria', 'Give feedback'));
      btn.title = fbOr('fabTitle', 'Give feedback');
    }
    const title = document.getElementById('globalFeedbackModalTitle');
    if (title) title.textContent = '💬 ' + fbOr('modalTitle', 'Give feedback');
    const bug = document.getElementById('globalFeedbackTypeBug');
    if (bug) bug.textContent = '🐛 ' + fbOr('typeBug', 'Report a problem');
    const sug = document.getElementById('globalFeedbackTypeSuggestion');
    if (sug) sug.textContent = '💡 ' + fbOr('typeSuggestion', 'Suggestion');
    const lang = document.getElementById('globalFeedbackTypeLanguage');
    if (lang) lang.textContent = '🌐 ' + fbOr('typeLanguage', 'Language');
    const titleInput = document.getElementById('globalFeedbackTitle');
    if (titleInput) titleInput.placeholder = fbOr('titlePlaceholder', 'Title');
    const msgInput = document.getElementById('globalFeedbackMessage');
    if (msgInput) msgInput.placeholder = fbOr('messagePlaceholder', 'What happened?');
    const cancel = document.getElementById('globalFeedbackCancel');
    if (cancel) cancel.textContent = fbOr('cancel', 'Cancel');
    const submit = document.getElementById('globalFeedbackSubmit');
    if (submit && !submit.disabled) submit.textContent = fbOr('submit', 'Send report');
  }

  function buildFeedbackMetadata() {
    const locale = (window.I18n && I18n.getCurrentLang) ? I18n.getCurrentLang() : 'sv-SE';
    return {
      locale,
      route: location.pathname,
      platform: (window.Platform && Platform.isNative && Platform.isNative()) ? 'native' : 'web',
      app_version: document.querySelector('meta[name="app-version"]')?.content || '',
      sw_version: (window.__SW_CACHE_NAME || ''),
      user_agent: navigator.userAgent.slice(0, 200),
      timestamp: new Date().toISOString(),
    };
  }

  function trackLanguageReport(eventType) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, { locale: I18n?.getCurrentLang?.() || 'sv-SE', route: location.pathname });
    }
  }

  function bindEvents() {
    const btn = document.getElementById('globalFeedbackBtn');
    const modal = document.getElementById('globalFeedbackModal');
    const closeBtn = document.getElementById('globalFeedbackClose');
    const cancelBtn = document.getElementById('globalFeedbackCancel');
    const form = document.getElementById('globalFeedbackForm');

    if (!btn || !modal || !form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    btn.addEventListener('click', function() { openModal(); });
    closeBtn.addEventListener('click', function() { closeModal(); });
    cancelBtn.addEventListener('click', function() { closeModal(); });

    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('globalFeedbackSubmit');
      const msgEl = document.getElementById('globalFeedbackMsg');
      const type = (document.querySelector('input[name="globalFeedbackType"]:checked') || {}).value || 'bug';
      const title = document.getElementById('globalFeedbackTitle').value.trim();
      const message = document.getElementById('globalFeedbackMessage').value.trim();

      if (!title || !message) {
        msgEl.textContent = fbOr('validationRequired', 'Please fill in all fields.');
        msgEl.style.color = '#ef4444';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = fbOr('submitting', 'Sending...');
      submitBtn.style.opacity = '0.7';

      try {
        const data = await Auth.api('/api/feedback', {
          method: 'POST',
          body: JSON.stringify({
            type: type,
            title: title,
            message: message,
            metadata: buildFeedbackMetadata(),
          }),
        });
        if (type === 'language') trackLanguageReport('language_issue_report_submitted');
        msgEl.textContent = data.message || fbOr('success', 'Your report has been sent.');
        msgEl.style.color = '#16a34a';
        setTimeout(function() { closeModal(); }, 2000);
      } catch (err) {
        msgEl.textContent = err.message || fbOr('errorGeneric', 'Something went wrong. Please try again.');
        msgEl.style.color = '#ef4444';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = fbOr('submit', 'Send report');
      submitBtn.style.opacity = '1';
    });
  }

  function openModal(presetType) {
    const modal = document.getElementById('globalFeedbackModal');
    if (!modal) return;
    applyFeedbackCopy();
    modal.classList.remove('hidden');
    document.getElementById('globalFeedbackMsg').textContent = '';
    document.getElementById('globalFeedbackMsg').style.color = '';
    document.getElementById('globalFeedbackTitle').value = '';
    document.getElementById('globalFeedbackMessage').value = '';
    const type = presetType || 'bug';
    const radio = document.querySelector(`input[name="globalFeedbackType"][value="${type}"]`);
    if (radio) radio.checked = true;
    if (type === 'language') trackLanguageReport('language_issue_report_opened');
    setTimeout(function() {
      document.getElementById('globalFeedbackTitle').focus();
    }, 100);
  }

  function closeModal() {
    const modal = document.getElementById('globalFeedbackModal');
    if (modal) modal.classList.add('hidden');
  }

  window.openFeedbackModal = function(presetType) { openModal(presetType); };
  window.openLanguageFeedbackModal = function() { openModal('language'); };
  window.closeFeedbackModal = function() { closeModal(); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedback);
  } else {
    initFeedback();
  }
})();
