/**
 * child-profile-setup.js — B8 inline setup on barnprofil Inställningar tab (v2.4).
 */
(function () {
  'use strict';

  const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  const BIRTHDAY_PREFIX = 'profileBd';

  let _wiring = false;

  function calcAge(birthday) {
    if (!birthday) return null;
    const bday = new Date(birthday);
    if (Number.isNaN(bday.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
    if (age < 0) return null;
    return age + ' år';
  }

  function readBirthdayValue() {
    const year = document.getElementById(BIRTHDAY_PREFIX + 'Year');
    const month = document.getElementById(BIRTHDAY_PREFIX + 'Month');
    const day = document.getElementById(BIRTHDAY_PREFIX + 'Day');
    if (!year || !month || !day) return null;
    const y = year.value;
    const m = month.value;
    const d = day.value;
    return (y && m && d) ? y + '-' + m + '-' + d : null;
  }

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

  function isNnlModeEnabled(child) {
    return child && child.show_now_next === true;
  }

  async function saveNnlMode(childId, enabled) {
    return window.apiFetch('/api/children/' + encodeURIComponent(childId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        show_now_next: enabled,
        require_sequential_completion: enabled,
      }),
    });
  }

  function transitionLeadHtml(child, hasAccess) {
    if (!hasAccess) return '';
    const leadMins = Array.isArray(child.transition_lead_minutes) ? child.transition_lead_minutes : [5, 1];
    const options = [5, 3, 1].map(function (m) {
      const checked = leadMins.indexOf(m) >= 0;
      return '<label class="flex items-center gap-2 text-sm text-navy cursor-pointer min-h-[44px]">' +
        '<input type="checkbox" class="transition-lead-cb accent-gold min-w-[44px] min-h-[44px]" data-minutes="' + m + '"' +
        (checked ? ' checked' : '') + '>' +
        ' Om ' + m + ' min' + (m === 1 ? '' : 'uter') +
        '</label>';
    }).join('');
    return '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-1">⏳ Övergångsstöd</p>' +
      '<p class="text-xs text-text-soft mb-3">Välj när barnet ser varningstext i NU-kortet: Snart → Om X min → Nu.</p>' +
      '<div class="flex flex-col gap-2" id="transitionLeadGroup">' + options + '</div>' +
      '<p class="text-xs text-text-soft mt-3">Minst en lead-tid rekommenderas. Standard: 5 och 1 minut.</p>' +
      '</div>';
  }

  function wireTransitionLeadCheckboxes(child) {
    document.querySelectorAll('.transition-lead-cb').forEach(function (cb) {
      cb.addEventListener('change', async function () {
        const selected = Array.from(document.querySelectorAll('.transition-lead-cb:checked'))
          .map(function (el) { return parseInt(el.getAttribute('data-minutes'), 10); })
          .filter(function (n) { return !Number.isNaN(n); });
        if (selected.length === 0) {
          showToast('Välj minst en lead-tid', true);
          cb.checked = true;
          return;
        }
        const res = await saveChildField(child.id, 'transition_lead_minutes', selected);
        if (!res.ok) {
          cb.checked = !cb.checked;
          showToast('Kunde inte spara övergångstider', true);
          return;
        }
        child.transition_lead_minutes = selected;
        showToast('Övergångstider sparade');
      });
    });
  }

  function advancedSettingsHtml(child) {
    const hapticsOn = localStorage.getItem('stjarndag_haptics_enabled') !== 'false';
    return '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-1">Barnvy & rutiner</p>' +
      '<p class="text-xs text-text-soft mb-3">Ordning, klocka, animationer och timer.</p>' +
      toggleRow('profileSetupNnl', 'NU / NÄSTA / SEDAN', 'Guidad ordning — barnet bockar av en i taget', isNnlModeEnabled(child)) +
      toggleRow('profileSetupReorder', 'Barnets omsortering', 'Barnet kan dra om aktiviteter', !!child.allow_child_reorder) +
      toggleRow('profileSetupHideClock', 'Dölj klockslag', 'Minskar stress för tidskänsliga barn', !!child.hide_clock) +
      toggleRow('profileSetupLockSchedule', 'Lås schema', 'Barnet kan inte bläddra till andra dagar', !!child.lock_schedule) +
      toggleRow('profileSetupDopamin', 'Dopamin-animation', 'Stjärnburst vid avbockning', child.dopamin_animation !== false) +
      toggleRow('profileSetupHaptics', 'Vibration', 'Taktil feedback vid stjärnor och belöningar', hapticsOn) +
      toggleRow('profileSetupActivityTimers', 'Aktivitetstimer (timglas)', 'Masterbrytare. Sätt tid per aktivitet i biblioteket.', child.activity_timers_enabled === true) +
      toggleRow('profileSetupVisualTimer', 'Visuell timer', 'Cirkulär klocka vid pågående aktivitet', child.visual_timer !== false) +
      toggleRow('profileSetupColorCoding', 'Färgkodning', 'Färgkodade aktivitetskort', child.color_coding !== false) +
      '</div>';
  }

  function wireChildToggle(track, childId, field, child, onSaved) {
    if (!track) return;
    track.addEventListener('click', async function (e) {
      e.preventDefault();
      const on = !track.classList.contains('on');
      track.classList.toggle('on');
      const res = await saveChildField(childId, field, on);
      if (!res.ok) {
        track.classList.toggle('on');
        showToast('Kunde inte spara', true);
        return;
      }
      child[field] = on;
      showToast('Sparat');
      if (onSaved) onSaved(on);
    });
  }

  function avatarPreviewHtml(child) {
    if (window.MemberAvatar) {
      return '<div id="profileSetupAvatarWrap">' + MemberAvatar.renderChildAvatar(child, 64) + '</div>';
    }
    return '<span class="text-5xl" id="profileSetupEmoji">' + esc(child.emoji || '⭐') + '</span>';
  }

  const PROFILE_EMOJIS = ['👧', '👦', '🧒', '👶', '🌟', '🦄', '🐱', '🐶', '🐻', '🦊', '🌈', '🎀'];

  function profileIdentityHtml(child) {
    const currentEmoji = child.emoji || '⭐';
    const emojiBtns = PROFILE_EMOJIS.map(function (em) {
      const selected = em === currentEmoji;
      return '<button type="button" class="profile-setup-emoji-opt text-2xl p-2 rounded-lg border-2 min-h-[44px] min-w-[44px] transition-colors ' +
        (selected ? 'border-gold bg-gold-light' : 'border-transparent hover:border-gold') +
        '" data-emoji="' + em + '" aria-label="Välj emoji ' + em + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' + em + '</button>';
    }).join('');
    return '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
      '<p class="font-semibold text-navy mb-1">Namn &amp; emoji</p>' +
      '<p class="text-xs text-text-soft mb-3">Så här visas barnet i familjen och vid inloggning.</p>' +
      '<form id="profileSetupIdentityForm" class="space-y-4">' +
      '<div>' +
      '<label for="profileSetupName" class="block text-sm font-medium text-text-soft mb-1">Barnets namn</label>' +
      '<input id="profileSetupName" type="text" required maxlength="100" autocomplete="off" ' +
      'value="' + esc(child.name || '') + '" ' +
      'class="w-full px-4 py-3 border border-lavender rounded-xl bg-white text-navy font-body text-sm min-h-[44px] focus:border-gold focus:outline-none" ' +
      'placeholder="T.ex. Emma" />' +
      '</div>' +
      '<div>' +
      '<p class="block text-sm font-medium text-text-soft mb-1" id="profileSetupEmojiLabel">Emoji</p>' +
      '<div class="flex flex-wrap gap-2" role="group" aria-labelledby="profileSetupEmojiLabel">' + emojiBtns + '</div>' +
      '<input type="hidden" id="profileSetupEmoji" value="' + esc(currentEmoji) + '" />' +
      '</div>' +
      '<div>' +
      '<label class="block text-sm font-medium text-text-soft mb-1" for="' + BIRTHDAY_PREFIX + 'Year">Födelsedag</label>' +
      '<p class="text-xs text-text-soft mb-2">Hjälper oss föreslå rätt schema och visa ålder.</p>' +
      '<div class="grid grid-cols-3 gap-2">' +
      '<select id="' + BIRTHDAY_PREFIX + 'Year" onchange="updateBirthdayDays(\'' + BIRTHDAY_PREFIX + '\')" ' +
      'class="profile-birthday-select w-full min-w-0 px-2 py-3 border border-lavender rounded-xl bg-white text-navy font-body text-sm min-h-[44px] focus:border-gold focus:outline-none" aria-label="Födelseår">' +
      '<option value="">År</option></select>' +
      '<select id="' + BIRTHDAY_PREFIX + 'Month" onchange="updateBirthdayDays(\'' + BIRTHDAY_PREFIX + '\')" ' +
      'class="profile-birthday-select w-full min-w-0 px-2 py-3 border border-lavender rounded-xl bg-white text-navy font-body text-sm min-h-[44px] focus:border-gold focus:outline-none" aria-label="Födelsemånad">' +
      '<option value="">Månad</option></select>' +
      '<select id="' + BIRTHDAY_PREFIX + 'Day" ' +
      'class="profile-birthday-select w-full min-w-0 px-2 py-3 border border-lavender rounded-xl bg-white text-navy font-body text-sm min-h-[44px] focus:border-gold focus:outline-none" aria-label="Födelsedag">' +
      '<option value="">Dag</option></select>' +
      '</div></div>' +
      '<button type="submit" id="profileSetupIdentitySave" ' +
      'class="w-full py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold text-sm min-h-[44px] transition-colors">' +
      'Spara profil</button>' +
      '</form></div>';
  }

  function updateProfileHeader(child) {
    const mount = document.getElementById('childProfileMount');
    if (!mount || !child) return;
    const title = mount.querySelector('h1');
    if (title) title.textContent = child.name || '';
    const subtitle = mount.querySelector('.child-profile-subtitle');
    if (subtitle) {
      const ageText = calcAge(child.birthday);
      subtitle.textContent = ageText ? ('Barnprofil · ' + ageText) : 'Barnprofil';
    }
    const emojiEl = mount.querySelector('.flex.items-center.gap-3.mb-4 > .text-4xl');
    if (emojiEl) emojiEl.textContent = child.emoji || '⭐';
  }

  function wireBirthdayPicker(child) {
    if (typeof window.initBirthdayPicker !== 'function') return;
    window.initBirthdayPicker(BIRTHDAY_PREFIX);
    if (typeof window.setBirthdayValue === 'function') {
      window.setBirthdayValue(child.birthday, BIRTHDAY_PREFIX);
    }
  }

  function setupHtml(child, viewConfig, hasTransitionSupportAccess) {
    const vm = viewConfig || {};
    const avatar = avatarPreviewHtml(child);
    const hasPhoto = !!child.has_avatar;
    const transitionBlock = transitionLeadHtml(child, !!hasTransitionSupportAccess);
    return '<div class="space-y-4">' +
      '<div class="bg-white rounded-2xl border border-lavender p-4">' +
      '<p class="font-semibold text-navy mb-3">Profilbild</p>' +
      '<div class="flex items-center gap-4 mb-3">' + avatar + '</div>' +
      '<div class="flex flex-col gap-2">' +
      '<button type="button" id="profileSetupPhotoBtn" class="w-full py-3 bg-sky text-navy rounded-xl font-semibold text-sm min-h-[44px]">' +
      (hasPhoto ? 'Byt foto' : 'Lägg till foto') + '</button>' +
      (hasPhoto ? '<button type="button" id="profileSetupPhotoRemoveBtn" class="w-full py-3 border border-lavender text-red-600 rounded-xl font-semibold text-sm min-h-[44px]">Ta bort bild</button>' : '') +
      '</div></div>' +
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
      transitionBlock +
      advancedSettingsHtml(child) +
      (child.role === 'primary'
        ? '<div class="pt-4 mt-2 border-t border-lavender">' +
          '<button type="button" id="profileDeleteChildBtn" class="w-full py-3 bg-coral/30 hover:bg-coral/50 text-red-700 rounded-xl text-sm font-semibold transition-colors min-h-[44px]">' +
          '🗑 Radera barn permanent</button>' +
          '<p class="text-xs text-text-soft text-center mt-2">Tar bort schema, stjärnor och all historik för barnet.</p>' +
          '</div>'
        : '') +
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
      const rewards = (Array.isArray(data) ? data : (data.rewards || [])).filter(function (r) {
        return r && r.is_active !== false;
      });
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

  function wireIdentityForm(child) {
    const form = document.getElementById('profileSetupIdentityForm');
    const nameInput = document.getElementById('profileSetupName');
    const emojiInput = document.getElementById('profileSetupEmoji');
    const saveBtn = document.getElementById('profileSetupIdentitySave');
    if (!form || !nameInput || !emojiInput) return;

    document.querySelectorAll('.profile-setup-emoji-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const emoji = btn.getAttribute('data-emoji') || '⭐';
        emojiInput.value = emoji;
        document.querySelectorAll('.profile-setup-emoji-opt').forEach(function (b) {
          const on = b.getAttribute('data-emoji') === emoji;
          b.classList.toggle('border-gold', on);
          b.classList.toggle('bg-gold-light', on);
          b.classList.toggle('border-transparent', !on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Namn krävs', true);
        nameInput.focus();
        return;
      }
      const emoji = (emojiInput.value || '').trim() || child.emoji || '⭐';
      const birthday = readBirthdayValue();
      if (saveBtn) saveBtn.disabled = true;
      try {
        const body = { name: name, emoji: emoji };
        if (birthday) body.birthday = birthday;
        const res = await window.apiFetch('/api/children/' + encodeURIComponent(child.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          showToast(await formatApiError(res, 'Kunde inte spara profil'), true);
          return;
        }
        const updated = await res.json();
        child.name = updated.name || name;
        child.emoji = updated.emoji || emoji;
        if (updated.birthday) child.birthday = updated.birthday;
        else if (birthday) child.birthday = birthday;
        updateProfileHeader(child);
        if (child.username && typeof Auth !== 'undefined' && Auth.persistKnownChildrenFromSession) {
          Auth.persistKnownChildrenFromSession([child], Auth.getFamilyId && Auth.getFamilyId());
        }
        showToast('Profil sparad');
      } catch (err) {
        showToast((err && err.message) || 'Kunde inte spara profil', true);
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });
  }

  async function wireSetup(child, viewConfig, pinSetupHtml, onPinWire) {
    if (_wiring) return;
    _wiring = true;
    const mount = document.getElementById('childProfileSetupBody');
    if (!mount) { _wiring = false; return; }
    let hasTransitionSupportAccess = false;
    try {
      const accessRes = await fetch('/api/subscription/access', { credentials: 'include' });
      if (accessRes.ok) {
        const accessData = await accessRes.json();
        hasTransitionSupportAccess = !!(accessData.features && accessData.features.transition_support);
      }
    } catch (_) { /* non-blocking */ }
    // Name/emoji first — parents look here to rename a child (was lost when drawer → barnprofil).
    mount.innerHTML = profileIdentityHtml(child) + (pinSetupHtml || '') + setupHtml(child, viewConfig, hasTransitionSupportAccess);
    if (onPinWire) onPinWire();
    wireBirthdayPicker(child);
    wireIdentityForm(child);
    wireTransitionLeadCheckboxes(child);

    const rewardsMount = document.getElementById('profileSetupRewards');
    if (rewardsMount) loadRewardsList(child.id, rewardsMount);

    const photoBtn = document.getElementById('profileSetupPhotoBtn');
    const removeBtn = document.getElementById('profileSetupPhotoRemoveBtn');
    if (photoBtn && window.AvatarUploadFlow) {
      photoBtn.addEventListener('click', async function () {
        photoBtn.disabled = true;
        const orig = photoBtn.textContent;
        photoBtn.textContent = 'Laddar…';
        try {
          const endpoint = '/api/children/' + encodeURIComponent(child.id) + '/avatar';
          const updated = await AvatarUploadFlow.pickCropAndUpload(endpoint);
          if (!updated) return;
          Object.assign(child, updated);
          _wiring = false;
          wireSetup(child, viewConfig, pinSetupHtml, onPinWire);
          showToast('Bild sparad!');
        } catch (err) {
          const msg = (err && err.message) ? err.message : 'Kunde inte spara bild';
          console.error('[child-profile-setup] photo save failed:', msg);
          showToast(msg, 'error', 7000);
        } finally {
          photoBtn.disabled = false;
          photoBtn.textContent = orig;
          _wiring = false;
        }
      });
    } else if (photoBtn) {
      photoBtn.classList.add('hidden');
    }

    if (removeBtn && window.AvatarUploadFlow) {
      removeBtn.addEventListener('click', async function () {
        removeBtn.disabled = true;
        try {
          const endpoint = '/api/children/' + encodeURIComponent(child.id) + '/avatar';
          const updated = await AvatarUploadFlow.deleteAvatar(endpoint);
          Object.assign(child, updated);
          _wiring = false;
          wireSetup(child, viewConfig, pinSetupHtml, onPinWire);
          showToast('Profilbilden togs bort');
        } catch (err) {
          showToast(err.message || 'Kunde inte ta bort', 'error', 7000);
        } finally {
          removeBtn.disabled = false;
          _wiring = false;
        }
      });
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

    const nnlToggle = document.getElementById('profileSetupNnl');
    if (nnlToggle) {
      nnlToggle.addEventListener('click', async function (e) {
        e.preventDefault();
        const on = !nnlToggle.classList.contains('on');
        nnlToggle.classList.toggle('on');
        const res = await saveNnlMode(child.id, on);
        if (!res.ok) {
          nnlToggle.classList.toggle('on');
          showToast('Kunde inte spara', true);
          return;
        }
        child.show_now_next = on;
        child.require_sequential_completion = on;
        showToast(on ? 'NU / NÄSTA / SEDAN aktiverat' : 'Fri avbockning — barnet väljer själv');
      });
    }

    wireChildToggle(document.getElementById('profileSetupReorder'), child.id, 'allow_child_reorder', child);
    wireChildToggle(document.getElementById('profileSetupHideClock'), child.id, 'hide_clock', child);
    wireChildToggle(document.getElementById('profileSetupLockSchedule'), child.id, 'lock_schedule', child);
    wireChildToggle(document.getElementById('profileSetupDopamin'), child.id, 'dopamin_animation', child);
    wireChildToggle(document.getElementById('profileSetupActivityTimers'), child.id, 'activity_timers_enabled', child);
    wireChildToggle(document.getElementById('profileSetupVisualTimer'), child.id, 'visual_timer', child);
    wireChildToggle(document.getElementById('profileSetupColorCoding'), child.id, 'color_coding', child);

    const hapticsToggle = document.getElementById('profileSetupHaptics');
    if (hapticsToggle) {
      hapticsToggle.addEventListener('click', function (e) {
        e.preventDefault();
        const on = !hapticsToggle.classList.contains('on');
        hapticsToggle.classList.toggle('on');
        localStorage.setItem('stjarndag_haptics_enabled', on ? 'true' : 'false');
        showToast(on ? 'Vibration påslagen' : 'Vibration avstängd');
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
