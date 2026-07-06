/**
 * ambient-director.js — budgets simultaneous ambient juice in Min värld.
 */
(function () {
  'use strict';

  const MAX_ANIMATIONS = 3;
  const MAX_PARTICLES = 2;
  const MAX_SOUNDS = 1;

  let activeAnimations = 0;
  let activeParticles = 0;
  let activeSounds = 0;
  const cooldownUntil = new Map();

  function canAnimate() {
    return activeAnimations < MAX_ANIMATIONS;
  }

  function canParticle() {
    return activeParticles < MAX_PARTICLES;
  }

  function canSound() {
    return activeSounds < MAX_SOUNDS;
  }

  function isOnCooldown(key) {
    const until = cooldownUntil.get(key);
    return until != null && Date.now() < until;
  }

  function budgetCooldown(key, ms) {
    if (!key) return true;
    if (isOnCooldown(key)) return false;
    cooldownUntil.set(key, Date.now() + (ms || 0));
    return true;
  }

  function releaseAfter(counter, ms) {
    setTimeout(function () {
      if (counter === 'animation' && activeAnimations > 0) activeAnimations -= 1;
      if (counter === 'particle' && activeParticles > 0) activeParticles -= 1;
      if (counter === 'sound' && activeSounds > 0) activeSounds -= 1;
    }, ms);
  }

  function requestAnimation(ms) {
    if (!canAnimate()) return false;
    activeAnimations += 1;
    releaseAfter('animation', ms);
    return true;
  }

  function requestParticle(ms) {
    if (!canParticle()) return false;
    activeParticles += 1;
    releaseAfter('particle', ms);
    return true;
  }

  function requestSound(ms) {
    if (!canSound()) return false;
    activeSounds += 1;
    releaseAfter('sound', ms);
    return true;
  }

  function clearCooldowns(sceneId) {
    if (!sceneId) {
      cooldownUntil.clear();
      return;
    }
    cooldownUntil.forEach(function (_v, key) {
      if (key.indexOf(sceneId + ':') === 0) cooldownUntil.delete(key);
    });
  }

  function reset() {
    activeAnimations = 0;
    activeParticles = 0;
    activeSounds = 0;
    cooldownUntil.clear();
  }

  window.AmbientDirector = {
    MAX_ANIMATIONS: MAX_ANIMATIONS,
    MAX_PARTICLES: MAX_PARTICLES,
    MAX_SOUNDS: MAX_SOUNDS,
    canAnimate: canAnimate,
    canParticle: canParticle,
    canSound: canSound,
    budgetCooldown: budgetCooldown,
    isOnCooldown: isOnCooldown,
    requestAnimation: requestAnimation,
    requestParticle: requestParticle,
    requestSound: requestSound,
    clearCooldowns: clearCooldowns,
    reset: reset,
  };
})();
