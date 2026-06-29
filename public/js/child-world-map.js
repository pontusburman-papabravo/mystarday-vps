/**
 * child-world-map.js — Världskarta (7 lek-världar) i Min värld.
 */
(function () {
  'use strict';

  const MOUNT_ID = 'childWorldMapMount';

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function defaultMap() {
    return [
      { slug: 'racerbil', icon: '🏎️', label: 'Garaget', href: '/child/garage', unlocked: false, active: false },
      { slug: 'husdjur', icon: '🐾', label: 'Husdjurshemmet', href: '/child/world', unlocked: false, active: false },
      { slug: 'dinosaurie', icon: '🦕', label: 'Dino-dalen', href: '/child/world', unlocked: false, active: false },
      { slug: 'dockhus', icon: '🏠', label: 'Dockhuset', href: '/child/world', unlocked: false, active: false },
      { slug: 'fiske', icon: '🎣', label: 'Båtkajen', href: '/child/world', unlocked: false, active: false },
      { slug: 'laxor', icon: '📚', label: 'Läxbordet', href: '/child/world', unlocked: false, active: false },
      { slug: 'vardag', icon: '⭐', label: 'Mitt rum', href: '/child/world', unlocked: false, active: false },
    ];
  }

  function renderSection(worldMap) {
    const list = worldMap && worldMap.length ? worldMap : defaultMap();
    const items = list.map(function (w) {
      const cls = w.unlocked ? ' is-unlocked' : (w.active ? ' is-active' : ' is-locked');
      const href = w.unlocked && w.href ? w.href : '';
      const tag = w.unlocked && href
        ? '<a href="' + esc(href) + '" class="skatt-world-pin' + cls + '">'
        : '<div class="skatt-world-pin' + cls + '">';
      const end = w.unlocked && href ? '</a>' : '</div>';
      const status = w.unlocked ? 'Öppen!' : (w.active ? 'Bygger…' : 'Låst');
      return tag +
        '<span class="skatt-world-pin-icon">' + esc(w.icon) + '</span>' +
        '<span class="skatt-world-pin-label">' + esc(w.label) + '</span>' +
        '<span class="skatt-world-pin-status">' + esc(status) + '</span>' +
      end;
    }).join('');
    return '<section class="skatt-world-map" aria-label="Dina lek-världar">' +
      '<h2 class="skatt-world-map-title">🗺️ Ditt växande universum</h2>' +
      '<p class="skatt-world-map-sub">Varje äventyr du bygger klart läggs till här.</p>' +
      '<div class="skatt-world-map-grid">' + items + '</div>' +
    '</section>';
  }

  function ensureMount(container) {
    if (!container) return null;
    let el = container.querySelector('#' + MOUNT_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = MOUNT_ID;
      container.insertBefore(el, container.firstChild);
    }
    return el;
  }

  async function refresh(container) {
    const mount = ensureMount(container || document.getElementById('skattkammarView'));
    if (!mount) return;
    let worldMap = defaultMap();
    if (window.Auth && typeof Auth.api === 'function') {
      try {
        const data = await Auth.api('/api/me/build');
        if (data && data.world_map && data.world_map.length) worldMap = data.world_map;
      } catch (_) { /* keep defaults */ }
    }
    mount.innerHTML = renderSection(worldMap);
    return worldMap;
  }

  window.ChildWorldMap = {
    renderSection: renderSection,
    refresh: refresh,
    defaultMap: defaultMap,
  };
})();
