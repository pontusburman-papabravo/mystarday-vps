/**
 * family-invite-scan.js — parse QR / pasted text for "lägg till vuxen".
 */
(function () {
  'use strict';

  function parseQrPayload(raw) {
    const s = String(raw || '').trim();
    if (!s) return {};

    if (s.toLowerCase().startsWith('mailto:')) {
      const email = s.slice(7).split('?')[0].trim();
      return email ? { email } : {};
    }

    try {
      const u = new URL(s, 'https://mystarday.se');
      const inviteToken =
        u.searchParams.get('invite') ||
        (u.pathname.match(/\/invite\/([^/]+)/i) || [])[1];
      if (inviteToken) return { inviteToken };
    } catch {
      /* not a URL */
    }

    const emailMatch = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) return { email: emailMatch[0] };

    return {};
  }

  function scanAdultQrInteractive() {
    const pasted = window.prompt(
      'Skanna eller klistra in från QR-koden:\n\n• e-postadress\n• inbjudningslänk (mystarday.se/invite/…)\n• mailto-länk'
    );
    return pasted ? String(pasted).trim() : null;
  }

  window.FamilyInviteScan = {
    parseQrPayload,
    scanAdultQrInteractive,
  };
})();
