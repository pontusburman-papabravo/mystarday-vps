/**
 * Dashboard system message banner — loads unread admin messages and handles real-time updates via SSE.
 * Does not own: authentication, API routing, database.
 */

// ─── System message banner — on-load check + SSE realtime ────
    // Queues pending message IDs; each dismissal marks as read and shows next.
    (function() {
      let _pendingMessages = [];
      let _currentMsgId = null;

      function formatMsgTime(isoStr) {
        if (!isoStr) return '';
        try {
          return new Date(isoStr).toLocaleString('sv-SE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
          });
        } catch { return ''; }
      }

      function showNextMessage() {
        if (_pendingMessages.length === 0) {
          document.getElementById('systemMsgBanner').style.display = 'none';
          _currentMsgId = null;
          return;
        }
        const msg = _pendingMessages.shift();
        _currentMsgId = msg.id;

        // Parse optional |link:URL suffix — library update messages use this
        // to render a clickable action link inside the banner.
        const rawText = msg.message || '';
        const linkMatch = rawText.match(/\|link:(\S+)$/);
        const displayText = linkMatch ? rawText.slice(0, rawText.lastIndexOf('|link:')).trim() : rawText;
        const linkUrl = linkMatch ? linkMatch[1] : null;

        const textEl = document.getElementById('systemMsgText');
        textEl.textContent = displayText;

        // Inject action link if present
        let actionLink = document.getElementById('systemMsgActionLink');
        if (linkUrl) {
          if (!actionLink) {
            actionLink = document.createElement('a');
            actionLink.id = 'systemMsgActionLink';
            actionLink.style.cssText = 'display:inline-block; margin-top:8px; color:#F5A623; font-weight:700; font-size:13px; text-decoration:none; border-bottom:1.5px solid rgba(245,166,35,0.4); transition:opacity 0.15s;';
            actionLink.onmouseover = function() { this.style.opacity = '0.8'; };
            actionLink.onmouseout  = function() { this.style.opacity = '1'; };
            textEl.parentNode.insertBefore(actionLink, document.getElementById('systemMsgTime'));
          }
          actionLink.href = linkUrl;
          actionLink.textContent = (window.pt ? pt('family.systemMessages.goLibrary') : 'Go to the Library →');
          actionLink.style.display = 'inline-block';
        } else if (actionLink) {
          actionLink.style.display = 'none';
        }

        document.getElementById('systemMsgTime').textContent = formatMsgTime(msg.created_at);
        document.getElementById('systemMsgBanner').style.display = 'block';
      }

      window.dismissSystemMessage = async function() {
        const id = _currentMsgId;
        document.getElementById('systemMsgBanner').style.display = 'none';
        _currentMsgId = null;
        if (id) {
          try {
            await fetch('/api/messages/' + id + '/read', {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'X-CSRF-Token': document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '',
              },
            });
          } catch {}
        }
        // Show next queued message if any
        showNextMessage();
      };

      async function loadUnreadMessages() {
        try {
          if (!Auth.isLoggedIn()) return;
          const res = await fetch('/api/messages/unread', {
            credentials: 'include',
          });
          if (!res.ok) return;
          const messages = await res.json();
          if (messages && messages.length > 0) {
            _pendingMessages = messages;
            showNextMessage();
          }
        } catch {}
      }

      // Load on page ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUnreadMessages);
      } else {
        loadUnreadMessages();
      }

      // SSE real-time: push new message to queue immediately
      window.addEventListener('sse:SYSTEM_ALERT', (e) => {
        const detail = e.detail || {};
        if (!detail.message_id || !detail.message_text) return;
        const msg = { id: detail.message_id, message: detail.message_text, created_at: detail.created_at };
        if (_currentMsgId) {
          // Already showing one — queue for after
          _pendingMessages.push(msg);
        } else {
          _pendingMessages = [msg];
          showNextMessage();
        }
      });
    })();
