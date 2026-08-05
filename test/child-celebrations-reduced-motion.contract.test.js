const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CELEB_SRC = path.join(__dirname, '../public/js/child-dashboard-celebrations.js');

test('child celebrations respect prefers-reduced-motion for burst and confetti', () => {
  const src = fs.readFileSync(CELEB_SRC, 'utf8');
  assert.match(src, /prefers-reduced-motion/);
  assert.match(src, /function launchDopaminBurst[\s\S]*prefersReducedMotion\(\)/);
  assert.match(src, /function launchMilestoneConfetti[\s\S]*prefersReducedMotion\(\)/);
});
