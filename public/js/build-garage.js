/**
 * build-garage.js — Garage customization + mecka (Fas B preview)
 */
(function () {
  'use strict';

  let state = {
    project: null,
    options: null,
    actions: [],
    saving: false,
  };

  const $ = (id) => document.getElementById(id);

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
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(function () {});
    } else if (navigator.vibrate) {
      navigator.vibrate(12);
    }
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

    ['wheelFront', 'wheelRear'].forEach(function (id) {
      const w = $(id);
      if (w) w.setAttribute('data-wheel', c.wheels || 'standard');
    });

    const decalEl = $('carDecal');
    const decalOpt = (state.options.decals || []).find(function (d) { return d.id === c.decal; });
    if (decalEl) {
      if (c.decal && c.decal !== 'none' && decalOpt && decalOpt.icon) {
        decalEl.textContent = decalOpt.icon;
        decalEl.hidden = false;
      } else {
        decalEl.hidden = true;
      }
    }

    $('statClean').textContent = '✨ Ren ' + Math.round(c.cleanliness) + '%';
    $('statTune').textContent = '🔧 Motor ' + (c.tune_level || 0) + '/5';

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
      return '<button type="button" class="garage-chip" data-kind="wheels" data-val="' + w.id + '">' +
        w.icon + ' ' + w.label + '</button>';
    }).join('');

    $('decalRow').innerHTML = (state.options.decals || []).map(function (d) {
      const label = d.id === 'none' ? 'Ingen' : d.label;
      const icon = d.icon || '—';
      return '<button type="button" class="garage-chip" data-kind="decal" data-val="' + d.id + '">' +
        icon + ' ' + label + '</button>';
    }).join('');

    $('actionRow').innerHTML = (state.actions || []).map(function (a) {
      return '<button type="button" class="garage-action-btn" data-action="' + a.id + '">' +
        '<span>' + a.icon + '</span><span>' + a.label + '</span></button>';
    }).join('');

    bindPanelEvents();
  }

  async function patchCustomization(patch) {
    if (state.saving) return;
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
    if (state.saving) return;
    state.saving = true;
    const wrap = $('carWrap');
    try {
      const res = await Auth.api('/api/me/build/garage/action', {
        method: 'POST',
        body: JSON.stringify({ action: actionId }),
      });
      state.project.customization = res.customization;
      applyCustomization(res.customization);
      showToast(res.message);
      haptic();

      if (actionId === 'honk' && wrap) {
        wrap.classList.add('is-honking');
        setTimeout(function () { wrap.classList.remove('is-honking'); }, 700);
      }
      if (actionId === 'race' && wrap) {
        wrap.classList.add('is-racing');
        setTimeout(function () { wrap.classList.remove('is-racing'); }, 1200);
      }
      if (actionId === 'wash' && wrap) {
        wrap.classList.add('is-washing');
        setTimeout(function () { wrap.classList.remove('is-washing'); }, 1400);
      }
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
        patchCustomization({ wheels: btn.getAttribute('data-val') });
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

  async function init() {
    const loading = $('garageLoading');
    const login = $('garageLogin');
    const app = $('garageApp');

    try {
      await Auth.init();
      if (!Auth.isChild()) {
        loading.classList.add('hidden');
        login.style.display = '';
        return;
      }

      const data = await Auth.api('/api/me/build/garage');
      state.project = data.project;
      state.options = data.options;
      state.actions = data.actions;

      $('garageTitle').textContent = '🏎️ ' + (data.project.name || 'Garaget');
      $('garageSub').textContent = 'Din ' + (data.project.name || 'bil').toLowerCase() + ' — mecka och kör!';

      renderOptions();
      applyCustomization(data.project.customization);

      loading.classList.add('hidden');
      app.style.display = '';
    } catch (err) {
      console.error('[GARAGE]', err);
      loading.classList.add('hidden');
      if (!Auth.isChild()) {
        login.style.display = '';
      } else {
        showToast('Kunde inte öppna garaget');
        login.innerHTML = '<p>' + (err.message || 'Fel') + '</p><a href="/child-login">Logga in igen</a>';
        login.style.display = '';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
