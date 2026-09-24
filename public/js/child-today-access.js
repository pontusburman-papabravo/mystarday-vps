/**
 * Fires child_access_completed only after child Today has loaded.
 */
(function () {
  'use strict';

  function platform() {
    try {
      if (window.Platform && typeof Platform.isNative === 'function' && Platform.isNative()) {
        if (typeof Platform.isIOS === 'function' && Platform.isIOS()) return 'ios';
        return 'android';
      }
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
    } catch (_) { /* web */ }
    return 'web';
  }

  function source() {
    if (window.ChildAccessHandoff && typeof ChildAccessHandoff.readSource === 'function') {
      return ChildAccessHandoff.readSource() || 'child_login';
    }
    try {
      return sessionStorage.getItem('sd_child_access_source') || 'child_login';
    } catch (_) {
      return 'child_login';
    }
  }

  async function confirmEstablished() {
    if (!window.Auth || typeof Auth.api !== 'function') return;
    const user = Auth.getUser && Auth.getUser();
    if (user && user.type && user.type !== 'child') return;
    try {
      const res = await Auth.api('/api/me/child-access-completed', {
        method: 'POST',
        body: JSON.stringify({
          today_established: true,
          source: source(),
          platform: platform(),
        }),
      });
      if (window.ChildAccessHandoff && typeof ChildAccessHandoff.clearSource === 'function') {
        ChildAccessHandoff.clearSource();
      }
      if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
        MetaAppEvents.handleServerMilestones(res && res.meta_milestones);
      }
    } catch (_) { /* retry on next Today load; milestone is idempotent */ }
  }

  window.ChildTodayAccess = { confirmEstablished: confirmEstablished };
})();
