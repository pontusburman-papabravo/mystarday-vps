/**
 * family-chest-setting.js — Parent toggle: familjekista på/av (Option B).
 * Story + projects unaffected when chest is off.
 */
(function () {
  'use strict';

  let _wired = false;

  function init(familyData) {
    const section = document.getElementById('familyChestSetting');
    const toggle = document.getElementById('familyChestToggle');
    const msg = document.getElementById('familyChestSaveMsg');
    if (!section || !toggle) return;

    section.classList.remove('hidden');
    toggle.checked = familyData.family_chest_enabled !== false;

    if (_wired) return;
    _wired = true;

    toggle.addEventListener('change', function () {
      const next = toggle.checked;
      if (msg) {
        msg.textContent = 'Sparar...';
        msg.classList.remove('hidden');
      }
      Auth.api('/api/family/settings', {
        method: 'PUT',
        body: JSON.stringify({ family_chest_enabled: next }),
      }).then(function () {
        if (msg) {
          msg.textContent = '✓ Sparat!';
          setTimeout(function () { msg.classList.add('hidden'); }, 2000);
        }
      }).catch(function (err) {
        toggle.checked = !next;
        if (typeof showToast === 'function') {
          showToast('Kunde inte spara: ' + (err.message || 'fel'), true);
        }
        if (msg) msg.classList.add('hidden');
      });
    });
  }

  window.FamilyChestSetting = { init: init };
})();
