/**
 * Admin: full database SQL export button handler.
 */
(function () {
  function initDatabaseExportButton() {
    const btn = document.getElementById('exportFullDatabaseBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Exportera hela databasen som SQL?\n\n' +
          'Filen kan bli stor. Lösenordshash och refresh-token-hash maskeras som [REDACTED].\n' +
          'Kräver MIGRATION_EXPORT_ENABLED=true på servern.'
      );
      if (!confirmed) return;

      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Exporterar databas…';

      try {
        const res = await fetch('/api/admin/export/sql', {
          credentials: 'include',
        });
        if (!res.ok) {
          let msg = 'Export misslyckades';
          try {
            const data = await res.json();
            if (data.error) msg = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const blob = await res.blob();
        const date = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stjarndag-full-export-${date}.sql`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.message || 'Kunde inte exportera databasen');
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDatabaseExportButton);
  } else {
    initDatabaseExportButton();
  }
})();
