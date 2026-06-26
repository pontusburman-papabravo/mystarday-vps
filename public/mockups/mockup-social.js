(function () {
  'use strict';

  function updatePreviewScale() {
    var stage = document.querySelector('.preview-stage');
    if (!stage) return;
    var scale = stage.clientWidth / 1080;
    stage.style.setProperty('--preview-scale', String(scale));
  }

  function setExportMode(on) {
    document.body.classList.toggle('export-mode', on);
    var toggle = document.getElementById('toggleExport');
    var exitBtn = document.getElementById('exitExport');
    if (toggle) {
      toggle.textContent = on ? '✕ Stäng exportläge' : '📷 Exportläge';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (exitBtn) exitBtn.hidden = !on;
    if (on) {
      window.scrollTo(0, 0);
      var canvas = document.getElementById('marknadsbild');
      if (canvas) canvas.scrollIntoView({ block: 'start' });
    }
  }

  function copyText(text, btn) {
    var prev = btn.textContent;

    function showOk() {
      btn.textContent = '✓ Kopierat!';
      btn.disabled = true;
      window.setTimeout(function () {
        btn.textContent = prev;
        btn.disabled = false;
      }, 2000);
    }

    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        showOk();
        return;
      }
    } catch (e) { /* fall through */ }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(showOk).catch(function () {
        window.prompt('Markera och kopiera (Ctrl+C / Cmd+C):', text);
      });
      return;
    }

    window.prompt('Markera och kopiera (Ctrl+C / Cmd+C):', text);
  }

  function init() {
    var stage = document.querySelector('.preview-stage');
    if (stage) {
      updatePreviewScale();
      if (window.ResizeObserver) {
        new ResizeObserver(updatePreviewScale).observe(stage);
      } else {
        window.addEventListener('resize', updatePreviewScale);
      }
    }

    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('#toggleExport');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        setExportMode(!document.body.classList.contains('export-mode'));
        return;
      }
      var copyBtn = e.target.closest('#copyCaption');
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        var caption = document.getElementById('captionShort');
        if (caption) copyText(caption.textContent.trim(), copyBtn);
        return;
      }
      var exitBtn = e.target.closest('#exitExport');
      if (exitBtn) {
        e.preventDefault();
        e.stopPropagation();
        setExportMode(false);
      }
    }, true);

    var toggle = document.getElementById('toggleExport');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setExportMode(!document.body.classList.contains('export-mode'));
      });
    }

    var exitBtn = document.getElementById('exitExport');
    if (exitBtn) {
      exitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setExportMode(false);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('export-mode')) {
        setExportMode(false);
      }
    });

    var copyBtn = document.getElementById('copyCaption');
    var caption = document.getElementById('captionShort');
    if (copyBtn && caption) {
      copyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        copyText(caption.textContent.trim(), copyBtn);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
