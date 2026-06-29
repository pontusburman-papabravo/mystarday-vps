/**
 * pet-home.js — Husdjurshemmet v2 (mockup-layout, drag/skrubb/lek)
 */
(function () {
  'use strict';

  const SLUG = 'husdjur';
  const PET_IMG = '/img/build/pet-home/pet-';
  const PETS = [
    { id: 'hund', label: 'Hund' },
    { id: 'katt', label: 'Katt' },
    { id: 'kanin', label: 'Kanin' },
    { id: 'hast', label: 'Häst' },
  ];

  const METER_ROWS = [
    { key: 'hunger', label: 'Mätt' },
    { key: 'happiness', label: 'Glad' },
    { key: 'cleanliness', label: 'Ren' },
    { key: 'energy', label: 'Pigg', invert: false },
  ];

  const GOALS = [
    { id: 'fed', label: 'Mata ditt husdjur' },
    { id: 'brushed', label: 'Borsta pälsen' },
    { id: 'played', label: 'Lek med bollen' },
    { id: 'petted', label: 'Klappa djuret' },
    { id: 'treat', label: 'Ge godis' },
    { id: 'rested', label: 'Låt djuret vila' },
  ];

  const DEFAULT_GOALS = {
    date: '',
    fed: false,
    brushed: false,
    played: false,
    petted: false,
    treat: false,
    rested: false,
  };

  const DEFAULT_STATE = {
    game_version: 2,
    pet_id: 'hund',
    hunger: 38,
    happiness: 70,
    cleanliness: 82,
    energy: 88,
    bowl_fill: 0,
    asleep: false,
    dirty_spots: 2,
    daily_goals: Object.assign({}, DEFAULT_GOALS),
  };

  let state = {};
  let buildProject = null;
  let preview = false;
  let brushMode = false;
  let scrubProgress = 0;
  const scrubTarget = 100;
  let decayTimer = null;
  let drag = null;
  let homePositions = {};

  const $ = (id) => document.getElementById(id);

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n) || 0));
  }

  function normalizeGoals(raw) {
    const g = Object.assign({}, DEFAULT_GOALS, raw || {});
    if (g.date !== todayKey()) {
      return Object.assign({}, DEFAULT_GOALS, { date: todayKey() });
    }
    GOALS.forEach(function (goal) {
      g[goal.id] = !!g[goal.id];
    });
    return g;
  }

  function normalizeState(raw) {
    const s = Object.assign({}, DEFAULT_STATE, raw || {});
    s.game_version = 2;
    if (s.pet_id === 'hamster') s.pet_id = 'kanin';
    s.pet_id = PETS.some(function (p) { return p.id === s.pet_id; }) ? s.pet_id : 'hund';
    s.hunger = clamp(s.hunger, 0, 100);
    s.happiness = clamp(s.happiness, 0, 100);
    s.cleanliness = clamp(s.cleanliness, 0, 100);
    s.energy = clamp(s.energy, 0, 100);
    s.bowl_fill = clamp(s.bowl_fill, 0, 100);
    s.dirty_spots = clamp(s.dirty_spots, 0, 5);
    s.asleep = !!s.asleep;
    s.daily_goals = normalizeGoals(s.daily_goals);
    return s;
  }

  function haptic(kind) {
    if (window.BuildGameMobile) BuildGameMobile.haptic(kind || 'tick');
  }

  function toast(msg) {
    const el = $('phToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
  }

  function burst(emojis, container) {
    const layer = container || $('phFx');
    if (window.BuildGameMobile && layer) {
      BuildGameMobile.burst(layer, emojis[0], emojis.length > 1 ? 10 : 8);
      return;
    }
    (emojis || ['✨']).forEach(function (em, i) {
      const el = document.createElement('span');
      el.className = 'ph-fx-particle';
      el.textContent = em;
      el.style.left = (20 + i * 12 + Math.random() * 20) + '%';
      el.style.top = (30 + Math.random() * 30) + '%';
      layer.appendChild(el);
      setTimeout(function () { el.remove(); }, 1000);
    });
  }

  function heartsHtml(val) {
    const filled = Math.round(clamp(val, 0, 100) / 20);
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += '<span class="ph-heart' + (i < filled ? ' is-on' : '') + '">♥</span>';
    }
    return html;
  }

  function rectsOverlap(a, b, pad) {
    pad = pad || 0;
    return !(a.right + pad < b.left || a.left - pad > b.right ||
      a.bottom + pad < b.top || a.top - pad > b.bottom);
  }

  function rect(el) {
    return el.getBoundingClientRect();
  }

  function persist() {
    if (preview) return;
    if (window.PlayWorldSave) PlayWorldSave.saveDebounced(SLUG, state, 600);
  }

  function markGoal(id) {
    if (!state.daily_goals) state.daily_goals = normalizeGoals({});
    if (state.daily_goals.date !== todayKey()) {
      state.daily_goals = normalizeGoals({});
    }
    if (!state.daily_goals[id]) {
      state.daily_goals[id] = true;
      renderGoals();
    }
  }

  function setHint(text) {
    const el = $('phHint');
    if (el) el.textContent = text;
  }

  function updateHint() {
    if (state.asleep) {
      setHint('Djuret sover gott under filten 💤');
      return;
    }
    if (state.bowl_fill < 20 && state.hunger < 55) {
      setHint('Dra matpåsen till skålen 🥫');
      return;
    }
    if (state.bowl_fill >= 20 && state.hunger < 75) {
      setHint('Dra skålen till djuret så det kan äta');
      return;
    }
    if (state.cleanliness < 65 || state.dirty_spots > 0) {
      setHint('Tryck Borsta — skrubba pälsen med fingret');
      return;
    }
    if (state.energy < 45) {
      setHint('Dra filten över djuret så det vilar');
      return;
    }
    if (state.happiness < 80) {
      setHint('Klappa djuret, ge godis eller kasta bollen');
      return;
    }
    setHint('Bra jobbat! Djuret är nöjt och glatt ⭐');
  }

  function renderMeters() {
    const el = $('phMeters');
    if (!el) return;
    el.innerHTML = METER_ROWS.map(function (r) {
      return '<div class="ph-meter-row">' +
        '<span class="ph-meter-label">' + r.label + '</span>' +
        '<div class="ph-hearts" aria-label="' + r.label + '">' + heartsHtml(state[r.key]) + '</div>' +
        '</div>';
    }).join('');
  }

  function renderGoals() {
    const el = $('phGoals');
    if (!el) return;
    const goals = state.daily_goals || DEFAULT_GOALS;
    el.innerHTML = GOALS.map(function (g) {
      const done = goals[g.id] ? ' is-done' : '';
      const mark = goals[g.id] ? '✓' : '';
      return '<li class="ph-goal' + done + '">' +
        '<span class="ph-goal-check">' + mark + '</span>' +
        '<span>' + g.label + '</span></li>';
    }).join('');
  }

  function renderCollect() {
    const panel = $('phCollectPanel');
    const fill = $('phCollectFill');
    const label = $('phCollectLabel');
    if (!panel || !fill || !label) return;

    if (!buildProject || buildProject.parts_required == null) {
      panel.hidden = true;
      return;
    }

    const collected = buildProject.parts_collected || 0;
    const required = buildProject.parts_required || 75;
    const pct = required > 0 ? Math.min(100, (collected / required) * 100) : 0;

    panel.hidden = false;
    fill.style.width = pct + '%';
    label.textContent = collected + ' / ' + required + ' delar';
  }

  function petImgSrc(id) {
    return PET_IMG + id + '.svg';
  }

  function renderPet() {
    const pet = $('phPet');
    const img = $('phPetImg');
    if (!pet) return;
    pet.dataset.pet = state.pet_id;
    pet.classList.remove('is-dirty', 'is-happy', 'is-eating', 'is-playing', 'is-sleeping');
    if (state.dirty_spots > 0 || state.cleanliness < 70) pet.classList.add('is-dirty');
    if (state.asleep) pet.classList.add('is-sleeping');
    if (img) img.src = petImgSrc(state.pet_id);

    const bowl = $('phBowl');
    if (bowl) bowl.classList.toggle('has-food', state.bowl_fill > 8);

    const zzz = $('phZzz');
    const blanket = $('phBlanketOnPet');
    if (zzz) zzz.hidden = !state.asleep;
    if (blanket) blanket.hidden = !state.asleep;
  }

  function renderPicker() {
    const el = $('phPicker');
    if (!el) return;
    el.innerHTML = PETS.map(function (p) {
      const on = p.id === state.pet_id ? ' is-on' : '';
      return '<button type="button" class="ph-pick-btn' + on + '" data-pet="' + p.id + '">' +
        '<img src="' + petImgSrc(p.id) + '" alt="" draggable="false">' +
        p.label + '</button>';
    }).join('');
    el.querySelectorAll('[data-pet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.asleep) return;
        state.pet_id = btn.getAttribute('data-pet');
        renderPicker();
        renderPet();
        toast('Hej ' + btn.textContent.trim() + '!');
        haptic('tick');
        persist();
      });
    });
  }

  function applyState(patch) {
    Object.assign(state, patch);
    state = normalizeState(state);
    renderMeters();
    renderPet();
    renderGoals();
    updateHint();
    persist();
  }

  function rememberHome(el) {
    if (!el || homePositions[el.id]) return;
    const parent = el.parentElement;
    homePositions[el.id] = {
      parent: parent,
      next: el.nextElementSibling,
    };
  }

  function resetPropPosition(el) {
    if (!el) return;
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.zIndex = '';
    el.classList.remove('is-dragging');

    const home = homePositions[el.id];
    if (home && home.parent && el.parentElement !== home.parent) {
      if (home.next) home.parent.insertBefore(el, home.next);
      else home.parent.appendChild(el);
    }
  }

  function fillBowl() {
    applyState({ bowl_fill: 100 });
    burst(['🥣', '✨', '🌾'], $('phRoom'));
    toast('Skålen är full med mat!');
    haptic('success');
  }

  function feedPet() {
    if (state.asleep || state.bowl_fill < 15) return;
    const pet = $('phPet');
    if (pet) {
      pet.classList.add('is-eating');
      setTimeout(function () { pet.classList.remove('is-eating'); }, 1600);
    }
    applyState({
      bowl_fill: 0,
      hunger: clamp(state.hunger + 32, 0, 100),
      happiness: clamp(state.happiness + 10, 0, 100),
      energy: clamp(state.energy - 5, 0, 100),
    });
    markGoal('fed');
    burst(['😋', '💚'], $('phPetStage'));
    toast('Nom nom! Så gott!');
    haptic('success');
  }

  function completeBrush() {
    brushMode = false;
    scrubProgress = 0;
    $('phScrubMeter').hidden = true;
    $('phBrush').classList.remove('is-active-tool');
    applyState({
      cleanliness: 100,
      dirty_spots: 0,
      happiness: clamp(state.happiness + 12, 0, 100),
    });
    markGoal('brushed');
    burst(['✨', '🪮', '⭐'], $('phPetStage'));
    toast('Så mjuk och fin päls!');
    haptic('success');
  }

  function petAnimal() {
    if (state.asleep || brushMode) return;
    const pet = $('phPet');
    if (pet) {
      pet.classList.add('is-happy');
      clearTimeout(petAnimal._t);
      petAnimal._t = setTimeout(function () { pet.classList.remove('is-happy'); }, 1200);
    }
    applyState({ happiness: clamp(state.happiness + 8, 0, 100) });
    markGoal('petted');
    burst(['❤️', '💕', '🤚'], $('phPetStage'));
    haptic('tick');
  }

  function throwBall(dx, dy) {
    if (state.asleep) return;
    const room = $('phRoom');
    const pet = $('phPet');
    if (!room || !pet) return;
    const fly = document.createElement('span');
    fly.className = 'ph-ball-flying';
    fly.textContent = '🎾';
    const pr = rect(pet);
    const rr = rect(room);
    fly.style.left = (pr.left - rr.left + pr.width / 2) + 'px';
    fly.style.top = (pr.top - rr.top) + 'px';
    room.appendChild(fly);
    requestAnimationFrame(function () {
      fly.style.left = (pr.left - rr.left + dx * 0.4) + 'px';
      fly.style.top = (pr.top - rr.top + dy * 0.4 - 40) + 'px';
    });
    setTimeout(function () { fly.remove(); }, 520);

    pet.classList.add('is-playing');
    setTimeout(function () { pet.classList.remove('is-playing'); }, 1400);

    applyState({
      happiness: clamp(state.happiness + 15, 0, 100),
      energy: clamp(state.energy - 12, 0, 100),
      hunger: clamp(state.hunger - 6, 0, 100),
      dirty_spots: clamp(state.dirty_spots + (Math.random() > 0.6 ? 1 : 0), 0, 5),
    });
    markGoal('played');
    toast('Wiii! Kul lek!');
    haptic('medium');
  }

  function giveTreat() {
    if (state.asleep) return;
    const pet = $('phPet');
    const room = $('phRoom');
    if (!pet || !room) return;

    const fly = document.createElement('span');
    fly.className = 'ph-treat-flying';
    fly.textContent = '🍖';
    const pr = rect(pet);
    const rr = rect(room);
    fly.style.left = (pr.left - rr.left + pr.width * 0.3) + 'px';
    fly.style.top = (pr.top - rr.top + pr.height * 0.2) + 'px';
    room.appendChild(fly);
    requestAnimationFrame(function () {
      fly.style.left = (pr.left - rr.left + pr.width * 0.45) + 'px';
      fly.style.top = (pr.top - rr.top + pr.height * 0.35) + 'px';
    });
    setTimeout(function () { fly.remove(); }, 400);

    pet.classList.add('is-happy');
    setTimeout(function () { pet.classList.remove('is-happy'); }, 1000);

    applyState({
      happiness: clamp(state.happiness + 18, 0, 100),
      hunger: clamp(state.hunger + 8, 0, 100),
      energy: clamp(state.energy - 4, 0, 100),
    });
    markGoal('treat');
    burst(['🍖', '⭐', '😋'], $('phPetStage'));
    toast('Mums! Ett litet godis!');
    haptic('success');
  }

  function tuckInBlanket() {
    applyState({
      asleep: true,
      energy: clamp(state.energy + 25, 0, 100),
      happiness: clamp(state.happiness + 5, 0, 100),
    });
    markGoal('rested');
    toast('Gonatt… 💤');
    haptic('success');
    setTimeout(function () {
      applyState({ asleep: false, energy: clamp(state.energy + 15, 0, 100) });
      toast('Djuret vaknade utvilat!');
    }, 12000);
  }

  function startBrushMode() {
    if (state.asleep) return;
    brushMode = true;
    scrubProgress = 0;
    $('phBrush').classList.add('is-active-tool');
    $('phScrubMeter').hidden = false;
    $('phScrubFill').style.width = '0%';
    setHint('Skrubba pälsen — dra fingret över djuret');
    haptic('tool');
  }

  function onDecayTick() {
    if (state.asleep) return;
    applyState({
      hunger: clamp(state.hunger - 4, 0, 100),
      cleanliness: clamp(state.cleanliness - 3, 0, 100),
      happiness: clamp(state.happiness - (state.hunger < 30 ? 5 : 2), 0, 100),
      energy: clamp(state.energy - 2, 0, 100),
      dirty_spots: clamp(state.dirty_spots + (state.cleanliness < 60 ? 1 : 0), 0, 5),
    });
  }

  function bindDraggable(el, opts) {
    if (!el) return;
    rememberHome(el);
    el.addEventListener('pointerdown', function (e) {
      if (state.asleep && opts.id !== 'blanket') return;
      if (opts.id === 'brush') return;
      e.preventDefault();
      const room = $('phRoom');
      const rr = rect(room);
      const er = rect(el);
      const startLeft = er.left - rr.left;
      const startTop = er.top - rr.top;
      el.style.position = 'absolute';
      el.style.left = startLeft + 'px';
      el.style.top = startTop + 'px';
      el.style.width = er.width + 'px';
      drag = {
        el: el,
        id: opts.id,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: startLeft,
        origTop: startTop,
        moved: false,
        fromToolbar: el.closest('.ph-toolbar') != null,
      };
      el.classList.add('is-dragging');
      if (drag.fromToolbar) {
        document.body.appendChild(el);
        el.style.position = 'fixed';
        el.style.left = er.left + 'px';
        el.style.top = er.top + 'px';
        el.style.zIndex = '60';
        drag.origLeft = er.left;
        drag.origTop = er.top;
      }
      el.setPointerCapture(e.pointerId);
      if (window.BuildGameMobile) BuildGameMobile.lockScroll();
      haptic('tick');
    });
  }

  function onPointerMove(e) {
    if (!drag) {
      if (brushMode && !state.asleep) {
        const pet = $('phPet');
        if (!pet) return;
        const pr = rect(pet);
        if (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) {
          scrubProgress = Math.min(scrubTarget, scrubProgress + 4);
          $('phScrubFill').style.width = scrubProgress + '%';
          if (scrubProgress >= scrubTarget) completeBrush();
        }
      }
      return;
    }
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (drag.fromToolbar) {
      drag.el.style.left = (drag.origLeft + dx) + 'px';
      drag.el.style.top = (drag.origTop + dy) + 'px';
    } else {
      drag.el.style.left = (drag.origLeft + dx) + 'px';
      drag.el.style.top = (drag.origTop + dy) + 'px';
    }
  }

  function onPointerUp(e) {
    if (!drag) return;
    const el = drag.el;
    const id = drag.id;
    const moved = drag.moved;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    el.releasePointerCapture(e.pointerId);
    el.classList.remove('is-dragging');
    if (window.BuildGameMobile) BuildGameMobile.unlockScroll();

    const bowlZone = $('phBowlZone');
    const pet = $('phPet');
    const elRect = rect(el);

    if (id === 'bag' && bowlZone && rectsOverlap(elRect, rect(bowlZone), 12)) {
      fillBowl();
    } else if (id === 'bowl' && pet && state.bowl_fill > 10 && rectsOverlap(elRect, rect(pet), 16)) {
      feedPet();
    } else if (id === 'blanket' && pet && rectsOverlap(elRect, rect(pet), 10)) {
      tuckInBlanket();
    } else if (id === 'ball' && moved && pet) {
      throwBall(dx, dy);
    } else if (id === 'ball' && !moved) {
      toast('Dra bollen mot djuret!');
    } else if (id === 'treat' && pet && rectsOverlap(elRect, rect(pet), 14)) {
      giveTreat();
    } else if (id === 'treat' && !moved) {
      toast('Dra godiset till djuret!');
    }

    resetPropPosition(el);
    drag = null;
  }

  function bindInteractions() {
    bindDraggable($('phFoodBag'), { id: 'bag' });
    bindDraggable($('phBall'), { id: 'ball' });
    bindDraggable($('phBlanket'), { id: 'blanket' });
    bindDraggable($('phTreat'), { id: 'treat' });

    const bowl = $('phBowl');
    bindDraggable(bowl, { id: 'bowl' });

    $('phBrush').addEventListener('click', function () {
      if (brushMode) {
        brushMode = false;
        $('phBrush').classList.remove('is-active-tool');
        $('phScrubMeter').hidden = true;
        updateHint();
        return;
      }
      startBrushMode();
    });

    $('phPet').addEventListener('click', function () {
      petAnimal();
    });

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function showApp() {
    $('phLoading').hidden = true;
    $('phLogin').hidden = true;
    $('phApp').hidden = false;
  }

  function showLogin(msg) {
    $('phLoading').hidden = true;
    $('phApp').hidden = true;
    $('phLogin').hidden = false;
    $('phLoginMsg').textContent = msg;
  }

  function bootUi() {
    renderMeters();
    renderGoals();
    renderCollect();
    renderPet();
    renderPicker();
    updateHint();
    bindInteractions();
    showApp();
    decayTimer = setInterval(onDecayTick, 50000);
  }

  async function init() {
    try {
      const loaded = await PlayWorldSave.load(SLUG, DEFAULT_STATE);
      preview = loaded.preview;
      buildProject = loaded.project || null;
      state = normalizeState(loaded.state);
      $('phPreviewBanner').hidden = !preview;
      bootUi();
    } catch (err) {
      if (PlayWorldSave.isPreview()) {
        preview = true;
        state = normalizeState(DEFAULT_STATE);
        $('phPreviewBanner').hidden = false;
        bootUi();
        return;
      }
      showLogin(err.message || 'Kunde inte öppna husdjurshemmet');
    }
  }

  window.PetHome = { normalizeState: normalizeState, DEFAULT_STATE: DEFAULT_STATE };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
