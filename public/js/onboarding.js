// onboarding.js — 6-step onboarding wizard logic
// Owns: child creation, schedule selection, view type selection, reward selection,
//       PIN display/edit, invite flow, celebration, and all step navigation.
// Does NOT own: auth (auth.js), birthday picker (birthday-picker.js), toast (toast.js)

// ────────────────────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────────────────────
let currentStep = 1;
let childId = null;
let childName = '';
let childUsername = '';
let childPin = '';
let childBirthdayValue = null;   // stored for schedule-preview age calc
let selectedDayPref = null;      // template_group key (e.g. 'forskola', 'morgon', 'helg')
let selectedViewType = 'day';    // 'day' | 'timeline' — default: Dagsvy
let selectedRewards = [];        // array of { name, icon, star_cost }
let selectedEmojiValue = null;
let selectedAvatarUrl = null;    // uploaded avatar URL (iOS native camera) — null = use emoji
let weekendScheduleAdded = false; // true if parent opted in to helg schedule for Sat+Sun
let availableRewards = [];       // loaded from admin library
let loadedChildren = [];         // for invite child-selection

const TOTAL_STEPS = 6;

// Template groups loaded dynamically from admin library
let templateGroups = [];

// Fallback template group metadata (if API fails)
const TEMPLATE_GROUP_FALLBACK = [
  { key: 'forskola', name: 'Förskola', icon: '🏫', description: 'Hel dag — barn 2–5 år', activity_count: 15 },
  { key: 'skola',    name: 'Skola',    icon: '📚', description: 'Hel dag — barn 6+ år', activity_count: 13 },
  { key: 'morgon',   name: 'Morgon',   icon: '☀️', description: 'Morgonrutin', activity_count: 5 },
  { key: 'dag',      name: 'Dag',      icon: '🌤️', description: 'Dag-aktiviteter', activity_count: 5 },
  { key: 'kvall',    name: 'Kväll',    icon: '🌙', description: 'Kvällsrutin', activity_count: 5 },
  { key: 'helg',     name: 'Helg',     icon: '🎉', description: 'Helgrutin', activity_count: 10 },
];

// Fallback items for schedule preview (used if API preview fails)
const PREVIEW_FALLBACK = {
  forskola: ['🛏️ Vakna', '👕 Klä på sig', '🍳 Frukost', '🏫 Förskola', '🧩 Leka', '🍽️ Middag', '📕 Godnattsaga'],
  skola:    ['🛏️ Vakna', '🍳 Frukost', '🎒 Packa väska', '🏫 Skola', '📚 Läxor', '🍽️ Middag', '📕 Läsa'],
  morgon:   ['🛏️ Vakna', '👕 Klä på sig', '🪥 Tänderna', '🍳 Frukost', '🎒 Packa väska'],
  dag:      ['🏫 Förskola / Skola', '🛝 Leka ute', '🍎 Mellanmål', '🏃 Fritidsaktivitet', '📚 Läxor / Pyssel'],
  kvall:    ['🍽️ Middag', '🪥 Tänderna', '🧸 Pyjamas', '📕 Godnattsaga', '😴 Sova'],
  helg:     ['😴 Sova ut', '🥞 Frukost', '🧩 Leka fritt', '🌳 Utflykt', '❤️ Familjaktivitet', '🍽️ Middag'],
};

// Fallback rewards if API fails
const REWARD_PRESETS_FALLBACK = [
  { name: 'Extra saga',       icon: '📚', star_cost: 50  },
  { name: 'Välja efterrätt',  icon: '🍦', star_cost: 50  },
  { name: 'Filmkväll',        icon: '🎬', star_cost: 100 },
  { name: 'Välj middag',      icon: '🍝', star_cost: 100 },
  { name: 'Utflykt',          icon: '🌲', star_cost: 150 },
  { name: 'Baka ihop',        icon: '🧁', star_cost: 125 },
  { name: 'Familjens spelkväll', icon: '🎲', star_cost: 150 },
  { name: 'Sent uppehåll',    icon: '🌙', star_cost: 75  },
  { name: 'Biobesök',         icon: '🎬', star_cost: 250 },
];

const EMOJIS = [
  '🦁','🐯','🦊','🐻','🐼','🐸','🐙','🦄',
  '🐬','🐧','🦋','🐝','🦖','🦕','🐢','🦀',
  '🌟','⭐','🌈','☀️','🌺','🌸','🍀','🎈',
  '🚀','✈️','🎸','🎨','⚽','🏀','🎯','💎',
];

