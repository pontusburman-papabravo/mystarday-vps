/**
 * Landing magic night — stars + clouds on web (platform-web only).
 */
(function () {
  'use strict';

  if (!document.body.classList.contains('platform-web')) return;

  document.body.classList.add('landing-magic-bg');

  const sc = document.getElementById('landing-stars-container');
  const cc = document.getElementById('landing-clouds-container');
  if (!sc) return;

  const STAR_COUNT = 24;
  const chars = ['✦', '✧', '⋆', '✶'];
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = document.createElement('div');
    s.className = 'star-particle' + (Math.random() > 0.4 ? ' lit' : '');
    s.style.cssText = [
      'position:absolute',
      'font-size:' + (8 + Math.random() * 12) + 'px',
      'left:' + (Math.random() * 100) + '%',
      'top:' + (Math.random() * 100) + '%',
      'color:rgba(255,255,255,' + (0.2 + Math.random() * 0.5) + ')',
      '--float-dur:' + (3 + Math.random() * 5) + 's',
      '--float-delay:' + (Math.random() * 4) + 's',
    ].join(';');
    s.textContent = chars[Math.floor(Math.random() * chars.length)];
    sc.appendChild(s);
  }

  if (!cc) return;
  const sizes = [160, 200, 140, 180];
  for (let j = 0; j < 4; j++) {
    const c = document.createElement('div');
    c.className = 'cloud';
    c.style.cssText = [
      'position:absolute',
      'left:' + (j * 22 + Math.random() * 12) + '%',
      'top:' + (18 + j * 16) + '%',
      'width:' + sizes[j] + 'px',
      'height:' + (sizes[j] * 0.45) + 'px',
      'background:rgba(255,255,255,0.06)',
      'border-radius:50%',
      'filter:blur(20px)',
      '--drift-dur:' + (8 + Math.random() * 6) + 's',
    ].join(';');
    cc.appendChild(c);
  }
})();
