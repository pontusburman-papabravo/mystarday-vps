/**
 * Dashboard onboarding tour — step-by-step walkthrough for new users, with localStorage opt-out.
 * Does not own: authentication, API routing.
 */

// ─── DASHBOARD TOUR ───────────────────────────────────────
  const TOUR_STEPS = [
    {
      emoji: '👋',
      title: 'Välkommen till dashboarden!',
      body: 'Här ser du alla dina barns dagliga progress. Klicka på ett barnkort för att se och redigera dess schema.',
      targetId: 'childCardsGrid',
    },
    {
      emoji: '⭐',
      title: 'Stjärnor & Skattkammaren',
      body: 'Varje avklarad aktivitet ger 1 stjärna. Barnet samlar stjärnor och löser in dem mot belöningar i Skattkammaren.',
      targetId: null,
    },
    {
      emoji: '📅',
      title: 'Veckoschema & Aktiviteter',
      body: 'Under "Aktiviteter & Belöningar" i menyn hittar du aktivitetsbiblioteket och kan lägga till egna belöningar.',
      targetId: null,
    },
    {
      emoji: '👨‍👩‍👧',
      title: 'Lägg till fler barn eller vuxna',
      body: 'Klicka på "+ Lägg till barn" för att lägga till ett syskon. Under "Familjen & inställningar" kan du bjuda in en annan vuxen.',
      targetId: null,
    },
    {
      emoji: '❓',
      title: 'Behöver du hjälp?',
      body: 'Klicka på ❓-knappen längst ner till höger när som helst för FAQ och tips. Lycka till med Stjärndagen!',
      targetId: 'helpBtn',
    },
  ];

  let tourStep = 0;

  function shouldShowTour() {
    return !localStorage.getItem('dash_tour_v1_done');
  }

  function startTour() {
    if (!shouldShowTour()) return;
    tourStep = 0;
    document.getElementById('dashTourOverlay').classList.remove('hidden');
    renderTourStep();
  }

  function renderTourStep() {
    const step = TOUR_STEPS[tourStep];
    const total = TOUR_STEPS.length;

    // Dots
    const dots = document.getElementById('tourDots');
    dots.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('div');
      d.className = i === tourStep
        ? 'w-5 h-2 bg-gold rounded-full transition-all'
        : 'w-2 h-2 bg-lavender rounded-full transition-all';
      dots.appendChild(d);
    }

    // Content
    document.getElementById('tourStepContent').innerHTML = `
      <div class="text-4xl mb-3">${step.emoji}</div>
      <h3 class="font-heading font-bold text-navy text-lg mb-2">${step.title}</h3>
      <p class="text-text-soft text-sm leading-relaxed">${step.body}</p>
    `;

    // Last step → change button
    const nextBtn = document.getElementById('tourNextBtn');
    const skipBtn = document.getElementById('tourSkipBtn');
    if (tourStep === total - 1) {
      nextBtn.textContent = '🎉 Starta!';
      skipBtn.classList.add('hidden');
    } else {
      nextBtn.textContent = 'Nästa →';
      skipBtn.classList.remove('hidden');
    }

    // Highlight target element
    highlightTarget(step.targetId);
  }

  function highlightTarget(targetId) {
    const ring = document.getElementById('tourHighlight');
    if (!targetId) {
      ring.classList.add('hidden');
      return;
    }
    const el = document.getElementById(targetId);
    if (!el) { ring.classList.add('hidden'); return; }
    const rect = el.getBoundingClientRect();
    const pad = 6;
    ring.style.left = (rect.left + window.scrollX - pad) + 'px';
    ring.style.top  = (rect.top  + window.scrollY - pad) + 'px';
    ring.style.width  = (rect.width  + pad * 2) + 'px';
    ring.style.height = (rect.height + pad * 2) + 'px';
    ring.classList.remove('hidden');
  }

  window.nextTourStep = function() {
    tourStep++;
    if (tourStep >= TOUR_STEPS.length) {
      skipTour();
    } else {
      renderTourStep();
    }
  };

  window.skipTour = function() {
    localStorage.setItem('dash_tour_v1_done', '1');
    document.getElementById('dashTourOverlay').classList.add('hidden');
    document.getElementById('tourHighlight').classList.add('hidden');
  };

  // ─── HELP PANEL ──────────────────────────────────────────
  function refreshDashboardHelpTip() {
    const mount = document.getElementById('helpJourneyTipMount');
    if (!mount || !window.HelpJourneyTip) return;
    HelpJourneyTip.refresh(mount);
  }

  window.toggleHelpPanel = function() {
    const panel = document.getElementById('helpPanel');
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (opening) refreshDashboardHelpTip();
  };

  window.switchHelpTab = function(btn, tab) {
    // Reset all tabs
    document.querySelectorAll('.help-tab').forEach(t => {
      t.className = 'help-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-lavender text-navy hover:bg-purple-200';
    });
    btn.className = 'help-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-navy text-white';

    // Hide all content divs
    document.querySelectorAll('#helpContent > div').forEach(d => d.classList.add('hidden'));
    const target = document.getElementById('help-' + tab);
    if (target) target.classList.remove('hidden');
  };

  window.toggleFaq = function(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = !answer.classList.contains('hidden');
    answer.classList.toggle('hidden');
    btn.querySelector('span').textContent = isOpen ? '+' : '−';
  };

  // ─── Start tour after dashboard loads ────────────────────
  // We hook into the existing DOMContentLoaded flow - after cards load
  const _origLoadDashboardCards = window.loadDashboardCards;
  let _tourStarted = false;
  function maybeStartTour() {
    if (_tourStarted) return;
    _tourStarted = true;
    // Small delay so page content renders first
    setTimeout(() => {
      if (shouldShowTour()) startTour();
    }, 1200);
  }
  // Hook after auth resolves
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for initial data to load, then check
    setTimeout(maybeStartTour, 2500);
  });
