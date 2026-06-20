/**
 * pricing-info.js — program & package info (no scarcity counter).
 */
(function () {
  'use strict';

  function render(data) {
    if (!window.ProgramCatalogRender) return;

    var copy = data.copy || {};
    var programs = data.programs || [];

    var title = document.getElementById('pageTitle');
    if (title && copy.title) title.textContent = copy.title;

    var intro = document.getElementById('pageIntro');
    if (intro) intro.textContent = copy.intro || '';

    var founder = document.getElementById('founderNote');
    if (founder) founder.textContent = copy.founder_note || '';

    var addon = document.getElementById('addonNote');
    if (addon) addon.textContent = copy.addon_note || '';

    var cards = document.getElementById('programCards');
    if (cards) {
      cards.innerHTML = programs.map(ProgramCatalogRender.renderProgramCard).join('');
    }

    ProgramCatalogRender.renderMatrix(
      data.comparison,
      programs,
      document.getElementById('matrixHeadRow'),
      document.getElementById('matrixBody')
    );

    var matrixTitle = document.getElementById('matrixTitle');
    if (matrixTitle && data.comparison && data.comparison.title) {
      matrixTitle.textContent = data.comparison.title;
    }

    if (window.LandingNewsletter && typeof LandingNewsletter.wireInterestForms === 'function') {
      LandingNewsletter.wireInterestForms(cards);
    }
  }

  function setBackLink() {
    var back = document.getElementById('backLink');
    if (!back) return;
    var params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'landing') {
      back.href = '/#program';
      back.textContent = '← Tillbaka till startsidan';
      return;
    }
    var referrer = document.referrer || '';
    if (referrer.indexOf('/upgrade') !== -1) {
      back.href = '/upgrade';
      back.textContent = '← Tillbaka till Extra';
    } else if (referrer.indexOf('/dashboard') !== -1) {
      back.href = '/dashboard';
      back.textContent = '← Tillbaka till dashboard';
    } else if (referrer.indexOf('/') === 0 && referrer.indexOf(window.location.origin) === 0) {
      back.href = '/#program';
      back.textContent = '← Tillbaka till startsidan';
    }
  }

  setBackLink();

  fetch('/api/public/program-catalog')
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      render({
        copy: {
          title: 'Program och paket',
          intro: 'Kunde inte ladda programinformation. Försök igen senare.',
          founder_note: '',
          addon_note: '',
        },
        programs: [],
        comparison: { title: 'Vad ingår var?', rows: [] },
      });
    });
})();
