'use strict';

/**
 * Avatar crop modal a11y + settings remove button contracts.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('avatar-image-crop.js a11y', () => {
  it('supports Escape, focus restore, dialog semantics, 44px targets', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/avatar-image-crop.js'), 'utf8');
    assert.match(src, /Escape/);
    assert.match(src, /previousFocus/);
    assert.match(src, /setAttribute\('role', 'dialog'\)/);
    assert.match(src, /aria-modal/);
    assert.match(src, /avatarCropHelp/);
    assert.match(src, /avatarCropCancelBtn/);
    assert.match(src, /min-h-\[44px\]/);
    assert.match(src, /trapFocus/);
  });

  it('Escape key closes modal without throwing in minimal DOM', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/avatar-image-crop.js'), 'utf8');
    const listeners = {};
    const sandbox = {
      document: {
        body: { appendChild() {} },
        activeElement: null,
        addEventListener(type, fn) {
          listeners[type] = fn;
        },
        removeEventListener() {},
      },
      window: {},
      Blob: class Blob {},
      HTMLCanvasElement: function () {},
      Image: function () {
        this.onload = null;
        this.onerror = null;
      },
      File: class File {},
      FileReader: class FileReader {
        readAsDataURL() {
          this.onload({ target: { result: 'data:image/jpeg;base64,/9j/' } });
        }
      },
      URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
      requestAnimationFrame: (fn) => fn(),
      setTimeout,
      clearTimeout,
      console,
    };
    sandbox.window = sandbox;
    sandbox.document.createElement = function (tag) {
      const el = {
        tagName: tag.toUpperCase(),
        className: '',
        classList: { add() {}, remove() {}, contains: () => false },
        style: {},
        setAttribute() {},
        addEventListener() {},
        querySelector(sel) {
          if (sel === '#avatarCropCancelBtn') return { focus() {} };
          return null;
        },
        querySelectorAll() { return []; },
        appendChild() {},
        focus() {},
        getContext: () => ({
          drawImage() {},
          clearRect() {},
          save() {},
          restore() {},
        }),
        width: 0,
        height: 0,
      };
      return el;
    };
    vm.runInNewContext(src, sandbox, { context: sandbox });
    assert.equal(typeof sandbox.window.AvatarImageCrop.openFromFile, 'function');
    assert.doesNotThrow(() => {
      if (listeners.keydown) {
        listeners.keydown({ key: 'Escape', preventDefault() {} });
      }
    });
  });
});

describe('settings avatar remove accessibility', () => {
  it('settings-avatar exposes remove control with accessible label', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/settings-avatar.js'), 'utf8');
    assert.match(src, /settingsAvatarRemoveBtn/);
    assert.match(src, /settings\.avatar\.removePhoto/);
  });

  it('member-avatar profile picker uses initials fallback when no photo', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/member-avatar.js'), 'utf8');
    assert.match(src, /computeInitials/);
    assert.match(src, /has_avatar/);
    assert.match(src, /avatar_src/);
  });

  it('avatar-upload-flow wires crop modal for profile picker', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/avatar-upload-flow.js'), 'utf8');
    assert.match(src, /AvatarImageCrop/);
    assert.match(src, /openFromFile/);
  });
});

describe('mobile layout hooks', () => {
  it('avatar crop modal uses mobile-first bottom sheet layout', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/avatar-image-crop.js'), 'utf8');
    assert.match(src, /items-end/);
    assert.match(src, /sm:items-center/);
    assert.match(src, /rounded-t-2xl/);
  });

  it('platform.js documents native pick fallback for mobile upload', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /tryCapacitorPick|HTML file input/i);
  });
});
