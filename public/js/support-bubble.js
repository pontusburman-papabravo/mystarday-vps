/**
 * Support Chat Bubble for logged-out pages.
 * Renders a floating bubble (bottom-right) that opens a contact form.
 * Messages are sent to POST /api/contact and stored in the admin inbox.
 *
 * Usage: Include <script src="/js/support-bubble.js"></script> on any page.
 */
(function () {
  'use strict';

  if (document.getElementById('supportBubbleRoot')) return;

  function t(key, params) {
    if (typeof window.authT === 'function') return window.authT(key, params);
    if (window.I18n && typeof I18n.t === 'function') {
      return I18n.t(key, params || {});
    }
    return key;
  }

  // Keep FROM/THROUGH in sync with config/support-ooo.js
  var SUPPORT_OOO_FROM = '2026-09-01';
  var SUPPORT_OOO_THROUGH = '2026-09-11';

  function supportOooPreviewForced() {
    try {
      return new URLSearchParams(window.location.search || '').get('support_ooo') === 'preview';
    } catch (_) {
      return false;
    }
  }

  function isSupportOooActive(now) {
    if (window.SupportOoo && typeof window.SupportOoo.isActive === 'function') {
      return window.SupportOoo.isActive(now);
    }
    if (supportOooPreviewForced()) return true;
    var date = now instanceof Date ? now : new Date();
    var stamp = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return stamp >= SUPPORT_OOO_FROM && stamp <= SUPPORT_OOO_THROUGH;
  }

  // ─── Styles ────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #supportBubbleRoot {
      position: fixed;
      bottom: 24px;
      right: 24px;
      /* Below modal overlays (z-50) so the bubble never covers modal CTAs */
      z-index: 40;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .sb-trigger {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F5A623, #e6951a);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(245, 166, 35, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .sb-trigger:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(245, 166, 35, 0.5);
    }
    .sb-trigger:active { transform: scale(0.95); }
    .sb-trigger svg { width: 26px; height: 26px; fill: white; }

    .sb-panel {
      display: none;
      position: absolute;
      bottom: 68px;
      right: 0;
      width: 340px;
      max-width: calc(100vw - 32px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(27, 35, 64, 0.15);
      overflow: hidden;
      animation: sbSlideUp 0.25s ease-out;
    }
    .sb-panel.open { display: block; }

    @keyframes sbSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sb-header {
      background: #1B2340;
      color: white;
      padding: 16px 20px;
    }
    .sb-header h3 {
      margin: 0;
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
    }
    .sb-header p {
      margin: 4px 0 0;
      font-size: 13px;
      opacity: 0.7;
    }

    .sb-body {
      padding: 16px 20px 20px;
    }

    .sb-field {
      margin-bottom: 12px;
    }
    .sb-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1B2340;
      margin-bottom: 4px;
    }
    .sb-field input,
    .sb-field textarea {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #E8F0FE;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      color: #1B2340;
      background: #FAFBFF;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .sb-field input:focus,
    .sb-field textarea:focus {
      outline: none;
      border-color: #F5A623;
    }
    .sb-field textarea {
      resize: vertical;
      min-height: 80px;
    }

    .sb-submit {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #F5A623, #e6951a);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .sb-submit:hover { opacity: 0.9; }
    .sb-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sb-alert {
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 12px;
      display: none;
    }
    .sb-alert.success {
      background: #E0F5EC;
      border: 1px solid #22C55E;
      color: #166534;
    }
    .sb-alert.error {
      background: #FDEAE7;
      border: 1px solid #EF4444;
      color: #991B1B;
    }
    .sb-alert a {
      color: inherit;
      font-weight: 600;
      text-decoration: underline;
    }

    .sb-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: white;
      opacity: 0.7;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 4px;
    }
    .sb-close:hover { opacity: 1; }

    .sb-email-hint {
      font-size: 11px;
      color: #5A6178;
      margin-top: 2px;
    }

    @media (max-width: 400px) {
      .sb-panel {
        width: calc(100vw - 16px);
        right: -16px;
        bottom: 64px;
      }
      #supportBubbleRoot {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  function buildPanelHtml() {
    return `
    <div class="sb-panel" id="sbPanel">
      <button class="sb-close" id="sbClose" type="button" aria-label=""></button>
      <div class="sb-header">
        <h3 id="sbTitle"></h3>
        <p id="sbSubtitle"></p>
      </div>
      <div class="sb-body">
        <div class="sb-alert success" id="sbSuccess"></div>
        <div class="sb-alert error" id="sbError"></div>
        <form id="sbForm">
          <div class="sb-field">
            <label for="sbName" id="sbNameLabel"></label>
            <input type="text" id="sbName" required>
          </div>
          <div class="sb-field">
            <label for="sbEmail" id="sbEmailLabel"></label>
            <input type="email" id="sbEmail" required>
            <p class="sb-email-hint" id="sbEmailHint"></p>
          </div>
          <div class="sb-field">
            <label for="sbMessage" id="sbMessageLabel"></label>
            <textarea id="sbMessage" required></textarea>
          </div>
          <button type="submit" class="sb-submit" id="sbSubmit"></button>
        </form>
      </div>
    </div>
    <button class="sb-trigger" id="sbTrigger" type="button" aria-label="">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    </button>`;
  }

  function applyStrings() {
    const closeBtn = document.getElementById('sbClose');
    const trigger = document.getElementById('sbTrigger');
    const submitBtn = document.getElementById('sbSubmit');
    if (!closeBtn || !trigger) return;

    closeBtn.setAttribute('aria-label', t('auth.supportBubble.closeAria'));
    trigger.setAttribute('aria-label', t('auth.supportBubble.triggerAria'));

    const title = document.getElementById('sbTitle');
    const subtitle = document.getElementById('sbSubtitle');
    if (title) title.textContent = t('auth.supportBubble.title');
    if (subtitle) {
      subtitle.textContent = isSupportOooActive()
        ? t('auth.supportBubble.oooSubtitle')
        : t('auth.supportBubble.subtitle');
    }

    const successEl = document.getElementById('sbSuccess');
    if (successEl) {
      successEl.textContent = isSupportOooActive()
        ? t('auth.supportBubble.oooSuccess')
        : t('auth.supportBubble.success');
    }

    const nameLabel = document.getElementById('sbNameLabel');
    const emailLabel = document.getElementById('sbEmailLabel');
    const emailHint = document.getElementById('sbEmailHint');
    const messageLabel = document.getElementById('sbMessageLabel');
    const nameInput = document.getElementById('sbName');
    const emailInput = document.getElementById('sbEmail');
    const messageInput = document.getElementById('sbMessage');

    if (nameLabel) nameLabel.textContent = t('auth.supportBubble.nameLabel');
    if (emailLabel) emailLabel.textContent = t('auth.supportBubble.emailLabel');
    if (emailHint) emailHint.textContent = t('auth.supportBubble.emailHint');
    if (messageLabel) messageLabel.textContent = t('auth.supportBubble.messageLabel');
    if (nameInput) nameInput.placeholder = t('auth.supportBubble.namePlaceholder');
    if (emailInput) emailInput.placeholder = t('auth.supportBubble.emailPlaceholder');
    if (messageInput) messageInput.placeholder = t('auth.supportBubble.messagePlaceholder');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.textContent = t('auth.supportBubble.submit');
    }
  }

  let wired = false;

  function wireLogic() {
    if (wired) return;
    wired = true;

    const trigger = document.getElementById('sbTrigger');
    const panel = document.getElementById('sbPanel');
    const closeBtn = document.getElementById('sbClose');
    const form = document.getElementById('sbForm');
    const submitBtn = document.getElementById('sbSubmit');
    const successEl = document.getElementById('sbSuccess');
    const errorEl = document.getElementById('sbError');
    const root = document.getElementById('supportBubbleRoot');

    function togglePanel() {
      panel.classList.toggle('open');
    }

    trigger.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', function () {
      panel.classList.remove('open');
    });

    document.addEventListener('click', function (e) {
      if (!root.contains(e.target) && panel.classList.contains('open')) {
        panel.classList.remove('open');
      }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      successEl.style.display = 'none';
      errorEl.style.display = 'none';

      const name = document.getElementById('sbName').value.trim();
      const email = document.getElementById('sbEmail').value.trim();
      const message = document.getElementById('sbMessage').value.trim();

      if (!name || !email || !message) {
        errorEl.textContent = t('auth.supportBubble.fillAllFields');
        errorEl.style.display = 'block';
        return;
      }
      if (message.length < 10) {
        errorEl.textContent = t('auth.supportBubble.messageMinLength');
        errorEl.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.supportBubble.submitting');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            email: email,
            message: message,
            locale: (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'sv',
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || t('auth.supportBubble.genericError'));
        }

        successEl.textContent = isSupportOooActive()
          ? t('auth.supportBubble.oooSuccess')
          : t('auth.supportBubble.success');
        const threadPath = typeof data.threadUrl === 'string' && data.threadUrl.indexOf('/support/svar/sf1.') === 0
          ? data.threadUrl
          : '';
        if (threadPath) {
          successEl.appendChild(document.createTextNode(' '));
          const link = document.createElement('a');
          link.href = threadPath;
          link.textContent = t('auth.supportBubble.openThread');
          successEl.appendChild(link);
        }
        successEl.style.display = 'block';
        form.reset();
      } catch (err) {
        errorEl.textContent = err.message || t('auth.supportBubble.sendFailed');
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = t('auth.supportBubble.submit');
      }
    });
  }

  async function ensureI18n() {
    if (!window.I18n) return;
    if (Object.keys(I18n.locale || {}).length > 0) return;
    try {
      await I18n.init();
    } catch (_) { /* fall back to keys */ }
  }

  async function mount() {
    await ensureI18n();

    const root = document.createElement('div');
    root.id = 'supportBubbleRoot';
    root.innerHTML = buildPanelHtml();
    document.body.appendChild(root);

    applyStrings();
    wireLogic();

    document.addEventListener('locale-changed', applyStrings);
  }

  function scheduleMount() {
    mount().catch(function (err) {
      console.warn('[support-bubble] mount failed:', err);
      if (!document.getElementById('supportBubbleRoot')) {
        const root = document.createElement('div');
        root.id = 'supportBubbleRoot';
        root.innerHTML = buildPanelHtml();
        document.body.appendChild(root);
        applyStrings();
        wireLogic();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMount);
  } else {
    scheduleMount();
  }
})();
