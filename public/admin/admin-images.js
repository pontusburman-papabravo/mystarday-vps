// Admin: Bildbank — upload, list, delete.
// Owns: image grid, upload widget, drag-and-drop.
// Does NOT own: esc() (in parent page), showSection() (in admin-core.js).

// ── CSRF ──────────────────────────────────────────────────────────
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;)[ \t]*csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

let adminImagesAll = [];
let pendingImageFile = null;

async function loadAdminImages() {
  try {
    const res = await fetch('/api/admin/images', { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    adminImagesAll = await res.json();
    renderAdminImageGrid();
  } catch (err) {
    const el = document.getElementById('adminImageEmptyState');
    if (el) el.textContent = 'Kunde inte ladda bilder: ' + esc(err.message);
  }
}

function renderAdminImageGrid() {
  const grid = document.getElementById('adminImageGrid');
  if (!grid) return;

  if (adminImagesAll.length === 0) {
    grid.innerHTML = '<p class="text-text-soft text-sm italic col-span-full">Inga bilder uppladdade ännu.</p>';
    return;
  }

  const html = adminImagesAll.map(img => {
    const sizeKB = Math.round(img.file_size / 1024);
    const date = img.created_at ? new Date(img.created_at).toLocaleDateString('sv-SE') : '';
    return `
      <div class="relative group rounded-xl overflow-hidden border-2 border-lavender bg-gray-50 hover:border-gold transition-all">
        <img src="${esc(img.url)}" alt="${esc(img.filename)}"
             class="w-full aspect-square object-cover cursor-pointer"
             onclick="copyImageUrl('${esc(img.url.replace(/'/g, "\\'"))}')"
             title="Klicka för att kopiera URL">
        <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <p class="truncate font-medium">${esc(img.filename)}</p>
          <p class="text-xs text-gray-300">${sizeKB} KB · ${date}</p>
        </div>
        <button onclick="deleteAdminImage(${img.id}, '${esc(img.filename.replace(/'/g, "\\'"))}')"
          class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="Ta bort">
          ×
        </button>
      </div>`;
  }).join('');

  grid.innerHTML = html;
}

// ─── Upload widget ──────────────────────────────────────────────

const fileInput = document.getElementById('imageBankFileInput');
if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleImageBankFile(fileInput.files[0]);
  });
}

// Drag-and-drop on dropzone
const dropzone = document.getElementById('imageBankDropzone');
if (dropzone) {
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-gold', 'bg-gold-light');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-gold', 'bg-gold-light');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-gold', 'bg-gold-light');
    const file = e.dataTransfer.files[0];
    if (file) handleImageBankFile(file);
  });
}

function handleImageBankFile(file) {
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showImageBankError('Endast JPG, PNG eller WebP är tillåtna');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showImageBankError('Filen är för stor (max 5 MB)');
    return;
  }

  pendingImageFile = file;
  document.getElementById('imageBankDropzoneText').classList.add('hidden');
  document.getElementById('imageBankPreview').classList.remove('hidden');
  document.getElementById('imageBankPreviewImg').src = URL.createObjectURL(file);
  document.getElementById('imageBankFileName').textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
  document.getElementById('imageBankUploadBtn').disabled = false;
  hideImageBankError();
}

async function uploadAdminImage() {
  if (!pendingImageFile) return;
  const btn = document.getElementById('imageBankUploadBtn');
  const status = document.getElementById('imageBankUploadStatus');
  btn.disabled = true;
  btn.textContent = 'Laddar upp...';
  status.className = 'text-sm mt-2';
  status.textContent = '';

  try {
    const fd = new FormData();
    fd.append('image', pendingImageFile);
    const res = await fetch('/api/admin/images/upload', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Uppladdning misslyckades');
    }
    status.className = 'text-sm mt-2 text-green-600';
    status.textContent = '✓ Bild uppladdad!';
    resetImageBankForm();
    await loadAdminImages();
  } catch (err) {
    showImageBankError(err.message);
    btn.disabled = false;
    btn.textContent = 'Ladda upp';
  }
}

function resetImageBankForm() {
  pendingImageFile = null;
  document.getElementById('imageBankDropzoneText').classList.remove('hidden');
  document.getElementById('imageBankPreview').classList.add('hidden');
  document.getElementById('imageBankFileInput').value = '';
  const btn = document.getElementById('imageBankUploadBtn');
  btn.disabled = true;
  btn.textContent = 'Ladda upp';
}

function showImageBankError(msg) {
  const el = document.getElementById('imageBankDropError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideImageBankError() {
  const el = document.getElementById('imageBankDropError');
  if (el) el.classList.add('hidden');
}

window.copyImageUrl = function (url) {
  navigator.clipboard.writeText(url).then(() => {
    const grid = document.getElementById('adminImageGrid');
    if (grid) {
      const orig = grid.innerHTML;
      grid.innerHTML = '<p class="text-green-600 font-semibold col-span-full p-4">✓ URL kopierad!</p>';
      setTimeout(() => { grid.innerHTML = orig; renderAdminImageGrid(); }, 1500);
    }
  }).catch(() => {
    prompt('Kopiera denna URL:', url);
  });
};

window.deleteAdminImage = async function (id, filename) {
  if (!confirm('Ta bort bilden "' + filename + '"? Detta kan inte ångras.')) return;
  try {
    const res = await fetch('/api/admin/images/' + id, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() },
    });
    if (!res.ok) throw new Error('Delete failed');
    adminImagesAll = adminImagesAll.filter(i => i.id !== id);
    renderAdminImageGrid();
  } catch (err) {
    const el = document.getElementById('adminImageEmptyState');
    if (el) el.textContent = 'Kunde inte ta bort: ' + err.message;
  }
};

// ─── Image bank picker for landing news form ───────────────────
window.pickImageFromBank = async function () {
  const modal = document.getElementById('imageBankModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Ensure images are loaded
  if (adminImagesAll.length === 0) await loadAdminImages();

  renderImageBankPicker();
};

function renderImageBankPicker() {
  const container = document.getElementById('imageBankPickerGrid');
  if (!container) return;

  if (adminImagesAll.length === 0) {
    container.innerHTML = '<p class="text-text-soft text-sm col-span-full">Inga bilder i bildbanken ännu. Ladda upp en först.</p>';
    return;
  }

  container.innerHTML = adminImagesAll.map(img => `
    <div onclick="selectImageFromBank('${esc(img.url.replace(/'/g, "\\'"))}')"
      class="cursor-pointer rounded-xl overflow-hidden border-2 border-transparent hover:border-gold transition-all">
      <img src="${esc(img.url)}" alt="${esc(img.filename)}" class="w-full aspect-square object-cover">
      <p class="text-xs text-text-soft p-2 bg-gray-50 truncate">${esc(img.filename)}</p>
    </div>`).join('');
}

window.selectImageFromBank = function (url) {
  document.getElementById('lnImageUrl').value = url;
  closeImageBankModal();
  showImageBankStatus('✓ Bild vald från bildbank', 'text-sm p-3 rounded-xl bg-green-50 text-green-600');
};

window.closeImageBankModal = function () {
  const modal = document.getElementById('imageBankModal');
  if (modal) modal.classList.add('hidden');
};

function showImageBankStatus(msg, className) {
  const el = document.getElementById('lnStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = className;
  el.classList.remove('hidden');
  setTimeout(() => { el.classList.add('hidden'); }, 4000);
}

// Close modal on background click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('imageBankModal');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeImageBankModal();
  }
});

window.uploadAdminImage = uploadAdminImage;