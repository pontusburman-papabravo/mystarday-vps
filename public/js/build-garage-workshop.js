/**
 * build-garage-workshop.js — Verktygsvägg + steg-för-steg mecka (däckbyte, tvätt, …)
 */
(function () {
  'use strict';

  const TOOLS = [
    { id: 'jack', icon: '🏗️', label: 'Domkraft' },
    { id: 'wrench', icon: '🔧', label: 'Skiftnyckel' },
    { id: 'hose', icon: '🚿', label: 'Vattenslang' },
    { id: 'sponge', icon: '🧽', label: 'Svamp' },
    { id: 'rag', icon: '🧻', label: 'Trasa' },
    { id: 'polish', icon: '✨', label: 'Polermedel' },
  ];

  const TIRE_OPTIONS = [
    { id: 'standard', label: 'Standard', emoji: '⚙️' },
    { id: 'sport', label: 'Sport', emoji: '🏎️' },
    { id: 'offroad', label: 'Breda', emoji: '🛞' },
  ];

  const WHEEL_STEPS = [
    { id: 'pick_jack', needTool: 'jack', hint: '1/8 — Ta domkraften från väggen 🏗️' },
    { id: 'lift', needTool: 'jack', hint: '2/8 — Tryck på bilen för att lyfta upp den' },
    { id: 'pick_wrench', needTool: 'wrench', hint: '3/8 — Ta skiftnyckeln 🔧' },
    { id: 'unscrew', needTool: 'wrench', hint: '4/8 — Skruva loss! Tryck på hjulet (6 varv)' },
    { id: 'remove', hint: '5/8 — Dra bort det gamla däcket 👇' },
    { id: 'pick_tire', hint: '6/8 — Välj nytt däck på hyllan' },
    { id: 'mount', hint: '7/8 — Dra dit det nya däcket på bilen' },
    { id: 'screw', needTool: 'wrench', hint: '8/8 — Skruva fast! (6 varv)' },
  ];

  const WASH_STEPS = [
    { id: 'pick_hose', needTool: 'hose', hint: '1/4 — Ta vattenslangen 🚿' },
    { id: 'spray', needTool: 'hose', hint: '2/4 — Spruta vatten på bilen! (tryck 8 gånger)' },
    { id: 'pick_sponge', needTool: 'sponge', hint: '3/4 — Ta tvätsvampen 🧽' },
    { id: 'scrub', needTool: 'sponge', hint: '4/4 — Skrubba runt bilen (dra med fingret)' },
  ];

  let state = {
    open: false,
    mode: null,
    step: 0,
    steps: [],
    selectedTool: null,
    desiredWheel: 'standard',
    unscrewCount: 0,
    screwTarget: 6,
    sprayCount: 0,
    sprayTarget: 8,
    scrubProgress: 0,
    scrubTarget: 100,
    wheelRemoved: false,
    wheelMounted: false,
    lifted: false,
    onComplete: null,
    drag: null,
  };

  const $ = (id) => document.getElementById(id);

  function haptic(kind) {
    if (window.BuildGameMobile) {
      BuildGameMobile.haptic(kind || 'tick');
      return;
    }
    if (window.Platform && window.Platform.haptics && window.Platform.haptics.light) {
      Platform.haptics.light();
    } else if (navigator.vibrate) navigator.vibrate(10);
  }

  function hapticSuccess() {
    if (window.BuildGameMobile) BuildGameMobile.haptic('success');
    else haptic('medium');
  }

  function currentStep() {
    return state.steps[state.step] || null;
  }

  function setHint(text) {
    const el = $('gwHint');
    if (el) el.textContent = text;
  }

  function renderProgress() {
    const bar = $('gwProgress');
    if (!bar) return;
    const total = state.steps.length;
    bar.innerHTML = state.steps.map(function (_, i) {
      const cls = i < state.step ? 'is-done' : (i === state.step ? 'is-active' : '');
      return '<span class="gw-progress-dot ' + cls + '"></span>';
    }).join('');
  }

  function renderTools() {
    const wall = $('gwToolWall');
    if (!wall) return;
    const step = currentStep();
    wall.innerHTML = TOOLS.map(function (t) {
      const needed = step && step.needTool === t.id;
      const selected = state.selectedTool === t.id;
      const dim = step && step.needTool && step.needTool !== t.id;
      let cls = 'gw-tool';
      if (selected) cls += ' is-selected';
      if (needed) cls += ' is-needed';
      if (dim) cls += ' is-dim';
      return '<button type="button" class="' + cls + '" data-tool="' + t.id + '">' +
        '<span class="gw-tool-icon">' + t.icon + '</span>' +
        '<span class="gw-tool-label">' + t.label + '</span></button>';
    }).join('');

    wall.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTool(btn.getAttribute('data-tool'));
      });
    });
  }

  function renderTireRack() {
    const rack = $('gwTireRack');
    if (!rack) return;
    const step = currentStep();
    const show = state.mode === 'wheel' && step && step.id === 'pick_tire';
    rack.hidden = !show;
    if (!show) return;

    rack.innerHTML = '<p class="gw-rack-title">Välj däck</p><div class="gw-rack-row">' +
      TIRE_OPTIONS.map(function (t) {
        const active = state.desiredWheel === t.id ? ' is-picked' : '';
        return '<button type="button" class="gw-rack-tire' + active + '" data-tire="' + t.id + '">' +
          '<span class="gw-rack-tire-visual" data-tire-type="' + t.id + '"></span>' +
          '<span>' + t.emoji + ' ' + t.label + '</span></button>';
      }).join('') + '</div>';

    rack.querySelectorAll('[data-tire]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.desiredWheel = btn.getAttribute('data-tire');
        haptic();
        renderTireRack();
        advanceAfterPickTire();
      });
    });
  }

  const WHEEL_ZONE_STEPS = ['unscrew', 'remove', 'pick_tire', 'mount', 'screw'];

  function updateArena() {
    const arena = $('gwArena');
    if (!arena) return;
    arena.classList.toggle('is-lifted', state.lifted);
    arena.classList.toggle('is-wheel-off', state.wheelRemoved && !state.wheelMounted);
    arena.classList.toggle('is-wheel-on', state.wheelMounted);

    const sprayMeter = $('gwSprayMeter');
    const scrubMeter = $('gwScrubMeter');
    const step = currentStep();

    const wheelZone = $('gwWheelZone');
    if (wheelZone) {
      const showZone = state.mode === 'wheel' && step && WHEEL_ZONE_STEPS.indexOf(step.id) >= 0;
      wheelZone.hidden = !showZone;
    }
    if (sprayMeter) sprayMeter.hidden = !(state.mode === 'wash' && step && (step.id === 'spray' || step.id === 'pick_hose'));
    if (scrubMeter) scrubMeter.hidden = !(state.mode === 'wash' && step && step.id === 'scrub');

    const wheelEl = $('gwWheel');
    if (wheelEl) {
      wheelEl.setAttribute('data-tire-type', state.desiredWheel);
      wheelEl.hidden = !!(step && step.id === 'pick_tire');
      wheelEl.classList.toggle('is-dragging', !!(state.drag && state.drag.type === 'wheel'));
      if (state.drag && (state.drag.type === 'wheel' || state.drag.type === 'wheel-mount')) {
        wheelEl.style.transform = 'translate(' + state.drag.dx + 'px,' + state.drag.dy + 'px)';
      } else if (step && step.id === 'mount' && state.wheelRemoved && !state.wheelMounted) {
        wheelEl.style.transform = 'translate(70px, 55px) scale(0.95)';
      } else if (state.wheelRemoved && !state.wheelMounted) {
        wheelEl.style.transform = 'translate(0, 0)';
      } else {
        wheelEl.style.transform = '';
      }
    }

    const bolts = $('gwBolts');
    if (bolts) {
      const turns = state.mode === 'wheel' && currentStep()
        ? (currentStep().id === 'unscrew' ? state.unscrewCount : (currentStep().id === 'screw' ? state.unscrewCount : 0))
        : 0;
      bolts.style.setProperty('--bolt-turn', turns * 60 + 'deg');
      bolts.classList.toggle('is-loose', currentStep() && currentStep().id === 'unscrew' && state.unscrewCount >= state.screwTarget);
    }

    const scrub = $('gwScrubFill');
    if (scrub) scrub.style.width = state.scrubProgress + '%';

    const spray = $('gwSprayFill');
    if (spray) spray.style.width = Math.min(100, (state.sprayCount / state.sprayTarget) * 100) + '%';
  }

  function refresh() {
    const step = currentStep();
    if (step) setHint(step.hint);
    renderProgress();
    renderTools();
    renderTireRack();
    updateArena();
  }

  function selectTool(toolId) {
    const step = currentStep();
    if (step && step.needTool && step.needTool !== toolId) {
      setHint('Fel verktyg! Du behöver: ' + (TOOLS.find(function (t) { return t.id === step.needTool; }) || {}).label);
      haptic();
      return;
    }
    state.selectedTool = toolId;
    haptic();
    renderTools();

    if (step && step.id === 'pick_jack' && toolId === 'jack') {
      state.step++;
      refresh();
    } else if (step && step.id === 'pick_wrench' && toolId === 'wrench') {
      state.step++;
      state.unscrewCount = 0;
      refresh();
    } else if (step && step.id === 'pick_hose' && toolId === 'hose') {
      state.step++;
      state.sprayCount = 0;
      refresh();
    } else if (step && step.id === 'pick_sponge' && toolId === 'sponge') {
      state.step++;
      state.scrubProgress = 0;
      refresh();
    }
  }

  function advanceAfterPickTire() {
    const step = currentStep();
    if (!step || step.id !== 'pick_tire') return;
    state.step++;
    state.wheelMounted = false;
    refresh();
  }

  function nextStep() {
    state.step++;
    state.unscrewCount = 0;
    refresh();
  }

  function finish(result) {
    const cb = state.onComplete;
    close();
    if (typeof cb === 'function') cb(result);
  }

  function handleLift() {
    if (!state.lifted) {
      state.lifted = true;
      haptic();
      showBurst('⬆️', 'Bilen är upplyft!');
      nextStep();
    }
  }

  function handleUnscrewTap() {
    state.unscrewCount++;
    haptic();
    $('gwBolts') && $('gwBolts').classList.add('is-turning');
    setTimeout(function () { $('gwBolts') && $('gwBolts').classList.remove('is-turning'); }, 180);
    if (state.unscrewCount >= state.screwTarget) {
      showBurst('🔩', 'Skruvarna är lossa!');
      hapticSuccess();
      setTimeout(nextStep, 400);
    } else {
      setHint('Skruva loss… ' + state.unscrewCount + '/' + state.screwTarget);
    }
    updateArena();
  }

  function handleScrewTap() {
    state.unscrewCount++;
    haptic();
    if (state.unscrewCount >= state.screwTarget) {
      showBurst('✅', 'Däcket sitter fast!');
      setTimeout(function () {
        finish({ mode: 'wheel', wheels: state.desiredWheel });
      }, 500);
    } else {
      setHint('Skruva fast… ' + state.unscrewCount + '/' + state.screwTarget);
    }
    updateArena();
  }

  function handleSprayTap() {
    state.sprayCount++;
    spawnArenaParticle(['💧', '🫧', '💦']);
    haptic();
    if (state.sprayCount >= state.sprayTarget) {
      showBurst('🫧', 'Bilen är blöt och redo att skrubbas!');
      setTimeout(nextStep, 450);
    } else {
      setHint('Spruta… ' + state.sprayCount + '/' + state.sprayTarget);
    }
    updateArena();
  }

  function handleScrub(dx, dy) {
    state.scrubProgress = Math.min(state.scrubTarget, state.scrubProgress + Math.sqrt(dx * dx + dy * dy) * 0.15);
    if (Math.random() > 0.6) spawnArenaParticle(['🫧', '✨']);
    updateArena();
    if (state.scrubProgress >= state.scrubTarget) {
      showBurst('✨', 'Så ren och fin!');
      setTimeout(function () {
        finish({ mode: 'wash', cleanliness: 100 });
      }, 500);
    }
  }

  function spawnArenaParticle(emojis) {
    const arena = $('gwArena');
    if (!arena) return;
    const el = document.createElement('span');
    el.className = 'gw-float-particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = (20 + Math.random() * 60) + '%';
    el.style.top = (30 + Math.random() * 40) + '%';
    arena.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function showBurst(emoji, text) {
    const b = $('gwBurst');
    if (!b) return;
    b.innerHTML = '<span class="gw-burst-emoji">' + emoji + '</span><span>' + text + '</span>';
    b.classList.add('is-visible');
    clearTimeout(showBurst._t);
    showBurst._t = setTimeout(function () { b.classList.remove('is-visible'); }, 1400);
  }

  function onArenaClick(e) {
    if (!state.open) return;
    const step = currentStep();
    if (!step) return;

    if (step.id === 'lift' && state.selectedTool === 'jack') {
      handleLift();
      return;
    }
    if (step.id === 'unscrew' && state.selectedTool === 'wrench') {
      if (e.target.closest('#gwWheel') || e.target.closest('#gwBolts')) handleUnscrewTap();
      return;
    }
    if (step.id === 'screw' && state.selectedTool === 'wrench') {
      if (e.target.closest('#gwWheel') || e.target.closest('#gwBolts')) handleScrewTap();
      return;
    }
    if (step.id === 'spray' && state.selectedTool === 'hose') {
      handleSprayTap();
      return;
    }
  }

  function onPointerDown(e) {
    const step = currentStep();
    if (!step) return;

    if (step.id === 'remove' && !state.wheelRemoved) {
      if (!e.target.closest('#gwWheel')) return;
      state.drag = { type: 'wheel', startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
      e.preventDefault();
      return;
    }
    if (step.id === 'mount' && state.wheelRemoved && !state.wheelMounted) {
      if (!e.target.closest('#gwWheel')) return;
      state.drag = { type: 'wheel-mount', startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
      e.preventDefault();
      return;
    }
    if (step.id === 'scrub' && state.selectedTool === 'sponge') {
      state.drag = { type: 'scrub', lastX: e.clientX, lastY: e.clientY };
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!state.drag) return;
    const step = currentStep();

    if (state.drag.type === 'wheel') {
      state.drag.dx = e.clientX - state.drag.startX;
      state.drag.dy = e.clientY - state.drag.startY;
      updateArena();
      if (state.drag.dy > 70 || Math.abs(state.drag.dx) > 90) {
        state.wheelRemoved = true;
        state.drag = null;
        haptic();
        showBurst('🛞', 'Däcket är av!');
        setTimeout(nextStep, 400);
        updateArena();
      }
      return;
    }
    if (state.drag.type === 'wheel-mount') {
      state.drag.dx = e.clientX - state.drag.startX;
      state.drag.dy = e.clientY - state.drag.startY;
      updateArena();
      if (state.drag.dy < -40 && Math.abs(state.drag.dx) < 60) {
        state.wheelMounted = true;
        state.drag = null;
        haptic();
        showBurst('🛞', 'Däcket sitter på plats!');
        state.step++;
        state.unscrewCount = 0;
        refresh();
      }
      return;
    }
    if (state.drag.type === 'scrub' && step && step.id === 'scrub') {
      const dx = e.clientX - state.drag.lastX;
      const dy = e.clientY - state.drag.lastY;
      state.drag.lastX = e.clientX;
      state.drag.lastY = e.clientY;
      handleScrub(dx, dy);
    }
  }

  function onPointerUp() {
    state.drag = null;
    updateArena();
  }

  function bindArena() {
    const arena = $('gwArena');
    if (!arena || arena._gwBound) return;
    arena._gwBound = true;
    arena.addEventListener('click', onArenaClick);
    arena.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function open(opts) {
    opts = opts || {};
    if (window.BuildGameMobile) BuildGameMobile.lockScroll();
    state.open = true;
    state.mode = opts.mode || 'wheel';
    state.onComplete = opts.onComplete || null;
    state.desiredWheel = opts.desiredWheel || 'standard';
    state.step = 0;
    state.selectedTool = null;
    state.unscrewCount = 0;
    state.sprayCount = 0;
    state.scrubProgress = 0;
    state.wheelRemoved = false;
    state.wheelMounted = false;
    state.lifted = false;
    state.drag = null;

    state.steps = state.mode === 'wash' ? WASH_STEPS : WHEEL_STEPS;

    const overlay = $('garageWorkshop');
    if (overlay) {
      overlay.hidden = false;
      overlay.classList.add('is-open');
    }
    $('gwTitle').textContent = state.mode === 'wash' ? '🫧 Tvättstation' : '🛞 Byt däck';
    bindArena();
    refresh();
  }

  function close() {
    state.open = false;
    state.drag = null;
    if (window.BuildGameMobile) BuildGameMobile.unlockScroll();
    const overlay = $('garageWorkshop');
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
    }
  }

  function isOpen() {
    return state.open;
  }

  $('gwClose') && $('gwClose').addEventListener('click', function () {
    close();
  });

  window.GarageWorkshop = { open: open, close: close, isOpen: isOpen };
})();
