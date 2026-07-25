/**
 * Dashboard onboarding tour — step-by-step walkthrough for new users, with localStorage opt-out.
 * Does not own: authentication, API routing.
 */

function dt(key, params) {
  return (typeof window.pt === 'function') ? window.pt(key, params) : key;
}

function tourStepDefs() {
  return [
    {
      emoji: '👋',
      titleKey: 'home.dashboardTour.steps.welcome.title',
      bodyKey: 'home.dashboardTour.steps.welcome.body',
      targetId: 'childCardsGrid',
    },
    {
      emoji: '⭐',
      titleKey: 'home.dashboardTour.steps.stars.title',
      bodyKey: 'home.dashboardTour.steps.stars.body',
      targetId: null,
    },
    {
      emoji: '📅',
      titleKey: 'home.dashboardTour.steps.schedule.title',
      bodyKey: 'home.dashboardTour.steps.schedule.body',
      targetId: null,
    },
    {
      emoji: '👨‍👩‍👧',
      titleKey: 'home.dashboardTour.steps.family.title',
      bodyKey: 'home.dashboardTour.steps.family.body',
      targetId: null,
    },
    {
      emoji: '❓',
      titleKey: 'home.dashboardTour.steps.help.title',
      bodyKey: 'home.dashboardTour.steps.help.body',
      targetId: 'helpBtn',
    },
  ];
}

let tourStep = 0;

function shouldShowTour() {
  return !localStorage.getItem('dash_tour_v1_done');
}

function startTour() {
  if (!shouldShowTour()) return;
  if (typeof window.pt !== 'function') return;
  tourStep = 0;
  document.getElementById('dashTourOverlay').classList.remove('hidden');
  renderTourStep();
}

function renderTourStep() {
  const steps = tourStepDefs();
  const step = steps[tourStep];
  const total = steps.length;

  const dots = document.getElementById('tourDots');
  dots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = i === tourStep
      ? 'w-5 h-2 bg-gold rounded-full transition-all'
      : 'w-2 h-2 bg-lavender rounded-full transition-all';
    dots.appendChild(d);
  }

  document.getElementById('tourStepContent').innerHTML = `
    <div class="text-4xl mb-3">${step.emoji}</div>
    <h3 class="font-heading font-bold text-navy text-lg mb-2">${dt(step.titleKey)}</h3>
    <p class="text-text-soft text-sm leading-relaxed">${dt(step.bodyKey)}</p>
  `;

  const nextBtn = document.getElementById('tourNextBtn');
  const skipBtn = document.getElementById('tourSkipBtn');
  if (tourStep === total - 1) {
    nextBtn.textContent = dt('home.dashboardTour.start');
    skipBtn.classList.add('hidden');
  } else {
    nextBtn.textContent = dt('home.dashboardTour.next');
    skipBtn.classList.remove('hidden');
    skipBtn.textContent = dt('home.dashboardTour.skip');
  }

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
  if (tourStep >= tourStepDefs().length) {
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
  document.querySelectorAll('.help-tab').forEach(t => {
    t.className = 'help-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-lavender text-navy hover:bg-purple-200';
  });
  btn.className = 'help-tab whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-navy text-white';

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

let _tourStarted = false;
function maybeStartTour() {
  if (_tourStarted) return;
  if (typeof window.pt !== 'function') return;
  _tourStarted = true;
  setTimeout(() => {
    if (shouldShowTour()) startTour();
  }, 1200);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(maybeStartTour, 2500);
});

document.addEventListener('parent-i18n-ready', () => {
  const overlay = document.getElementById('dashTourOverlay');
  if (!overlay) return;
  if (!overlay.classList.contains('hidden')) {
    renderTourStep();
    return;
  }
  maybeStartTour();
});
