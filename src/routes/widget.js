'use strict';

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const trusted = require('../lib/trusted-device');
const {
  resolveBindingFromTrustedDevice,
  resolveBindingFromParent,
  verifyBindingToken,
  assertBindingStillValid,
} = require('../lib/widget-binding');
const { isNativeWidgetEnabled, isWidgetCompletionEnabled } = require('../lib/widget-flags');
const { resolveWidgetNextAction } = require('../lib/widget-next-activity');
const { verifyInstanceToken } = require('../lib/widget-instance-token');
const { completeChildDailyLogItem } = require('../lib/widget-child-complete');
const idempotencyDb = require('../../db/widget-idempotency');
const analytics = require('../../db/analytics');

const router = express.Router();

function extractBindingToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return req.headers['x-widget-binding'] || null;
}

async function requireWidgetBinding(req, res, next) {
  const raw = extractBindingToken(req);
  const verified = verifyBindingToken(raw);
  if (!verified.ok) {
    return res.status(401).json({ status: verified.code || 'reauth_required' });
  }
  const valid = await assertBindingStillValid(verified.binding);
  if (!valid.ok) {
    return res.status(403).json({ status: valid.code || 'device_revoked' });
  }
  const enabled = await isNativeWidgetEnabled(valid.familyId);
  if (!enabled) {
    return res.status(403).json({ status: 'offline_unavailable' });
  }
  req.widgetBinding = verified.binding;
  req.widgetFamilyId = valid.familyId;
  req.widgetChildId = valid.childId;
  next();
}

function completionSourceForPlatform(platform) {
  return platform === 'android' ? 'widget_android' : 'widget_ios';
}

