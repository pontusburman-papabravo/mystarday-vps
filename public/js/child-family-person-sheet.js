/**
 * child-family-person-sheet.js — Tap person card → larger recognition sheet (Mina personer).
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

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

  function roleDisplayLabel(person) {
    if (person.familyRole && typeof window.childRoleLabel === 'function') {
      return childRoleLabel(person.familyRole);
    }
    if (person.kind === 'pedagog' && typeof window.childRoleLabel === 'function') {
      return childRoleLabel('pedagog');
    }
    if (person.kind === 'sibling' && typeof window.childRoleLabel === 'function') {
      return childRoleLabel('sibling');
    }
    return person.roleLabel || '';
  }

  function warmGreeting(person) {
    const role = person.familyRole || person.kind;
    if (role === 'pappa' || person.roleLabel === 'Pappa') return t('family.greetingPappa');
    if (role === 'mamma' || person.roleLabel === 'Mamma') return t('family.greetingMamma');
    if (role === 'sibling' || person.kind === 'sibling' || person.roleLabel === 'Syskon') {
      return t('family.greetingSibling');
    }
    return t('family.greetingDefault');
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
          '<button type="button" class="cfh-person-sheet-close" data-cfh-sheet-close aria-label="' + esc(t('family.closeAria')) + '">✕</button>' +
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
    const roleLabel = roleDisplayLabel(person);
    const greeting = warmGreeting(person);
    body.innerHTML =
      '<div class="cfh-person-sheet-card">' +
        '<p class="cfh-person-sheet-kicker">' + esc(greeting) + '</p>' +
        '<div class="cfh-person-sheet-avatar">' + avatarHtml(person, 128) + '</div>' +
        '<h2 class="cfh-person-sheet-name">' + esc(person.name) + '</h2>' +
        '<p class="cfh-person-sheet-role">' + esc(roleLabel) + '</p>' +
        (awayNote
          ? '<p class="cfh-person-sheet-away">' + esc(awayNote) + '</p>'
          : '<p class="cfh-person-sheet-warm">' + esc(t('family.sheetWarm')) + '</p>') +
      '</div>';

    sheet.classList.remove('hidden');
    sheet.setAttribute('aria-hidden', 'false');
    sheet.setAttribute('aria-label', person.name + ', ' + roleLabel);
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
