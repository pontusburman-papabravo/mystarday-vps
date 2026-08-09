// Admin: Landing page news section management.
// Owns: list, add, edit, delete, reorder.
// Does NOT own: esc() (in parent page), showSection() (in admin-core.js).

let landingNewsAll = [];

async function loadLandingNews() {
  // Auth.api() handles the CSRF token + retry-on-403 automatically.
  try {
    const data = await Auth.api('/api/admin/landing-news');
    landingNewsAll = Array.isArray(data) ? data : [];
    renderLandingNewsList();
  } catch (err) {
    document.getElementById('landingNewsList').innerHTML =
      '<p class="text-red-500 text-sm">Kunde inte ladda poster: ' + esc(err.message) + '</p>';
  }
}

    function renderLandingNewsList() {
      const container = document.getElementById('landingNewsList');
      if (!container) return;

      if (landingNewsAll.length === 0) {
        container.innerHTML = '<p class="text-text-soft text-sm italic">Inga poster ännu. Lägg till en ovan.</p>';
        return;
      }

      const html = landingNewsAll.map(item => {
        const imgThumb = item.image_url
          ? `<img src="${esc(item.image_url)}" alt="" class="w-12 h-12 rounded-lg object-cover border border-lavender flex-shrink-0" onerror="this.style.display='none'">`
          : `<div class="w-12 h-12 rounded-lg bg-lavender flex items-center justify-center text-xl flex-shrink-0">📄</div>`;
        const activeBadge = item.is_archived
          ? '<span class="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Arkiverad</span>'
          : item.is_active
          ? '<span class="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktiv</span>'
          : '<span class="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inaktiv</span>';
        return `
          <div class="flex items-center gap-4 p-4 border-b border-lavender last:border-b-0 hover:bg-sky rounded-xl transition-colors mb-2"
               data-ln-id="${item.id}" data-ln-sort="${item.sort_order}">
            <div class="drag-handle text-text-soft hover:text-navy cursor-grab" title="Dra för att flytta">⋮⋮</div>
            ${imgThumb}
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-navy text-sm truncate">${esc(item.title)}</p>
              <p class="text-xs text-text-soft truncate">${item.body ? esc(item.body) : '(utan brödtext)'}</p>
              <div class="flex items-center gap-2 mt-1">
                ${activeBadge}
                <span class="text-xs text-text-soft">Ordning: ${item.sort_order}</span>
                ${item.button_url ? `<span class="text-xs text-text-soft">→ ${esc(item.button_url)}</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 action-btns">
              <button onclick="editLandingNews(${item.id})"
                class="px-3 py-1.5 bg-sky hover:bg-lavender text-navy rounded-lg text-xs font-semibold transition-colors"
                title="Redigera">✏️</button>
              <button onclick="toggleLandingNewsActive(${item.id})"
                class="px-3 py-1.5 bg-sky hover:bg-mint text-navy rounded-lg text-xs font-semibold transition-colors"
                title="${item.is_active ? 'Inaktivera' : 'Aktivera'}">
                ${item.is_active ? '🔄' : '✅'}
              </button>
              <button onclick="deleteLandingNews(${item.id})"
                class="px-3 py-1.5 bg-coral hover:bg-red-200 text-navy rounded-lg text-xs font-semibold transition-colors"
                title="Ta bort">🗑️</button>
            </div>
          </div>`;
      }).join('');

      container.innerHTML = html;
      initLandingNewsSortable();
    }

    function initLandingNewsSortable() {
      if (!window.Sortable) return;
      const list = document.getElementById('landingNewsList');
      if (!list) return;
      // Only init once
      if (list._sortable) return;

      list._sortable = new Sortable(list, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: async function (_evt) {
          const items = list.querySelectorAll('[data-ln-id]');
          const updates = [];
          items.forEach((el, index) => {
            const id = parseInt(el.dataset.lnId, 10);
            updates.push({ id, sort_order: index });
            el.dataset.lnSort = index;
          });
          try {
            await Auth.api('/api/admin/landing-news/reorder', {
              method: 'PATCH',
              body: JSON.stringify({ updates }),
            });
          } catch (err) {
            showLnStatus('Kunde inte spara ordning: ' + err.message, 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
            loadLandingNews(); // reload on failure
          }
        },
      });
    }

    // ─── Submit form ─────────────────────────────────────────
    document.getElementById('landingNewsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      // Auth.api() waits for fresh CSRF token and retries on 403 automatically.
      const id = document.getElementById('lnEditingId').value;
      const payload = {
        title: document.getElementById('lnTitle').value.trim(),
        body: document.getElementById('lnBody').value.trim(),
        title_en: document.getElementById('lnTitleEn').value.trim(),
        body_en: document.getElementById('lnBodyEn').value.trim(),
        image_url: document.getElementById('lnImageUrl').value.trim(),
        button_text: document.getElementById('lnButtonText').value.trim() || 'Läs mer',
        button_text_en: document.getElementById('lnButtonTextEn').value.trim(),
        button_url: document.getElementById('lnButtonUrl').value.trim(),
        is_active: document.getElementById('lnIsActive').checked,
        is_archived: document.getElementById('lnIsArchived').checked,
      };

      if (!payload.title) {
        showLnStatus('Titel krävs', 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
        return;
      }

      const btn = document.getElementById('lnSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Sparar...';

      try {
        const url = id ? `/api/admin/landing-news/${id}` : '/api/admin/landing-news';
        const method = id ? 'PUT' : 'POST';
        await Auth.api(url, { method, body: JSON.stringify(payload) });
        showLnStatus('✓ Sparad!', 'text-sm p-3 rounded-xl bg-green-50 text-green-600');
        resetLandingNewsForm();
        loadLandingNews();
      } catch (err) {
        showLnStatus('Fel: ' + err.message, 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Spara';
      }
    });

    // ─── Edit ───────────────────────────────────────────────
    window.editLandingNews = function (id) {
      const item = landingNewsAll.find(i => i.id === id);
      if (!item) return;
      document.getElementById('lnEditingId').value = id;
      document.getElementById('lnTitle').value = item.title || '';
      document.getElementById('lnBody').value = item.body || '';
      document.getElementById('lnTitleEn').value = item.title_en || '';
      document.getElementById('lnBodyEn').value = item.body_en || '';
      document.getElementById('lnImageUrl').value = item.image_url || '';
      document.getElementById('lnButtonText').value = item.button_text || 'Läs mer';
      document.getElementById('lnButtonTextEn').value = item.button_text_en || '';
      document.getElementById('lnButtonUrl').value = item.button_url || '';
      document.getElementById('lnIsActive').checked = item.is_active !== false && !item.is_archived;
      document.getElementById('lnIsArchived').checked = item.is_archived === true;
      document.getElementById('lnSubmitBtn').textContent = 'Uppdatera';
      document.getElementById('lnCancelBtn').classList.remove('hidden');
      document.getElementById('lnTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.cancelLandingNewsEdit = function () {
      resetLandingNewsForm();
    };

    function resetLandingNewsForm() {
      document.getElementById('lnEditingId').value = '';
      document.getElementById('lnTitle').value = '';
      document.getElementById('lnBody').value = '';
      document.getElementById('lnTitleEn').value = '';
      document.getElementById('lnBodyEn').value = '';
      document.getElementById('lnImageUrl').value = '';
      document.getElementById('lnButtonText').value = 'Läs mer';
      document.getElementById('lnButtonTextEn').value = '';
      document.getElementById('lnButtonUrl').value = '';
      document.getElementById('lnIsActive').checked = true;
      document.getElementById('lnIsArchived').checked = false;
      document.getElementById('lnSubmitBtn').textContent = 'Spara';
      document.getElementById('lnCancelBtn').classList.add('hidden');
    }

    function showLnStatus(msg, className) {
      const el = document.getElementById('lnStatus');
      if (!el) return;
      el.textContent = msg;
      el.className = className;
      el.classList.remove('hidden');
      setTimeout(() => { el.classList.add('hidden'); }, 4000);
    }

    // ─── Toggle active ───────────────────────────────────────
    window.toggleLandingNewsActive = async function (id) {
      const item = landingNewsAll.find(i => i.id === id);
      if (!item) return;
      try {
        await Auth.api(`/api/admin/landing-news/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...item,
            is_active: !item.is_active,
            is_archived: false,
          }),
        });
        loadLandingNews();
      } catch (err) {
        showLnStatus('Kunde inte ändra: ' + err.message, 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
      }
    };

    // ─── Delete ─────────────────────────────────────────────
    window.deleteLandingNews = async function (id) {
      if (!confirm('Ta bort denna post? Detta kan inte ångras.')) return;
      try {
        await Auth.api(`/api/admin/landing-news/${id}`, { method: 'DELETE' });
        loadLandingNews();
      } catch (err) {
        showLnStatus('Kunde inte ta bort: ' + err.message, 'text-sm p-3 rounded-xl bg-red-50 text-red-600');
      }
    };