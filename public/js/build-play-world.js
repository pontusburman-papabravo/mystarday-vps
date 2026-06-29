/**
 * build-play-world.js — Generisk lek-värld (husdjur, dino, dockhus, fiske, läxor, vardag)
 */
(function () {
  'use strict';

  const PLAY_SLUGS = ['husdjur', 'dinosaurie', 'dockhus', 'fiske', 'laxor', 'vardag'];

  const PREVIEW_WORLDS = {
    husdjur: {
      title: 'Husdjurshemmet', icon: '🐾', subtitle: 'Mata, borsta och lek med din kompis!',
      theme: 'bpw--pets', hero_svg: '/img/build/svg/pet-hero.svg', scene_svg: '/img/build/svg/pet-scene.svg',
      stats: [
        { key: 'happiness', label: 'Glädje', icon: '💚', max: 100 },
        { key: 'hunger', label: 'Mättnad', icon: '🥣', max: 100 },
        { key: 'cleanliness', label: 'Ren', icon: '✨', max: 100 },
      ],
      pickers: [{ key: 'pet_id', label: 'Välj husdjur', options: [
        { id: 'hund', label: 'Hund', icon: '🐶' }, { id: 'katt', label: 'Katt', icon: '🐱' },
        { id: 'hamster', label: 'Hamster', icon: '🐹' }, { id: 'hast', label: 'Häst', icon: '🐴' },
      ]}],
      actions: [
        { id: 'feed', label: 'Mata', icon: '🥣' }, { id: 'brush', label: 'Borsta', icon: '🪮' },
        { id: 'pet', label: 'Klappa', icon: '🤚' }, { id: 'walk', label: 'Promenera', icon: '🦮' },
      ],
      defaults: { pet_id: 'hund', happiness: 75, hunger: 40, cleanliness: 90 },
    },
    dinosaurie: {
      title: 'Dino-dalen', icon: '🦕', subtitle: 'Gräv, borsta ben och bygg skelett!',
      theme: 'bpw--dino', hero_svg: '/img/build/svg/dino-hero.svg', scene_svg: '/img/build/svg/dino-scene.svg',
      stats: [
        { key: 'bones', label: 'Ben', icon: '🦴', max: 10 },
        { key: 'skeleton', label: 'Skelett', icon: '🦕', max: 100 },
        { key: 'knowledge', label: 'Fakta', icon: '📋', max: 100 },
      ],
      pickers: [{ key: 'dino_id', label: 'Välj dinosaurie', options: [
        { id: 'trex', label: 'T-rex', icon: '🦖' }, { id: 'triceratops', label: 'Triceratops', icon: '🦕' },
        { id: 'stego', label: 'Stegosaurus', icon: '🦴' },
      ]}],
      actions: [
        { id: 'dig', label: 'Gräv', icon: '⛏️' }, { id: 'brush', label: 'Borsta', icon: '🖌️' },
        { id: 'assemble', label: 'Montera', icon: '🧩' }, { id: 'read', label: 'Läs fakta', icon: '📖' },
      ],
      defaults: { dino_id: 'trex', bones: 2, skeleton: 20, knowledge: 10 },
    },
    dockhus: {
      title: 'Dockhuset', icon: '🏠', subtitle: 'Bygg rum, måla och bjud in gäster!',
      theme: 'bpw--doll', hero_svg: '/img/build/svg/doll-hero.svg', scene_svg: '/img/build/svg/doll-scene.svg',
      stats: [
        { key: 'rooms', label: 'Rum', icon: '🚪', max: 4 },
        { key: 'decor', label: 'Inredning', icon: '🛋️', max: 100 },
        { key: 'guests', label: 'Gäster', icon: '🎉', max: 10 },
      ],
      pickers: [{ key: 'room_id', label: 'Välj rum', options: [
        { id: 'living', label: 'Vardagsrum', icon: '🛋️' }, { id: 'bedroom', label: 'Sovrum', icon: '🛏️' },
        { id: 'kitchen', label: 'Kök', icon: '🍳' },
      ]}],
      actions: [
        { id: 'paint', label: 'Måla', icon: '🎨' }, { id: 'furnish', label: 'Inred', icon: '🪑' },
        { id: 'invite', label: 'Bjud in', icon: '💌' }, { id: 'play', label: 'Lek', icon: '🪆' },
      ],
      defaults: { room_id: 'living', rooms: 1, decor: 30, guests: 0 },
    },
    fiske: {
      title: 'Båtkajen', icon: '🎣', subtitle: 'Kasta, dra in och hala upp fångsten!',
      theme: 'bpw--fish', hero_svg: '/img/build/svg/fish-hero.svg', scene_svg: '/img/build/svg/fish-scene.svg',
      stats: [
        { key: 'catch', label: 'Fiskar', icon: '🐠', max: 20 },
        { key: 'boat', label: 'Båt', icon: '⛵', max: 100 },
        { key: 'shine', label: 'Glans', icon: '✨', max: 100 },
      ],
      pickers: [{ key: 'spot_id', label: 'Fiskeplats', options: [
        { id: 'dock', label: 'Bryggan', icon: '🎣' }, { id: 'lake', label: 'Sjön', icon: '🏞️' },
        { id: 'boat', label: 'Båten', icon: '⛵' },
      ]}],
      actions: [
        { id: 'cast', label: 'Kasta', icon: '🎣' }, { id: 'reel', label: 'Dra in', icon: '🔄' },
        { id: 'polish', label: 'Polera båt', icon: '✨' }, { id: 'feed_fish', label: 'Mata fisk', icon: '🐟' },
      ],
      defaults: { spot_id: 'dock', catch: 0, boat: 50, shine: 80 },
    },
    laxor: {
      title: 'Läxbordet', icon: '📚', subtitle: 'Läs, skriv och räkna — lekfullt!',
      theme: 'bpw--study', hero_svg: '/img/build/svg/study-hero.svg', scene_svg: '/img/build/svg/study-scene.svg',
      stats: [
        { key: 'letters', label: 'Bokstäver', icon: '🔤', max: 26 },
        { key: 'math', label: 'Räkna', icon: '🔢', max: 100 },
        { key: 'books', label: 'Läst', icon: '📖', max: 10 },
      ],
      pickers: [{ key: 'subject_id', label: 'Välj ämne', options: [
        { id: 'abc', label: 'Alfabetet', icon: '🔤' }, { id: 'math', label: 'Matte', icon: '➕' },
        { id: 'read', label: 'Läsa', icon: '📖' },
      ]}],
      actions: [
        { id: 'write', label: 'Skriv', icon: '✏️' }, { id: 'count', label: 'Räkna', icon: '🔢' },
        { id: 'read', label: 'Läs', icon: '📖' }, { id: 'show', label: 'Visa', icon: '⭐' },
      ],
      defaults: { subject_id: 'abc', letters: 3, math: 15, books: 1 },
    },
    vardag: {
      title: 'Mitt rum', icon: '⭐', subtitle: 'Ditt eget mysiga rum — som i schemat!',
      theme: 'bpw--room', hero_svg: '/img/build/svg/room-hero.svg', scene_svg: '/img/build/svg/room-scene.svg',
      stats: [
        { key: 'cozy', label: 'Mys', icon: '🛏️', max: 100 },
        { key: 'tidy', label: 'Städat', icon: '🧹', max: 100 },
        { key: 'stars', label: 'Stjärnor', icon: '⭐', max: 20 },
      ],
      pickers: [{ key: 'zone_id', label: 'Tid på dygnet', options: [
        { id: 'morning', label: 'Morgon', icon: '🌅' }, { id: 'day', label: 'Dag', icon: '☀️' },
        { id: 'evening', label: 'Kväll', icon: '🌙' },
      ]}],
      actions: [
        { id: 'bed', label: 'Bädda', icon: '🛏️' }, { id: 'teeth', label: 'Tänder', icon: '🪥' },
        { id: 'dress', label: 'Klä på', icon: '👕' }, { id: 'breakfast', label: 'Frukost', icon: '🥣' },
      ],
      defaults: { zone_id: 'morning', cozy: 60, tidy: 70, stars: 2 },
    },
  };

  let state = {
    slug: '',
    world: null,
    customization: {},
    preview: false,
    saving: false,
  };

  const $ = (id) => document.getElementById(id);

  function getSlugFromPath() {
    const m = window.location.pathname.match(/\/child\/play\/([a-z]+)/);
    return m ? m[1] : '';
  }

  function isPreviewMode() {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  function isChildUser(user) {
    return !!(user && user.type === 'child');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n) || 0));
  }

  function normalizeLocal(slug, raw) {
    const cfg = PREVIEW_WORLDS[slug];
    if (!cfg) return raw || {};
    const c = { ...cfg.defaults, ...(raw || {}) };
    (cfg.stats || []).forEach(function (s) {
      c[s.key] = clamp(c[s.key], 0, s.max);
    });
    return c;
  }

  function showToast(msg) {
    const el = $('bpwToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  function haptic() {
    if (window.Platform && window.Platform.haptics && typeof window.Platform.haptics.light === 'function') {
      window.Platform.haptics.light();
    } else if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  function showLogin(msg) {
    $('bpwLoading').style.display = 'none';
    $('bpwApp').style.display = 'none';
    $('bpwLogin').style.display = 'block';
    $('bpwLoginMsg').textContent = msg;
  }

  function showApp() {
    $('bpwLoading').style.display = 'none';
    $('bpwLogin').style.display = 'none';
    $('bpwApp').style.display = 'flex';
  }

  function spawnParticles(emojis) {
    const layer = $('bpwFx');
    const wrap = $('bpwHeroWrap');
    if (!layer || !wrap) return;
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('span');
      el.className = 'bpw-particle';
      el.textContent = emojis[i % emojis.length];
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = (20 + Math.random() * 50) + '%';
      el.style.animationDelay = (Math.random() * 0.3) + 's';
      layer.appendChild(el);
      setTimeout(function () { el.remove(); }, 1300);
    }
    wrap.classList.remove('is-bounce', 'is-action');
    void wrap.offsetWidth;
    wrap.classList.add('is-bounce', 'is-action');
    setTimeout(function () { wrap.classList.remove('is-action'); }, 900);
  }

  function renderStats() {
    const el = $('bpwStats');
    if (!el || !state.world) return;
    el.innerHTML = (state.world.stats || []).map(function (s) {
      const val = state.customization[s.key] != null ? state.customization[s.key] : 0;
      const pct = s.max > 0 ? Math.round((val / s.max) * 100) : 0;
      return '<span class="bpw-stat">' + s.icon + ' ' + s.label + ' ' + val + '/' + s.max +
        '<span class="bpw-stat-bar"><i style="width:' + pct + '%"></i></span></span>';
    }).join('');
  }

  function renderPickers() {
    const el = $('bpwPickers');
    if (!el || !state.world) return;
    el.innerHTML = (state.world.pickers || []).map(function (p) {
      const chips = p.options.map(function (o) {
        const active = state.customization[p.key] === o.id ? ' is-active' : '';
        return '<button type="button" class="bpw-chip' + active + '" data-picker="' + p.key +
          '" data-val="' + o.id + '">' + o.icon + ' ' + o.label + '</button>';
      }).join('');
      return '<p class="bpw-picker-label">' + p.label + '</p><div class="bpw-chip-row">' + chips + '</div>';
    }).join('');

    el.querySelectorAll('.bpw-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-picker');
        const val = btn.getAttribute('data-val');
        patchCustomization({ [key]: val });
      });
    });
  }

  function renderActions() {
    const el = $('bpwActions');
    if (!el || !state.world) return;
    el.innerHTML = (state.world.actions || []).map(function (a) {
      return '<button type="button" class="bpw-action-btn" data-action="' + a.id + '">' +
        '<span class="bpw-action-icon">' + a.icon + '</span>' + a.label + '</button>';
    }).join('');

    el.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        runAction(btn.getAttribute('data-action'));
      });
    });
  }

  function applyTheme() {
    document.body.className = 'build-play-page ' + (state.world.theme || '');
    const bg = $('bpwBgScene');
    if (bg && state.world.scene_svg) {
      bg.style.backgroundImage = 'url(' + state.world.scene_svg + ')';
    }
    const hero = $('bpwHeroImg');
    if (hero && state.world.hero_svg) {
      hero.src = state.world.hero_svg;
      hero.alt = state.world.title || 'Lek-värld';
    }
    const wrap = $('bpwHeroWrap');
    if (wrap && state.world.pickers && state.world.pickers[0]) {
      const key = state.world.pickers[0].key;
      wrap.setAttribute('data-variant', state.customization[key] || '');
    }
  }

  function applyCustomization(c) {
    state.customization = normalizeLocal(state.slug, c);
    renderStats();
    renderPickers();
    applyTheme();
  }

  async function patchCustomization(patch) {
    if (state.preview) {
      applyCustomization({ ...state.customization, ...patch });
      haptic();
      return;
    }
    if (state.saving) return;
    state.saving = true;
    try {
      const res = await Auth.api('/api/me/build/play/' + state.slug, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      applyCustomization(res.customization);
      haptic();
    } catch (err) {
      showToast(err.message || 'Kunde inte spara');
    } finally {
      state.saving = false;
    }
  }

  function previewAction(actionId) {
    const c = { ...state.customization };
    const effects = {
      husdjur: {
        feed: { hunger: Math.min(100, (c.hunger || 0) + 25), happiness: Math.min(100, (c.happiness || 0) + 8), msg: 'Nom nom! 🥣' },
        brush: { cleanliness: 100, happiness: Math.min(100, (c.happiness || 0) + 12), msg: 'Så mjuk päls! 🪮' },
        pet: { happiness: Math.min(100, (c.happiness || 0) + 15), msg: 'Gos-gos! 🤚' },
        walk: { happiness: Math.min(100, (c.happiness || 0) + 10), hunger: Math.max(0, (c.hunger || 0) - 8), msg: 'Bra promenad! 🦮' },
      },
      dinosaurie: {
        dig: { bones: Math.min(10, (c.bones || 0) + 1), msg: 'Ett ben till! ⛏️' },
        brush: { skeleton: Math.min(100, (c.skeleton || 0) + 8), msg: 'Rent ben! 🖌️' },
        assemble: { skeleton: Math.min(100, (c.skeleton || 0) + 12), msg: 'Skelettet växer! 🧩' },
        read: { knowledge: Math.min(100, (c.knowledge || 0) + 15), msg: 'Coolt fakta! 📖' },
      },
      dockhus: {
        paint: { decor: Math.min(100, (c.decor || 0) + 12), msg: 'Så fint! 🎨' },
        furnish: { decor: Math.min(100, (c.decor || 0) + 15), msg: 'Ny möbel! 🪑' },
        invite: { guests: Math.min(10, (c.guests || 0) + 1), msg: 'Gäst! 💌' },
        play: { decor: Math.min(100, (c.decor || 0) + 8), msg: 'Lek i huset! 🪆' },
      },
      fiske: {
        cast: { msg: 'Plask! 🎣' },
        reel: { catch: Math.min(20, (c.catch || 0) + 1), msg: 'En fisk! 🐠' },
        polish: { shine: 100, boat: Math.min(100, (c.boat || 0) + 10), msg: 'Båten glänser! ✨' },
        feed_fish: { msg: 'Glada fiskar! 🐟' },
      },
      laxor: {
        write: { letters: Math.min(26, (c.letters || 0) + 1), msg: 'Bra bokstav! ✏️' },
        count: { math: Math.min(100, (c.math || 0) + 12), msg: 'Rätt! 🔢' },
        read: { books: Math.min(10, (c.books || 0) + 1), msg: 'Fint läst! 📖' },
        show: { math: Math.min(100, (c.math || 0) + 8), msg: 'Duktig! ⭐' },
      },
      vardag: {
        bed: { cozy: Math.min(100, (c.cozy || 0) + 15), tidy: Math.min(100, (c.tidy || 0) + 10), msg: 'Bäddat! 🛏️' },
        teeth: { tidy: Math.min(100, (c.tidy || 0) + 12), stars: Math.min(20, (c.stars || 0) + 1), msg: 'Pärlvita! 🪥' },
        dress: { tidy: Math.min(100, (c.tidy || 0) + 10), msg: 'Snyggt! 👕' },
        breakfast: { cozy: Math.min(100, (c.cozy || 0) + 10), stars: Math.min(20, (c.stars || 0) + 1), msg: 'Gott! 🥣' },
      },
    };
    const worldFx = effects[state.slug] || {};
    const fx = worldFx[actionId];
    if (!fx) return { customization: c, message: 'Bra jobbat!' };
    const patch = { ...fx };
    const msg = patch.msg;
    delete patch.msg;
    Object.assign(c, patch);
    return { customization: normalizeLocal(state.slug, c), message: msg };
  }

  async function runAction(actionId) {
    const action = (state.world.actions || []).find(function (a) { return a.id === actionId; });
    const emojis = action ? [action.icon, '✨', '⭐'] : ['✨'];

    if (state.preview) {
      const res = previewAction(actionId);
      applyCustomization(res.customization);
      spawnParticles(emojis);
      showToast(res.message);
      haptic();
      return;
    }

    if (state.saving) return;
    state.saving = true;
    try {
      const res = await Auth.api('/api/me/build/play/' + state.slug + '/action', {
        method: 'POST',
        body: JSON.stringify({ action: actionId }),
      });
      applyCustomization(res.customization);
      spawnParticles(emojis);
      showToast(res.message);
      haptic();
    } catch (err) {
      showToast(err.message || 'Något gick fel');
    } finally {
      state.saving = false;
    }
  }

  function mountUi(world, customization, preview) {
    state.world = world;
    state.preview = preview;

    $('bpwTitle').textContent = (world.icon || '') + ' ' + (world.title || 'Lek-värld');
    $('bpwSub').textContent = preview
      ? 'Förhandsvisning — logga in som barn för att spara'
      : (world.subtitle || '');

    const banner = $('bpwPreviewBanner');
    if (banner) banner.hidden = !preview;

    document.title = (world.title || 'Lek-värld') + ' — Min värld';
    applyCustomization(customization);
    renderActions();
    showApp();
  }

  function startPreview(slug) {
    const world = PREVIEW_WORLDS[slug];
    if (!world) {
      showLogin('Okänd lek-värld: ' + slug);
      return;
    }
    mountUi(world, { ...world.defaults }, true);
  }

  async function init() {
    const slug = getSlugFromPath();
    state.slug = slug;

    if (!slug || PLAY_SLUGS.indexOf(slug) < 0) {
      showLogin('Lek-världen finns inte. Gå tillbaka till Min värld.');
      return;
    }

    if (!window.Auth || typeof Auth.api !== 'function') {
      if (isPreviewMode()) { startPreview(slug); return; }
      showLogin('Kunde inte ladda inloggning. Ladda om sidan.');
      return;
    }

    try {
      let me = null;
      try { me = await Auth.api('/api/auth/me'); } catch (_) { me = null; }

      if (!isChildUser(me)) {
        if (isPreviewMode()) { startPreview(slug); return; }
        if (me && me.type === 'parent') {
          showLogin('Du är inloggad som förälder. Låt barnet logga in — eller lägg till ?preview=1.');
          return;
        }
        showLogin('Logga in som barn för att leka här.');
        return;
      }

      const qs = isPreviewMode() ? '?preview=1' : '';
      const data = await Auth.api('/api/me/build/play/' + slug + qs);
      mountUi(data.world, data.customization, isPreviewMode());
    } catch (err) {
      console.error('[PLAY]', err);
      if (isPreviewMode()) {
        startPreview(slug);
        showToast('API fel — visar förhandsvisning');
        return;
      }
      const host = (window.location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') {
        startPreview(slug);
        showToast('Demoläge — kör npm run migrate om det inte sparar');
        return;
      }
      showLogin((err && err.message) ? err.message + ' Prova ?preview=1.' : 'Kunde inte öppna lek-världen.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
