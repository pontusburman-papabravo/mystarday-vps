/**
 * child-family-person-sheet.js — Tap person card → larger recognition sheet (Mina personer).
 */
(function () {
  'use strict';

  let _openKey = null;
  let _personsByKey = {};

  function setPersons(persons) {
    _personsByKey = {};
    (persons || []).forEach(function (p) {
      if (p && p.key) _personsByKey[p.key] = p;
    });
  }

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function warmGreeting(roleLabel) {
    if (roleLabel === 'Pappa') return 'Min pappa';
    if (roleLabel === 'Mamma') return 'Min mamma';
    if (roleLabel === 'Syskon') return 'Mitt syskon';
    if (roleLabel === 'Mormor' || roleLabel === 'Farmor') return 'Min ' + roleLabel.toLowerCase();
    if (roleLabel === 'Morfar' || roleLabel === 'Farfar') return 'Min ' + roleLabel.toLowerCase();
    return 'Hjälper mig varje dag';
  }

  function avatarHtml(person, size) {
    if (window.MemberAvatar && MemberAvatar.renderMemberAvatar) {
      const memberType = person.kind === 'parent' || person.kind === 'pedagog' ? 'parent' : 'child';
      const opts = {
        memberType: memberType,
        displayEmoji: person.displayEmoji || person.emoji || (memberType === 'child' ? '⭐' : '👤'),
      };
      return '<div class="cfh-person-avatar-ring" data-role="' + esc(person.roleLabel) + '">' +
        MemberAvatar.renderMemberAvatar({
          id: person.id,
          name: person.name,
          emoji: person.emoji,
          display_emoji: person.displayEmoji,
          avatar_src: person.avatarUrl || '',
          has_avatar: person.hasAvatar,
          type: memberType,
          member_type: memberType,
        }, size, opts) + '</div>';
    }
    return '<span class="cfh-person-emoji cfh-person-emoji--face" aria-hidden="true">' + esc(person.emoji || '👤') + '</span>';
  }

  function close() {
    const sheet = document.getElementById('cfhPersonSheet');
    if (sheet) {
      sheet.classList.add('hidden');
      sheet.setAttribute('aria-hidden', 'true');
    }
    _openKey = null;
    document.body.classList.remove('cfh-person-sheet-open');
  }

  function open(person) {
    if (!person) return;
    let sheet = document.getElementById('cfhPersonSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cfhPersonSheet';
      sheet.className = 'cfh-person-sheet hidden';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.innerHTML =
        '<div class="cfh-person-sheet-scrim" data-cfh-sheet-close></div>' +
        '<div class="cfh-person-sheet-panel" role="document">' +
          '<button type="button" class="cfh-person-sheet-close" data-cfh-sheet-close aria-label="Stäng">✕</button>' +
          '<div id="cfhPersonSheetBody"></div>' +
        '</div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target.closest('[data-cfh-sheet-close]')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && _openKey) close();
      });
    }

    const body = document.getElementById('cfhPersonSheetBody');
    if (!body) return;

    const awayNote = person.cardNote || '';
    const greeting = warmGreeting(person.roleLabel);
    body.innerHTML =
      '<div class="cfh-person-sheet-card">' +
        '<p class="cfh-person-sheet-kicker">' + esc(greeting) + '</p>' +
        '<div class="cfh-person-sheet-avatar">' + avatarHtml(person, 128) + '</div>' +
        '<h2 class="cfh-person-sheet-name">' + esc(person.name) + '</h2>' +
        '<p class="cfh-person-sheet-role">' + esc(person.roleLabel) + '</p>' +
        (awayNote
          ? '<p class="cfh-person-sheet-away">' + esc(awayNote) + '</p>'
          : '<p class="cfh-person-sheet-warm">Finns här för dig ❤️</p>') +
      '</div>';

    sheet.classList.remove('hidden');
    sheet.setAttribute('aria-hidden', 'false');
    sheet.setAttribute('aria-label', person.name + ', ' + person.roleLabel);
    document.body.classList.add('cfh-person-sheet-open');
    _openKey = person.key;

    const closeBtn = sheet.querySelector('.cfh-person-sheet-close');
    if (closeBtn) closeBtn.focus();
  }

  function bindCards(root) {
    if (!root) return;
    root.querySelectorAll('[data-cfh-person-key]').forEach(function (btn) {
      if (btn.dataset.cfhBound === '1') return;
      btn.dataset.cfhBound = '1';
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-cfh-person-key');
        const person = _personsByKey[key];
        if (!person) return;
        if (_openKey === key) {
          close();
        } else {
          open(person);
        }
      });
    });
  }

  window.ChildFamilyPersonSheet = {
    open: open,
    close: close,
    bindCards: bindCards,
    setPersons: setPersons,
  };
})();
