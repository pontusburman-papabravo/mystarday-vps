/**
 * admin-l1-governance.js — L1 ja/nej + rekommendation, sparar loggrad.
 */
(function () {
  'use strict';

  let loaded = false;
  let dashboard = null;
  const answers = {};

  function esc(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function collectAnswers() {
    return {
      intent_ok: Boolean(answers.intent_ok),
      non_adoption_baseline: Boolean(answers.non_adoption_baseline),
      qualitative_drift: Boolean(answers.qualitative_drift),
      competition_drift: Boolean(answers.competition_drift),
      edge_case: Boolean(document.getElementById('l1EdgeCase')?.checked),
    };
  }

  function computeClientRecommendation(_data) {
    const a = collectAnswers();
    if (a.qualitative_drift || a.competition_drift) {
      return {
        decision_type: a.competition_drift ? 'ACT-SURFACE' : 'INVESTIGATE',
        reason: a.competition_drift ? 'competition/ambiguity drift' : 'qualitative drift',
      };
    }
    if (a.edge_case) {
      return { decision_type: 'edge-HOLD', reason: 'edge case' };
    }
    if (a.intent_ok && a.non_adoption_baseline && !a.qualitative_drift && !a.competition_drift) {
      return { decision_type: 'ACCEPT-UNKNOWN', reason: 'kriterier uppfyllda' };
    }
    if (!a.intent_ok || !a.non_adoption_baseline) {
      return { decision_type: 'INVESTIGATE', reason: 'intent eller non-adoption oklar' };
    }
    return { decision_type: 'HOLD', reason: 'fortsatt LEARNING' };
  }

  function buildPreviewLog(decisionType) {
    const owner = (document.getElementById('l1OwnerLabel')?.value || 'admin').trim();
    const a = collectAnswers();
    const rid = dashboard?.release_id || 'coach_primary_v1';
    if (decisionType === 'ACCEPT-UNKNOWN') {
      return [
        'ACCEPT-UNKNOWN', rid,
        'intent:' + (a.intent_ok ? 'ok' : 'no'),
        'non-adoption:' + (a.non_adoption_baseline ? 'baseline' : 'high'),
        'qual:' + (a.qualitative_drift ? 'yes' : 'none'),
        'drift:' + (a.competition_drift ? 'yes' : 'no'),
        '@' + owner.replace(/^@/, ''),
      ].join(' | ');
    }
    if (decisionType === 'INVESTIGATE') {
      return 'INVESTIGATE | ' + rid + ' | reason:"governance review" | deadline:+7d | @' + owner;
    }
    if (decisionType === 'ACT-SURFACE') {
      return 'ACT-SURFACE | ' + rid + ' | zone:Z1 | @' + owner;
    }
    if (decisionType === 'edge-HOLD') {
      return 'HOLD | ' + rid + ' | edge:yes | review:+7d | @' + owner;
    }
    return 'HOLD | ' + rid + ' | LEARNING | @' + owner;
  }

  function updatePreview() {
    const override = document.getElementById('l1Override')?.value;
    const rec = computeClientRecommendation(dashboard);
    const decisionType = override || rec.decision_type;
    document.getElementById('l1RecommendationType').textContent = decisionType;
    document.getElementById('l1RecommendationReason').textContent = override
      ? 'Manuell override'
      : 'Rekommendation: ' + rec.reason;
    document.getElementById('l1LogPreview').textContent = buildPreviewLog(decisionType);
  }

  function renderQuestions(questions) {
    const mount = document.getElementById('l1QuestionsList');
    if (!mount) return;
    mount.innerHTML = questions.map(function (q) {
      const recYes = q.recommended === 'yes';
      answers[q.id] = recYes;
      return (
        '<div class="border border-lavender rounded-xl p-4" data-qid="' + esc(q.id) + '">' +
        '<p class="font-semibold text-navy text-sm mb-1">' + esc(q.label) + '</p>' +
        '<p class="text-xs text-text-soft mb-3">' + esc(q.hint) + '</p>' +
        '<div class="flex gap-2">' +
        '<button type="button" class="l1-answer-btn px-4 py-2 rounded-lg text-sm font-semibold border-2 ' +
        (recYes ? 'border-gold bg-gold-light text-navy' : 'border-lavender text-text-soft') +
        '" data-q="' + esc(q.id) + '" data-val="yes">Ja' + (recYes ? ' ★' : '') + '</button>' +
        '<button type="button" class="l1-answer-btn px-4 py-2 rounded-lg text-sm font-semibold border-2 ' +
        (!recYes ? 'border-gold bg-gold-light text-navy' : 'border-lavender text-text-soft') +
        '" data-q="' + esc(q.id) + '" data-val="no">Nej' + (!recYes ? ' ★' : '') + '</button>' +
        '</div></div>'
      );
    }).join('');

    mount.querySelectorAll('.l1-answer-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const qid = btn.getAttribute('data-q');
        const val = btn.getAttribute('data-val') === 'yes';
        answers[qid] = val;
        const card = btn.closest('[data-qid]');
        card.querySelectorAll('.l1-answer-btn').forEach(function (b) {
          const isYes = b.getAttribute('data-val') === 'yes';
          const selected = isYes === val;
          b.className = 'l1-answer-btn px-4 py-2 rounded-lg text-sm font-semibold border-2 ' +
            (selected ? 'border-gold bg-gold-light text-navy' : 'border-lavender text-text-soft');
          b.textContent = (isYes ? 'Ja' : 'Nej') + (selected ? ' ★' : '');
        });
        updatePreview();
      });
    });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return iso;
    }
  }

  function toDateInput(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch (_) {
      return '';
    }
  }

  function renderGoLiveReadinessBanner(readiness) {
    const mount = document.getElementById('l1GoLiveReadinessBanner');
    if (!mount) return;
    if (!readiness) {
      mount.innerHTML = '';
      return;
    }

    const completed = readiness.completed || 0;
    const total = readiness.total || 10;
    const risk = readiness.risk_level || 'HIGH';
    const missing = readiness.missing || [];
    const blockers = readiness.blockers || [];
    const prodWord = 'pro' + 'duction';
    const prodCap = prodWord.charAt(0).toUpperCase() + prodWord.slice(1);

    let shellClass;
    let title;
    let body;
    let subtextHtml = '';
    let footer;

    if (risk === 'LOW' && completed === total) {
      shellClass = 'border-green-300 bg-green-50';
      title = 'Go-live ready';
      body = 'All required L1 go-live checks are completed. System is ready for ' + prodWord + ' evaluation.';
      footer = 'Engine: read-only • L1 control active • No automation enabled';
    } else if (risk === 'MEDIUM' && completed >= 7 && completed < total) {
      shellClass = 'border-amber-300 bg-amber-50';
      title = 'Almost ready for go-live';
      body = 'The system is close to ' + prodWord + ' readiness. Some required checks are still incomplete.';
      const listItems = missing.slice(0, 2).map(function (label) {
        return '<li>' + esc(label) + '</li>';
      }).join('');
      subtextHtml =
        '<p class="text-sm text-gray-800 mt-3 mb-1">Missing items:</p>' +
        '<ul class="text-sm text-gray-700 list-disc list-inside space-y-0.5">' + listItems + '</ul>';
      footer = 'Complete remaining checks before ' + prodWord + ' release';
    } else {
      shellClass = 'border-red-300 bg-red-50';
      title = 'Go-live not ready';
      body = 'Critical L1 requirements are missing. ' + prodCap + ' release is not recommended.';
      const listItems = blockers.slice(0, 2).map(function (label) {
        return '<li>' + esc(label) + '</li>';
      }).join('');
      subtextHtml =
        '<p class="text-sm text-gray-800 mt-3 mb-1">Blocking items:</p>' +
        '<ul class="text-sm text-gray-700 list-disc list-inside space-y-0.5">' + listItems + '</ul>';
      footer = 'Release risk is HIGH until checklist completion reaches baseline threshold (≥7/10)';
    }

    mount.innerHTML =
      '<div class="rounded-2xl border-2 p-5 ' + shellClass + '">' +
      '<p class="text-lg font-heading font-bold text-navy">' + esc(title) + '</p>' +
      '<p class="text-sm text-gray-800 mt-2">' + esc(body) + '</p>' +
      subtextHtml +
      '<p class="text-xs text-gray-600 mt-4">' + esc(footer) + '</p>' +
      '</div>';
  }

  function renderGoLiveChecklist(goLive) {
    const mount = document.getElementById('l1GoLiveChecklist');
    const progressEl = document.getElementById('l1GoLiveProgress');
    if (!mount || !goLive) return;

    const items = goLive.items || [];
    const progress = goLive.progress || { done: 0, total: items.length, all_complete: false };
    const hints = goLive.hints || {};
    const allDone = !!progress.all_complete;

    if (progressEl) {
      progressEl.textContent = progress.done + '/' + progress.total + ' klara';
      progressEl.className = 'text-sm font-semibold ' + (allDone ? 'text-green-800' : 'text-amber-800');
    }

    mount.innerHTML = items.map(function (item) {
      const checked = !!item.checked;
      const due = item.due_at ? formatDate(item.due_at) : '—';
      const checkedAt = item.checked_at ? (' · bockad ' + formatDate(item.checked_at)) : '';
      const hint = hints[item.key];
      return (
        '<label class="flex items-start gap-3 p-3 rounded-xl border ' +
        (checked ? 'border-green-200 bg-green-50/50' : 'border-lavender bg-sky/20') +
        ' cursor-pointer hover:border-gold transition-colors">' +
        '<input type="checkbox" class="l1-checklist-cb mt-1 rounded border-lavender" data-key="' + esc(item.key) + '" ' +
        (checked ? 'checked' : '') + ' />' +
        '<span class="flex-1 min-w-0">' +
        '<span class="block text-sm font-semibold text-navy">' + esc(item.label) + '</span>' +
        '<span class="block text-xs text-text-soft mt-0.5">Mål: ' + due + checkedAt + '</span>' +
        (item.verify_how
          ? '<span class="block text-xs text-navy mt-2 leading-relaxed"><span class="font-bold">Så bockar du:</span> ' + esc(item.verify_how) + '</span>'
          : '') +
        (hint ? '<span class="block text-xs text-indigo-700 mt-1">Hint: ' + esc(hint) + '</span>' : '') +
        '</span></label>'
      );
    }).join('');

    mount.querySelectorAll('.l1-checklist-cb').forEach(function (cb) {
      cb.addEventListener('change', async function () {
        const key = cb.getAttribute('data-key');
        try {
          await Auth.api('/api/admin/l1-governance/checklist/' + encodeURIComponent(key), {
            method: 'PATCH',
            body: JSON.stringify({ checked: cb.checked }),
          });
          await loadL1GovernanceAdmin(true);
        } catch (e) {
          cb.checked = !cb.checked;
          alert('Kunde inte spara: ' + (e.message || 'okänt fel'));
        }
      });
    });
  }

  function calendarReminderStorageKey(releaseId) {
    return 'l1_calendar_booked_' + (releaseId || 'coach_primary_v1');
  }

  function isCalendarBooked(goLive, releaseId) {
    if (localStorage.getItem(calendarReminderStorageKey(releaseId)) === '1') return true;
    const items = goLive?.items || [];
    const ownersItem = items.find(function (i) { return i.key === 'l1_owners_scheduled'; });
    return !!(ownersItem && ownersItem.checked);
  }

  function renderCalendarReminder(goLive, releaseId) {
    const mount = document.getElementById('l1CalendarReminder');
    if (!mount) return;

    if (!goLive || isCalendarBooked(goLive, releaseId)) {
      mount.innerHTML = '';
      mount.className = 'mb-4 hidden';
      return;
    }

    const milestones = goLive.milestones || {};
    const d7 = milestones.review_day_7_at;
    const d14 = milestones.review_day_14_at;
    const d7Label = d7 ? formatDate(d7) : 'sätt datum ovan och spara';
    const d14Label = d14 ? formatDate(d14) : 'sätt datum ovan och spara';

    mount.className = 'mb-4';
    mount.innerHTML =
      '<div class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">' +
      '<p class="text-xs font-bold uppercase text-amber-800 mb-1">Påminnelse — driftstart punkt 3</p>' +
      '<h4 class="font-heading font-bold text-navy mb-2">Boka review i kalendern</h4>' +
      '<p class="text-sm text-gray-800 mb-3">Efter ägare + datum (punkt 2): boka två fasta pass. Inget annat behövs idag.</p>' +
      '<ul class="text-sm text-navy space-y-2 mb-4 list-none">' +
      '<li><strong>Dag 7</strong> · ' + esc(d7Label) + ' · <span class="text-text-soft">30 min</span><br>' +
      '<span class="text-xs font-mono bg-white/80 px-2 py-0.5 rounded">L1 sanity (observation only)</span></li>' +
      '<li class="pt-1"><strong>Dag 14</strong> · ' + esc(d14Label) + ' · <span class="text-text-soft">45 min</span><br>' +
      '<span class="text-xs font-mono bg-white/80 px-2 py-0.5 rounded">L1 GO/NO-GO + beslut</span></li>' +
      '</ul>' +
      '<label class="flex items-start gap-3 cursor-pointer">' +
      '<input type="checkbox" id="l1CalendarBookedCb" class="mt-1 rounded border-lavender" />' +
      '<span class="text-sm font-semibold text-navy">Jag har bokat dag 7 och dag 14 i kalendern</span>' +
      '</label>' +
      '<p id="l1CalendarReminderStatus" class="text-xs text-text-soft mt-2"></p>' +
      '</div>';

    document.getElementById('l1CalendarBookedCb').addEventListener('change', async function (cbEv) {
      const cb = cbEv.target;
      const status = document.getElementById('l1CalendarReminderStatus');
      if (!cb.checked) return;
      status.textContent = 'Sparar…';
      try {
        localStorage.setItem(calendarReminderStorageKey(releaseId), '1');
        await Auth.api('/api/admin/l1-governance/checklist/' + encodeURIComponent('l1_owners_scheduled'), {
          method: 'PATCH',
          body: JSON.stringify({ checked: true }),
        });
        status.textContent = 'Klart — påminnelsen döljs.';
        await loadL1GovernanceAdmin(true);
      } catch (e) {
        cb.checked = false;
        localStorage.removeItem(calendarReminderStorageKey(releaseId));
        status.textContent = e.message || 'Kunde inte spara.';
      }
    });
  }

  function renderGoLiveMeta(goLive) {
    const mount = document.getElementById('l1GoLiveMeta');
    if (!mount || !goLive) return;

    const owners = goLive.owners || {};
    const milestones = goLive.milestones || {};

    mount.innerHTML =
      '<div class="bg-sky/30 rounded-2xl border border-lavender p-5">' +
      '<h4 class="font-heading font-bold text-navy mb-4">Ägare &amp; review-datum</h4>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div><label class="block text-xs font-bold text-text-soft mb-1" for="l1PrimaryOwner">L1 primär ägare</label>' +
      '<input type="text" id="l1PrimaryOwner" class="w-full border border-lavender rounded-lg px-3 py-2 text-sm" value="' +
      esc(owners.primary || '') + '" placeholder="namn / e-post" /></div>' +
      '<div><label class="block text-xs font-bold text-text-soft mb-1" for="l1BackupOwner">L1 backup</label>' +
      '<input type="text" id="l1BackupOwner" class="w-full border border-lavender rounded-lg px-3 py-2 text-sm" value="' +
      esc(owners.backup || '') + '" placeholder="namn / e-post" /></div>' +
      '<div><label class="block text-xs font-bold text-text-soft mb-1" for="l1ReviewDay7">Dag 7 sanity (kalender)</label>' +
      '<input type="date" id="l1ReviewDay7" class="w-full border border-lavender rounded-lg px-3 py-2 text-sm" value="' +
      esc(toDateInput(milestones.review_day_7_at)) + '" /></div>' +
      '<div><label class="block text-xs font-bold text-text-soft mb-1" for="l1ReviewDay14">Dag 14 första L1-beslut</label>' +
      '<input type="date" id="l1ReviewDay14" class="w-full border border-lavender rounded-lg px-3 py-2 text-sm" value="' +
      esc(toDateInput(milestones.review_day_14_at)) + '" /></div>' +
      '</div>' +
      '<p class="text-xs text-text-soft mt-3">Release start: ' + esc(formatDate(milestones.started_at)) +
      ' · LEARNING dag ' + esc(String(milestones.learning_day || '—')) + '</p>' +
      '<button type="button" id="l1SaveMetaBtn" class="mt-4 px-4 py-2 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy-soft transition-colors">' +
      'Spara ägare &amp; datum</button>' +
      '<p id="l1MetaSaveStatus" class="text-sm mt-2 text-text-soft"></p>' +
      '</div>';

    document.getElementById('l1SaveMetaBtn').addEventListener('click', async function () {
      const status = document.getElementById('l1MetaSaveStatus');
      status.textContent = 'Sparar…';
      try {
        await Auth.api('/api/admin/l1-governance/meta', {
          method: 'PATCH',
          body: JSON.stringify({
            l1_primary_owner: document.getElementById('l1PrimaryOwner').value.trim() || null,
            l1_backup_owner: document.getElementById('l1BackupOwner').value.trim() || null,
            review_day_7_at: document.getElementById('l1ReviewDay7').value || null,
            review_day_14_at: document.getElementById('l1ReviewDay14').value || null,
          }),
        });
        status.textContent = 'Sparat.';
        await loadL1GovernanceAdmin(true);
      } catch (e) {
        status.textContent = e.message || 'Kunde inte spara.';
      }
    });
  }

  function renderMetrics(m) {
    const mount = document.getElementById('l1MetricsRow');
    if (!mount || !m) return;
    const items = [
      ['Coach klick 7d', m.coach_clicks_7d],
      ['Conflict 7d', m.conflicts_7d],
      ['Readiness klick 7d', m.readiness_clicks_7d],
      ['Invite CTA 7d', m.invite_clicks_7d],
      ['Child access 7d', m.child_access_completed_7d],
    ];
    mount.innerHTML = items.map(function (pair) {
      return '<div class="bg-sky/30 rounded-xl p-3 border border-lavender"><p class="text-xs text-text-soft">' +
        esc(pair[0]) + '</p><p class="text-lg font-bold text-navy">' + pair[1] + '</p></div>';
    }).join('');
  }

  function renderLog(decisions) {
    const mount = document.getElementById('l1DecisionLog');
    if (!mount) return;
    if (!decisions || !decisions.length) {
      mount.innerHTML = '<p class="text-text-soft">Inga beslut ännu.</p>';
      return;
    }
    mount.innerHTML = decisions.map(function (d) {
      const when = d.created_at ? new Date(d.created_at).toLocaleString('sv-SE') : '';
      return '<div class="border-b border-lavender pb-2">' +
        '<p class="text-xs text-text-soft">' + esc(when) + ' · ' + esc(d.decision_type) + '</p>' +
        '<code class="text-xs text-navy break-all">' + esc(d.log_line) + '</code></div>';
    }).join('');
  }

  function applyDashboard(data) {
    dashboard = data;
    document.getElementById('l1ReleaseId').textContent = data.release_id;
    document.getElementById('l1LearningDay').textContent = 'd' + data.learning_day;
    document.getElementById('l1State').textContent = data.state;
    const sla = document.getElementById('l1SlaHint');
    if (data.sla?.day_14_due) {
      sla.textContent = 'Dag 14+ — beslut idag';
      sla.className = 'text-sm font-semibold text-red-600 mt-1';
    } else {
      sla.textContent = 'Dag 14 om ' + (14 - data.learning_day) + 'd';
      sla.className = 'text-sm font-semibold text-navy mt-1';
    }
    renderGoLiveReadinessBanner(data.go_live_readiness);
    renderGoLiveChecklist(data.go_live);
    renderGoLiveMeta(data.go_live);
    renderCalendarReminder(data.go_live, data.release_id);
    renderMetrics(data.metrics);
    const gh = data.governance_health;
    const healthEl = document.getElementById('l1GovernanceHealth');
    if (gh && healthEl) {
      healthEl.classList.toggle('hidden', !gh.decision_count);
      document.getElementById('l1FollowRate').textContent =
        gh.follow_recommendation_rate_pct != null ? gh.follow_recommendation_rate_pct + '%' : '—';
      document.getElementById('l1OverrideRate').textContent =
        gh.override_rate_pct != null ? gh.override_rate_pct + '%' : '—';
      document.getElementById('l1AcceptUnknownRate').textContent =
        gh.accept_unknown_rate_pct != null ? gh.accept_unknown_rate_pct + '%' : '—';
      document.getElementById('l1MismatchHint').textContent =
        gh.non_adoption_mismatch_hint ? 'Ja (coach tyst, intent ändå)' : 'Nej';
      const warn = document.getElementById('l1GravityWarning');
      if (gh.gravity_warning === 'recommendation_gravity') {
        warn.textContent = 'Varning: hög recommendation gravity — överväg blind review (dölj ★ en vecka).';
        warn.classList.remove('hidden');
      } else if (gh.gravity_warning === 'accept_unknown_heavy') {
        warn.textContent = 'Varning: ACCEPT-UNKNOWN dominerar — är det aktivt val eller escape hatch?';
        warn.classList.remove('hidden');
      } else if (warn) {
        warn.classList.add('hidden');
      }
    }
    renderQuestions(data.questions || []);
    document.getElementById('l1RecommendationType').textContent = data.recommendation?.decision_type || '—';
    document.getElementById('l1RecommendationReason').textContent = data.recommendation?.reason || '';
    document.getElementById('l1LogPreview').textContent = data.recommendation?.log_line_preview || '—';
    renderLog(data.decisions);
    updatePreview();
  }

  async function loadL1GovernanceAdmin(force) {
    if (loaded && !force) return;
    try {
      const data = await Auth.api('/api/admin/l1-governance');
      applyDashboard(data);
      loaded = true;
    } catch (err) {
      console.error('[L1 governance] load error:', err);
      const status = document.getElementById('l1SaveStatus');
      if (status) status.textContent = 'Kunde inte ladda L1-data.';
    }
  }

  async function saveL1Decision() {
    const status = document.getElementById('l1SaveStatus');
    const confirm = document.getElementById('l1ConfirmRecommendation');
    const override = document.getElementById('l1Override')?.value || '';
    if (!confirm?.checked) {
      status.textContent = 'Kryssa i att du godkänner nästa steg.';
      return;
    }
    status.textContent = 'Sparar…';
    try {
      const body = {
        answers: collectAnswers(),
        owner_label: document.getElementById('l1OwnerLabel')?.value || '',
        confirm_recommendation: !override,
        override_decision: override || undefined,
      };
      const res = await Auth.api('/api/admin/l1-governance/decision', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      status.textContent = 'Sparat: ' + (res.log_line || res.decision?.log_line || '');
      confirm.checked = false;
      await loadL1GovernanceAdmin(true);
    } catch (err) {
      console.error('[L1 governance] save error:', err);
      status.textContent = err.message || 'Kunde inte spara.';
    }
  }

  async function onRefreshClick() {
    const btn = document.getElementById('l1GovernanceRefreshBtn');
    const status = document.getElementById('l1SaveStatus');
    const label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Uppdaterar…';
    }
    if (status) status.textContent = 'Hämtar L1-data…';
    try {
      await loadL1GovernanceAdmin(true);
      if (status) {
        status.textContent = 'Uppdaterad ' + new Date().toLocaleTimeString('sv-SE');
        status.className = 'text-sm mt-3 text-green-700';
      }
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Kunde inte uppdatera.';
        status.className = 'text-sm mt-3 text-red-600';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label || '↺ Uppdatera';
      }
    }
  }

  /** Delegation on section — survives re-render; direct bind missed refresh on some loads. */
  function bindSectionControls() {
    const section = document.getElementById('l1GovernanceSection');
    if (!section || section.dataset.l1ControlsBound === '1') return;
    section.dataset.l1ControlsBound = '1';
    section.addEventListener('click', function (e) {
      if (e.target.closest('#l1GovernanceRefreshBtn')) {
        e.preventDefault();
        onRefreshClick();
        return;
      }
      if (e.target.closest('#l1SaveDecisionBtn')) {
        e.preventDefault();
        saveL1Decision();
      }
    });
    section.addEventListener('change', function (e) {
      if (e.target.id === 'l1Override' || e.target.id === 'l1EdgeCase') updatePreview();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSectionControls);
  } else {
    bindSectionControls();
  }

  window.loadL1GovernanceAdmin = loadL1GovernanceAdmin;
})();
