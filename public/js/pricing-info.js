/**
 * pricing-info.js — program & package info (no scarcity counter).
 */
(function () {
  'use strict';

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderList(items, emptyText) {
    if (!items || !items.length) {
      return '<li class="text-text-soft italic">' + esc(emptyText || '—') + '</li>';
    }
    return items.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');
  }

  function matrixCell(value) {
    if (value === true) {
      return '<td class="matrix-yes" aria-label="Ingår">✓</td>';
    }
    return '<td class="matrix-no" aria-label="Ingår inte">—</td>';
  }

  function renderProgramCard(program) {
    var statusClass = program.availability === 'live'
      ? 'program-status--live'
      : 'program-status--coming';

    var previewLink = '';
    if (program.preview_path) {
      previewLink =
        '<a href="' + esc(program.preview_path) + '" class="program-preview-link">' +
        'Se förhandsvisning →</a>';
    }

    return (
      '<article class="program-card" data-program="' + esc(program.id) + '">' +
        '<div class="program-card-header">' +
          '<span class="program-emoji" aria-hidden="true">' + esc(program.emoji || '•') + '</span>' +
          '<div>' +
            '<span class="program-status ' + statusClass + '">' + esc(program.availability_label) + '</span>' +
            '<h2 class="program-name">' + esc(program.name) + '</h2>' +
            '<p class="program-headline">' + esc(program.headline) + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="program-promise">' + esc(program.promise) + '</p>' +
        '<div class="program-lists">' +
          '<div>' +
            '<h3 class="program-list-title program-list-title--yes">Det här ingår</h3>' +
            '<ul class="program-list program-list--yes">' +
              renderList(program.includes) +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h3 class="program-list-title program-list-title--no">Ingår inte</h3>' +
            '<ul class="program-list program-list--no">' +
              renderList(program.not_included) +
            '</ul>' +
          '</div>' +
        '</div>' +
        previewLink +
      '</article>'
    );
  }

  function renderMatrix(comparison, programs) {
    var head = document.getElementById('matrixHeadRow');
    var body = document.getElementById('matrixBody');
    if (!head || !body || !comparison) return;

    var cols = programs.map(function (p) { return p.component; });

    head.innerHTML =
      '<th scope="col" class="matrix-feature-col">Funktion</th>' +
      programs.map(function (p) {
        return '<th scope="col">' + esc(p.name.replace('Familj ', '')) + '</th>';
      }).join('');

    body.innerHTML = comparison.rows.map(function (row) {
      return (
        '<tr>' +
          '<th scope="row" class="matrix-feature-col">' + esc(row.label) + '</th>' +
          cols.map(function (col) {
            return matrixCell(row.programs[col]);
          }).join('') +
        '</tr>'
      );
    }).join('');
  }

  function render(data) {
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
      cards.innerHTML = programs.map(renderProgramCard).join('');
    }

    renderMatrix(data.comparison, programs);

    var matrixTitle = document.getElementById('matrixTitle');
    if (matrixTitle && data.comparison && data.comparison.title) {
      matrixTitle.textContent = data.comparison.title;
    }
  }

  function setBackLink() {
    var back = document.getElementById('backLink');
    if (!back) return;
    var referrer = document.referrer || '';
    if (referrer.indexOf('/upgrade') !== -1) {
      back.href = '/upgrade';
      back.textContent = '← Tillbaka till Extra';
    } else if (referrer.indexOf('/dashboard') !== -1) {
      back.href = '/dashboard';
      back.textContent = '← Tillbaka till dashboard';
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
