/**
 * ambient-object-runtime.js — spawn, tap, animation, emit action (Min värld).
 */
(function () {
  'use strict';

  const TAP_RESET_MS = 1200;
  const DEFAULT_COOLDOWN_MS = 800;
  const SOUND_MS = 400;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function director() {
    return window.AmbientDirector || null;
  }

  function prefersReducedMotion(ctx) {
    if (ctx && typeof ctx.prefersReducedMotion === 'boolean') {
      return ctx.prefersReducedMotion;
    }
    return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function hitAreaStyle(hit) {
    const h = hit || { x: 0, y: 0, w: 0.15, h: 0.15 };
    return 'left:' + ((h.x || 0) * 100) + '%;top:' + ((h.y || 0) * 100) + '%;' +
      'width:' + ((h.w || 0.15) * 100) + '%;height:' + ((h.h || 0.15) * 100) + '%;';
  }

  function tokenClass(prefix, token) {
    if (!token) return '';
    return prefix + token;
  }

  function getPack() {
    return window.AmbientObjectsPack || null;
  }

  function findProp(state, propId) {
    if (!state || !propId) return null;
    return (state.props || []).find(function (p) { return p.prop_id === propId; }) || null;
  }

  function objectVisible(obj, state, ctx) {
    if (obj.show_when) {
      const keys = Object.keys(obj.show_when);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if ((state && state[key]) !== obj.show_when[key]) return false;
      }
    }
    if (typeof ctx.filterObject === 'function') {
      return ctx.filterObject(obj, state);
    }
    return true;
  }

  function ariaLabelForObject(obj, state, ctx) {
    if (typeof ctx.getAriaLabel === 'function') {
      const custom = ctx.getAriaLabel(obj, state);
      if (custom) return custom;
    }
    return obj.aria_label_sv || obj.object_id;
  }

  function extraClassesForObject(obj, state, ctx) {
    const classes = [];
    if (obj.legacy_classes) {
      obj.legacy_classes.forEach(function (c) { classes.push(c); });
    }
    if (obj.prop_id) {
      const prop = findProp(state, obj.prop_id);
      if (prop) {
        if (prop.unlocked) classes.push('is-unlocked');
        else classes.push('is-locked');
        if (prop.visual_token || obj.visual_token) {
          classes.push('mh-token--' + (prop.visual_token || obj.visual_token));
        }
      }
    }
    if (typeof ctx.getExtraClasses === 'function') {
      const more = ctx.getExtraClasses(obj, state);
      if (more) {
        if (Array.isArray(more)) more.forEach(function (c) { classes.push(c); });
        else classes.push(more);
      }
    }
    return classes;
  }

  function idleClasses(obj) {
    const classes = [];
    if (obj.idle) classes.push(tokenClass('ao-idle--', obj.idle));
    return classes;
  }

  function playTapAnimation(btn, obj, reduced) {
    const dir = director();
    if (!obj.tap_animation || reduced) return false;
    if (dir && !dir.requestAnimation(TAP_RESET_MS)) return false;

    btn.classList.add('ao-hotspot--tapped');
    btn.classList.add(tokenClass('ao-tap--', obj.tap_animation));
    if (obj.visual_token) btn.classList.add('mh-token-active--' + obj.visual_token);

    setTimeout(function () {
      btn.classList.remove('ao-hotspot--tapped');
      btn.classList.remove(tokenClass('ao-tap--', obj.tap_animation));
      if (obj.visual_token) btn.classList.remove('mh-token-active--' + obj.visual_token);
    }, TAP_RESET_MS);
    return true;
  }

  function spawnParticle(layer, btn, obj, reduced) {
    if (!layer || !btn || !obj.particle || reduced) return false;
    const dir = director();
    if (dir && !dir.requestParticle(TAP_RESET_MS + 200)) return false;

    const el = document.createElement('span');
    el.className = 'ao-particle ' + tokenClass('ao-particle--', obj.particle);
    el.setAttribute('aria-hidden', 'true');
    if (obj.particle_glyph) el.setAttribute('data-ao-glyph', obj.particle_glyph);

    if (typeof btn.appendChild === 'function') {
      btn.appendChild(el);
    } else {
      const host = layer.querySelector('.ao-particle-layer');
      if (!host) return false;
      host.appendChild(el);
    }

    setTimeout(function () { el.remove(); }, TAP_RESET_MS + 200);
    return true;
  }

  function triggerSceneEffect(canvas, effectId, reduced) {
    if (!canvas || !effectId || reduced) return false;
    const dir = director();
    if (dir && !dir.requestAnimation(TAP_RESET_MS)) return false;

    const cls = effectId === 'garden_path' ? 'is-path-tap'
      : effectId === 'garden_sky' ? 'is-sky-tap'
      : effectId === 'garden_bed' ? 'is-bloom-tap' : null;
    if (!cls) return false;

    canvas.classList.add(cls);
    setTimeout(function () { canvas.classList.remove(cls); }, TAP_RESET_MS);
    return true;
  }

  function fireHaptic(kind, reduced) {
    if (reduced || !kind) return false;
    const dir = director();
    if (dir && !dir.requestSound(SOUND_MS)) return false;
    if (!window.Platform || !window.Platform.haptics) return false;
    if (kind === 'heavy' && window.Platform.haptics.heavy) window.Platform.haptics.heavy();
    else if (kind === 'medium' && window.Platform.haptics.medium) window.Platform.haptics.medium();
    else if (window.Platform.haptics.light) window.Platform.haptics.light();
    return true;
  }

  function renderHint(obj) {
    if (!obj.hint_sv) return '';
    return '<p class="ao-hint ao-hint--' + esc(obj.object_id) + '" aria-hidden="true">' +
      esc(obj.hint_sv) + '</p>';
  }

  function renderObjectButton(obj, state, ctx) {
    const extra = extraClassesForObject(obj, state, ctx);
    const classes = ['ao-hotspot', 'ao-hotspot--' + obj.object_id]
      .concat(extra)
      .concat(idleClasses(obj))
      .join(' ');

    let attrs = ' data-ao-id="' + esc(obj.object_id) + '"';
    if (obj.prop_id) attrs += ' data-prop="' + esc(obj.prop_id) + '"';
    if (obj.idle_glyph) attrs += ' data-ao-idle-glyph="' + esc(obj.idle_glyph) + '"';
    if (obj.data_attrs) {
      Object.keys(obj.data_attrs).forEach(function (key) {
        attrs += ' data-' + key + '="' + esc(obj.data_attrs[key]) + '"';
      });
    }

    const disabled = typeof ctx.isDisabled === 'function' && ctx.isDisabled(obj, state)
      ? ' disabled' : '';

    return '<button type="button" class="' + classes + '"' + attrs +
      ' style="' + hitAreaStyle(obj.hit_area) + '"' +
      ' aria-label="' + esc(ariaLabelForObject(obj, state, ctx)) + '"' +
      disabled + '></button>';
  }

  function renderLayer(sceneId, state, ctx) {
    const pack = getPack();
    if (!pack || typeof pack.getScene !== 'function') return '';

    const objects = pack.getScene(sceneId).filter(function (obj) {
      return objectVisible(obj, state, ctx);
    });

    return '<div class="ao-layer" data-ao-scene="' + esc(sceneId) + '">' +
      objects.map(renderHint).join('') +
      objects.map(function (obj) { return renderObjectButton(obj, state, ctx); }).join('') +
      '<div class="ao-particle-layer" aria-hidden="true"></div>' +
    '</div>';
  }

  function emitAction(obj, btn, sceneId, state, ctx) {
    const payload = {
      sceneId: sceneId,
      objectId: obj.object_id,
      action: obj.action || 'ambient',
      object: obj,
      button: btn,
      state: state,
    };
    if (typeof ctx.onAction === 'function') {
      return ctx.onAction(payload);
    }
    return true;
  }

  function bindLayer(root, sceneId, state, ctx) {
    const pack = getPack();
    if (!pack || !root) return function () {};

    const layer = root.querySelector('.ao-layer[data-ao-scene="' + sceneId + '"]');
    if (!layer) return function () {};

    const handlers = [];

    pack.getScene(sceneId).forEach(function (obj) {
      if (!objectVisible(obj, state, ctx)) return;
      const btn = layer.querySelector('[data-ao-id="' + obj.object_id + '"]');
      if (!btn) return;

      const onClick = async function () {
        if (btn.disabled) return;

        const key = sceneId + ':' + obj.object_id;
        const dir = director();
        const cooldown = obj.cooldown_ms != null ? obj.cooldown_ms : DEFAULT_COOLDOWN_MS;
        if (dir) {
          if (!dir.budgetCooldown(key, cooldown)) return;
        } else if (window.AmbientObjectRuntime && window.AmbientObjectRuntime._isOnCooldown
            && window.AmbientObjectRuntime._isOnCooldown(key)) {
          return;
        }

        const reduced = prefersReducedMotion(ctx);
        playTapAnimation(btn, obj, reduced);
        fireHaptic(obj.haptic, reduced);

        const canvas = root.querySelector('.mh-scene-canvas, .gd-scene-canvas');
        if (obj.scene_effect) triggerSceneEffect(canvas, obj.scene_effect, reduced);
        spawnParticle(layer, btn, obj, reduced);

        if (typeof ctx.onPulse === 'function') ctx.onPulse();
        await emitAction(obj, btn, sceneId, state, ctx);
      };

      btn.addEventListener('click', onClick);
      handlers.push(function () { btn.removeEventListener('click', onClick); });
    });

    return function unbind() {
      handlers.forEach(function (fn) { fn(); });
    };
  }

  function mount(canvas, options) {
    if (!canvas || !options || !options.sceneId) return null;

    const sceneId = options.sceneId;
    const state = options.state || null;
    const ctx = options.context || {};
    const html = renderLayer(sceneId, state, ctx);

    const existing = canvas.querySelector('.ao-layer[data-ao-scene="' + sceneId + '"]');
    if (existing) existing.remove();

    canvas.insertAdjacentHTML('beforeend', html);
    const unbind = bindLayer(
      canvas.closest('.mh-scene, .gd-scene, .cww-scene-stage') || canvas.parentElement || canvas,
      sceneId,
      state,
      ctx
    );

    return {
      sceneId: sceneId,
      unbind: unbind,
      destroy: function () {
        unbind();
        const layer = canvas.querySelector('.ao-layer[data-ao-scene="' + sceneId + '"]');
        if (layer) layer.remove();
      },
    };
  }

  function refresh(root, sceneId, state, ctx) {
    if (!root) return;
    const layer = root.querySelector('.ao-layer[data-ao-scene="' + sceneId + '"]');
    if (!layer) return;

    const pack = getPack();
    if (!pack) return;

    pack.getScene(sceneId).forEach(function (obj) {
      const btn = layer.querySelector('[data-ao-id="' + obj.object_id + '"]');
      if (!btn) return;

      btn.className = ['ao-hotspot', 'ao-hotspot--' + obj.object_id]
        .concat(extraClassesForObject(obj, state, ctx))
        .concat(idleClasses(obj))
        .join(' ');

      btn.setAttribute('aria-label', ariaLabelForObject(obj, state, ctx));
      if (obj.idle_glyph) btn.setAttribute('data-ao-idle-glyph', obj.idle_glyph);
      else btn.removeAttribute('data-ao-idle-glyph');

      if (typeof ctx.isDisabled === 'function' && ctx.isDisabled(obj, state)) {
        btn.setAttribute('disabled', '');
      } else {
        btn.removeAttribute('disabled');
      }
    });
  }

  function clearCooldowns(sceneId) {
    const dir = director();
    if (dir) {
      dir.clearCooldowns(sceneId);
      return;
    }
  }

  window.AmbientObjectRuntime = {
    mount: mount,
    refresh: refresh,
    renderLayer: renderLayer,
    bindLayer: bindLayer,
    hitAreaStyle: hitAreaStyle,
    clearCooldowns: clearCooldowns,
    TAP_RESET_MS: TAP_RESET_MS,
  };
})();
