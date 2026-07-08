/**
 * child-garden.js — Trädgården illustrated scene + Living Objects gameplay.
 * Primary visual: scene-bg.webp via <picture>. LOE bed_1: plant → water → grow → harvest.
 */
(function () {
  'use strict';

  const API_PATH = '/api/me/garden';
  const SLOTS_PATH = '/api/me/garden/slots';
  const FETCH_TIMEOUT_MS = 8000;
  const TAP_RESET_MS = 1200;
  const TIMER_POLL_MS = 4000;
  const HARVEST_CELEBRATE_MS = 1800;
  const BED_SLOT_ID = 'bed_1';

  let _active = false;
  let _state = null;
  let _slotsPayload = null;
  let _prefersReducedMotion = false;
  let _assetCleanup = null;
  let _timerPollId = null;
  let _verbInFlight = false;
  let _pathConfirmUntil = 0;
  let _ambientMount = null;

  const PATH_CONFIRM_MS = 5000;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function pipeline() {
    return window.GardenAssetPipeline || null;
  }

  function scenePictureMarkup() {
    const p = pipeline();
    if (p && typeof p.scenePictureHtml === 'function') {
      return p.scenePictureHtml();
    }
    return '<picture class="gd-scene-picture" data-asset-id="scene-bg">' +
      '<source type="image/webp" media="(max-width: 430px)" srcset="/images/child/world/garden/scene-bg-430.webp" />' +
      '<source type="image/webp" media="(max-width: 860px)" srcset="/images/child/world/garden/scene-bg-860.webp" />' +
      '<img class="gd-scene-bg" data-asset-id="scene-bg" data-critical="true"' +
        ' src="/images/child/world/garden/scene-bg.webp"' +
        ' srcset="/images/child/world/garden/scene-bg-430.webp 430w, /images/child/world/garden/scene-bg-860.webp 860w, /images/child/world/garden/scene-bg-1280.webp 1280w"' +
        ' sizes="100vw" alt="" decoding="async" loading="eager" fetchpriority="high" />' +
      '</picture>';
  }

  function catalogGardenRoom() {
    const c = window.LivingWorldScenesCatalog;
    return c && typeof c.getRoomByWorldId === 'function' ? c.getRoomByWorldId('garden') : null;
  }

  const DEFAULT_BED_HIT = { x: 0.05, y: 0.6, w: 0.25, h: 0.25 };

  function gardenBedHitArea() {
    const room = catalogGardenRoom();
    const bed = (room && room.hotspots || []).find(function (h) {
      return h.hotspot_id === 'garden_bed';
    });
    return (bed && bed.hit_area) ? bed.hit_area : DEFAULT_BED_HIT;
  }

  function hitAreaStyle(hit) {
    const h = hit || DEFAULT_BED_HIT;
    return 'left:' + ((h.x || 0) * 100) + '%;top:' + ((h.y || 0) * 100) + '%;' +
      'width:' + ((h.w || 0.15) * 100) + '%;height:' + ((h.h || 0.15) * 100) + '%;';
  }

  function bedCanvasStyle() {
    const hit = gardenBedHitArea();
    return hitAreaStyle(hit) +
      '--bed-x:' + ((hit.x || 0) * 100) + '%;' +
      '--bed-y:' + ((hit.y || 0) * 100) + '%;' +
      '--bed-w:' + ((hit.w || 0.15) * 100) + '%;' +
      '--bed-h:' + ((hit.h || 0.15) * 100) + '%;';
  }

  function outdoorNavHotspots() {
    const room = catalogGardenRoom();
    if (!room || !room.hotspots) return '';
    const outdoorIds = ['path_workshop', 'path_forest', 'gate_pet_house'];
    return room.hotspots.filter(function (h) {
      return outdoorIds.indexOf(h.hotspot_id) !== -1 && h.interaction === 'navigate' && h.target_scene;
    }).map(function (h) {
      const hit = h.hit_area || {};
      const style = 'left:' + ((hit.x || 0) * 100) + '%;top:' + ((hit.y || 0) * 100) + '%;' +
        'width:' + ((hit.w || 0.15) * 100) + '%;height:' + ((hit.h || 0.15) * 100) + '%;';
      return '<button type="button" class="gd-hotspot gd-hotspot--outdoor gd-hotspot--' + esc(h.hotspot_id) + '"' +
        ' data-outdoor-nav="' + esc(h.target_scene) + '"' +
        ' style="' + style + '"' +
        ' aria-label="' + esc(h.label_sv || h.hotspot_id) + '"></button>';
    }).join('');
  }

  function getBedSlot() {
    const slots = (_slotsPayload && _slotsPayload.slots) || [];
    return slots.find(function (s) { return s.slot_id === BED_SLOT_ID; }) || null;
  }

  function loeVisualClass(slot) {
    if (!slot || !slot.visual_token) return 'gd-loe--garden_bed_empty';
    return 'gd-loe--' + slot.visual_token;
  }

  function loeHaptic(kind) {
    if (!window.Platform || !window.Platform.haptics) return;
    if (kind === 'harvest') window.Platform.haptics.heavy();
    else if (kind === 'plant') window.Platform.haptics.medium();
    else window.Platform.haptics.light();
  }

  function bedHotspotExtraClass(slot) {
    if (!slot) return '';
    if (slot.state_key === 'blooming') return ' gd-hotspot--bed-harvest';
    if (slot.plant_locked && slot.state_key === 'empty') return ' gd-hotspot--bed-locked';
    const verbs = slot.available_verbs || [];
    if (verbs.some(function (v) { return v.verb === 'plant'; })) return ' gd-hotspot--bed-ready';
    if (verbs.some(function (v) { return v.verb === 'water'; })) return ' gd-hotspot--bed-needs-water';
    if (slot.state_key === 'watered') return ' gd-hotspot--bed-growing';
    if (slot.state_key === 'planted') return ' gd-hotspot--bed-needs-water';
    if (slot.state_key === 'harvested') return ' gd-hotspot--bed-memory';
    return '';
  }

  function bedAriaLabel(slot) {
    if (!slot) return 'Blomsterbädden';
    const verbs = slot.available_verbs || [];
    if (verbs.some(function (v) { return v.verb === 'harvest'; })) {
      return 'Skörda solrosen';
    }
    if (verbs.some(function (v) { return v.verb === 'water'; })) {
      return 'Vattna fröet i blomsterbädden';
    }
    if (verbs.some(function (v) { return v.verb === 'plant'; })) {
      return 'Plantera i blomsterbädden';
    }
    if (slot.plant_locked && slot.state_key === 'empty') {
      return 'Blomsterbädden — gör en sak på Idag först';
    }
    if (slot.state_key === 'watered' || slot.state_key === 'planted') {
      return 'Solrosen växer';
    }
    if (slot.state_key === 'harvested') {
      return slot.label_state_sv || 'Dagens blomma';
    }
    return slot.label_sv || 'Blomsterbädden';
  }

  function loePlantImage(slot) {
    if (!slot || !slot.visual_token) return null;
    const map = {
      sunflower_seed: '/images/child/world/garden/sunflower-sprout.svg',
      sunflower_bloom: '/images/child/world/garden/sunflower-bloom.svg',
      sunflower_harvested: '/images/child/world/garden/sunflower-stump.svg',
    };
    return map[slot.visual_token] || null;
  }

  function renderBedOverlay(slot) {
    const tokenClass = loeVisualClass(slot);
    const plantSrc = loePlantImage(slot);
    const plantImg = plantSrc
      ? '<img class="gd-bed-plant" src="' + esc(plantSrc) + '" alt="" decoding="async" />'
      : '';
    return '<div class="gd-bed-mound" aria-hidden="true"></div>' +
      '<div class="gd-bed-overlay ' + tokenClass + '" id="gdBedOverlay" aria-hidden="true">' +
      plantImg +
    '</div>';
  }

  function gardenAmbientContext(root) {
    return {
      prefersReducedMotion: _prefersReducedMotion,
      onPulse: function () {
        const pulse = root && root.querySelector('#gdTapPulse');
        if (pulse) {
          pulse.classList.remove('is-active');
          void pulse.offsetWidth;
          pulse.classList.add('is-active');
          setTimeout(function () { pulse.classList.remove('is-active'); }, TAP_RESET_MS);
        }
      },
      onAction: async function (payload) {
        const obj = payload && payload.object;
        const btn = payload && payload.button;
        const action = (payload && payload.action) || 'ambient';

        if (action === 'gameplay_bed') {
          return handleBedTap(root, btn);
        }
        if (action === 'scenery_path') {
          const entered = await handleSceneryTap(root, 'garden_path', btn);
          if (obj && obj.feedback_sv) showLoeFeedback(obj.feedback_sv);
          return entered;
        }
        if (action === 'ambient' && obj && obj.feedback_sv) {
          showLoeFeedback(obj.feedback_sv);
        }
        return true;
      },
      getAriaLabel: function (obj) {
        if (obj.object_id === 'garden_bed') return bedAriaLabel(getBedSlot());
        return obj.aria_label_sv;
      },
      getExtraClasses: function (obj) {
        if (obj.object_id !== 'garden_bed') return '';
        return bedHotspotExtraClass(getBedSlot());
      },
      isDisabled: function (obj) {
        if (obj.object_id !== 'garden_bed') return false;
        const bed = getBedSlot();
        return Boolean(bed && bed.plant_locked && bed.state_key === 'empty');
      },
    };
  }

  function bindAmbientObjects(root) {
    if (!root) return;
    const rt = window.AmbientObjectRuntime;
    if (!rt || typeof rt.bindLayer !== 'function') return;
    if (_ambientMount && typeof _ambientMount.unbind === 'function') {
      _ambientMount.unbind();
    }
    const unbind = rt.bindLayer(root, 'garden', _state, gardenAmbientContext(root));
    _ambientMount = { unbind: unbind, destroy: function () { unbind(); } };
  }

  function refreshAmbientBed(root) {
    const rt = window.AmbientObjectRuntime;
    if (!rt || typeof rt.refresh !== 'function' || !root) return;
    rt.refresh(root, 'garden', _state, gardenAmbientContext(root));
  }

  function renderSceneInner(state) {
    const bedSlot = getBedSlot();
    const rt = window.AmbientObjectRuntime;
    const ambientHtml = rt && typeof rt.renderLayer === 'function'
      ? rt.renderLayer('garden', state || _state, gardenAmbientContext({}, state))
      : '';

    return '<div class="gd-scene gd-scene--illustrated gd-scene--entering" data-world="garden" role="img" aria-label="Trädgården">' +
      '<div class="gd-scene-canvas" style="' + bedCanvasStyle() + '" aria-hidden="true">' +
        scenePictureMarkup() +
        ambientHtml +
        renderBedOverlay(bedSlot) +
        '<div class="gd-ambient gd-ambient--clouds" aria-hidden="true"></div>' +
        '<div class="gd-tap-pulse" id="gdTapPulse" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="gd-scene-status" id="gdSceneStatus" role="status" aria-live="polite" aria-atomic="true"></div>' +
    '</div>';
  }

  function wayfinderConfig(state) {
    return {
      placeId: 'garden',
      placeLabel: 'Trädgården',
      placeIcon: '🌻',
      immersive: true,
      back: { label: 'Tillbaka till Morgonhuset', short: 'Hem' },
      actions: [],
    };
  }

  function renderScene(state) {
    const inner = renderSceneInner(state);
    const wf = window.ChildWorldWayfinder;
    if (!wf || typeof wf.render !== 'function') {
      return inner;
    }
    return '<div class="cww-shell">' +
      wf.render(wayfinderConfig(state)) +
      '<div class="cww-scene-stage">' + inner + '</div>' +
    '</div>';
  }

  function bindWayfinder(root) {
    const wf = window.ChildWorldWayfinder;
    if (!wf || typeof wf.bind !== 'function' || !root) return;

    wf.bind(root, {
      onBack: function () {
        if (window.LivingWorldTransition
            && typeof window.LivingWorldTransition.isActive === 'function'
            && window.LivingWorldTransition.isActive()
            && typeof window.LivingWorldTransition.exitGarden === 'function') {
          window.LivingWorldTransition.exitGarden();
          return;
        }
        deactivate();
        if (window.ChildWorlds && typeof ChildWorlds.returnFromWorldSubScene === 'function') {
          ChildWorlds.returnFromWorldSubScene();
          return;
        }
        if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
          window.ChildMorgonhus.tryMountWorld();
          return;
        }
        if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
          window.ChildWorldHub.show();
        }
      },
      onAction: async function (id, btn) {
        if (id === 'bed') {
          await handleBedTap(root, btn);
        }
      },
    });
  }

  function showLoeFeedback(message) {
    const root = document.getElementById('skattkammarView');
    if (!root || !message) return;
    const status = root.querySelector('#gdSceneStatus');
    if (!status) return;
    status.textContent = message;
    clearTimeout(showLoeFeedback._timer);
    showLoeFeedback._timer = setTimeout(function () {
      if (status.textContent === message) status.textContent = '';
    }, 2600);
  }

  function livingSlotTransitionMessage(prevSlot, nextSlot) {
    if (!nextSlot) return null;
    if (prevSlot && prevSlot.state_key === nextSlot.state_key) return null;
    if (nextSlot.state_key === 'blooming') {
      return nextSlot.label_state_sv || 'Solrosen blommar!';
    }
    if (nextSlot.state_key === 'watered' && (!prevSlot || prevSlot.state_key === 'planted')) {
      return 'Fröet dricker vatten…';
    }
    if (nextSlot.state_key === 'planted' && (!prevSlot || prevSlot.state_key === 'empty')) {
      return 'Fröet ligger i jorden — vattna det!';
    }
    return null;
  }

  function updateBedVisual(root, slot) {
    if (!root) return;
    const overlay = root.querySelector('#gdBedOverlay');
    const bedBtn = root.querySelector('[data-ao-id="garden_bed"]')
      || root.querySelector('[data-scenery="garden_bed"]');
    if (overlay) {
      overlay.className = 'gd-bed-overlay ' + loeVisualClass(slot);
    }
    if (bedBtn) {
      const extra = bedHotspotExtraClass(slot);
      bedBtn.className = 'ao-hotspot ao-hotspot--garden_bed gd-hotspot gd-hotspot--bed' + extra;
      bedBtn.setAttribute('aria-label', bedAriaLabel(slot));
      const locked = Boolean(slot.plant_locked && slot.state_key === 'empty');
      if (locked) bedBtn.setAttribute('disabled', '');
      else bedBtn.removeAttribute('disabled');
    }
    refreshAmbientBed(root);
  }

  function clearTimerPoll() {
    if (_timerPollId) {
      clearInterval(_timerPollId);
      _timerPollId = null;
    }
  }

  function isTimerGrowingState(slot) {
    if (!slot) return false;
    if (slot.state_key === 'watered') return true;
    if (slot.state_key === 'planted' && slot.timer_remaining_ms != null) return true;
    return false;
  }

  function scheduleTimerRefresh() {
    clearTimerPoll();
    const bed = getBedSlot();
    if (!isTimerGrowingState(bed)) return;

    const remaining = bed.timer_remaining_ms;
    const delay = remaining != null && remaining > 0
      ? Math.min(Math.max(remaining + 500, 2000), TIMER_POLL_MS)
      : TIMER_POLL_MS;

    _timerPollId = setInterval(async function () {
      if (!_active) {
        clearTimerPoll();
        return;
      }
      const prev = getBedSlot();
      const payload = await fetchSlots();
      if (!payload) return;
      _slotsPayload = payload;
      const next = getBedSlot();
      const root = document.getElementById('skattkammarView');
      updateBedVisual(root, next);
      const transitionMsg = livingSlotTransitionMessage(prev, next);
      if (transitionMsg) {
        showLoeFeedback(transitionMsg);
        if (next && next.state_key === 'blooming') launchBloomJuice(root);
      }
      if (!isTimerGrowingState(next)) {
        clearTimerPoll();
      }
    }, delay);
  }

  function launchBloomJuice(root) {
    if (!root || _prefersReducedMotion) return;
    const overlay = root.querySelector('#gdBedOverlay');
    if (!overlay) return;
    overlay.classList.remove('gd-juice--bloom');
    void overlay.offsetWidth;
    overlay.classList.add('gd-juice--bloom');
    setTimeout(function () { overlay.classList.remove('gd-juice--bloom'); }, 2000);
  }

  function launchVerbJuice(root, verb) {
    if (!root || _prefersReducedMotion) return;
    const overlay = root.querySelector('#gdBedOverlay');
    if (!overlay) return;
    const cls = verb === 'plant' ? 'gd-juice--plant'
      : verb === 'water' ? 'gd-juice--water' : null;
    if (!cls) return;
    overlay.classList.remove(cls);
    void overlay.offsetWidth;
    overlay.classList.add(cls);
    setTimeout(function () { overlay.classList.remove(cls); }, 2000);
  }

  function dismissHarvestCelebration(root) {
    if (!root) return;
    const el = root.querySelector('.gd-harvest-celebrate');
    if (el) el.remove();
    clearTimeout(dismissHarvestCelebration._timer);
  }

  function launchHarvestCelebration(root) {
    if (!root) return;
    dismissHarvestCelebration(root);
    const el = document.createElement('div');
    el.className = 'gd-harvest-celebrate';
    el.setAttribute('role', 'presentation');
    el.innerHTML = '<div class="gd-harvest-burst" aria-hidden="true">🌻</div>';
    root.querySelector('.gd-scene').appendChild(el);

    function dismiss() {
      el.classList.add('is-done');
      setTimeout(function () { el.remove(); }, 200);
    }

    el.addEventListener('click', dismiss, { once: true });
    dismissHarvestCelebration._timer = setTimeout(dismiss, HARVEST_CELEBRATE_MS);
  }

  async function apiFetch(path, options) {
    if (!window.Auth || typeof window.Auth.api !== 'function') return null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS)
      : null;

    try {
      const opts = Object.assign({}, options || {});
      if (controller) opts.signal = controller.signal;
      return await window.Auth.api(path, opts);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        console.warn('[garden] fetch timeout');
      } else if (err && err.status === 503) {
        return null;
      } else {
        console.warn('[garden] fetch failed:', err && err.message);
      }
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchState() {
    return apiFetch(API_PATH);
  }

  async function fetchSlots() {
    return apiFetch(SLOTS_PATH);
  }

  async function applySlotVerb(slotId, verb) {
    return apiFetch(SLOTS_PATH + '/' + encodeURIComponent(slotId) + '/verb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verb: verb }),
    });
  }

  function showPathHint(root, message) {
    if (!root) return;
    let toast = root.querySelector('.gd-path-hint');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'gd-path-hint';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      root.appendChild(toast);
    }
    toast.textContent = message || 'Stigen leder till Minnesrummet…';
    toast.classList.add('is-visible');
    clearTimeout(showPathHint._timer);
    showPathHint._timer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, PATH_CONFIRM_MS);
  }

  function triggerVisual(root, sceneryId) {
    if (!root) return;
    const pulse = root.querySelector('#gdTapPulse');
    const scene = root.querySelector('.gd-scene-canvas');

    if (pulse) {
      pulse.classList.remove('is-active');
      void pulse.offsetWidth;
      pulse.classList.add('is-active');
      setTimeout(function () { pulse.classList.remove('is-active'); }, TAP_RESET_MS);
    }

    if (sceneryId === 'garden_path' && scene) {
      scene.classList.add('is-path-tap');
      setTimeout(function () { scene.classList.remove('is-path-tap'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_bed' && scene) {
      scene.classList.add('is-bloom-tap');
      setTimeout(function () { scene.classList.remove('is-bloom-tap'); }, TAP_RESET_MS);
      return;
    }
    if (sceneryId === 'garden_sky' && scene) {
      scene.classList.add('is-sky-tap');
      setTimeout(function () { scene.classList.remove('is-sky-tap'); }, TAP_RESET_MS);
    }
  }

  async function handleBedTap(root, btn) {
    if (_verbInFlight) return;
    const bed = getBedSlot();
    if (!bed) {
      triggerVisual(root, 'garden_bed');
      return;
    }

    const verbs = bed.available_verbs || [];
    let verb = null;
    if (verbs.some(function (v) { return v.verb === 'harvest'; })) {
      verb = 'harvest';
    } else if (verbs.some(function (v) { return v.verb === 'water'; })) {
      verb = 'water';
    } else if (verbs.some(function (v) { return v.verb === 'plant'; })) {
      verb = 'plant';
    }

    if (!verb) {
      triggerVisual(root, 'garden_bed');
      if (bed.plant_locked && bed.state_key === 'empty') {
        const msg = (_slotsPayload && _slotsPayload.plant_locked_message_sv)
          || 'Gör en sak på Idag så vaknar jorden.';
        showLoeFeedback(msg);
      } else if (bed.state_key === 'planted') {
        showLoeFeedback('Vattna fröet så växer det!');
      } else if (bed.state_key === 'watered') {
        showLoeFeedback('Solrosen växer…');
      }
      return;
    }

    _verbInFlight = true;
    btn.classList.add('is-acting');
    const prev = bed;
    const result = await applySlotVerb(BED_SLOT_ID, verb);
    _verbInFlight = false;
    btn.classList.remove('is-acting');

    if (!result || !result.ok) {
      triggerVisual(root, 'garden_bed');
      const msg = (result && result.child_message_sv)
        || (result && result.error === 'plant_locked' ? 'Klarmarkera något på Idag först!' : null)
        || 'Det gick inte just nu — försök igen.';
      showLoeFeedback(msg);
      return;
    }

    if (result.slot) {
      const slots = (_slotsPayload && _slotsPayload.slots) || [];
      const idx = slots.findIndex(function (s) { return s.slot_id === BED_SLOT_ID; });
      if (idx >= 0) slots[idx] = result.slot;
      else slots.push(result.slot);
      if (_slotsPayload) _slotsPayload.slots = slots;
      updateBedVisual(root, result.slot);
      const transitionMsg = livingSlotTransitionMessage(prev, result.slot);
      const feedback = result.child_message_sv || transitionMsg;
      if (feedback) showLoeFeedback(feedback);
      loeHaptic(verb);
      launchVerbJuice(root, verb);
      if (verb === 'harvest') launchHarvestCelebration(root);
      if (isTimerGrowingState(result.slot)) scheduleTimerRefresh();
      else clearTimerPoll();
    }
    triggerVisual(root, 'garden_bed');
  }

  async function handleSceneryTap(root, sceneryId, btn) {
    if (sceneryId === 'garden_bed') {
      await handleBedTap(root, btn);
      return;
    }

    const scenery = (_state && _state.scenery || []).find(function (s) {
      return s.scenery_id === sceneryId;
    });

    if (scenery && scenery.leads_to_memory_hall && window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterMemoryHall === 'function') {
      const now = Date.now();
      if (now > _pathConfirmUntil) {
        _pathConfirmUntil = now + PATH_CONFIRM_MS;
        triggerVisual(root, sceneryId);
        showPathHint(root, 'Stigen till Minnesrummet — tryck igen om du vill gå dit.');
        return;
      }
      _pathConfirmUntil = 0;
      const entered = await window.LivingWorldTransition.enterMemoryHall({ pathEl: btn });
      if (!entered) {
        triggerVisual(root, sceneryId);
        showPathHint(root, scenery.ambient_message || 'Stigen svarar inte just nu — försök igen.');
      }
      return;
    }

    triggerVisual(root, sceneryId);
  }

  function bindInteractions(root) {
    if (!root) return;
    bindWayfinder(root);
    bindAmbientObjects(root);
  }

  async function handleOutdoorNav(root, targetScene, btn) {
    const c = window.LivingWorldScenesCatalog;
    const targetRoom = c && c.getRoomBySceneId ? c.getRoomBySceneId(targetScene) : null;
    if (targetRoom && targetRoom.wire_in && !targetRoom.wired_via
        && window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterWorld === 'function') {
      const entered = await window.LivingWorldTransition.enterWorld(targetRoom.world_id, { triggerEl: btn });
      if (!entered) {
        triggerVisual(root, null);
        showPathHint(root, (btn && btn.getAttribute('aria-label')) + ' är inte redo än.');
      }
      return;
    }
    triggerVisual(root, null);
    showPathHint(root, 'Stigen svarar inte just nu — försök igen.');
  }

  function finishEnterAnimation(root) {
    const scene = root && root.querySelector('.gd-scene');
    if (!scene) return;
    if (_prefersReducedMotion) {
      scene.classList.remove('gd-scene--entering');
      return;
    }
    function onEnd() {
      scene.classList.remove('gd-scene--entering');
      scene.removeEventListener('animationend', onEnd);
    }
    scene.addEventListener('animationend', onEnd);
  }

  function bindAssetWatch(root) {
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    const p = pipeline();
    if (!p || typeof p.watchSceneImage !== 'function') return;
    _assetCleanup = p.watchSceneImage(root, function () {
      console.warn('[garden] scene-bg failed — exiting to Morgonhus');
      if (window.LivingWorldTransition
          && typeof window.LivingWorldTransition.isActive === 'function'
          && window.LivingWorldTransition.isActive()
          && typeof window.LivingWorldTransition.exitGarden === 'function') {
        window.LivingWorldTransition.exitGarden();
        return;
      }
      exitToMorgonhus();
    });
  }

  function hideLoader() {
    const loader = document.getElementById('skattkammarLoading');
    const view = document.getElementById('skattkammarView');
    if (loader) loader.style.display = 'none';
    if (view) view.style.display = '';
  }

  function deactivate() {
    _active = false;
    _state = null;
    _slotsPayload = null;
    clearTimerPoll();
    if (_assetCleanup) {
      _assetCleanup();
      _assetCleanup = null;
    }
    if (_ambientMount && typeof _ambientMount.destroy === 'function') {
      _ambientMount.destroy();
      _ambientMount = null;
    }
    if (window.AmbientObjectRuntime && typeof window.AmbientObjectRuntime.clearCooldowns === 'function') {
      window.AmbientObjectRuntime.clearCooldowns('garden');
    }
    if (window.AmbientDirector && typeof window.AmbientDirector.reset === 'function') {
      window.AmbientDirector.reset();
    }
    document.body.classList.remove('child-garden-active');
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.clearActivePlace === 'function') {
      window.ChildWorldWayfinder.clearActivePlace(document);
    }
    const view = document.getElementById('skattkammarView');
    if (view) view.classList.remove('gd-exit-through-door');
  }

  async function remountMorgonhusOrSkatt() {
    if (window.ChildWorlds && typeof ChildWorlds.returnFromWorldSubScene === 'function') {
      return ChildWorlds.returnFromWorldSubScene();
    }
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.tryMountWorld === 'function') {
      const remounted = await window.ChildMorgonhus.tryMountWorld();
      if (remounted) return true;
      if (typeof window.ChildMorgonhus.tryRemountCached === 'function'
          && window.ChildMorgonhus.tryRemountCached()) {
        return true;
      }
    }
    if (window.ChildWorldHub && typeof window.ChildWorldHub.show === 'function') {
      const hubShown = await window.ChildWorldHub.show();
      if (hubShown) return true;
    }
    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.openSkattkammaren === 'function') {
      window.ChildMorgonhus.openSkattkammaren();
      return true;
    }
    if (typeof window.loadRewards === 'function') {
      window.rewardsLoaded = false;
      window.loadRewards();
    }
    return false;
  }

  async function mount(state, opts) {
    if (window.ChildWorlds && ChildWorlds.isWorldHubEntryDisabled && ChildWorlds.isWorldHubEntryDisabled()) {
      return false;
    }
    const view = document.getElementById('skattkammarView');
    if (!view) return false;

    let sceneState = state;
    let viaTransition = opts && opts.viaTransition;
    if (sceneState && sceneState.viaTransition && sceneState.enabled === undefined) {
      viaTransition = true;
      sceneState = null;
    }

    const [fetchedScene, fetchedSlots] = await Promise.all([
      sceneState ? Promise.resolve(sceneState) : fetchState(),
      fetchSlots(),
    ]);

    if (!fetchedScene || !fetchedScene.enabled) return false;

    const p = pipeline();
    if (p && typeof p.preloadScene === 'function') {
      const sceneOk = await p.preloadScene(5000);
      if (!sceneOk) {
        console.warn('[garden] scene-bg unavailable — staying in Morgonhus');
        return false;
      }
    }

    if (window.ChildMorgonhus && typeof window.ChildMorgonhus.deactivate === 'function') {
      window.ChildMorgonhus.deactivate();
    }

    _prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _state = fetchedScene;
    _slotsPayload = fetchedSlots || { slots: [], plant_unlocked: false };
    _active = true;
    if (!viaTransition) {
      view.classList.add('gd-exit-through-door');
    }
    view.innerHTML = renderScene(fetchedScene);
    bindInteractions(view);
    bindAssetWatch(view);
    finishEnterAnimation(view);
    scheduleTimerRefresh();
    hideLoader();
    document.body.classList.add('child-garden-active');
    document.body.classList.remove('child-morgonhus-active');
    if (window.ChildWorldWayfinder && typeof window.ChildWorldWayfinder.setActivePlace === 'function') {
      window.ChildWorldWayfinder.setActivePlace(document, 'garden');
    }
    return true;
  }

  async function enterFromMorgonhus(opts) {
    if (opts && opts.viaTransition) {
      return mount(null, { viaTransition: true });
    }
    if (window.LivingWorldTransition
        && typeof window.LivingWorldTransition.enterGarden === 'function') {
      return window.LivingWorldTransition.enterGarden({
        doorEl: opts && opts.doorEl,
      });
    }
    return mount();
  }

  async function exitToMorgonhus() {
    deactivate();
    return remountMorgonhusOrSkatt();
  }

  function isActive() {
    return _active;
  }

  window.ChildGarden = {
    API_PATH: API_PATH,
    SLOTS_PATH: SLOTS_PATH,
    renderScene: renderScene,
    mount: mount,
    enterFromMorgonhus: enterFromMorgonhus,
    exitToMorgonhus: exitToMorgonhus,
    handleBedTap: handleBedTap,
    deactivate: deactivate,
    isActive: isActive,
    triggerVisual: triggerVisual,
    showLoeFeedback: showLoeFeedback,
    livingSlotTransitionMessage: livingSlotTransitionMessage,
    scheduleTimerRefresh: scheduleTimerRefresh,
  };
})();
