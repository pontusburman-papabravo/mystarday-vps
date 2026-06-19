/**
 * Read aloud for teacch NU (E9) — Web Speech API.
 */
(function (global) {
  'use strict';

  function isAvailable() {
    return typeof window.speechSynthesis !== 'undefined';
  }

  function speakNow(itemId) {
    if (!isAvailable()) return;
    const card = document.getElementById('card-' + itemId);
    if (!card) return;
    const texts = Array.from(card.querySelectorAll('.teacch-q-text')).map((el) => el.textContent);
    const utter = new SpeechSynthesisUtterance(texts.join('. '));
    utter.lang = 'sv-SE';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_type: 'read_aloud_used', metadata: { item_id: itemId } }),
      });
    } catch (_) {}
  }

  global.ChildReadAloud = { isAvailable, speakNow };
})(window);
