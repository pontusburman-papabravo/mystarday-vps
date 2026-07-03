/**
 * child-profile-setup.js — B8 inline setup on barnprofil Inställningar tab (v2.3).
 */
(function () {
  'use strict';

  const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  let _wiring = false;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function safeAvatarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.indexOf('/') === 0) return true;
    try {
      const parsed = new URL(trimmed, window.location.origin);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  async function formatApiError(res, fallback) {
    try {
      const data = await res.json();
      if (data && data.error) {
        if (data.details && data.details.length) {
          return data.error + ' (' + data.details.join('; ') + ')';
        }
        return data.error;
      }
    } catch (_) { /* non-json */ }
    return fallback + ' (felkod ' + res.status + ')';
  }

  function toggleRow(id, label, sub, on) {
    return '<div class="flex items-center justify-between gap-3 py-3 border-b border-lavender last:border-0 child-profile-setup-row">' +
      '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-navy">' + esc(label) + '</p>' +
      (sub ? '<p class="text-xs text-text-soft mt-0.5">' + esc(sub) + '</p>' : '') + '</div>' +
      '<div class="toggle-track profile-setup-toggle ' + (on ? 'on' : '') + '" id="' + id + '" data-field="' + id + '" style="min-width:44px;min-height:24px;flex-shrink:0">' +
      '<div class="toggle-thumb"></div></div></div>';
  }

  function setupHtml(child, viewConfig) {
    const vm = viewConfig || {};
    const avatar = safeAvatarUrl(child.avatar_url)
      ? '<img src="' + esc(child.avatar_url) + '" alt="" class="w-16 h-16 rounded-full object-cover ring-2 ring-gold" id="profileSetupAvatar">'
      : '<span class="text-5xl" id="profileSetupEmoji">' + esc(child.emoji || '⭐') + '</span>';
    return '<div class="space-y-4">' +
      '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-3">Profilbild</p>' +
      '<div class="flex items-center gap-4 mb-3">' + avatar + '</div>' +
      '<button type="button" id="profileSetupPhotoBtn" class="w-full py-3 bg-sky text-navy rounded-xl font-semibold text-sm">Byt foto</button>' +
      '</div>' +
      '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-2">Barnvy</p>' +
      '<div class="grid grid-cols-2 gap-2 mb-3">' +
      '<button type="button" id="profileViewClassic" class="py-3 rounded-xl font-semibold text-sm border ' +
      (vm.view_mode !== 'new' ? 'bg-gold border-gold text-navy' : 'bg-white border-lavender text-navy') + '">Klassisk</button>' +
      '<button type="button" id="profileViewNew" class="py-3 rounded-xl font-semibold text-sm border ' +
      (vm.view_mode === 'new' ? 'bg-gold border-gold text-navy' : 'bg-white border-lavender text-navy') + '">Ny vy</button>' +
      '</div>' +
      toggleRow('profileSetupMinimalUi', 'Distraktionsfri vy', 'Döljer extra knappar i barnvyn', !!vm.minimal_ui) +
      '</div>' +
      '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-2">Känslor & belöningar</p>' +
      toggleRow('profileSetupMood', 'Känsloregistrering', 'Slider efter avbockning', child.show_mood_rating !== false) +
      '<div id="profileSetupRewards" class="mt-3"><p class="text-sm text-text-soft">Laddar belöningar…</p></div>' +
      '<a href="/library" class="block mt-3 text-center text-xs text-gold font-semibold">Skapa fler belöningar →</a>' +
      '</div>' +
      '<a href="/family/child/' + encodeURIComponent(child.id) + '?tab=setup" class="block text-sm text-text-soft text-center">Avancerade inställningar (NU/NÄSTA, klocka m.m.) →</a>' +
      '<div class="pt-4 mt-2 border-t border-lavender">' +
      '<button type="button" id="profileDeleteChildBtn" class="w-full py-3 bg-coral/30 hover:bg-coral/50 text-red-700 rounded-xl text-sm font-semibold transition-colors min-h-[44px]">' +
      '🗑 Radera barn permanent</button>' +
      '<p class="text-xs text-text-soft text-center mt-2">Tar bort schema, stjärnor och all historik för barnet.</p>' +
      '</div>' +
      '</div>';
  }

  async function saveChildField(childId, field, value) {
    return window.apiFetch('/api/children/' + encodeURIComponent(childId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function saveViewConfig(childId, config) {
    return window.apiFetch('/api/children/' + encodeURIComponent(childId) + '/view-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async function loadRewardsList(childId, mount) {
    try {
      const resp = await window.apiFetch('/api/rewards');
      const data = resp.ok ? await resp.json() : {};
      const rewards = Array.isArray(data) ? data : (data.rewards || []);
      if (!rewards.length) {
        mount.innerHTML = '<p class="text-sm text-text-soft">Inga belöningar ännu.</p>';
        return;
      }
      mount.innerHTML = rewards.map(function (r) {
        const vtc = r.visible_to_children;
        const visible = vtc === null || vtc === undefined || (Array.isArray(vtc) && vtc.indexOf(childId) >= 0);
        return '<div class="flex items-center justify-between gap-2 py-2 border-b border-lavender last:border-0">' +
          '<div class="flex items-center gap-2 min-w-0 flex-1">' +
          '<span class="shrink-0">' + esc(r.icon || '🏆') + '</span>' +
          '<div class="min-w-0">' +
          '<p class="text-sm font-semibold text-navy truncate">' + esc(r.name) + '</p>' +
          (r.star_cost != null ? '<p class="text-xs text-text-soft">' + esc(String(r.star_cost)) + ' ⭐</p>' : '') +
          '</div></div>' +
          '<div class="toggle-track profile-reward-toggle ' + (visible ? 'on' : '') + '" data-reward-id="' + esc(r.id) + '" style="min-width:44px;min-height:24px;flex-shrink:0">' +
          '<div class="toggle-thumb"></div></div></div>';
      }).join('');

      mount.querySelectorAll('.profile-reward-toggle').forEach(function (track) {
        track.addEventListener('click', function () {
          toggleRewardVisibility(childId, track, rewards);
        });
      });
    } catch (_) {
      mount.innerHTML = '<p class="text-sm text-text-soft">Kunde inte ladda belöningar.</p>';
    }
  }

  async function toggleRewardVisibility(childId, track, rewards) {
    const rewardId = track.getAttribute('data-reward-id');
    const r = rewards.find(function (x) { return x.id === rewardId; });
    if (!r) return;
    const wasOn = track.classList.contains('on');
    track.classList.toggle('on');
    try {
      const vtcCurrent = r.visible_to_children;
      let newVtc;
      if (wasOn) {
        if (vtcCurrent === null || vtcCurrent === undefined) {
          const childrenRes = await window.apiFetch('/api/children');
          const allChildren = childrenRes.ok ? await childrenRes.json() : [];
          newVtc = allChildren.map(function (c) { return c.id; }).filter(function (id) { return id !== childId; });
        } else {
          newVtc = (Array.isArray(vtcCurrent) ? vtcCurrent : []).filter(function (id) { return id !== childId; });
        }
      } else if (vtcCurrent === null || vtcCurrent === undefined) {
        newVtc = null;
      } else {
        newVtc = Array.from(new Set((vtcCurrent || []).concat([childId])));
      }
      const res = await window.apiFetch('/api/rewards/' + encodeURIComponent(rewardId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_children: newVtc }),
      });
      if (!res.ok) throw new Error('save failed');
      const updated = await res.json();
      r.visible_to_children = updated.visible_to_children;
      showToast(wasOn ? 'Dold för barnet' : 'Synlig för barnet');
    } catch (_) {
      track.classList.toggle('on');
      showToast('Kunde inte uppdatera', true);
    }
  }

  async function wireSetup(child, viewConfig, pinSetupHtml, onPinWire) {
    if (_wiring) return;
    _wiring = true;
    const mount = document.getElementById('childProfileSetupBody');
    if (!mount) { _wiring = false; return; }
    mount.innerHTML = pinSetupHtml + setupHtml(child, viewConfig);
    if (onPinWire) onPinWire();

    const rewardsMount = document.getElementById('profileSetupRewards');
    if (rewardsMount) loadRewardsList(child.id, rewardsMount);

    const photoBtn = document.getElementById('profileSetupPhotoBtn');
    if (photoBtn && window.Platform && Platform.camera) {
      photoBtn.addEventListener('click', async function () {
        try {
          const result = await Platform.camera.pick({ quality: 'medium' });
          if (!result || result.error) {
            if (result && result.error) showToast(result.error, true);
            return;
          }
          photoBtn.disabled = true;
          photoBtn.textContent = 'Laddar upp…';
          const url = await Platform.camera.upload(result);
          if (!url || !safeAvatarUrl(url)) {
            throw new Error('Uppladdningen gav en ogiltig bildadress — försök igen');
          }
          const res = await saveChildField(child.id, 'avatar_url', url);
          if (!res.ok) {
            throw new Error(await formatApiError(res, 'Kunde inte spara profilbilden'));
          }
          const updated = await res.json();
          child.avatar_url = updated.avatar_url || url;
          if (!safeAvatarUrl(child.avatar_url)) {
            throw new Error('Profilbilden sparades men kunde inte visas — ladda om sidan');
          }
          const img = document.getElementById('profileSetupAvatar');
          if (img) img.src = child.avatar_url;
          else {
            const emoji = document.getElementById('profileSetupEmoji');
            if (emoji) {
              const newImg = document.createElement('img');
              newImg.id = 'profileSetupAvatar';
              newImg.src = child.avatar_url;
              newImg.className = 'w-16 h-16 rounded-full object-cover ring-2 ring-gold';
              emoji.replaceWith(newImg);
            }
          }
          showToast('Bild sparad!');
        } catch (err) {
          const msg = (err && err.message) ? err.message : 'Kunde inte spara bild';
          console.error('[child-profile-setup] photo save failed:', msg);
          showToast(msg, 'error', 7000);
        } finally {
          photoBtn.disabled = false;
          photoBtn.textContent = 'Byt foto';
        }
      });
    } else if (photoBtn) {
      photoBtn.classList.add('hidden');
    }

    const classicBtn = document.getElementById('profileViewClassic');
    const newBtn = document.getElementById('profileViewNew');
    if (classicBtn && newBtn) {
      classicBtn.addEventListener('click', async function () {
        const res = await saveViewConfig(child.id, { view_mode: 'classic' });
        if (res.ok) { viewConfig.view_mode = 'classic'; showToast('Klassisk vy'); wireSetup(child, viewConfig, pinSetupHtml, onPinWire); }
      });
      newBtn.addEventListener('click', async function () {
        const res = await saveViewConfig(child.id, { view_mode: 'new' });
        if (res.ok) { viewConfig.view_mode = 'new'; showToast('Ny vy'); wireSetup(child, viewConfig, pinSetupHtml, onPinWire); }
      });
    }

    const moodToggle = document.getElementById('profileSetupMood');
    if (moodToggle) {
      moodToggle.addEventListener('click', async function (e) {
        e.preventDefault();
        const on = !moodToggle.classList.contains('on');
        moodToggle.classList.toggle('on');
        const res = await saveChildField(child.id, 'show_mood_rating', on);
        if (!res.ok) { moodToggle.classList.toggle('on'); showToast('Kunde inte spara', true); }
        else { child.show_mood_rating = on; showToast('Sparat'); }
      });
    }

    const minimalToggle = document.getElementById('profileSetupMinimalUi');
    if (minimalToggle) {
      minimalToggle.addEventListener('click', async function (e) {
        e.preventDefault();
        const on = !minimalToggle.classList.contains('on');
        minimalToggle.classList.toggle('on');
        const res = await saveViewConfig(child.id, { minimal_ui: on });
        if (!res.ok) { minimalToggle.classList.toggle('on'); showToast('Kunde inte spara', true); }
        else { viewConfig.minimal_ui = on; showToast('Sparat'); }
      });
    }
    _wiring = false;
  }

  async function schemaSummaryHtml(childId, childName) {
    try {
      const res = await window.apiFetch('/api/children/' + encodeURIComponent(childId) + '/schedules');
      if (!res.ok) {
        return '<p class="text-text-soft mb-4">Kunde inte ladda schema.</p>' +
          '<a href="/schedule?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Öppna veckoschema →</a>';
      }
      const schedules = await res.json();
      const byDay = {};
      (schedules || []).forEach(function (s) {
        const dow = parseInt(s.day_of_week, 10);
        const idx = dow === 0 ? 6 : dow - 1;
        byDay[idx] = parseInt(s.item_count, 10) || 0;
      });
      const dots = DAY_LABELS.map(function (_label, i) {
        const count = byDay[i] || 0;
        const cls = count > 0 ? 'bg-gold' : 'bg-lavender';
        return '<div class="flex flex-col items-center gap-1 flex-1"><span class="w-3 h-3 rounded-full ' + cls + '"></span>' +
          '<span class="text-[10px] text-text-soft">' + DAY_LABELS[i] + '</span>' +
          (count > 0 ? '<span class="text-[10px] font-bold text-navy">' + count + '</span>' : '') + '</div>';
      }).join('');
      return '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
        '<p class="text-sm text-text-soft mb-3">Veckodagsöversikt för ' + esc(childName) + '</p>' +
        '<div class="flex gap-1">' + dots + '</div></div>' +
        '<a href="/schedule?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Redigera veckoschema →</a>';
    } catch (_) {
      return '<a href="/schedule?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Öppna veckoschema →</a>';
    }
  }

  window.ChildProfileSetup = {
    wireSetup: wireSetup,
    schemaSummaryHtml: schemaSummaryHtml,
  };
})();
