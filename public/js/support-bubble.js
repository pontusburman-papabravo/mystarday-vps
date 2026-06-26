/**
 * Support Chat Bubble for logged-out pages.
 * Renders a floating bubble (bottom-right) that opens a contact form.
 * Messages are sent to POST /api/contact and stored in the admin inbox.
 *
 * Usage: Include <script src="/js/support-bubble.js"></script> on any page.
 */
(function () {
  'use strict';

  // Don't render if already present
  if (document.getElementById('supportBubbleRoot')) return;

  // ─── Styles ────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #supportBubbleRoot {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
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

  // ─── HTML ──────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'supportBubbleRoot';
  root.innerHTML = `
    <div class="sb-panel" id="sbPanel">
      <button class="sb-close" id="sbClose" aria-label="Stäng">&times;</button>
      <div class="sb-header">
        <h3>Behöver du hjälp? 💬</h3>
        <p>Vi svarar så snart vi kan</p>
      </div>
      <div class="sb-body">
        <div class="sb-alert success" id="sbSuccess">Tack! Vi har tagit emot ditt meddelande och återkommer snart.</div>
        <div class="sb-alert error" id="sbError"></div>
        <form id="sbForm">
          <div class="sb-field">
            <label for="sbName">Namn</label>
            <input type="text" id="sbName" placeholder="Ditt namn" required>
          </div>
          <div class="sb-field">
            <label for="sbEmail">E-post</label>
            <input type="email" id="sbEmail" placeholder="din@epost.se" required>
            <p class="sb-email-hint">Så vi kan svara dig</p>
          </div>
          <div class="sb-field">
            <label for="sbMessage">Meddelande</label>
            <textarea id="sbMessage" placeholder="Beskriv ditt ärende..." required></textarea>
          </div>
          <button type="submit" class="sb-submit" id="sbSubmit">Skicka meddelande</button>
        </form>
      </div>
    </div>
    <button class="sb-trigger" id="sbTrigger" aria-label="Kontakta support">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    </button>
  `;
  document.body.appendChild(root);

  // ─── Logic ─────────────────────────────────────────────────
  const trigger = document.getElementById('sbTrigger');
  const panel = document.getElementById('sbPanel');
  const closeBtn = document.getElementById('sbClose');
  const form = document.getElementById('sbForm');
  const submitBtn = document.getElementById('sbSubmit');
  const successEl = document.getElementById('sbSuccess');
  const errorEl = document.getElementById('sbError');

  function togglePanel() {
    panel.classList.toggle('open');
  }

  trigger.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', function () {
    panel.classList.remove('open');
  });

  // Close on outside click
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
      errorEl.textContent = 'Fyll i alla fält';
      errorEl.style.display = 'block';
      return;
    }
    if (message.length < 10) {
      errorEl.textContent = 'Meddelandet måste vara minst 10 tecken';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Skickar...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, message: message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Något gick fel');
      }

      successEl.style.display = 'block';
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message || 'Kunde inte skicka meddelandet. Försök igen.';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Skicka meddelande';
    }
  });
})();
