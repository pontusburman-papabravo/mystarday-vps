/**
 * Preview shell — mock package UI + interest CTA (§6.6, §9.3, §9.8).
 * Reads /api/subscription/access — never duplicates rollout logic.
 */
(function (global) {
  'use strict';

  let accessCache = null;
  let previewDataCache = null;

  const PREVIEW_PAGE_PATHS = {
    reporting: '/reports',
    pedagog: '/samarbete',
    teacch: '/barn-stod',
  };

  function getCsrfToken() {
    const cached = localStorage.getItem('csrf_token');
    if (cached) return cached;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function trackEvent(eventType, metadata) {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
        credentials: 'include',
      });
    } catch (_) { /* silent */ }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadAccess(force) {
    if (accessCache && !force) return accessCache;
    if (global.fetchPackageAccess) {
      accessCache = await global.fetchPackageAccess(force);
      return accessCache;
    }
    const res = await fetch('/api/subscription/access', { credentials: 'include' });
    if (!res.ok) throw new Error('access_fetch_failed');
    accessCache = await res.json();
    return accessCache;
  }

  async function loadPreviewData(force) {
    if (previewDataCache && !force) return previewDataCache;
    const res = await fetch('/api/subscription/preview-data', { credentials: 'include' });
    if (!res.ok) throw new Error('preview_data_fetch_failed');
    previewDataCache = await res.json();
    return previewDataCache;
  }

  async function loadPublicPreviewData(force) {
    if (previewDataCache && !force) return previewDataCache;
    const res = await fetch('/api/public/preview-data');
    if (!res.ok) throw new Error('public_preview_data_fetch_failed');
    previewDataCache = await res.json();
    return previewDataCache;
  }

  function clearCache() {
    accessCache = null;
    previewDataCache = null;
    window._packageAccessPromise = null;
    window._packageAccess = null;
  }

  async function shouldShowPreview(component) {
    const access = await loadAccess();
    return !!(access.preview && access.preview[component]);
  }

  function getCtaConfig(access) {
    if (access.rollout_mode === 'interest') {
      return {
        action: 'interest',
        label: 'Jag är intresserad',
        sublabel: 'Anmäl intresse för kommande beta',
      };
    }
    if (access.rollout_mode === 'purchase' && access.purchase_enabled) {
      return {
        action: 'purchase',
        label: 'Köp nu',
        sublabel: null,
      };
    }
    return null;
  }

  function renderReportingBody(pkg) {
    const stats = (pkg.body.stats || []).map((s) => `
      <div class="preview-stat">
        <span class="preview-stat-value">${escapeHtml(s.value)}</span>
        <span class="preview-stat-label">${escapeHtml(s.label)}</span>
      </div>
    `).join('');

    const highlights = (pkg.body.highlights || []).map((h) => `
      <li>${escapeHtml(h)}</li>
    `).join('');

    return `
      <p class="preview-child-name">${escapeHtml(pkg.body.childName)}</p>
      <h3 class="preview-section-title">${escapeHtml(pkg.body.headline)}</h3>
      <div class="preview-stats">${stats}</div>
      <ul class="preview-highlights">${highlights}</ul>
    `;
  }

  function renderPedagogBody(pkg) {
    const sections = (pkg.body.sections || []).map((s) => `
      <span class="preview-chip">${escapeHtml(s)}</span>
    `).join('');

    return `
      <p class="preview-educator">${escapeHtml(pkg.body.educatorName)} · ${escapeHtml(pkg.body.educatorRole)}</p>
      <p class="preview-child-name">Barn: ${escapeHtml(pkg.body.childName)} (exempel)</p>
      <blockquote class="preview-quote">"${escapeHtml(pkg.body.notePreview)}"</blockquote>
      <div class="preview-chips">${sections}</div>
      <p class="preview-meta">${escapeHtml(pkg.body.statusLabel)}</p>
    `;
  }

  function renderTeacchBody(pkg) {
    const questions = (pkg.body.questions || []).map((q) => `
      <div class="preview-question">
        <span class="preview-question-emoji">${escapeHtml(q.emoji || '•')}</span>
        <div>
          <span class="preview-question-label">${escapeHtml(q.label)}</span>
          <span class="preview-question-value">${escapeHtml(q.value)}</span>
        </div>
      </div>
    `).join('');

    const features = (pkg.body.features || []).map((f) => `
      <span class="preview-chip">${escapeHtml(f)}</span>
    `).join('');

    return `
      <h3 class="preview-section-title">NU: ${escapeHtml(pkg.body.activityTitle)}</h3>
      <div class="preview-questions">${questions}</div>
      <div class="preview-chips">${features}</div>
    `;
  }

  function renderBody(component, pkg) {
    if (component === 'reporting') return renderReportingBody(pkg);
    if (component === 'pedagog') return renderPedagogBody(pkg);
    if (component === 'teacch') return renderTeacchBody(pkg);
    return '';
  }

  async function submitInterest(component, source) {
    const headers = { 'Content-Type': 'application/json' };
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;

    const res = await fetch('/api/subscription/interest', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ component, source }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'interest_failed');
    }
    return data;
  }

  async function handleCtaClick(component, source, access, btn, feedbackEl) {
    const cta = getCtaConfig(access);
    if (!cta) return;

    if (cta.action === 'interest') {
      btn.disabled = true;
      try {
        const result = await submitInterest(component, source);
        if (feedbackEl) {
          feedbackEl.textContent = result.message || 'Tack!';
          feedbackEl.hidden = false;
        }
        access.interest = access.interest || {};
        access.interest[component] = true;
        btn.textContent = 'Intresse registrerat ✓';
      } catch (err) {
        btn.disabled = false;
        if (feedbackEl) {
          feedbackEl.textContent = err.message || 'Något gick fel. Försök igen.';
          feedbackEl.hidden = false;
        }
      }
      return;
    }

    if (cta.action === 'purchase') {
      trackEvent('upgrade_from_preview', { component, source });
      if (global.IapManager && typeof global.IapManager.purchaseComponent === 'function') {
        global.IapManager.purchaseComponent(component);
      } else {
        window.location.href = '/upgrade?component=' + encodeURIComponent(component);
      }
    }
  }

  function getPreviewPagePath(component) {
    return PREVIEW_PAGE_PATHS[component] || null;
  }

  function renderGuestCtaArea(component, source) {
    return `
      <div class="preview-cta-area preview-guest-cta">
        <p class="preview-cta-sublabel">Få e-post när paketet släpps — ingen inloggning krävs.</p>
        <form class="preview-guest-form" data-component="${escapeHtml(component)}" data-source="${escapeHtml(source)}">
          <label class="sr-only" for="previewGuestEmail">E-post</label>
          <input type="email" id="previewGuestEmail" name="email" class="preview-guest-email" placeholder="din@email.se" required autocomplete="email">
          <button type="submit" class="preview-cta-btn">Håll mig uppdaterad</button>
        </form>
        <p class="preview-cta-feedback" hidden></p>
        <p class="preview-guest-login-hint">Har du redan konto? <a href="/login">Logga in</a> för att anmäla intresse i appen.</p>
      </div>
    `;
  }

  function wireGuestCtaForm(shell, component, source) {
    const form = shell.querySelector('.preview-guest-form');
    const feedbackEl = shell.querySelector('.preview-cta-feedback');
    if (!form || !global.PreviewGuest) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('.preview-guest-email');
      const btn = form.querySelector('.preview-cta-btn');
      const email = input ? input.value.trim() : '';
      if (!global.PreviewGuest.isValidEmail(email)) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Ange en giltig e-postadress.';
          feedbackEl.hidden = false;
        }
        return;
      }
      if (btn) btn.disabled = true;
      try {
        const result = await global.PreviewGuest.subscribe(email, { component, source });
        if (feedbackEl) {
          feedbackEl.textContent = result.message || 'Tack!';
          feedbackEl.hidden = false;
        }
        if (btn) btn.textContent = 'Tack! ✓';
      } catch (err) {
        if (btn) btn.disabled = false;
        if (feedbackEl) {
          feedbackEl.textContent = err.message || 'Något gick fel.';
          feedbackEl.hidden = false;
        }
      }
    });
  }

  async function mountPublicPreview(container, options) {
    const component = options.component;
    const source = options.source || 'landing_preview';
    const fullPage = options.fullPage !== false;
    const showBanner = options.showBanner !== false;
    const compact = !!options.compact;

    const previewData = await loadPublicPreviewData();
    const pkg = previewData[component];
    if (!pkg) return false;

    const shell = document.createElement('div');
    shell.className = 'preview-shell'
      + (fullPage ? ' preview-shell--full' : '')
      + (compact ? ' preview-shell--compact' : '');
    shell.setAttribute('data-preview-component', component);

    shell.innerHTML = `
      <div class="preview-shell-inner">
        ${showBanner ? `
        <div class="preview-banner">
          <span class="preview-badge">${escapeHtml(pkg.badge)}</span>
          <strong>${escapeHtml(pkg.name)}</strong>
          <p class="preview-tagline">${escapeHtml(pkg.tagline)}</p>
        </div>
        ` : ''}
        <div class="preview-mock preview-mock--watermarked" data-watermark="${escapeHtml(pkg.watermark)}">
          ${renderBody(component, pkg)}
        </div>
        ${renderGuestCtaArea(component, source)}
      </div>
    `;

    if (fullPage) {
      container.innerHTML = '';
    }
    container.appendChild(shell);
    wireGuestCtaForm(shell, component, source);
    return true;
  }

  async function mountPreviewShell(container, options) {
    const component = options.component;
    const source = options.source || 'contextual_trigger';
    const fullPage = options.fullPage !== false;
    const showCta = options.showCta !== false;
    const showBanner = options.showBanner !== false;
    const compact = !!options.compact;

    const [access, previewData] = await Promise.all([loadAccess(), loadPreviewData()]);
    if (!access.preview || !access.preview[component]) return false;

    const pkg = previewData[component];
    if (!pkg) return false;

    const cta = showCta ? getCtaConfig(access) : null;
    const alreadyInterested = !!(access.interest && access.interest[component]);

    trackEvent('preview_shown', { component, source });

    const shell = document.createElement('div');
    shell.className = 'preview-shell'
      + (fullPage ? ' preview-shell--full' : '')
      + (compact ? ' preview-shell--compact' : '');
    shell.setAttribute('data-preview-component', component);

    const ctaLabel = alreadyInterested && cta?.action === 'interest'
      ? 'Intresse registrerat ✓'
      : (cta?.label || '');

    shell.innerHTML = `
      <div class="preview-shell-inner">
        ${showBanner ? `
        <div class="preview-banner">
          <span class="preview-badge">${escapeHtml(pkg.badge)}</span>
          <strong>${escapeHtml(pkg.name)}</strong>
          <p class="preview-tagline">${escapeHtml(pkg.tagline)}</p>
        </div>
        ` : ''}
        <div class="preview-mock preview-mock--watermarked" data-watermark="${escapeHtml(pkg.watermark)}">
          ${renderBody(component, pkg)}
        </div>
        ${cta ? `
          <div class="preview-cta-area">
            <p class="preview-cta-feedback" hidden></p>
            <button type="button" class="preview-cta-btn" ${alreadyInterested && cta.action === 'interest' ? 'disabled' : ''}>
              ${escapeHtml(ctaLabel)}
            </button>
            ${cta.sublabel ? `<p class="preview-cta-sublabel">${escapeHtml(cta.sublabel)}</p>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    if (fullPage) {
      container.innerHTML = '';
    }
    container.appendChild(shell);

    const btn = shell.querySelector('.preview-cta-btn');
    const feedbackEl = shell.querySelector('.preview-cta-feedback');
    if (btn && cta) {
      btn.addEventListener('click', () => {
        handleCtaClick(component, source, access, btn, feedbackEl);
      });
    }

    return true;
  }

  async function takeOverPage(options) {
    const show = await shouldShowPreview(options.component);
    if (!show) return false;

    const target = options.container
      || document.getElementById('previewShellRoot')
      || document.querySelector('main')
      || document.body;

    const ok = await mountPreviewShell(target, options);
    if (ok && options.hideSelectors) {
      options.hideSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
      });
    }
    return ok;
  }

  async function takeOverPublicPage(options) {
    const target = options.container
      || document.getElementById('previewShellRoot')
      || document.querySelector('main')
      || document.body;

    const ok = await mountPublicPreview(target, options);
    if (!ok) return false;

    if (options.hideSelectors) {
      options.hideSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
      });
    }

    if (options.backLinkEl && global.PreviewBack) {
      global.PreviewBack.apply(options.backLinkEl);
    } else if (options.injectBackLink && global.PreviewBack) {
      const bar = document.createElement('nav');
      bar.className = 'preview-guest-nav';
      const href = global.PreviewBack.resolveBackHref();
      const label = global.PreviewBack.resolveBackLabel();
      bar.innerHTML = '<a href="' + escapeHtml(href) + '" class="preview-guest-back">' + escapeHtml(label) + '</a>';
      if (target.parentNode) {
        target.parentNode.insertBefore(bar, target);
      }
    }

    return true;
  }

  global.PreviewShell = {
    PREVIEW_PAGE_PATHS,
    loadAccess,
    loadPreviewData,
    loadPublicPreviewData,
    clearCache,
    shouldShowPreview,
    mountPreviewShell,
    mountPublicPreview,
    takeOverPage,
    takeOverPublicPage,
    getCtaConfig,
    getPreviewPagePath,
  };
})(window);