// initBirthdayPicker and updateBirthdayDays are now in /js/birthday-picker.js

function updateBirthdayHidden() {
  const y = document.getElementById('childBirthdayYear').value;
  const m = document.getElementById('childBirthdayMonth').value;
  const d = document.getElementById('childBirthdayDay').value;
  document.getElementById('childBirthday').value = (y && m && d) ? `${y}-${m}-${d}` : '';
}

// ────────────────────────────────────────────────────────────────────────────
// EMOJI GRID
// ────────────────────────────────────────────────────────────────────────────
function buildEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn text-2xl p-1.5 text-center';
    btn.textContent = emoji;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmojiValue = emoji;
      document.getElementById('customEmoji').value = '';
    });
    grid.appendChild(btn);
  });
  document.getElementById('customEmoji').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      selectedEmojiValue = val;
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE GROUP GRID (dynamic from admin library)
// ────────────────────────────────────────────────────────────────────────────
function buildTemplateGroupGrid(groups) {
  const grid = document.getElementById('templateGroupGrid');
  grid.innerHTML = '';
  groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'day-pref-card p-3 text-center';
    card.dataset.pref = group.key;
    const detailsId = `details-${group.key}`;
    const arrowId = `arrow-${group.key}`;
    card.innerHTML = `
      <div class="text-3xl mb-1.5">${group.icon}</div>
      <div class="font-semibold text-navy text-sm">${group.name}</div>
      <div class="text-text-soft text-xs mt-0.5">${group.description}</div>
      <div class="text-gold text-xs mt-1 font-medium">${group.activity_count} aktiviteter</div>
      <button class="template-toggle-btn" onclick="event.stopPropagation(); toggleTemplateDetails('${group.key}')">
        Visa aktiviteter <span class="arrow" id="${arrowId}">▼</span>
      </button>
      <div class="template-details" id="${detailsId}">
        <div class="text-xs text-text-soft py-1">Laddar...</div>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.template-toggle-btn')) return;
      document.querySelectorAll('.day-pref-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDayPref = group.key;
    });
    grid.appendChild(card);
  });
}

// Cache for loaded template details
const templateDetailsCache = {};

window.toggleTemplateDetails = async function(groupKey) {
  const details = document.getElementById(`details-${groupKey}`);
  const arrow = document.getElementById(`arrow-${groupKey}`);
  if (!details) return;

  const isOpen = details.classList.contains('open');
  // Close all other open details first
  document.querySelectorAll('.template-details.open').forEach(d => {
    d.classList.remove('open');
  });
  document.querySelectorAll('.template-toggle-btn .arrow').forEach(a => {
    a.classList.remove('open');
  });

  if (isOpen) return; // Was open, now closed

  details.classList.add('open');
  if (arrow) arrow.classList.add('open');

  // Load activities if not cached
  if (!templateDetailsCache[groupKey]) {
    try {
      const res = await window.apiFetch(`/api/onboarding/schedule-preview?group=${groupKey}`);
      if (res.ok) {
        const data = await res.json();
        templateDetailsCache[groupKey] = data.activities || [];
      }
    } catch { /* use fallback */ }

    if (!templateDetailsCache[groupKey] || templateDetailsCache[groupKey].length === 0) {
      const fb = PREVIEW_FALLBACK[groupKey] || [];
      templateDetailsCache[groupKey] = fb.map(item => {
        const parts = item.split(' ');
        return { icon: parts[0], name: parts.slice(1).join(' ') };
      });
    }
  }

  const activities = templateDetailsCache[groupKey];
  details.innerHTML = activities.map(a =>
    `<div class="template-detail-item">${escapeHtml(a.icon) || '📋'} ${escapeHtml(a.name)}</div>`
  ).join('');
};

// ────────────────────────────────────────────────────────────────────────────
// VIEW TYPE SELECTION (Step 2)
// ────────────────────────────────────────────────────────────────────────────
window.selectViewType = function(type) {
  selectedViewType = type;
  document.getElementById('viewCardDay').classList.toggle('selected', type === 'day');
  document.getElementById('viewCardTimeline').classList.toggle('selected', type === 'timeline');
};

// ────────────────────────────────────────────────────────────────────────────
// REWARD GRID
// ────────────────────────────────────────────────────────────────────────────
// Map star_cost to a 1-5 star rating for display
function starRating(cost) {
  if (cost <= 30) return 1;
  if (cost <= 75) return 2;
  if (cost <= 125) return 3;
  if (cost <= 200) return 4;
  return 5;
}

function renderStarRating(cost) {
  const rating = starRating(cost);
  let html = '<div class="star-rating">';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating ? '<span class="star-filled">★</span>' : '<span class="star-empty">★</span>';
  }
  html += '</div>';
  return html;
}

function buildRewardGrid(rewards) {
  const grid = document.getElementById('rewardGrid');
  grid.innerHTML = '';
  // Update copy with actual count
  const introPara = document.querySelector('#step4 .bg-lavender p.text-xs');
  if (introPara) {
    introPara.innerHTML = `Vi har fyllt på med <strong class="text-navy">${rewards.length}</strong> roliga belöningar. Välj de som <strong id="s4ChildName" class="text-navy">${childName || 'barnet'}</strong> ska få kämpa för!`;
  }
  rewards.forEach((reward) => {
    const card = document.createElement('div');
    card.className = 'reward-card';
    card.dataset.name = reward.name;
    card.dataset.icon = reward.icon;
    card.dataset.cost = reward.star_cost;
    card.innerHTML = `
      <div class="text-3xl mb-1">${escapeHtml(reward.icon)}</div>
      <div class="font-semibold text-navy text-xs leading-snug mb-0.5">${escapeHtml(reward.name)}</div>
      ${renderStarRating(reward.star_cost)}
      <div class="text-gold font-bold text-xs mt-0.5">${Number(reward.star_cost)} ⭐</div>
    `;
    card.addEventListener('click', () => toggleReward(card, reward));
    grid.appendChild(card);
  });
}

function toggleReward(card, reward) {
  const key = reward.name;
  const idx = selectedRewards.findIndex(r => r.name === key);
  if (idx >= 0) {
    selectedRewards.splice(idx, 1);
    card.classList.remove('selected');
  } else {
    // No limit — user can select as many rewards as they want
    selectedRewards.push({ name: reward.name, icon: reward.icon, star_cost: reward.star_cost });
    card.classList.add('selected');
  }
  const count = selectedRewards.length;
  document.getElementById('s4SelectCount').textContent = count >= 1
    ? `${count} belöning${count > 1 ? 'ar' : ''} vald${count > 1 ? 'a' : ''} ✓`
    : 'Välj minst 1 belöning (0 valda)';
}

// ────────────────────────────────────────────────────────────────────────────
// STEP NAVIGATION
// ────────────────────────────────────────────────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`step${n}`).classList.add('active');
  currentStep = n;

  // Progress bar (6 steps)
  document.getElementById('stepLabel').textContent = `Steg ${n} av ${TOTAL_STEPS}`;
  [1,2,3,4,5,6].forEach(i => {
    const pb = document.getElementById(`pb${i}`);
    pb.classList.remove('active','done');
    if (i < n) pb.classList.add('done');
    else if (i === n) pb.classList.add('active');
  });

  window.scrollTo(0, 0);
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — Create child
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step1Btn').addEventListener('click', async () => {
  const name = document.getElementById('childName').value.trim();
  const customEmojiVal = document.getElementById('customEmoji').value.trim();
  const emoji = customEmojiVal || selectedEmojiValue;
  const errorEl = document.getElementById('step1Error');
  errorEl.classList.add('hidden');

  if (!name) { showError(errorEl, 'Ange barnets namn'); return; }
  // iOS native with avatar: emoji is optional (falls back to ⭐ placeholder)
  const hasAvatar = Platform && Platform.isNative() && selectedAvatarUrl;
  if (!emoji && !hasAvatar) { showError(errorEl, 'Välj en emoji för barnet'); return; }
  if (!selectedDayPref) { showError(errorEl, 'Välj ett schema'); return; }

  const btn = document.getElementById('step1Btn');
  setLoading(btn, 'Skapar barnet…');

  try {
    const birthday = document.getElementById('childBirthday').value || null;
    const res = await window.apiFetch('/api/onboarding/child', {
      method: 'POST',
      body: JSON.stringify({ name, emoji, birthday, avatar_url: selectedAvatarUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Något gick fel');

    childId = data.id;
    childName = data.name;
    childUsername = data.username;
    childPin = data.pin;
    childBirthdayValue = document.getElementById('childBirthday').value || null;

    // Now create the schedule immediately (we know the template group)
    const schedRes = await window.apiFetch('/api/onboarding/schedule', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, template_group: selectedDayPref }),
    });
    const schedData = await schedRes.json();
    if (!schedRes.ok) throw new Error(schedData.error || 'Schemat kunde inte skapas');

    // Set child name in step 2 view selection
    document.getElementById('s2vChildName').textContent = childName;

    // School/preschool templates only cover Mon–Fri — ask about weekend schedule
    if (schedData.weekdays_only) {
      showWeekendModal();
    } else {
      goToStep(2);
    }
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
  } finally {
    setLoading(btn, 'Nästa steg →', false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WEEKEND SCHEDULE MODAL — shown after step 1 for school/preschool templates
// ────────────────────────────────────────────────────────────────────────────
function showWeekendModal() {
  document.getElementById('weekendModal').classList.remove('hidden');
}

function hideWeekendModal() {
  document.getElementById('weekendModal').classList.add('hidden');
}

window.applyWeekendSchedule = async function() {
  const yesBtn = document.getElementById('weekendYesBtn');
  const noBtn = document.getElementById('weekendNoBtn');
  const errorEl = document.getElementById('weekendModalError');
  errorEl.classList.add('hidden');
  yesBtn.disabled = true;
  noBtn.disabled = true;
  yesBtn.textContent = 'Lägger till…';

  try {
    const res = await window.apiFetch('/api/onboarding/weekend-schedule', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte lägga till helgschema');

    weekendScheduleAdded = true;
    hideWeekendModal();
    goToStep(2);
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
    yesBtn.disabled = false;
    noBtn.disabled = false;
    yesBtn.textContent = '✅ Ja, lägg till helgschema';
  }
};

window.skipWeekendSchedule = function() {
  weekendScheduleAdded = false;
  hideWeekendModal();
  goToStep(2);
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — View type selection
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step2vBtn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step2vError');
  errorEl.classList.add('hidden');
  const btn = document.getElementById('step2vBtn');
  setLoading(btn, 'Sparar vy-val…');

  try {
    // Save view_type to DB (non-blocking on failure — we fall back to default)
    if (childId) {
      const res = await window.apiFetch('/api/onboarding/child-view', {
        method: 'POST',
        body: JSON.stringify({ child_id: childId, view_type: selectedViewType }),
      });
      if (!res.ok) {
        // Non-fatal — default 'day' is already in DB
        console.warn('[onboarding] view_type save failed, using default');
      }
    }

    // Populate step 3 schedule preview before navigating
    await populateStep3();

    goToStep(3);
  } catch (err) {
    // Non-fatal error — still proceed
    await populateStep3();
    goToStep(3);
  } finally {
    setLoading(btn, 'Nästa steg →', false);
  }
});

async function populateStep3() {
  // Find the selected group's metadata
  const groupMeta = templateGroups.find(g => g.key === selectedDayPref)
    || TEMPLATE_GROUP_FALLBACK.find(g => g.key === selectedDayPref)
    || { icon: '📅', name: 'Schema', description: '' };

  document.getElementById('s3ChildName').textContent = childName;
  document.getElementById('s3TemplateIcon').textContent = groupMeta.icon;
  document.getElementById('s3TemplateLabel').textContent = groupMeta.name;

  // Update days label depending on whether weekend was added
  const isSchoolTemplate = ['forskola', 'skola', 'dag'].includes(selectedDayPref);
  const daysLabel = document.getElementById('s3DaysLabel');
  if (daysLabel) {
    if (isSchoolTemplate && weekendScheduleAdded) {
      daysLabel.textContent = 'mån–fre + helg';
    } else if (isSchoolTemplate) {
      daysLabel.textContent = 'mån–fre';
    } else {
      daysLabel.textContent = '7 dagar / vecka';
    }
  }

  // Update the subtitle copy
  const subtitleEl = document.getElementById('s3Subtitle');
  if (subtitleEl) {
    subtitleEl.innerHTML = `Vi har förberett schemat <strong class="text-navy">${groupMeta.name}</strong> för <strong class="text-navy">${childName}</strong>. Det innehåller de viktigaste stegen för att lyckas helt själv.`;
  }

  // Also update step 5 (login info)
  document.getElementById('s5ChildName').textContent = childName;
  document.getElementById('s5ChildNameCoach').textContent = childName;
  document.getElementById('s5Username').textContent = childUsername;
  document.getElementById('s5Pin').textContent = childPin;

  const preview = document.getElementById('s3SchedulePreview');

  // Try to load dynamic schedule from admin library using template_group
  try {
    const res = await window.apiFetch(`/api/onboarding/schedule-preview?group=${selectedDayPref}`);
    if (res.ok) {
      const data = await res.json();
      if (data.activities && data.activities.length > 0) {
        // Group by category
        const byCategory = {};
        for (const act of data.activities) {
          if (!byCategory[act.category_name]) byCategory[act.category_name] = [];
          byCategory[act.category_name].push(act);
        }
        let html = '';
        for (const [cat, items] of Object.entries(byCategory)) {
          if (Object.keys(byCategory).length > 1) {
            html += `<div class="text-xs font-bold text-text-soft uppercase tracking-wide mb-1 mt-2">${cat}</div>`;
          }
          html += items.map(act => `
            <div class="flex items-center gap-2 py-1.5 px-3 bg-white border border-lavender rounded-xl text-sm font-medium text-navy">
              ${act.icon || '📋'} ${act.name}
            </div>
          `).join('');
        }
        preview.innerHTML = html;
        return;
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: show static items
  const fallbackItems = PREVIEW_FALLBACK[selectedDayPref] || PREVIEW_FALLBACK['forskola'];
  preview.innerHTML = fallbackItems.map(item => `
    <div class="flex items-center gap-2 py-1.5 px-3 bg-white border border-lavender rounded-xl text-sm font-medium text-navy">
      ${item}
    </div>
  `).join('');
}

// Step 3 — just a confirmation, schedule already created in step 1
document.getElementById('step3Btn').addEventListener('click', () => {
  // Update child name in step 4 copy before navigating
  const s4Name = document.getElementById('s4ChildName');
  if (s4Name) s4Name.textContent = childName;
  goToStep(4);
});

// ────────────────────────────────────────────────────────────────────────────
// STEP 4 — Save rewards
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step4Btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step4Error');
  errorEl.classList.add('hidden');

  if (selectedRewards.length < 1) {
    showError(errorEl, 'Välj minst en belöning för att fortsätta');
    return;
  }

  const btn = document.getElementById('step4Btn');
  setLoading(btn, 'Sparar belöningar…');

  try {
    // Create all selected rewards (parallel)
    await Promise.all(selectedRewards.map(reward =>
      window.apiFetch('/api/onboarding/reward', {
        method: 'POST',
        body: JSON.stringify({ name: reward.name, icon: reward.icon, star_cost: reward.star_cost }),
      })
    ));
    goToStep(5);
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
  } finally {
    setLoading(btn, 'Spara belöningar →', false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// STEP 5 — Login info helpers
// ────────────────────────────────────────────────────────────────────────────
async function copyLoginInfo() {
  const text = `Min Stjärndag — ${childName}\nAnvändarnamn: ${childUsername}\nPIN: ${childPin}\nApp: https://my-starday.polsia.app/child-login`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyPinBtn');
    btn.textContent = '✓ Kopierat!';
    setTimeout(() => { btn.textContent = '📋 Kopiera info'; }, 2000);
  } catch {
    alert('Kopiera manuellt:\n\n' + text);
  }
}

