/**
 * Landing page — program overview + comparison matrix from program catalog API.
 */
(function () {
  'use strict';

  function renderLanding(data) {
    if (!window.ProgramCatalogRender) return;

    var copy = data.copy || {};
    var programs = data.programs || [];
    var comparison = data.comparison;

    var intro = document.getElementById('landingProgramIntro');
    if (intro) intro.textContent = copy.intro || '';

    var founder = document.getElementById('landingProgramFounderNote');
    if (founder) founder.textContent = copy.founder_note || '';

    var pills = document.getElementById('landingProgramPills');
    if (pills) {
      pills.innerHTML = programs.map(ProgramCatalogRender.renderProgramSummary).join('');
    }

    var matrixTitle = document.getElementById('landingMatrixTitle');
    if (matrixTitle && comparison && comparison.title) {
      matrixTitle.textContent = comparison.title;
    }

    ProgramCatalogRender.renderMatrix(
      comparison,
      programs,
      document.getElementById('landingMatrixHeadRow'),
      document.getElementById('landingMatrixBody')
    );
  }

  var section = document.getElementById('program');
  if (!section) return;

  fetch('/api/public/program-catalog')
    .then(function (r) { return r.json(); })
    .then(renderLanding)
    .catch(function () {
      var intro = document.getElementById('landingProgramIntro');
      if (intro) intro.textContent = 'Kunde inte ladda programinformation just nu.';
    });
})();