// ─── POST /api/widget/bindings ─────────────────────────────
router.post('/bindings', optionalAuth, async (req, res, next) => {
  try {
    const { installation_id: installationId, child_id: childId, platform } = req.body || {};
    const rawDevice = req.cookies?.[trusted.COOKIE_NAME];

    if (req.user?.type === 'child') {
      const familyId = req.user.familyId;
      const enabled = await isNativeWidgetEnabled(familyId);
      if (!enabled) {
        return res.status(403).json({ status: 'offline_unavailable' });
      }
      const inst = String(installationId || '').trim();
      if (!inst) {
        return res.status(400).json({ error: 'installation_id krävs' });
      }
      const { issueBindingToken } = require('../lib/widget-binding');
      const token = issueBindingToken({
        mode: 'child_session',
        family_id: familyId,
        child_id: req.user.id,
        installation_id: inst,
        platform: platform === 'android' ? 'android' : 'ios',
      });
      analytics.track(familyId, 'widget_configured', {
        platform: platform === 'android' ? 'android' : 'ios',
        device_mode: 'child_session',
        allowed_children_bucket: '1',
      });
      return res.status(201).json({ binding_token: token, child_id: req.user.id });
    }

    if (req.user?.type === 'parent' && childId) {
      const enabled = await isNativeWidgetEnabled(req.user.familyId);
      if (!enabled) {
        return res.status(403).json({ status: 'offline_unavailable' });
      }
      const result = await resolveBindingFromParent(req.user.id, req.user.familyId, {
        childId,
        installationId,
        platform,
      });
      if (!result.ok) {
        return res.status(403).json({ status: result.code });
      }
      analytics.track(req.user.familyId, 'widget_configured', {
        platform: result.platform,
        device_mode: 'parent',
        allowed_children_bucket: '1',
      });
      return res.status(201).json({
        binding_token: result.binding_token,
        child_id: result.child_id,
      });
    }

    if (rawDevice) {
      const result = await resolveBindingFromTrustedDevice(rawDevice, {
        childId,
        installationId,
        platform,
      });
      if (!result.ok) {
        const status = result.code === 'needs_child_selection' ? 409 : 403;
        return res.status(status).json({ status: result.code });
      }
      const enabled = await isNativeWidgetEnabled(result.family_id);
      if (!enabled) {
        return res.status(403).json({ status: 'offline_unavailable' });
      }
      analytics.track(result.family_id, 'widget_configured', {
        platform: result.platform,
        device_mode: 'trusted_device',
        allowed_children_bucket: '1',
      });
      return res.status(201).json({
        binding_token: result.binding_token,
        child_id: result.child_id,
      });
    }

    return res.status(401).json({ status: 'reauth_required' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/widget/next-action ─────────────────────────
router.get('/next-action', requireWidgetBinding, async (req, res, next) => {
  try {
    const payload = await resolveWidgetNextAction(req.widgetChildId);
    analytics.track(req.widgetFamilyId, 'widget_rendered', {
      platform: req.widgetBinding.platform === 'android' ? 'android' : 'ios',
      outcome: payload.status,
    });
    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/widget/complete-action ────────────────────
router.post('/complete-action', requireWidgetBinding, async (req, res, next) => {
  try {
    const completionEnabled = await isWidgetCompletionEnabled(req.widgetFamilyId);
    if (!completionEnabled) {
      return res.status(403).json({ status: 'offline_unavailable' });
    }

    const { instance_token: instanceToken, idempotency_key: idempotencyKey } = req.body || {};
    if (!instanceToken || !idempotencyKey || String(idempotencyKey).length > 128) {
      return res.status(400).json({ error: 'instance_token och idempotency_key krävs' });
    }

    const installationId = req.widgetBinding.installation_id;
    const cached = await idempotencyDb.getIdempotentResponse(installationId, idempotencyKey);
    if (cached) {
      return res.json(cached);
    }

    const verified = verifyInstanceToken(instanceToken, req.widgetChildId);
    if (!verified.ok) {
      return res.status(400).json({ status: verified.code });
    }

    const itemRow = await require('../lib/db').query(
      `SELECT dli.completed FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [verified.dailyLogItemId, req.widgetChildId]
    );
    const alreadyDone = itemRow.rows[0]?.completed === true;

    const nextBefore = await resolveWidgetNextAction(req.widgetChildId);
    if (
      !alreadyDone
      && nextBefore.status === 'ready'
      && nextBefore.activity?.instance_token !== instanceToken
    ) {
      return res.status(409).json({
        status: 'stale_activity',
        next: nextBefore,
      });
    }

    if (
      !alreadyDone
      && nextBefore.status === 'ready'
      && nextBefore.activity?.capability === 'open_app'
    ) {
      return res.status(400).json({ status: 'open_app_required', next: nextBefore });
    }

    analytics.track(req.widgetFamilyId, 'widget_completion_started', {
      platform: req.widgetBinding.platform === 'android' ? 'android' : 'ios',
    });

    const source = completionSourceForPlatform(req.widgetBinding.platform);
    const result = await completeChildDailyLogItem({
      childId: req.widgetChildId,
      familyId: req.widgetFamilyId,
      dailyLogItemId: verified.dailyLogItemId,
      completionSource: source,
    });

    if (result.status === 'not_found') {
      return res.status(404).json({ status: 'reauth_required' });
    }
    if (result.status === 'paused') {
      return res.status(400).json({ status: 'nothing_now' });
    }

    const starsAdded = result.justCompleted ? (result.star_value || 0) : 0;
    const nextAfter = await resolveWidgetNextAction(req.widgetChildId);

    const responseBody = {
      status: result.status === 'completed' ? 'completed' : 'already_completed',
      completed: {
        stars_added: starsAdded,
      },
      reward: {
        stars_added: starsAdded,
      },
      next: nextAfter,
    };

    await idempotencyDb.storeIdempotentResponse(
      installationId,
      idempotencyKey,
      verified.dailyLogItemId,
      responseBody
    );

    analytics.track(req.widgetFamilyId, 'widget_completion_succeeded', {
      platform: req.widgetBinding.platform === 'android' ? 'android' : 'ios',
      outcome: responseBody.status,
    });

    return res.json(responseBody);
  } catch (err) {
    analytics.track(req.widgetFamilyId, 'widget_completion_failed', {
      platform: req.widgetBinding?.platform === 'android' ? 'android' : 'ios',
      outcome: 'error',
    });
    next(err);
  }
});

module.exports = router;
