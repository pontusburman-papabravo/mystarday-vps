/**
 * child-pet.js — Husdjur (V3).
 */
(function () {
  'use strict';

  var SPECIES = [
    { id: 'dog', emoji: '🐶', label: 'Hund' },
    { id: 'cat', emoji: '🐱', label: 'Katt' },
    { id: 'rabbit', emoji: '🐰', label: 'Kanin' },
    { id: 'dragon', emoji: '🐉', label: 'Drake' },
  ];

  function speciesEmoji(id) {
    var s = SPECIES.find(function (x) { return x.id === id; });
    return s ? s.emoji : '🐶';
  }

  function renderHubPet(pet) {
    if (!pet) return '';
    return '<div class="cu-pet-hub" title="' + (pet.name || 'Mitt husdjur') + '">' +
      '<span class="cu-pet-hub-emoji">' + speciesEmoji(pet.species) + '</span>' +
      '</div>';
  }

  function renderRoom(universe) {
    var pet = universe.pet;
    if (pet) {
      return '<div class="skatt-section cu-pet-room">' +
        '<div class="skatt-section-body" style="text-align:center;padding:28px 16px;">' +
          '<div class="cu-pet-big">' + speciesEmoji(pet.species) + '</div>' +
          '<div class="cu-pet-name">' + (pet.name || 'Min kompis') + '</div>' +
          '<p style="font-size:0.82rem;color:#5A6178;margin-top:8px;">Ditt husdjur firar med dig när du klarar aktiviteter! 🎉</p>' +
        '</div></div>';
    }

    var picks = SPECIES.map(function (s) {
      return '<button type="button" class="cu-pet-pick" data-species="' + s.id + '">' +
        '<span>' + s.emoji + '</span><span>' + s.label + '</span></button>';
    }).join('');

    return '<div class="skatt-section cu-pet-room">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#55efc4,#00b894);">🐾</div>' +
        '<span class="skatt-section-title" style="color:#00864e;">Välj husdjur</span>' +
      '</div>' +
      '<div class="skatt-section-body">' +
        '<p style="font-size:0.82rem;color:#5A6178;margin:0 0 16px;text-align:center;">Vem följer med dig i huset?</p>' +
        '<div class="cu-pet-picks">' + picks + '</div>' +
        '<input type="text" id="cuPetName" maxlength="32" placeholder="Ge det ett namn…" class="cu-pet-name-input">' +
        '<button type="button" id="cuPetAdopt" class="skatt-redeem-btn" style="margin-top:12px;width:100%;">Adoptera! 🐾</button>' +
      '</div></div>';
  }

  function bindRoom(universe, onAdopted) {
    var selected = 'dog';
    document.querySelectorAll('.cu-pet-pick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selected = btn.getAttribute('data-species');
        document.querySelectorAll('.cu-pet-pick').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });
    var first = document.querySelector('.cu-pet-pick');
    if (first) first.classList.add('is-active');

    var adoptBtn = document.getElementById('cuPetAdopt');
    if (!adoptBtn) return;
    adoptBtn.addEventListener('click', function () {
      var nameEl = document.getElementById('cuPetName');
      var name = nameEl ? nameEl.value.trim() : '';
      ChildUniverse.adoptPet({ species: selected, name: name || undefined }).then(function () {
        if (onAdopted) onAdopted();
      });
    });
  }

  window.ChildPet = { renderHubPet: renderHubPet, renderRoom: renderRoom, bindRoom: bindRoom, speciesEmoji: speciesEmoji };
})();
