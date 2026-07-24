/**
 * Child dashboard celebration effects (Fas 8 F3).
 * Milestone tracking + confetti + dopamin burst, extracted from child-dashboard.js.
 * Reads child-dashboard.js globals (me, currentDate, dopaminAnimation) and window.Platform
 * at call time. Entry points used by child-dashboard.js are exposed on window:
 *   checkMilestones, launchMilestoneConfetti, launchDopaminBurst.
 */
(function () {
  function getMilestoneStorageKey() {
    const childId = me ? me.id : 'default';
    return `milestones_${childId}_${currentDate}`;
  }

  function getTriggeredMilestones() {
    try {
      const stored = localStorage.getItem(getMilestoneStorageKey());
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  function markMilestoneTriggered(milestone) {
    try {
      const existing = getTriggeredMilestones();
      if (!existing.includes(milestone)) {
        existing.push(milestone);
        localStorage.setItem(getMilestoneStorageKey(), JSON.stringify(existing));
      }
    } catch {}
  }

  function checkMilestones(total, completed) {
    if (window.ChildTodayWarmth && ChildTodayWarmth.shouldSuppressMilestoneConfetti()) {
      return;
    }
    if (total === 0) return;
    const pct = Math.round((completed / total) * 100);
    const triggered = getTriggeredMilestones();

    // Check each milestone threshold
    const milestones = [
      { pct: 25, message: (typeof window.cpt === 'function' ? cpt('celebration.milestone25') : 'Bra jobbat! Första steget! 🌟'), emoji: '🌟', delay: 100 },
      { pct: 50, message: (typeof window.cpt === 'function' ? cpt('celebration.milestone50') : 'Halvvägs! Du är fantastisk! 🎉'), emoji: '🎉', delay: 100 },
      { pct: 75, message: (typeof window.cpt === 'function' ? cpt('celebration.milestone75') : 'Nästan klart! 🚀'), emoji: '🚀', delay: 100 },
    ];

    for (const m of milestones) {
      if (pct >= m.pct && !triggered.includes(m.pct)) {
        markMilestoneTriggered(m.pct);
        setTimeout(() => showMilestoneCelebration(m.message, m.emoji), m.delay);
      }
    }
  }

  function showMilestoneCelebration(message, emoji) {
    // Haptic: milestone reached → heavy impact
    if (window.Platform && window.Platform.haptics) {
      window.Platform.haptics.heavy();
    }
    // Show toast
    const toast = document.getElementById('milestoneToast');
    if (toast) {
      toast.innerHTML = `<div class="text-2xl mb-1">${emoji}</div><div>${message}</div>`;
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
        toast.style.animation = '';
      }, 2500);
    }
    // Pulse the progress bar
    const bar = document.getElementById('progressBar');
    const container = document.getElementById('progressBarContainer');
    if (bar) { bar.classList.add('milestone-burst'); setTimeout(() => bar.classList.remove('milestone-burst'), 500); }
    if (container) { container.classList.add('milestone-burst'); setTimeout(() => container.classList.remove('milestone-burst'), 500); }
    // Small confetti burst
    launchMilestoneConfetti();
  }

  function launchMilestoneConfetti() {
    const COLORS = ['#F5A623', '#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F59E0B'];
    const SHAPES = ['✨', '⭐', '🌟', '★'];
    const count = 30;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        if (Math.random() < 0.4) {
          el.textContent = SHAPES[Math.floor(Math.random() * SHAPES.length)];
          el.style.cssText = `position:fixed;left:${10 + Math.random() * 80}vw;top:-20px;font-size:${10 + Math.random() * 14}px;pointer-events:none;z-index:9999;animation:confettiFall ${1.5 + Math.random() * 1.5}s linear forwards;`;
        } else {
          el.className = 'confetti-piece';
          el.style.left = `${10 + Math.random() * 80}vw`;
          el.style.top = '-10px';
          el.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
          el.style.width = `${6 + Math.random() * 8}px`;
          el.style.height = `${6 + Math.random() * 8}px`;
          el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          el.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
          document.body.appendChild(el);
          el.addEventListener('animationend', () => el.remove());
        }
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
      }, i * 40);
    }
  }

  // ── Dopamin burst — quick star/confetti animation on check-off ──
  // Non-blocking: fires from the check element, cleans itself up.

  function launchDopaminBurst(originEl) {
    if (!dopaminAnimation) return;
    const EMOJIS = ['⭐', '🌟', '✨', '⭐', '🌟'];
    const COLORS = ['#F5A623', '#22C55E', '#A855F7', '#3B82F6', '#EF4444'];

    // Get origin position
    const rect = originEl ? originEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // 8 particles radiating outward
    const count = 10;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        const isEmoji = i < 4;
        const angle = (360 / count) * i + (Math.random() * 30);
        const rad = angle * (Math.PI / 180);
        const dist = 40 + Math.random() * 60;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist;
        const dur = 0.45 + Math.random() * 0.2;
        const size = isEmoji ? (16 + Math.random() * 14) : (6 + Math.random() * 8);

        if (isEmoji) {
          el.textContent = EMOJIS[i % EMOJIS.length];
          el.style.cssText = `
            position: fixed;
            left: ${cx - size / 2}px;
            top: ${cy - size / 2}px;
            font-size: ${size}px;
            pointer-events: none;
            z-index: 9998;
            animation: dopaminRise ${dur}s ease-out forwards;
            --tx: ${tx}px;
            --ty: ${ty}px;
          `;
          // Manually do radial + rise combo via inline style transform
          el.style.animation = 'none';
          el.style.transition = `transform ${dur}s ease-out, opacity ${dur}s ease-out`;
          el.style.transform = 'scale(1)';
          el.style.opacity = '1';
          document.body.appendChild(el);
          requestAnimationFrame(() => {
            el.style.transform = `translate(${tx}px, ${ty}px) scale(0.4) rotate(${angle}deg)`;
            el.style.opacity = '0';
          });
          setTimeout(() => el.remove(), dur * 1000 + 100);
        } else {
          el.className = 'dopamin-particle';
          el.style.left = `${cx - size / 2}px`;
          el.style.top = `${cy - size / 2}px`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
          el.style.backgroundColor = COLORS[i % COLORS.length];
          el.style.animationDuration = `${dur}s`;
          el.style.animation = 'none';
          el.style.transition = `transform ${dur}s ease-out, opacity ${dur}s ease-out`;
          el.style.transform = 'scale(1)';
          el.style.opacity = '1';
          document.body.appendChild(el);
          requestAnimationFrame(() => {
            el.style.transform = `translate(${tx}px, ${ty}px) scale(0) rotate(${angle * 2}deg)`;
            el.style.opacity = '0';
          });
          setTimeout(() => el.remove(), dur * 1000 + 100);
        }
      }, i * 20);
    }
  }

  // Exposed for child-dashboard.js callers (renderSkattkammaren, renderActivities, _processCheckOff)
  window.checkMilestones = checkMilestones;
  window.launchMilestoneConfetti = launchMilestoneConfetti;
  window.launchDopaminBurst = launchDopaminBurst;
})();