async function emailLoginInfo() {
  try {
    const me = await (await window.apiFetch('/api/auth/me')).json();
    const email = me.email || '';
    const subject = encodeURIComponent(`Min Stjärndag — Inloggning för ${childName}`);
    const body = encodeURIComponent(
      `Hej!\n\nHär är inloggningsuppgifterna till Min Stjärndag för ${childName}:\n\nAnvändarnamn: ${childUsername}\nPIN-kod: ${childPin}\n\nÖppna appen: https://my-starday.polsia.app/child-login\n\nMed vänliga hälsningar,\nMin Stjärndag`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  } catch {
    alert(`Inloggning för ${childName}:\nAnvändarnamn: ${childUsername}\nPIN: ${childPin}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 5 — PIN edit helpers
// ────────────────────────────────────────────────────────────────────────────
window.showPinEdit = function() {
  document.getElementById('pinDisplay').classList.add('hidden');
  document.getElementById('pinEditSection').classList.remove('hidden');
  // Pre-fill with current PIN
  const digits = childPin.split('');
  for (let i = 0; i < 4; i++) {
    const input = document.getElementById(`pinD${i + 1}`);
    if (input) input.value = digits[i] || '';
  }
  document.getElementById('pinD1').focus();
};

window.cancelPinEdit = function() {
  document.getElementById('pinEditSection').classList.add('hidden');
  document.getElementById('pinDisplay').classList.remove('hidden');
  document.getElementById('pinEditError').classList.add('hidden');
};

window.saveCustomPin = async function() {
  const d1 = document.getElementById('pinD1').value;
  const d2 = document.getElementById('pinD2').value;
  const d3 = document.getElementById('pinD3').value;
  const d4 = document.getElementById('pinD4').value;
  const newPin = d1 + d2 + d3 + d4;
  const errorEl = document.getElementById('pinEditError');
  errorEl.classList.add('hidden');

  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    showError(errorEl, 'PIN-koden måste vara 4 siffror');
    return;
  }
  // Check weak patterns
  if (/^(\d)\1{3}$/.test(newPin)) {
    showError(errorEl, 'Välj en starkare PIN-kod (inte 1111, 2222 etc.)');
    return;
  }

  const btn = document.getElementById('savePinBtn');
  btn.disabled = true;
  btn.textContent = 'Sparar…';

  try {
    const res = await window.apiFetch('/api/onboarding/update-pin', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, pin: newPin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte spara PIN');

    childPin = newPin;
    document.getElementById('s5Pin').textContent = newPin;
    cancelPinEdit();
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Spara PIN';
  }
};

// Auto-advance PIN digit inputs
function setupPinInputs() {
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`pinD${i}`);
    if (!input) continue;
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && i < 4) {
        document.getElementById(`pinD${i + 1}`).focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 1) {
        document.getElementById(`pinD${i - 1}`).focus();
      }
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 6 — Complete onboarding
// ────────────────────────────────────────────────────────────────────────────
document.getElementById('step6Btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('step6Error');
  errorEl.classList.add('hidden');
  const btn = document.getElementById('step6Btn');

  // In add-child mode: skip invite step, go straight to complete
  if (IS_ADD_CHILD) {
    completeAddChild();
    return;
  }

  setLoading(btn, 'Slutför…');

  // Celebration effect
  launchStars();

  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error('Kunde inte slutföra onboardingen');

    // Update local auth state
    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    // Show loading then navigate
    document.getElementById('step6').classList.remove('active');
    document.getElementById('loadingStep').classList.remove('hidden');
    setTimeout(() => {
      window.location.href = IS_ADD_CHILD ? '/child-login' : '/dashboard';
    }, 1400);
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
    setLoading(btn, '🏠 Gå till dashboarden', false);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setLoading(btn, text, loading = true) {
  btn.disabled = loading;
  btn.textContent = text;
  btn.style.opacity = loading ? '0.7' : '1';
}

function launchStars() {
  const area = document.getElementById('celebrationArea');
  const starsEmojis = ['⭐','🌟','✨','💫'];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const star = document.createElement('span');
      star.className = 'float-star';
      star.textContent = starsEmojis[Math.floor(Math.random() * starsEmojis.length)];
      star.style.left = (20 + Math.random() * 60) + '%';
      star.style.bottom = '0';
      area.appendChild(star);
      setTimeout(() => star.remove(), 1300);
    }, i * 120);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION BANNER
// ────────────────────────────────────────────────────────────────────────────
function showVerificationBanner(user) {
  if (!user) return;
  // user.verified = true means email is confirmed; false means needs verification
  if (user.verified === true) return;

  const banner = document.getElementById('emailVerificationBanner');
  if (!banner) return;

  const emailSpan = document.getElementById('bannerEmailAddr');
  if (emailSpan && user.email) {
    emailSpan.textContent = maskEmail(user.email);
  }

  banner.classList.remove('hidden');
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return local[0] + '***' + (local.length > 3 ? local[local.length - 1] : '') + '@' + domain;
}

window.dismissEmailBanner = function() {
  const banner = document.getElementById('emailVerificationBanner');
  if (banner) banner.classList.add('hidden');
  try {
    localStorage.setItem('emailBannerDismissed', '1');
  } catch { /* ignore */ }
};

window.resendVerificationEmail = async function() {
  const resendBtn = document.getElementById('resendBtn');
  const successEl = document.getElementById('resendSuccess');
  const errorEl = document.getElementById('resendError');

  resendBtn.disabled = true;
  resendBtn.textContent = 'Skickar…';
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  try {
    const me = await (await window.apiFetch('/api/auth/me')).json();
    const email = me.email;
    const res = await window.apiFetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data?.error || 'Något gick fel. Försök igen.';
      errorEl.classList.remove('hidden');
    } else {
      successEl.textContent = '✓ Skickat!';
      successEl.classList.remove('hidden');
      resendBtn.textContent = 'Skickat';
    }
  } catch {
    errorEl.textContent = 'Nätverksfel. Försök igen.';
    errorEl.classList.remove('hidden');
  } finally {
    resendBtn.disabled = false;
    if (!successEl.classList.contains('hidden')) {
      resendBtn.textContent = 'Skickat';
    } else {
      resendBtn.textContent = 'Skicka igen';
    }
  }
};

// ────────────────────────────────────────────────────────────────────────────
// INVITE (Step 6)
// ────────────────────────────────────────────────────────────────────────────
async function loadInviteChildren() {
  try {
    const res = await window.apiFetch('/api/family');
    if (!res.ok) return;
    const data = await res.json();
    loadedChildren = data.allChildren || data.children || [];
    if (loadedChildren.length > 0) {
      const container = document.getElementById('inviteChildList');
      const wrapper = document.getElementById('inviteChildAccess');
      container.innerHTML = '';
      loadedChildren.forEach(child => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer py-1';
        label.innerHTML = `
          <input type="checkbox" value="${child.id}" class="invite-child-check w-4 h-4 accent-gold" checked />
          <span class="text-sm text-navy">${child.emoji || '⭐'} ${child.name}</span>
        `;
        container.appendChild(label);
      });
      wrapper.classList.remove('hidden');
    }
  } catch { /* non-critical */ }
}

window.sendInvite = async function() {
  const name = document.getElementById('inviteName').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();
  const errorEl = document.getElementById('inviteError');
  const successEl = document.getElementById('inviteSuccess');
  const btn = document.getElementById('inviteBtn');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!email) { errorEl.textContent = 'Ange en e-postadress'; errorEl.classList.remove('hidden'); return; }
  if (!email.includes('@')) { errorEl.textContent = 'Ogiltig e-postadress'; errorEl.classList.remove('hidden'); return; }

  // Collect selected child IDs
  const checkedBoxes = document.querySelectorAll('.invite-child-check:checked');
  const childIds = Array.from(checkedBoxes).map(cb => cb.value);

  btn.disabled = true;
  btn.textContent = 'Skickar…';

  try {
    const res = await window.apiFetch('/api/family/invite', {
      method: 'POST',
      body: JSON.stringify({ email, childIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Något gick fel';
      errorEl.classList.remove('hidden');
    } else {
      successEl.textContent = `Inbjudan skickad till ${email}! ✓`;
      successEl.classList.remove('hidden');
      document.getElementById('inviteName').value = '';
      document.getElementById('inviteEmail').value = '';
      // Disable form after success
      btn.textContent = '✓ Skickad';
      btn.className = btn.className.replace('bg-navy hover:bg-navy-soft', 'bg-green-500 cursor-default');
      return; // keep btn disabled
    }
  } catch {
    errorEl.textContent = 'Nätverksfel. Försök igen.';
    errorEl.classList.remove('hidden');
  }
  btn.disabled = false;
  btn.textContent = '📧 Skicka inbjudan';
};

window.skipInvite = async function() {
  // Complete onboarding and go directly to dashboard
  const errorEl = document.getElementById('step6Error');
  errorEl.classList.add('hidden');

  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error('Kunde inte slutföra onboardingen');

    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    document.getElementById('step6').classList.remove('active');
    document.getElementById('loadingStep').classList.remove('hidden');
    setTimeout(() => {
      window.location.href = IS_ADD_CHILD ? '/child-login' : '/dashboard';
    }, 1000);
  } catch (err) {
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ADD-CHILD COMPLETION (skip step 6 invite)
// ────────────────────────────────────────────────────────────────────────────
async function completeAddChild() {
  const btn = document.getElementById('step6Btn');
  setLoading(btn, 'Slutför…');

  try {
    const res = await window.apiFetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) throw new Error('Kunde inte slutföra');

    // Update local auth
    const user = Auth.getUser();
    if (user) {
      user.onboarding_completed = true;
      Auth.setAuth(Auth.getToken(), user);
    }

    document.getElementById('step6').classList.remove('active');
    document.getElementById('loadingStep').classList.remove('hidden');
    setTimeout(() => { window.location.href = '/child-login'; }, 1200);
  } catch (err) {
    const errorEl = document.getElementById('step6Error');
    showError(errorEl, err.message || 'Något gick fel. Försök igen.');
    setLoading(btn, 'Gå vidare →', false);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────────────────

// Detect add-child mode from URL query string — must be declared before first use (line 922+)
const IS_ADD_CHILD = new URLSearchParams(window.location.search).get('flow') === 'add-child';

// In add-child mode, hide invite step UI and use completeAddChild
if (IS_ADD_CHILD) {
  const inviteSection = document.getElementById('inviteSection');
  if (inviteSection) inviteSection.classList.add('hidden');
  const step6Btn = document.getElementById('step6Btn');
  if (step6Btn) step6Btn.textContent = 'Klar! →';
}
// ────────────────────────────────────────────────────────────────────────────
/**
 * On iOS native: replaces emoji grid with photo-picker UI.
 * On web: emoji grid stays as-is (emoji picker fallback).
 */
function initIOSAvatarPicker() {
  // Only active on iOS native — Android camera support is future work
  if (!window.Platform || !Platform.isIOS()) return;

  const avatarSection = document.getElementById('avatarPickerSection');
  const emojiSection = document.getElementById('emojiSection');
  if (!avatarSection || !emojiSection) return;

  // Hide web emoji picker, show iOS photo picker
  emojiSection.classList.add('hidden');
  avatarSection.classList.remove('hidden');

  const preview = document.getElementById('avatarPreview');
  const chooseBtn = document.getElementById('pickPhotoBtn');
  const useDefaultBtn = document.getElementById('useDefaultAvatarBtn');

  // "Use default" — deselects photo, falls back to emoji
  useDefaultBtn.addEventListener('click', () => {
    selectedAvatarUrl = null;
    preview.src = 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_87240/bac2e263-dc2f-4046-8870-cc4f4dd6f3a0.jpg';
    preview.classList.remove('ring-2', 'ring-gold');
    chooseBtn.classList.remove('hidden');
    useDefaultBtn.classList.add('hidden');
  });

  // "Choose photo" — opens camera/photo library
  chooseBtn.addEventListener('click', async () => {
    chooseBtn.disabled = true;
    chooseBtn.textContent = 'Laddar…';
    try {
      const result = await Platform.camera.pick({ source: 'library', quality: 'medium' });
      if (!result) {
        chooseBtn.disabled = false;
        chooseBtn.textContent = 'Välj foto';
        return;
      }
      // Upload to CDN
      chooseBtn.textContent = 'Laddar upp…';
      const url = await Platform.camera.upload(result.dataUrl);
      selectedAvatarUrl = url;
      preview.src = url;
      preview.classList.add('ring-2', 'ring-gold');
      chooseBtn.classList.add('hidden');
      useDefaultBtn.classList.remove('hidden');
    } catch (err) {
      console.error('[onboarding] avatar upload failed:', err.message);
      showToast('Kunde inte ladda upp fotot. Försök igen.', true);
    } finally {
      chooseBtn.disabled = false;
      chooseBtn.textContent = 'Välj foto';
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn() && !IS_ADD_CHILD) {
    // add-child can reach onboarding without login — will redirect via openAddChild()
    window.location.href = '/login';
    return;
  }
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  let me = null;
  try {
    const res = await window.apiFetch('/api/auth/me');
    if (!res.ok) { Auth.clearAuth(); window.location.href = '/login'; return; }
    me = await res.json();
    if (!IS_ADD_CHILD && me.onboarding_completed) { window.location.href = '/dashboard'; return; }
    if (me.is_admin) { window.location.href = '/admin'; return; }
  } catch {
    window.location.href = '/login';
    return;
  }

  buildEmojiGrid();
  initBirthdayPicker();
  initIOSAvatarPicker();
  setupPinInputs();
  goToStep(1);

  // Show email verification banner if needed (after auth check)
  showVerificationBanner(me);

  // Load template groups from admin library (for step 1 schema selection)
  try {
    const tRes = await window.apiFetch('/api/onboarding/template-groups');
    if (tRes.ok) {
      templateGroups = await tRes.json();
    }
  } catch { /* use fallback */ }
  if (!templateGroups || templateGroups.length === 0) {
    templateGroups = TEMPLATE_GROUP_FALLBACK;
  }
  buildTemplateGroupGrid(templateGroups);

  // Load rewards from admin library (for step 4)
  try {
    const rRes = await window.apiFetch('/api/onboarding/rewards-preview');
    if (rRes.ok) {
      availableRewards = await rRes.json();
    }
  } catch { /* use fallback */ }
  if (!availableRewards || availableRewards.length === 0) {
    availableRewards = REWARD_PRESETS_FALLBACK;
  }
  buildRewardGrid(availableRewards);

  // Pre-load children list for step 6 invite
  loadInviteChildren();

  // Track funnel_onboarding_abandoned when user leaves before completing step 6
  // Use sendBeacon so the event is sent even as the page unloads.
  window.addEventListener('pagehide', () => {
    if (currentStep < TOTAL_STEPS && Auth.getUser()?.familyId) {
      const body = JSON.stringify({
        event_type: 'funnel_onboarding_abandoned',
        metadata: { step: currentStep },
      });
      navigator.sendBeacon('/api/analytics/event', body);
    }
  });
});
