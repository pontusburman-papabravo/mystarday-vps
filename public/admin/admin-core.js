// Admin Core: section navigation, stats, init
    // ─── Section refresh registry ─────────────────────────────
    function refreshSection(section, route) {
      const r = route || (typeof resolveRoute === 'function' ? resolveRoute(window.location.hash) : {});

      if (section === 'overview') {
        refreshAdminStats();
        if (typeof loadOverviewStats === 'function') loadOverviewStats();
      }
      if (section === 'prenumeration' && typeof loadSubscriptionSettings === 'function') {
        loadSubscriptionSettings();
      }
      if (section === 'families' && typeof loadFamilies === 'function') loadFamilies();
      if (section === 'messages' && typeof loadMessages === 'function') loadMessages();
      if (section === 'defaults' && typeof switchLibTab === 'function') switchLibTab('activities');
      if (section === 'anvandning' && typeof loadLoginStats === 'function') loadLoginStats();
      if (section === 'retention' && typeof loadRetentionData === 'function') loadRetentionData();
      if (section === 'foraldaraktivering' && typeof loadActivationProgramAdmin === 'function') {
        loadActivationProgramAdmin();
      }
      if (section === 'fordig' && typeof loadForDigAdmin === 'function') loadForDigAdmin();
      if (section === 'dagensnyhet' && typeof loadNyheter === 'function') loadNyheter();
      if (section === 'landning' && typeof loadLandingNews === 'function') loadLandingNews();
      if (section === 'bildbank' && typeof loadAdminImages === 'function') loadAdminImages();
      if (section === 'nyhetsbrev' && typeof loadNewsletterSubscribers === 'function') {
        loadNewsletterSubscribers();
      }
      if (section === 'emailmallar') {
        if (r.emailTab && typeof openEmailTemplatesTab === 'function') {
          openEmailTemplatesTab(r.emailTab);
        } else if (typeof loadEmailTemplates === 'function') {
          loadEmailTemplates();
        }
      }
      if (section === 'emaillog' && typeof loadEmailLog === 'function') loadEmailLog();
      if (section === 'undersokningar' && typeof loadSurveys === 'function') loadSurveys();
      if (section === 'intresseanmalningar' && typeof loadInterests === 'function') loadInterests();
      if (section === 'waitlist' && typeof loadWaitlist === 'function') loadWaitlist();
      if (section === 'analytics' && typeof loadAnalytics === 'function') loadAnalytics();
      if (section === 'anvandarstatistik' && typeof loadUserStats === 'function') loadUserStats();
      if (section === 'valkomstmail') {
        if (typeof openEmailTemplatesTab === 'function') {
          openEmailTemplatesTab('valkomstmail');
        } else if (typeof loadWelcomeEmailTemplate === 'function') {
          loadWelcomeEmailTemplate();
        }
      }
    }

    function applyRouteExtras(route) {
      if (route.scrollTarget) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const el = document.querySelector(route.scrollTarget);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        });
      }
    }

    function showSection(name, route) {
      document.querySelectorAll('[id$="Section"]').forEach((s) => {
        if (s.id !== 'accessDenied') s.classList.add('hidden');
      });
      const target = document.getElementById(name + 'Section');
      if (target) target.classList.remove('hidden');

      const resolved = route || (typeof resolveRoute === 'function' ? resolveRoute(window.location.hash) : null);
      const pageTitle = resolved?.pageTitle || name;

      const titleEl = document.getElementById('pageTitle');
      if (titleEl) titleEl.textContent = pageTitle;

      if (resolved && typeof renderBreadcrumb === 'function') {
        renderBreadcrumb(resolved.breadcrumb);
      }

      if (resolved && typeof setActiveNavItem === 'function') {
        setActiveNavItem(resolved.navId);
      } else {
        document.querySelectorAll('.nav-item').forEach((a) => {
          a.classList.remove('bg-gold', 'text-navy', 'font-semibold');
          a.classList.add('text-white', 'hover:bg-navy-soft');
        });
        const active = document.querySelector(`.nav-item[data-section="${name}"]`);
        if (active) {
          active.classList.add('bg-gold', 'text-navy', 'font-semibold');
          active.classList.remove('text-white', 'hover:bg-navy-soft');
        }
      }

      refreshSection(name, resolved);
      if (resolved) applyRouteExtras(resolved);
    }

    function navigateToHash(rawHash, options) {
      const opts = options || {};
      const route = typeof resolveRoute === 'function'
        ? resolveRoute(rawHash || window.location.hash)
        : { actualSection: 'overview', hash: '#overview', navId: 'start', pageTitle: 'Start', breadcrumb: ['Hem', 'Start'] };

      if (route.external && route.href) {
        window.location.href = route.href;
        return route;
      }

      if (!opts.skipHashUpdate) {
        const targetHash = route.hash || '#overview';
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }

      showSection(route.actualSection, route);
      return route;
    }

    // ─── Mobile Menu Toggle ────────────────────────────────────
    function closeMobileMenu() {
      const links = document.getElementById('adminSidebarLinks');
      if (links) links.classList.remove('open');
    }
    (function () {
      const btn = document.getElementById('adminMenuToggle');
      const links = document.getElementById('adminSidebarLinks');
      if (btn && links) {
        btn.addEventListener('click', function () {
          links.classList.toggle('open');
        });
      }
    })();

    // Escape HTML to prevent XSS
    function esc(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    }

    // ─── Stats loader with retry ────────────────────────────
    function applyStats(stats) {
      document.getElementById('familiesCount').textContent = stats.families ?? 0;
      document.getElementById('parentsCount').textContent = stats.parents ?? 0;
      document.getElementById('childrenCount').textContent = stats.children ?? 0;
      const unread = stats.unreadMessages ?? 0;
      document.getElementById('unreadMessagesCount').textContent = unread;
      document.getElementById('unreadMessagesCount').style.color = unread > 0 ? '#E53E3E' : '#1B2340';
      updateMessagesBadge(unread);
      if (stats.totalMessages != null) {
        document.getElementById('totalMessagesCount').textContent = stats.totalMessages;
      }
    }

    async function loadAdminStats(retries) {
      for (let attempt = 0; attempt < (retries || 1); attempt++) {
        try {
          const stats = await Auth.api('/api/admin/stats');
          applyStats(stats);
          return;
        } catch (e) {
          console.error('[ADMIN] Stats load failed (attempt ' + (attempt + 1) + '):', e.message);
          if (attempt < (retries || 1) - 1) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
      }
      ['familiesCount', 'parentsCount', 'childrenCount'].forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.textContent === '\u2014') el.textContent = '!';
      });
    }

    // ─── Stored data for search/filter ────────────────────────
    let allMessages = [];
    let allFamilies = [];

    // ─── Init ─────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        Auth.requireAuth();

        const me = await Auth.api('/api/auth/me');

        if (!me.is_admin) {
          document.getElementById('accessDenied').classList.remove('hidden');
          document.querySelectorAll('[id$="Section"]').forEach((s) => {
            if (s.id !== 'accessDenied') s.classList.add('hidden');
          });
          setTimeout(() => { window.location.href = '/login'; }, 3000);
          return;
        }

        if (typeof renderAdminSidebar === 'function') renderAdminSidebar();

        window.addEventListener('hashchange', () => {
          navigateToHash(window.location.hash, { skipHashUpdate: true });
        });

        if (!window.location.hash) {
          history.replaceState(null, '', '#overview');
        }
        navigateToHash(window.location.hash || '#overview', { skipHashUpdate: true });

        await loadAdminStats(3);

        if (typeof loadOverviewStats === 'function') loadOverviewStats(3);

        loadFamilies();
        loadMessages();

        document.getElementById('exportEmailsBtn').addEventListener('click', async () => {
          try {
            const res = await fetch('/api/admin/export-emails', {
              credentials: 'include',
            });
            if (!res.ok) throw new Error('Export misslyckades');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'familjer-mailadresser.csv';
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            alert('Kunde inte exportera mailadresser');
          }
        });

        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const msg = document.getElementById('pwMsg');
          const currentPw = document.getElementById('currentPw').value;
          const newPw = document.getElementById('newPw').value;
          const confirmPw = document.getElementById('confirmPw').value;

          if (newPw !== confirmPw) {
            msg.textContent = 'Lösenorden matchar inte';
            msg.className = 'text-sm text-red-500';
            return;
          }

          try {
            const data = await Auth.api('/api/admin/change-password', {
              method: 'PUT',
              body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            msg.textContent = data.message || 'Lösenordet har ändrats!';
            msg.className = 'text-sm text-green-600';
            document.getElementById('passwordForm').reset();
          } catch (err) {
            msg.textContent = err.message || 'Något gick fel';
            msg.className = 'text-sm text-red-500';
          }
        });

        document.getElementById('createAdminForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const msg = document.getElementById('createAdminMsg');
          const email = document.getElementById('adminEmail').value.trim();
          const password = document.getElementById('adminPassword').value;
          const name = document.getElementById('adminName').value.trim();

          if (password.length < 8) {
            msg.textContent = 'Lösenordet måste vara minst 8 tecken';
            msg.className = 'text-sm text-red-500';
            return;
          }

          try {
            const body = { email, password };
            if (name) body.name = name;
            const data = await Auth.api('/api/admin/create-admin', {
              method: 'POST',
              body: JSON.stringify(body),
            });
            msg.textContent = data.message || 'Admin-konto skapat!';
            msg.className = 'text-sm text-green-600';
            document.getElementById('createAdminForm').reset();
          } catch (err) {
            msg.textContent = err.message || 'Kunde inte skapa admin-konto';
            msg.className = 'text-sm text-red-500';
          }
        });

        document.getElementById('messagesSearch').addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          renderMessages(filterMessages(query));
        });

        document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

        setInterval(refreshAdminStats, 30000);
      } catch (error) {
        console.error('Admin init failed:', error);
        if (error.status === 401 || error.status === 403) {
          window.location.href = '/login';
        }
      }
    });

    async function refreshAdminStats() {
      try {
        const stats = await Auth.api('/api/admin/stats');
        applyStats(stats);
      } catch (e) {
        // Silent fail for polling
      }
    }

    // ─── Welcome Email Template (legacy section; #valkomstmail routes to E-postmallar) ──

    let cachedWelcomeEmailTemplate = null;

    async function loadWelcomeEmailTemplate() {
      try {
        const data = await Auth.api('/api/admin/welcome-email');
        cachedWelcomeEmailTemplate = data;

        document.getElementById('welcomeEmailSubject').value = data.subject || '';
        document.getElementById('welcomeEmailBody').value = data.body || '';
        document.getElementById('welcomeEmailActive').checked = data.is_active;

        const status = document.getElementById('welcomeEmailActiveStatus');
        if (status) {
          status.textContent = data.is_active ? '✓ Aktiverad' : '✗ Inaktiverad';
        }

        updateWelcomeEmailPreview();
      } catch (err) {
        console.error('Failed to load welcome email template:', err);
        const preview = document.getElementById('welcomeEmailPreview');
        if (preview) preview.textContent = 'Kunde inte ladda mallen: ' + (err.message || 'Okänt fel');
      }
    }

    async function saveWelcomeEmailTemplate() {
      const subject = document.getElementById('welcomeEmailSubject').value.trim();
      const body = document.getElementById('welcomeEmailBody').value;
      const is_active = document.getElementById('welcomeEmailActive').checked;
      const statusEl = document.getElementById('welcomeEmailStatus');

      if (!subject) {
        showWelcomeEmailStatus('Rubriken kan inte vara tom', 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
        return;
      }
      if (!body.trim()) {
        showWelcomeEmailStatus('Brödtexten kan inte vara tom', 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
        return;
      }

      try {
        const data = await Auth.api('/api/admin/welcome-email', {
          method: 'PUT',
          body: JSON.stringify({ subject, body, is_active }),
        });
        cachedWelcomeEmailTemplate = data.template;
        showWelcomeEmailStatus('✓ Välkomstmailmallen har sparats!', 'text-sm p-3 rounded-xl bg-green-50 text-green-600');

        const activeStatus = document.getElementById('welcomeEmailActiveStatus');
        if (activeStatus) activeStatus.textContent = is_active ? '✓ Aktiverad' : '✗ Inaktiverad';
      } catch (err) {
        showWelcomeEmailStatus('Kunde inte spara: ' + (err.message || 'Okänt fel'), 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
      }
    }

    function showWelcomeEmailStatus(msg, className) {
      const el = document.getElementById('welcomeEmailStatus');
      if (!el) return;
      el.textContent = msg;
      el.className = className;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 5000);
    }

    function updateWelcomeEmailPreview() {
      const subject = document.getElementById('welcomeEmailSubject').value || 'Välkommen till [REDACTED]! 🌟';
      const body = document.getElementById('welcomeEmailBody').value || '';
      const previewEl = document.getElementById('welcomeEmailPreview');

      if (!previewEl) return;

      if (!body.trim()) {
        previewEl.innerHTML = '<p class="text-text-soft text-center py-8 italic">Skriv brödtexten ovan för att se förhandsgranskningen.</p>';
        return;
      }

      let previewBody = body
        .replace(/{{foralderns_namn}}/g, 'Anna')
        .replace(/{{barnets_namn}}/g, 'Stjärndag');

      const paragraphs = previewBody.split(/\n\n+/);
      const formatted = paragraphs.map((p) => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        const escaped = trimmed
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\u002a\u002a([^*]+)\u002a\u002a/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        return `<p style="margin:0 0 14px 0;line-height:1.7;">${escaped}</p>`;
      }).join('');

      previewEl.innerHTML = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;background:#fff;border-radius:10px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#F5A623,#e8952a);padding:20px 28px;">
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">[REDACTED]</p>
            <p style="margin:8px 0 0 0;color:#fff;font-size:20px;font-weight:700;">Välkommen! 🌟</p>
          </div>
          <div style="padding:24px 28px;font-size:15px;line-height:1.7;color:#374151;">
            ${formatted}
          </div>
          <div style="padding:0 28px 24px 28px;">
            <a href="#" style="display:inline-block;background:#F5A623;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;">Öppna [REDACTED] ⭐</a>
          </div>
          <div style="border-top:1px solid #e5e7eb;padding:16px 28px;font-size:12px;color:#9ca3af;">
            Du får detta mail för att du nyligen registrerade dig på [REDACTED].
          </div>
        </div>
      `;

    }
