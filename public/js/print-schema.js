/**
 * print-schema.js — Print schema picker (child + period + preview).
 */
(function () {
  'use strict';

  let children = [];
  let currentChildId = null;
  let periodKey = '1w';
  let scope = 'all';
  let weekOffset = 0;
  let custodyEnabled = false;

  function t(key, params) {
    if (typeof window.pt === 'function') return window.pt(key, params);
    return key;
  }

  function tGet(key) {
    if (window.I18n && typeof I18n.get === 'function') return I18n.get(key);
    return undefined;
  }

  function showToast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  function trackExport(meta) {
    meta.source = 'print_schema_page';
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track('print_schema_exported', meta);
    } else {
      apiFetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({ event_type: 'print_schema_exported', metadata: meta }),
      }).catch(function () {});
    }
  }

  function isMobileDevice() {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  }

  function isNativeApp() {
    try {
      if (document.documentElement && document.documentElement.classList.contains('is-native')) return true;
    } catch (_) { /* ignore */ }
    return !!(window.Platform && typeof Platform.isNative === 'function' && Platform.isNative());
  }

  let _pdfViewerUrl = null;
  let _pdfViewerBlob = null;
  let _pdfViewerFilename = '';

  function closePdfViewer() {
    const modal = document.getElementById('pdfViewerModal');
    const frame = document.getElementById('pdfViewerFrame');
    if (modal) modal.classList.add('hidden');
    if (frame) frame.removeAttribute('src');
    if (_pdfViewerUrl) {
      try { URL.revokeObjectURL(_pdfViewerUrl); } catch (_) { /* ignore */ }
      _pdfViewerUrl = null;
    }
    _pdfViewerBlob = null;
    _pdfViewerFilename = '';
  }

  function openPdfViewerOverlay(blob, filename) {
    const modal = document.getElementById('pdfViewerModal');
    const frame = document.getElementById('pdfViewerFrame');
    if (!modal || !frame || !blob) return;
    if (_pdfViewerUrl) {
      try { URL.revokeObjectURL(_pdfViewerUrl); } catch (_) { /* ignore */ }
    }
    _pdfViewerBlob = blob;
    _pdfViewerFilename = filename || '';
    _pdfViewerUrl = URL.createObjectURL(blob);
    frame.src = _pdfViewerUrl;
    modal.classList.remove('hidden');
  }

  async function sharePdfViewerBlob() {
    if (!_pdfViewerBlob) return;
    const filename = _pdfViewerFilename || t('printSchema.filename.fallbackSlug') + '.pdf';
    if (typeof navigator.share !== 'function') {
      showToast(t('printSchema.toasts.shareUnavailable'));
      return;
    }
    try {
      const shareFile = (typeof File === 'function')
        ? new File([_pdfViewerBlob], filename, { type: 'application/pdf' })
        : _pdfViewerBlob;
      await navigator.share({ files: [shareFile], title: filename });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      showToast(t('printSchema.toasts.shareUnavailable'));
    }
  }

  function setupPdfSaveHelp() {
    const mobile = isMobileDevice();
    document.getElementById('pdfSaveHelpMobile').classList.toggle('hidden', !mobile);
    document.getElementById('pdfSaveHelpDesktop').classList.toggle('hidden', mobile);
  }

  function renderHelpSteps(listId, stepsKey, params) {
    const ol = document.getElementById(listId);
    const steps = tGet(stepsKey);
    if (!ol || !Array.isArray(steps)) {
      ol.innerHTML = '';
      return;
    }
    ol.innerHTML = steps.map(function (html) {
      let out = html;
      if (params) {
        Object.keys(params).forEach(function (k) {
          out = out.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), params[k]);
        });
      }
      return '<li>' + out + '</li>';
    }).join('');
  }

  function openPdfHelpModal(mode, filename) {
    document.getElementById('pdfHelpStepsShare').classList.add('hidden');
    document.getElementById('pdfHelpStepsPreview').classList.add('hidden');
    document.getElementById('pdfHelpStepsDesktop').classList.add('hidden');

    const fileParen = filename
      ? t('printSchema.pdfHelp.filenameParen', { name: filename })
      : '';

    if (mode === 'share') {
      document.getElementById('pdfHelpIntro').textContent = t('printSchema.pdfHelp.introShare');
      renderHelpSteps('pdfHelpStepsShare', 'printSchema.pdfHelp.shareSteps');
      document.getElementById('pdfHelpStepsShare').classList.remove('hidden');
    } else if (mode === 'preview') {
      document.getElementById('pdfHelpIntro').textContent = t('printSchema.pdfHelp.introPreview', { filename: fileParen });
      renderHelpSteps('pdfHelpStepsPreview', 'printSchema.pdfHelp.previewSteps');
      document.getElementById('pdfHelpStepsPreview').classList.remove('hidden');
    } else {
      const prefix = scope === 'my'
        ? t('printSchema.filename.prefixMyDays')
        : t('printSchema.filename.prefixSchedule');
      document.getElementById('pdfHelpIntro').textContent = t('printSchema.pdfHelp.introDesktop', {
        filename: filename ? t('printSchema.pdfHelp.filenameSuffix', { name: filename }) : '',
      });
      renderHelpSteps('pdfHelpStepsDesktop', 'printSchema.pdfHelp.desktopSteps', { prefix: prefix });
      document.getElementById('pdfHelpStepsDesktop').classList.remove('hidden');
    }

    document.getElementById('pdfHelpModal').classList.remove('hidden');
  }

  function closePdfHelpModal() {
    document.getElementById('pdfHelpModal').classList.add('hidden');
  }

  function updateWeekLabel() {
    const core = window.PrintSchemaCore;
    let monday = core.mondayOf(new Date());
    monday = core.addDays(monday, weekOffset * 7);
    const period = core.getPeriods()[periodKey];
    const end = core.addDays(monday, period.days - 1);
    document.getElementById('weekLabel').textContent = core.fmtRangeLabel(monday, end);
  }

  function setActiveBtns(container, attr, value) {
    container.querySelectorAll('[' + attr + ']').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute(attr) === value);
    });
  }

  function selectChild(id) {
    currentChildId = id;
    setActiveBtns(document.getElementById('childTabs'), 'data-id', id);
  }

  async function loadCustody() {
    try {
      const res = await apiFetch('/api/family/custody');
      if (res.status === 404) return;
      if (!res.ok) return;
      const data = await res.json();
      custodyEnabled = Boolean(data && data.patterns && data.patterns.length > 0);
      document.getElementById('myDaysScopeBtn').classList.toggle('hidden', !custodyEnabled);
      if (!custodyEnabled && scope === 'my') {
        scope = 'all';
        setActiveBtns(document.getElementById('scopeBtns'), 'data-scope', 'all');
      }
    } catch (_) {
      custodyEnabled = false;
    }
  }

  async function loadChildren() {
    const res = await apiFetch('/api/children');
    if (!res.ok) {
      showToast(t('printSchema.toasts.loadChildrenError'), 'error');
      return;
    }
    children = await res.json();
    const tabs = document.getElementById('childTabs');
    if (!children.length) {
      tabs.innerHTML = '<p class="text-text-soft text-sm">' +
        escapeHtml(t('printSchema.empty.noChildren')) +
        ' <a href="/dashboard" class="text-gold font-semibold">' +
        escapeHtml(t('printSchema.empty.goDashboard')) + '</a></p>';
      document.getElementById('printBtn').disabled = true;
      document.getElementById('previewBtn').disabled = true;
      return;
    }

    tabs.innerHTML = children.map(function (c) {
      return '<button type="button" class="child-tab px-4 py-2 rounded-full border-2 border-lavender font-semibold text-sm flex items-center gap-2" data-id="' + c.id + '">' +
        renderChildAvatar(c, 22) + ' ' + escapeHtml(c.name) + '</button>';
    }).join('');

    tabs.querySelectorAll('.child-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { selectChild(btn.dataset.id); });
    });

    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('childId');
    const target = paramId && children.find(function (c) { return c.id === paramId; });
    selectChild(target ? target.id : children[0].id);
  }

  async function buildDoc(mode) {
    const child = children.find(function (c) { return c.id === currentChildId; });
    if (!child) throw new Error('no_child');
    return window.PrintSchemaCore.loadAndBuild(child, {
      periodKey: periodKey,
      weekOffset: weekOffset,
      myDaysOnly: scope === 'my',
      apiFetch: apiFetch,
      mode: mode,
    });
  }

  async function runPreview() {
    if (!currentChildId) { showToast(t('printSchema.toasts.selectChild'), 'error'); return; }
    try {
      showToast(t('printSchema.toasts.loadingPreview'));
      const doc = await buildDoc('preview');
      const mount = document.getElementById('previewMount');
      const wrap = document.getElementById('previewWrap');
      wrap.classList.remove('hidden');
      mount.innerHTML = '<style>' + doc.styles + '</style>' + doc.body;
      mount.scrollTop = 0;
    } catch (err) {
      if (err && err.message === 'no_my_days') {
        showToast(t('printSchema.toasts.noMyDays'), 'error');
      } else {
        showToast(t('printSchema.toasts.loadScheduleError'), 'error');
      }
    }
  }

  async function runCreatePdf() {
    if (!currentChildId) { showToast(t('printSchema.toasts.selectChild'), 'error'); return; }
    const btn = document.getElementById('printBtn');
    if (btn) btn.disabled = true;
    try {
      showToast(t('printSchema.toasts.creatingPdf'));
      const child = children.find(function (c) { return c.id === currentChildId; });
      const doc = await buildDoc('print');
      const result = await window.PrintSchemaCore.downloadPdf(doc, {
        childName: child ? child.name : t('printSchema.filename.fallbackSlug'),
        myDaysOnly: scope === 'my',
      });
      if (result && result.method === 'cancelled') {
        showToast(t('printSchema.toasts.pdfCancelled'));
        return;
      }
      const delivery = result && result.method ? result.method : 'pdf_download';
      trackExport({
        format: periodKey,
        scope: scope,
        child_id: currentChildId,
        week_offset: weekOffset,
        delivery: delivery,
      });
      if (scope === 'my' && window.analytics) {
        window.analytics.track('custody_view_filtered', { source: 'print_schema', period: periodKey });
      }
      if (delivery === 'share') {
        if (typeof window.showSuccessToast === 'function') {
          window.showSuccessToast(t('printSchema.toasts.shareHint'), 8000);
        }
      } else if (isNativeApp() || isMobileDevice()) {
        if (result && result.blob) {
          openPdfViewerOverlay(result.blob, result.filename);
        }
        if (typeof window.showSuccessToast === 'function') {
          window.showSuccessToast(t('printSchema.toasts.nativeViewerHint'), 6000);
        }
      } else {
        if (typeof window.showSuccessToast === 'function') {
          window.showSuccessToast(t('printSchema.toasts.desktopSavedHint'));
        }
        openPdfHelpModal('desktop', result && result.filename);
      }
    } catch (err) {
      if (err && err.message === 'no_my_days') {
        showToast(t('printSchema.toasts.noMyDays'), 'error');
      } else if (err && err.message === 'pdf_libs_missing') {
        showToast(t('printSchema.toasts.pdfLibsMissing'), 'error');
      } else {
        showToast(t('printSchema.toasts.createPdfError'), 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const paramScope = params.get('scope');
    if (paramScope === 'my' && custodyEnabled) {
      scope = 'my';
      setActiveBtns(document.getElementById('scopeBtns'), 'data-scope', 'my');
    }
  }

  function wireControls() {
    document.getElementById('periodBtns').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-period]');
      if (!btn) return;
      periodKey = btn.dataset.period;
      setActiveBtns(document.getElementById('periodBtns'), 'data-period', periodKey);
      updateWeekLabel();
    });

    document.getElementById('scopeBtns').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-scope]');
      if (!btn || btn.classList.contains('hidden')) return;
      scope = btn.dataset.scope;
      setActiveBtns(document.getElementById('scopeBtns'), 'data-scope', scope);
    });

    document.getElementById('weekPrev').addEventListener('click', function () {
      weekOffset -= 1;
      updateWeekLabel();
    });
    document.getElementById('weekNext').addEventListener('click', function () {
      weekOffset += 1;
      updateWeekLabel();
    });
    document.getElementById('weekToday').addEventListener('click', function () {
      weekOffset = 0;
      updateWeekLabel();
    });

    document.getElementById('previewBtn').addEventListener('click', runPreview);
    document.getElementById('printBtn').addEventListener('click', runCreatePdf);
    document.getElementById('pdfHelpCloseBtn').addEventListener('click', closePdfHelpModal);
    document.getElementById('pdfHelpOkBtn').addEventListener('click', closePdfHelpModal);
    document.getElementById('pdfHelpModal').addEventListener('click', function (e) {
      if (e.target.id === 'pdfHelpModal') closePdfHelpModal();
    });
    const pdfViewerClose = document.getElementById('pdfViewerCloseBtn');
    const pdfViewerClose2 = document.getElementById('pdfViewerCloseBtn2');
    const pdfViewerShare = document.getElementById('pdfViewerShareBtn');
    const pdfViewerModal = document.getElementById('pdfViewerModal');
    if (pdfViewerClose) pdfViewerClose.addEventListener('click', closePdfViewer);
    if (pdfViewerClose2) pdfViewerClose2.addEventListener('click', closePdfViewer);
    if (pdfViewerShare) pdfViewerShare.addEventListener('click', function () {
      sharePdfViewerBlob();
    });
    if (pdfViewerModal) {
      pdfViewerModal.addEventListener('click', function (e) {
        if (e.target.id === 'pdfViewerModal') closePdfViewer();
      });
    }
  }

  async function bootAfterI18n() {
    setupPdfSaveHelp();
    await loadChildren();
    await loadCustody();
    applyUrlParams();
    updateWeekLabel();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!Auth.requireAuth()) return;
    wireControls();

    if (typeof window.initParentAppI18n === 'function') {
      let preferredLocale = null;
      if (window.Auth && typeof Auth.getUser === 'function') {
        preferredLocale = Auth.getUser()?.preferred_locale || null;
      }
      if (!preferredLocale && window.Auth && typeof Auth.api === 'function') {
        try {
          const me = await Auth.api('/api/auth/me');
          preferredLocale = me?.preferred_locale || null;
        } catch (_) { /* ignore */ }
      }
      await initParentAppI18n(preferredLocale);
    }

    document.addEventListener('locale-changed', function () {
      updateWeekLabel();
    });

    await bootAfterI18n();
  });
})();
