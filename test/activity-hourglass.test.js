'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadActivityHourglass() {
  class SVGElement {}

  function makeSvg() {
    const props = Object.create(null);
    const svg = Object.create(SVGElement.prototype);
    svg.style = {
      setProperty(key, value) {
        props[key] = value;
      },
    };
    svg._testProps = props;
    return svg;
  }

  const context = {
    window: {},
    globalThis: {},
    console,
    SVGElement,
    fetch: function () {
      return Promise.resolve({ ok: true, text: function () { return Promise.resolve('<svg></svg>'); } });
    },
  };
  context.window = context;
  context.globalThis = context;

  const code = fs.readFileSync(
    path.join(__dirname, '../public/js/activity-hourglass.js'),
    'utf8'
  );
  vm.runInNewContext(code, context);
  return { AH: context.ActivityHourglass, makeSvg };
}

describe('activity-hourglass (UL component)', () => {
  it('idle at full time: progress 0', () => {
    const { AH, makeSvg } = loadActivityHourglass();
    const svg = makeSvg();
    const hg = new AH(svg);
    hg.setState({ remainingSeconds: 120, durationSeconds: 120, state: 'idle' });
    assert.equal(svg._testProps['--progress'], '0.0000');
    assert.equal(svg._testProps['--running'], '0');
  });

  it('half time running: progress 0.5 and stream on', () => {
    const { AH, makeSvg } = loadActivityHourglass();
    const svg = makeSvg();
    const hg = new AH(svg);
    hg.setState({ remainingSeconds: 60, durationSeconds: 120, state: 'running' });
    assert.equal(svg._testProps['--progress'], '0.5000');
    assert.equal(svg._testProps['--running'], '1');
  });

  it('paused hides sand stream', () => {
    const { AH, makeSvg } = loadActivityHourglass();
    const svg = makeSvg();
    const hg = new AH(svg);
    hg.setState({ remainingSeconds: 45, durationSeconds: 120, state: 'paused' });
    assert.equal(svg._testProps['--running'], '0');
  });

  it('finished: full lower sand (progress 1)', () => {
    const { AH, makeSvg } = loadActivityHourglass();
    const svg = makeSvg();
    const hg = new AH(svg);
    hg.setState({ remainingSeconds: 0, durationSeconds: 120, state: 'finished' });
    assert.equal(svg._testProps['--progress'], '1.0000');
    assert.equal(svg._testProps['--running'], '0');
  });
});

describe('activity-hourglass — timer UI wiring', () => {
  it('child timer uses delivered SVG mount in overlay, not legacy CSS hourglass', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-activity-timer.js'),
      'utf8'
    );
    assert.match(src, /ActivityHourglassUI/);
    assert.match(src, /activity-timer-overlay-hourglass/);
    assert.match(src, /overlayHourglassMountHtml/);
    assert.match(src, /inlineTimerIconHtml/);
    assert.doesNotMatch(src, /at-hourglass/);
    assert.doesNotMatch(src, /hourglassMarkup/);
  });
});
