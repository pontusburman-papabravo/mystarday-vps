/**
 * Shared rendering for program catalog (pricing-info + landing).
 */
(function (global) {
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

  function programColumnLabel(name) {
    return esc(String(name || '').replace('Familj ', ''));
  }

  function marketingPreviewHref(path) {
    if (!path) return '';
    if (path.indexOf('/pricing-info') === 0) {
      return path.indexOf('?') >= 0 ? path : path.replace('#', '?from=landing#');
    }
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'from=landing';
  }

  function programLinkHref(program) {
    if (program.preview_path && program.component !== 'total') {
      return marketingPreviewHref(program.preview_path);
    }
    if (program.availability === 'live') return '/register';
    return '/pricing-info?from=landing#' + program.id;
  }

  function renderProgramInterestCta(program) {
    if (program.availability !== 'coming' || program.component === 'basic_app') return '';
    return (
      '<form class="program-interest-form" data-component="' + esc(program.component) + '">' +
        '<p class="program-interest-label">Få e-post när paketet släpps — ingen inloggning krävs.</p>' +
        '<div class="program-interest-row">' +
          '<input type="email" name="email" placeholder="din@email.se" required autocomplete="email" class="program-interest-email">' +
          '<button type="submit" class="program-interest-btn">Håll mig uppdaterad</button>' +
        '</div>' +
        '<p class="program-interest-feedback" hidden></p>' +
      '</form>'
    );
  }

  function renderMatrix(comparison, programs, headEl, bodyEl) {
    if (!headEl || !bodyEl || !comparison) return;

    var cols = programs.map(function (p) { return p.component; });

    headEl.innerHTML =
      '<th scope="col" class="matrix-feature-col">Funktion</th>' +
      programs.map(function (p) {
        return '<th scope="col">' + programColumnLabel(p.name) + '</th>';
      }).join('');

    bodyEl.innerHTML = comparison.rows.map(function (row) {
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

  function renderProgramSummary(program) {
    var statusClass = program.availability === 'live'
      ? 'program-status--live'
      : 'program-status--coming';
    var href = programLinkHref(program);

    return (
      '<a href="' + esc(href) + '" class="landing-program-pill landing-program-pill-link" data-program="' + esc(program.id) + '">' +
        '<span class="program-emoji" aria-hidden="true">' + esc(program.emoji || '•') + '</span>' +
        '<div>' +
          '<span class="program-status ' + statusClass + '">' + esc(program.availability_label) + '</span>' +
          '<h3 class="landing-program-pill-name">' + esc(program.name) + '</h3>' +
          '<p class="landing-program-pill-headline">' + esc(program.headline) + '</p>' +
        '</div>' +
      '</a>'
    );
  }

  function renderProgramCard(program) {
    var statusClass = program.availability === 'live'
      ? 'program-status--live'
      : 'program-status--coming';

    var previewLink = '';
    if (program.preview_path && program.component !== 'total') {
      previewLink =
        '<a href="' + esc(marketingPreviewHref(program.preview_path)) + '" class="program-preview-link">' +
        'Se förhandsvisning →</a>';
    } else if (program.component === 'total') {
      previewLink =
        '<a href="' + esc(marketingPreviewHref(program.preview_path)) + '" class="program-preview-link">' +
        'Läs mer om Total-paketet →</a>';
    }

    var interestCta = renderProgramInterestCta(program);

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
        interestCta +
      '</article>'
    );
  }

  global.ProgramCatalogRender = {
    esc: esc,
    marketingPreviewHref: marketingPreviewHref,
    programLinkHref: programLinkHref,
    renderMatrix: renderMatrix,
    renderProgramCard: renderProgramCard,
    renderProgramSummary: renderProgramSummary,
    renderProgramInterestCta: renderProgramInterestCta,
  };
})(window);
