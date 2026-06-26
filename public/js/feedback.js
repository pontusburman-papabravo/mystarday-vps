/**
 * Global feedback button + modal for Min Stjärndag.
 * Include this script on any parent page AFTER auth.js.
 * Injects a fixed-position feedback button (top-right) and a modal form.
 * Submits to POST /api/feedback (types: 'bug' | 'feedback').
 */
(function() {
  'use strict';

  // Only init when the page is loaded and user is authenticated
  if (typeof Auth === 'undefined') return;

  // Gate 2H: feedback_formular — only init if feature is available.
  async function initFeedback() {
    if (!Auth.isLoggedIn()) return;
    const user = Auth.getUser();
    if (user && (user.type === 'child' || (!user.email && user.username))) return;

    // Async feature check — skip if feedback_formular is not available.
    // If the check fails (non-critical), init anyway.
    try {
      const resp = await fetch('/api/features', { credentials: 'include' });
      if (resp.ok) {
        const features = await resp.json();
        const slugs = features.map(function(f) { return f.slug; });
        if (!slugs.includes('feedback_formular')) return;
      }
    } catch (_) { /* non-critical — proceed with init */ }

    injectButton();
    injectModal();
    bindEvents();
  }

  function injectButton() {
    const btn = document.createElement('button');
    btn.id = 'globalFeedbackBtn';
    btn.setAttribute('aria-label', 'Ge feedback');
    btn.title = 'Ge feedback';
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
    const modal = document.createElement('div');
    modal.id = 'globalFeedbackModal';
    modal.className = 'hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
      <div class="bg-white dark:bg-navy-soft rounded-2xl p-6 w-full max-w-md shadow-2xl" style="max-width:28rem;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-heading font-bold text-navy dark:text-white" style="font-family:'Outfit',sans-serif;">💬 Ge feedback</h3>
          <button id="globalFeedbackClose" class="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg transition-colors text-xl" style="line-height:1;">&times;</button>
        </div>
        <form id="globalFeedbackForm" class="space-y-4" style="display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;gap:12px;">
            <label style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;padding:12px;border-radius:12px;border:2px solid #EDE7F6;transition:border-color 0.2s;">
              <input type="radio" name="globalFeedbackType" value="bug" checked style="accent-color:#F5A623;">
              <span class="text-navy dark:text-white" style="font-weight:600;font-size:14px;">🐛 Problem</span>
            </label>
            <label style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;padding:12px;border-radius:12px;border:2px solid #EDE7F6;transition:border-color 0.2s;">
              <input type="radio" name="globalFeedbackType" value="feedback" style="accent-color:#F5A623;">
              <span class="text-navy dark:text-white" style="font-weight:600;font-size:14px;">💡 Förslag</span>
            </label>
          </div>
          <input type="text" id="globalFeedbackTitle" placeholder="Rubrik" required maxlength="100"
            class="dark:bg-navy dark:text-white"
            style="width:100%;padding:12px 16px;border:2px solid #EDE7F6;border-radius:12px;font-size:14px;outline:none;transition:border-color 0.2s;color:#1B2340;"
            onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#EDE7F6'">
          <textarea id="globalFeedbackMessage" placeholder="Beskriv problemet eller förbättringsförslaget..." required rows="4"
            class="dark:bg-navy dark:text-white"
            style="width:100%;padding:12px 16px;border:2px solid #EDE7F6;border-radius:12px;font-size:14px;outline:none;transition:border-color 0.2s;resize:none;color:#1B2340;"
            onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#EDE7F6'"></textarea>
          <div id="globalFeedbackMsg" style="font-size:14px;min-height:1.2em;"></div>
          <div style="display:flex;gap:12px;">
            <button type="button" id="globalFeedbackCancel"
              style="flex:1;padding:12px;background:#EDE7F6;color:#1B2340;border:none;border-radius:12px;font-weight:600;font-size:14px;cursor:pointer;transition:background 0.2s;"
              onmouseover="this.style.background='#E8F0FE'" onmouseout="this.style.background='#EDE7F6'">Avbryt</button>
            <button type="submit" id="globalFeedbackSubmit"
              style="flex:1;padding:12px;background:#F5A623;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:background 0.2s;font-family:'Outfit',sans-serif;"
              onmouseover="this.style.background='#e09500'" onmouseout="this.style.background='#F5A623'">Skicka</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function bindEvents() {
    const btn = document.getElementById('globalFeedbackBtn');
    const modal = document.getElementById('globalFeedbackModal');
    const closeBtn = document.getElementById('globalFeedbackClose');
    const cancelBtn = document.getElementById('globalFeedbackCancel');
    const form = document.getElementById('globalFeedbackForm');

    if (!btn || !modal || !form) return;

    btn.addEventListener('click', function() { openModal(); });
    closeBtn.addEventListener('click', function() { closeModal(); });
    cancelBtn.addEventListener('click', function() { closeModal(); });

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });

    // Close on Escape
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
        msgEl.textContent = 'Fyll i alla fält.';
        msgEl.style.color = '#ef4444';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Skickar...';
      submitBtn.style.opacity = '0.7';

      try {
        const data = await Auth.api('/api/feedback', {
          method: 'POST',
          body: JSON.stringify({ type: type, title: title, message: message })
        });
        msgEl.textContent = data.message || 'Tack för din feedback!';
        msgEl.style.color = '#16a34a';
        setTimeout(function() { closeModal(); }, 2000);
      } catch (err) {
        msgEl.textContent = err.message || 'Något gick fel. Försök igen.';
        msgEl.style.color = '#ef4444';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Skicka';
      submitBtn.style.opacity = '1';
    });
  }

  function openModal() {
    const modal = document.getElementById('globalFeedbackModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.getElementById('globalFeedbackMsg').textContent = '';
    document.getElementById('globalFeedbackMsg').style.color = '';
    document.getElementById('globalFeedbackTitle').value = '';
    document.getElementById('globalFeedbackMessage').value = '';
    // Reset radio to bug
    const bugRadio = document.querySelector('input[name="globalFeedbackType"][value="bug"]');
    if (bugRadio) bugRadio.checked = true;
    // Focus the title field
    setTimeout(function() {
      document.getElementById('globalFeedbackTitle').focus();
    }, 100);
  }

  function closeModal() {
    const modal = document.getElementById('globalFeedbackModal');
    if (modal) modal.classList.add('hidden');
  }

  // Expose for any inline onclick handlers that might still exist
  window.openFeedbackModal = function() { openModal(); };
  window.closeFeedbackModal = function() { closeModal(); };

  // Init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedback);
  } else {
    initFeedback();
  }
})();
