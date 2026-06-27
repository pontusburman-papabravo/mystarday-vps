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

  function computeClientRecommendation(data) {
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

  document.addEventListener('DOMContentLoaded', function () {
    const refresh = document.getElementById('l1GovernanceRefreshBtn');
    const save = document.getElementById('l1SaveDecisionBtn');
    const override = document.getElementById('l1Override');
    const edge = document.getElementById('l1EdgeCase');
    if (refresh) refresh.addEventListener('click', function () { loadL1GovernanceAdmin(true); });
    if (save) save.addEventListener('click', saveL1Decision);
    if (override) override.addEventListener('change', updatePreview);
    if (edge) edge.addEventListener('change', updatePreview);
  });

  window.loadL1GovernanceAdmin = loadL1GovernanceAdmin;
})();
