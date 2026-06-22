/**
 * Shared toast notification module.
 * Works with all existing showToast call signatures across the app.
 * The toast element is created dynamically if not present in the DOM.
 */

(function () {
  let _timer = null;

  function applyToastLayout(el, isError) {
    var base = 'fixed z-[9999] px-5 py-4 rounded-2xl shadow-xl font-semibold leading-snug break-words ';
    if (isError) {
      el.className = base + 'bg-red-600 text-white text-base text-center max-w-[min(92vw,24rem)] left-1/2 -translate-x-1/2';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))';
      el.style.left = '50%';
    } else {
      el.className = base + 'text-sm max-w-xs bg-navy text-white';
      el.style.bottom = '';
      el.style.left = '';
      el.style.top = 'max(1rem, env(safe-area-inset-top, 1rem))';
      el.style.right = 'max(1rem, env(safe-area-inset-right, 1rem))';
    }
    el.classList.remove('hidden');
  }

  /**
   * Show a toast notification.
   * Signature variations from across the codebase:
   *   showToast(msg)                        — default navy, 3s
   *   showToast(msg, error)                 — error bool, 3s
   *   showToast(msg, type)                  — type 'error' triggers red, 3s
   *   showToast(msg, isError, duration)     — bool + custom duration
   */
  function showToast(msg, arg2, arg3) {
    var isError = false;
    var duration = 3000;

    if (typeof arg2 === 'boolean') {
      isError = arg2;
      if (typeof arg3 === 'number') duration = arg3;
    } else if (typeof arg2 === 'string') {
      isError = (arg2 === 'error');
      if (typeof arg3 === 'number') duration = arg3;
    }

    if (isError && duration === 3000) duration = 6000;

    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      document.body.appendChild(el);
    }

    el.textContent = msg;
    applyToastLayout(el, isError);

    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { el.classList.add('hidden'); }, duration);
  }

  /**
   * Show a green success toast.
   * Signature: showSuccessToast(msg, duration)
   */
  function showSuccessToast(msg, arg2) {
    var duration = (typeof arg2 === 'number') ? arg2 : 3000;

    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }

    el.textContent = msg;
    applyToastLayout(el, false);
    el.className = el.className.replace('bg-navy', 'bg-green-600');

    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () { el.classList.add('hidden'); }, duration);
  }

  // Expose globally
  window.showToast = showToast;
  window.showSuccessToast = showSuccessToast;
})();
