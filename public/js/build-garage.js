/**
 * build-garage.js — Garage customization + mecka (Fas B preview)
 */
(function () {
  'use strict';

  const PREVIEW_OPTIONS = {
    colors: [
      { id: 'racer_red', hex: '#E53935', label: 'Racer-röd', filter: 'none' },
      { id: 'ocean_blue', hex: '#3B82F6', label: 'Oceanblå', filter: 'hue-rotate(195deg) saturate(1.15)' },
      { id: 'forest_green', hex: '#22C55E', label: 'Skogsgrön', filter: 'hue-rotate(95deg) saturate(1.1)' },
      { id: 'sun_gold', hex: '#F5A623', label: 'Solguld', filter: 'hue-rotate(35deg) saturate(1.25) brightness(1.05)' },
      { id: 'lavender', hex: '#8B5CF6', label: 'Lila', filter: 'hue-rotate(260deg) saturate(1.2)' },
      { id: 'navy', hex: '#1B2340', label: 'Midnattsblå', filter: 'hue-rotate(220deg) saturate(0.7) brightness(0.75)' },
    ],
    wheels: [
      { id: 'standard', label: 'Standard', icon: '⚙️' },
      { id: 'sport', label: 'Sport', icon: '🏎️' },
      { id: 'offroad', label: 'Breda', icon: '🛞' },
    ],
    decals: [
      { id: 'none', label: 'Ingen', icon: '' },
      { id: 'stars', label: 'Stjärnor', icon: '⭐' },
      { id: 'flame', label: 'Eld', icon: '🔥' },
      { id: 'stripe', label: 'Ränder', icon: '〰️' },
    ],
  };

  const PREVIEW_ACTIONS = [
    { id: 'wash', label: 'Tvätta', icon: '🫧' },
    { id: 'polish', label: 'Polera', icon: '✨' },
    { id: 'tune', label: 'Mecka motor', icon: '🔧' },
    { id: 'honk', label: 'Tuta', icon: '📣' },
    { id: 'race', label: 'Kör ett varv', icon: '🏁' },
  ];

  let state = {
    project: null,
    options: null,
    actions: [],
    saving: false,
    preview: false,
  };

  const $ = (id) => document.getElementById(id);

  function isChildUser(user) {
    return !!(user && user.type === 'child');
  }

  function isPreviewMode() {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  function showToast(msg) {
    const el = $('garageToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2600);
  }

  function haptic() {
    if (window.Platform && window.Platform.haptics && typeof window.Platform.haptics.light === 'function') {
      window.Platform.haptics.light();
    } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(function () {});
    } else if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  function hapticHeavy() {
    if (window.Platform && window.Platform.haptics && typeof window.Platform.haptics.medium === 'function') {
      window.Platform.haptics.medium();
    } else if (navigator.vibrate) {
      navigator.vibrate([20, 30, 20]);
    } else {
      haptic();
    }
  }

  function updateTuneBar(level) {
    const bar = $('tuneBar');
    if (!bar) return;
    const n = Math.max(0, Math.min(5, level || 0));
    bar.querySelectorAll('i').forEach(function (seg, idx) {
      seg.classList.toggle('is-lit', idx < n);
    });
  }

  function pulseTuneBar() {
    const bar = $('tuneBar');
    if (!bar) return;
    bar.classList.add('is-pulse');
    clearTimeout(pulseTuneBar._t);
    pulseTuneBar._t = setTimeout(function () {
      bar.classList.remove('is-pulse');
    }, 1100);
  }

  function spawnParticles(wrap, opts) {
    const layer = $('carFx');
    if (!layer || !wrap) return;
    const count = opts.count || 10;
    const emojis = opts.emojis || ['✨'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'garage-particle garage-particle--' + (opts.type || 'sparkle');
      el.textContent = emojis[i % emojis.length];
      el.style.left = (opts.xMin + Math.random() * (opts.xMax - opts.xMin)) + '%';
      el.style.top = (opts.yMin + Math.random() * (opts.yMax - opts.yMin)) + '%';
      el.style.animationDelay = (Math.random() * 0.35) + 's';
      layer.appendChild(el);
      setTimeout(function () { el.remove(); }, opts.duration || 1400);
    }
  }

  function clearActionClasses(wrap) {
    if (!wrap) return;
    wrap.classList.remove('is-washing', 'is-honking', 'is-racing', 'is-polishing', 'is-tuning');
  }

  function playActionFx(actionId) {
    const wrap = $('carWrap');
    if (!wrap) return;

    clearActionClasses(wrap);
    void wrap.offsetWidth;

    switch (actionId) {
      case 'wash':
        wrap.classList.add('is-washing');
        spawnParticles(wrap, {
          type: 'bubble',
          emojis: ['🫧', '💧', '🫧', '✨'],
          count: 16,
          xMin: 8, xMax: 88, yMin: 35, yMax: 75,
          duration: 1500,
        });
        setTimeout(function () { wrap.classList.remove('is-washing'); }, 1600);
        break;
      case 'polish':
        wrap.classList.add('is-polishing');
        spawnParticles(wrap, {
          type: 'sparkle',
          emojis: ['✨', '⭐', '🌟', '✨'],
          count: 14,
          xMin: 5, xMax: 92, yMin: 15, yMax: 80,
          duration: 1000,
        });
        setTimeout(function () { wrap.classList.remove('is-polishing'); }, 1000);
        break;
      case 'tune':
        wrap.classList.add('is-tuning');
        spawnParticles(wrap, {
          type: 'smoke',
          emojis: ['💨', '⚙️', '💨'],
          count: 8,
          xMin: 20, xMax: 55, yMin: 20, yMax: 45,
          duration: 1100,
        });
        pulseTuneBar();
        setTimeout(function () { wrap.classList.remove('is-tuning'); }, 900);
        break;
      case 'honk':
        wrap.classList.add('is-honking');
        spawnParticles(wrap, {
          type: 'dust',
          emojis: ['📣', '💨'],
          count: 6,
          xMin: 0, xMax: 25, yMin: 40, yMax: 65,
          duration: 700,
        });
        setTimeout(function () { wrap.classList.remove('is-honking'); }, 800);
        break;
      case 'race':
        wrap.classList.add('is-racing');
        spawnParticles(wrap, {
          type: 'dust',
          emojis: ['💨', '🏁', '💨'],
          count: 10,
          xMin: 0, xMax: 30, yMin: 55, yMax: 85,
          duration: 900,
        });
        setTimeout(function () { wrap.classList.remove('is-racing'); }, 1250);
        break;
      default:
        break;
    }
  }

  function flashActionButton(actionId) {
    const btn = document.querySelector('.garage-action-btn[data-action="' + actionId + '"]');
    if (!btn) return;
    btn.classList.add('is-pressed');
    setTimeout(function () { btn.classList.remove('is-pressed'); }, 320);
  }

  function showApp() {
    $('garageLoading').classList.add('hidden');
    $('garageLogin').style.display = 'none';
    $('garageApp').style.display = 'flex';
  }

  function showLogin(message) {
    $('garageLoading').classList.add('hidden');
    $('garageApp').style.display = 'none';
    const login = $('garageLogin');
    const msgEl = $('garageLoginMsg');
    if (msgEl && message) msgEl.textContent = message;
    login.style.display = 'flex';
  }

  function applyCustomization(c) {
    if (!c) return;
    const colorOpt = (state.options.colors || []).find(function (x) { return x.id === c.color_id; });
    const carImg = $('carImg');
    if (carImg && colorOpt) {
      carImg.style.filter = 'drop-shadow(0 12px 28px rgba(0,0,0,0.35)) ' + (colorOpt.filter || 'none');
      if (c.cleanliness < 70) carImg.classList.add('is-dirty');
      else carImg.classList.remove('is-dirty');
    }

    const wrap = $('carWrap');
    if (wrap) {
      wrap.setAttribute('data-wheel', c.wheels || 'standard');
      wrap.setAttribute('data-decal', c.decal || 'none');
    }

    document.querySelectorAll('.garage-tire').forEach(function (tire) {
      tire.setAttribute('data-tire-type', c.wheels || 'standard');
    });

    if ($('statClean')) $('statClean').textContent = '✨ Ren ' + Math.round(c.cleanliness) + '%';
    if ($('statTune')) $('statTune').textContent = '🔧 Motor ' + (c.tune_level || 0) + '/5';
    updateTuneBar(c.tune_level || 0);

    document.querySelectorAll('.garage-swatch').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-id') === c.color_id);
    });
    document.querySelectorAll('.garage-chip[data-kind]').forEach(function (el) {
      const kind = el.getAttribute('data-kind');
      const val = el.getAttribute('data-val');
      let active = false;
      if (kind === 'wheels') active = c.wheels === val;
      if (kind === 'decal') active = c.decal === val;
      el.classList.toggle('is-active', active);
    });
  }

  function renderOptions() {
    const colors = state.options.colors || [];
    $('colorRow').innerHTML = colors.map(function (c) {
      return '<button type="button" class="garage-swatch" data-id="' + c.id + '" data-kind="color" ' +
        'style="background:' + c.hex + '" title="' + c.label + '" aria-label="' + c.label + '"></button>';
    }).join('');

    $('wheelRow').innerHTML = (state.options.wheels || []).map(function (w) {
      return '<button type="button" class="garage-chip is-workshop" data-kind="wheels" data-val="' + w.id + '">' +
        w.icon + ' ' + w.label + '</button>';
    }).join('');

    $('decalRow').innerHTML = (state.options.decals || []).map(function (d) {
      const label = d.id === 'none' ? 'Ingen' : d.label;
      const icon = d.icon || '—';
      return '<button type="button" class="garage-chip" data-kind="decal" data-val="' + d.id + '">' +
        icon + ' ' + label + '</button>';
    }).join('');

    $('actionRow').innerHTML = (state.actions || []).map(function (a) {
      return '<button type="button" class="garage-action-btn garage-action-btn--' + a.id + '" data-action="' + a.id + '">' +
        '<span class="garage-action-icon" aria-hidden="true">' + a.icon + '</span>' +
        '<span class="garage-action-label">' + a.label + '</span></button>';
    }).join('');

    bindPanelEvents();
  }

  function onWorkshopComplete(result) {
    if (!result) return;
    if (result.mode === 'wheel' && result.wheels) {
      patchCustomization({ wheels: result.wheels });
      showToast('Nytt däck monterat! 🛞');
      playActionFx('race');
    } else if (result.mode === 'wash') {
      if (state.preview) {
        state.project.customization = normalizeLocalCustomization(
          Object.assign({}, state.project.customization, { cleanliness: 100 })
        );
        applyCustomization(state.project.customization);
      } else {
        runActionAfterWorkshop('wash');
      }
      showToast('Bilen är skinande ren! 🫧');
      playActionFx('wash');
    }
    hapticHeavy();
  }

  function openWheelWorkshop(wheelId) {
    if (!window.GarageWorkshop) return;
    GarageWorkshop.open({
      mode: 'wheel',
      desiredWheel: wheelId,
      onComplete: onWorkshopComplete,
    });
  }

  function openWashWorkshop() {
    if (!window.GarageWorkshop) return;
    GarageWorkshop.open({
      mode: 'wash',
      onComplete: onWorkshopComplete,
    });
  }

  async function runActionAfterWorkshop(actionId) {
    try {
      const res = await Auth.api('/api/me/build/garage/action', {
        method: 'POST',
        body: JSON.stringify({ action: actionId }),
      });
      state.project.customization = res.customization;
      applyCustomization(res.customization);
    } catch (err) {
      showToast(err.message || 'Kunde inte spara');
    }
  }

  function normalizeLocalCustomization(c) {
    const base = {
      color_id: 'racer_red',
      wheels: 'standard',
      decal: 'none',
      cleanliness: 100,
      tune_level: 0,
    };
    return Object.assign(base, c || {});
  }

  function runPreviewAction(actionId) {
    const c = normalizeLocalCustomization(state.project.customization);
    let message = '';

    switch (actionId) {
      case 'wash':
        c.cleanliness = 100;
        message = 'Så fin och ren! 🫧';
        break;
      case 'polish':
        c.cleanliness = Math.min(100, c.cleanliness + 15);
        message = 'Wow, den glänser! ✨';
        break;
      case 'tune':
        c.tune_level = Math.min(5, c.tune_level + 1);
        message = c.tune_level >= 5 ? 'Motorn är maxad! 🔧' : 'Bra meckat — motorn surrar! 🔧';
        break;
      case 'honk':
        message = 'BRUM BRUM! 📣';
        break;
      case 'race':
        message = 'Vroom runt garaget! 🏁';
        break;
      default:
        return;
    }

    state.project.customization = c;
    applyCustomization(c);
    playActionFx(actionId);
    flashActionButton(actionId);
    showToast(message);
    if (actionId === 'honk' || actionId === 'race') hapticHeavy();
    else haptic();
  }

  async function patchCustomization(patch) {
    if (state.saving) return;

    if (state.preview) {
      state.project.customization = normalizeLocalCustomization(
        Object.assign({}, state.project.customization, patch)
      );
      applyCustomization(state.project.customization);
      haptic();
      return;
    }

    state.saving = true;
    try {
      const res = await Auth.api('/api/me/build/garage', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      state.project.customization = res.customization;
      applyCustomization(res.customization);
      haptic();
    } catch (err) {
      showToast(err.message || 'Kunde inte spara');
    } finally {
      state.saving = false;
    }
  }

  async function runAction(actionId) {
    if (window.GarageWorkshop && GarageWorkshop.isOpen()) return;

    if (actionId === 'wash') {
      openWashWorkshop();
      return;
    }

    if (state.preview) {
      runPreviewAction(actionId);
      return;
    }
    if (state.saving) return;
    state.saving = true;
    try {
      const res = await Auth.api('/api/me/build/garage/action', {
        method: 'POST',
        body: JSON.stringify({ action: actionId }),
      });
      state.project.customization = res.customization;
      applyCustomization(res.customization);
      playActionFx(actionId);
      flashActionButton(actionId);
      showToast(res.message);
      if (actionId === 'honk' || actionId === 'race') hapticHeavy();
      else haptic();
    } catch (err) {
      showToast(err.message || 'Något gick fel');
    } finally {
      state.saving = false;
    }
  }

  function bindPanelEvents() {
    $('colorRow').querySelectorAll('.garage-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        patchCustomization({ color_id: btn.getAttribute('data-id') });
      });
    });
    document.querySelectorAll('.garage-chip[data-kind="wheels"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openWheelWorkshop(btn.getAttribute('data-val'));
      });
    });
    document.querySelectorAll('.garage-chip[data-kind="decal"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        patchCustomization({ decal: btn.getAttribute('data-val') });
      });
    });
    $('actionRow').querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        runAction(btn.getAttribute('data-action'));
      });
    });
  }

  function mountGarageUi(data, preview) {
    state.preview = preview;
    state.project = data.project;
    state.options = data.options;
    state.actions = data.actions;

    $('garageTitle').textContent = '🏎️ ' + (data.project.name || 'Garaget');
    $('garageSub').textContent = preview
      ? 'Förhandsvisning — logga in som barn för att spara'
      : 'Din ' + (data.project.name || 'bil').toLowerCase() + ' — mecka och kör!';

    const banner = $('garagePreviewBanner');
    if (banner) banner.hidden = !preview;

    renderOptions();
    applyCustomization(data.project.customization);
    showApp();
  }

  function startPreview() {
    mountGarageUi({
      project: {
        name: 'Racerbil',
        customization: normalizeLocalCustomization({}),
      },
      options: PREVIEW_OPTIONS,
      actions: PREVIEW_ACTIONS,
    }, true);
  }

  async function init() {
    if (!window.Auth || typeof Auth.api !== 'function') {
      showLogin('Kunde inte ladda inloggning. Ladda om sidan.');
      return;
    }

    try {
      let me = null;
      try {
        me = await Auth.api('/api/auth/me');
      } catch (_) {
        me = null;
      }

      if (!isChildUser(me)) {
        if (isPreviewMode()) {
          startPreview();
          return;
        }
        if (me && me.type === 'parent') {
          showLogin('Du är inloggad som förälder. Låt barnet logga in med PIN — eller lägg till ?preview=1 i URL:en för att testa gränssnittet.');
          return;
        }
        showLogin('Logga in som barn för att mecka i garaget.');
        return;
      }

      const data = await Auth.api('/api/me/build/garage');
      mountGarageUi(data, false);
    } catch (err) {
      console.error('[GARAGE]', err);
      if (isPreviewMode()) {
        startPreview();
        showToast('API fel — visar förhandsvisning');
        return;
      }
      const msg = (err && err.message) ? err.message : 'Kunde inte öppna garaget.';
      if (msg.indexOf('migrate') !== -1 || msg.indexOf('relation') !== -1) {
        showLogin(msg + ' Kör: npm run migrate');
      } else {
        showLogin(msg + ' Prova ?preview=1 eller logga in igen.');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
