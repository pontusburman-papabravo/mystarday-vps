/**
 * ambient-object-runtime.js — reusable tappable scene object layer for Min värld.
 */
(function () {
  'use strict';

  const TAP_RESET_MS = 1200;
  const DEFAULT_COOLDOWN_MS = 800;

  const cooldownUntil = new Map();

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
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
        const expected = obj.show_when[key];
        const actual = state && state[key];
        if (actual !== expected) return false;
      }
    }
    if (typeof ctx.filterObject === 'function') {
      return ctx.filterObject(obj, state);
    }
    return true;
  }

  function feedbackForObject(obj, state) {
    if (obj.prop_id) {
      const prop = findProp(state, obj.prop_id);
      if (prop && prop.unlocked && obj.feedback_unlocked_sv) {
        return obj.feedback_unlocked_sv;
      }
    }
    return obj.feedback_sv || null;
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

  function isOnCooldown(key) {
    const until = cooldownUntil.get(key);
    return until != null && Date.now() < until;
  }

  function setCooldown(key, ms) {
    cooldownUntil.set(key, Date.now() + (ms || DEFAULT_COOLDOWN_MS));
  }

  function fireHaptic(kind) {
    if (!window.Platform || !window.Platform.haptics) return;
    if (kind === 'heavy' && window.Platform.haptics.heavy) window.Platform.haptics.heavy();
    else if (kind === 'medium' && window.Platform.haptics.medium) window.Platform.haptics.medium();
    else if (window.Platform.haptics.light) window.Platform.haptics.light();
  }

  function spawnParticle(container, btn, particleClass, reduced) {
    if (!container || !btn || !particleClass || reduced) return;
    const el = document.createElement('span');
    el.className = 'ao-particle ' + particleClass;
    el.setAttribute('aria-hidden', 'true');
    if (typeof btn.appendChild === 'function') {
      btn.appendChild(el);
    } else {
      const layer = container.querySelector('.ao-particle-layer');
      if (!layer) return;
      layer.appendChild(el);
    }
    setTimeout(function () { el.remove(); }, TAP_RESET_MS + 200);
  }

  function playTapAnimation(btn, obj, reduced) {
    btn.classList.add('ao-hotspot--tapped');
    if (obj.tap_class) btn.classList.add(obj.tap_class);
    if (!reduced && obj.visual_token) {
      btn.classList.add('mh-token-active--' + obj.visual_token);
    }
    setTimeout(function () {
      btn.classList.remove('ao-hotspot--tapped');
      if (obj.tap_class) btn.classList.remove(obj.tap_class);
      if (obj.visual_token) btn.classList.remove('mh-token-active--' + obj.visual_token);
    }, TAP_RESET_MS);
  }

  function triggerSceneEffect(canvas, effectId, reduced) {
    if (!canvas || !effectId || reduced) return;
    const cls = effectId === 'garden_path' ? 'is-path-tap'
      : effectId === 'garden_sky' ? 'is-sky-tap'
      : effectId === 'garden_bed' ? 'is-bloom-tap' : null;
    if (!cls) return;
    canvas.classList.add(cls);
    setTimeout(function () { canvas.classList.remove(cls); }, TAP_RESET_MS);
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
      .concat(obj.idle_class ? [obj.idle_class] : [])
      .join(' ');

    let attrs = ' data-ao-id="' + esc(obj.object_id) + '"';
    if (obj.prop_id) attrs += ' data-prop="' + esc(obj.prop_id) + '"';
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

    const hints = objects.map(renderHint).join('');
    const buttons = objects.map(function (obj) {
      return renderObjectButton(obj, state, ctx);
    }).join('');

    return '<div class="ao-layer" data-ao-scene="' + esc(sceneId) + '">' +
      hints +
      buttons +
      '<div class="ao-particle-layer" aria-hidden="true"></div>' +
    '</div>';
  }

  async function dispatchAction(obj, btn, root, state, ctx) {
    const action = obj.action || 'ambient';

    if (action === 'navigate_garden' && typeof ctx.onNavigateGarden === 'function') {
      return ctx.onNavigateGarden(btn);
    }
    if (action === 'open_skattkammaren' && typeof ctx.onOpenSkattkammaren === 'function') {
      ctx.onOpenSkattkammaren(btn);
      return true;
    }
    if (action === 'gameplay_bed' && typeof ctx.onGameplayBed === 'function') {
      return ctx.onGameplayBed(btn);
    }
    if (action === 'scenery_path' && typeof ctx.onSceneryPath === 'function') {
      return ctx.onSceneryPath(btn);
    }

    if (typeof ctx.onAmbient === 'function') {
      ctx.onAmbient(obj, btn);
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
        if (isOnCooldown(key)) return;

        const reduced = prefersReducedMotion(ctx);
        const cooldown = obj.cooldown_ms != null ? obj.cooldown_ms : DEFAULT_COOLDOWN_MS;
        setCooldown(key, cooldown);

        playTapAnimation(btn, obj, reduced);
        if (obj.haptic && !reduced) fireHaptic(obj.haptic);

        const canvas = root.querySelector('.mh-scene-canvas, .gd-scene-canvas');
        if (obj.scene_effect) triggerSceneEffect(canvas, obj.scene_effect, reduced);
        spawnParticle(layer, btn, obj.particle_class, reduced);

        const feedback = feedbackForObject(obj, state);
        if (feedback && typeof ctx.showFeedback === 'function') {
          ctx.showFeedback(feedback);
        }
        if (typeof ctx.onPulse === 'function') ctx.onPulse();

        await dispatchAction(obj, btn, root, state, ctx);
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
    const unbind = bindLayer(canvas.closest('.mh-scene, .gd-scene, .cww-scene-stage') || canvas.parentElement || canvas, sceneId, state, ctx);

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

      const extra = extraClassesForObject(obj, state, ctx);
      btn.className = ['ao-hotspot', 'ao-hotspot--' + obj.object_id]
        .concat(extra)
        .concat(obj.idle_class ? [obj.idle_class] : [])
        .join(' ');

      btn.setAttribute('aria-label', ariaLabelForObject(obj, state, ctx));

      if (typeof ctx.isDisabled === 'function' && ctx.isDisabled(obj, state)) {
        btn.setAttribute('disabled', '');
      } else {
        btn.removeAttribute('disabled');
      }
    });
  }

  function clearCooldowns(sceneId) {
    if (!sceneId) {
      cooldownUntil.clear();
      return;
    }
    cooldownUntil.forEach(function (_v, key) {
      if (key.indexOf(sceneId + ':') === 0) cooldownUntil.delete(key);
    });
  }

  window.AmbientObjectRuntime = {
    mount: mount,
    refresh: refresh,
    renderLayer: renderLayer,
    bindLayer: bindLayer,
    hitAreaStyle: hitAreaStyle,
    clearCooldowns: clearCooldowns,
    _isOnCooldown: isOnCooldown,
    _setCooldown: setCooldown,
    TAP_RESET_MS: TAP_RESET_MS,
  };
})();
