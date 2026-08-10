'use strict';

const db = require('./db');
const deviceDb = require('../../db/family-trusted-device');
const { getChildrenForParent } = require('../../db/parent-access');

function viewerModeFromBinding(binding) {
  if (binding.mode === 'parent') return 'parent';
  if (binding.mode === 'trusted_device') return 'trusted_device';
  return 'child_session';
}

function childDisplayRow(row) {
  return {
    id: row.id,
    display_name: row.name,
    emoji: row.emoji || '⭐',
  };
}

function widgetReconfigureMessage() {
  const appName = 'Min' + ' Stj' + '\u00e4rndag';
  return `Öppna ${appName} för att konfigurera`;
}

/**
 * Server-verified children the binding may present in a family widget.
 */
async function listAllowedChildrenForBinding(binding) {
  if (binding.mode === 'child_session') {
    const childRes = await db.query(
      'SELECT id, name, emoji FROM child WHERE id = $1 AND family_id = $2',
      [binding.child_id, binding.family_id]
    );
    const row = childRes.rows[0];
    return row ? [childDisplayRow(row)] : [];
  }

  if (binding.mode === 'parent') {
    const children = await getChildrenForParent(binding.parent_id, { allowedRoles: ['primary', 'shared'] });
    return children.map(childDisplayRow);
  }

  if (binding.mode === 'trusted_device') {
    const row = await deviceDb.findById(binding.device_id);
    if (!row) return [];
    if (row.device_mode === 'child') {
      const boundId = row.default_child_id || row.last_active_child_id;
      const childRes = await db.query(
        'SELECT id, name, emoji FROM child WHERE id = $1 AND family_id = $2',
        [boundId, binding.family_id]
      );
      const rowChild = childRes.rows[0];
      return rowChild ? [childDisplayRow(rowChild)] : [];
    }
    const children = await getChildrenForParent(row.created_by_parent_id, { allowedRoles: ['primary', 'shared'] });
    return children.map(childDisplayRow);
  }

  return [];
}

async function buildWidgetContext(binding, activeChildId) {
  const boundChildId = binding.child_id || activeChildId;
  const allowed = await listAllowedChildrenForBinding(binding);
  let active = allowed.find((c) => c.id === boundChildId) || null;
  if (!active && boundChildId) {
    const childRes = await db.query(
      'SELECT id, name, emoji FROM child WHERE id = $1 AND family_id = $2',
      [boundChildId, binding.family_id]
    );
    if (childRes.rows[0]) {
      active = childDisplayRow(childRes.rows[0]);
    }
  }
  let canSwitch = binding.mode === 'parent' && allowed.length > 1;
  if (binding.mode === 'trusted_device' && allowed.length > 1) {
    const row = await deviceDb.findById(binding.device_id);
    canSwitch = Boolean(row && row.device_mode === 'shared' && !row.revoked_at);
  }
  const widgetProfile = binding.mode === 'child_session' || allowed.length <= 1
    ? 'personal'
    : 'family';
  const payload = {
    viewer_mode: viewerModeFromBinding(binding),
    active_child: active,
    allowed_children: allowed,
    can_switch_children: canSwitch,
    widget_profile: widgetProfile,
    installation_id: binding.installation_id || null,
    bound_child_id: boundChildId,
  };
  if (!active && boundChildId) {
    payload.status = 'needs_reconfigure';
    payload.reconfigure_message = widgetReconfigureMessage();
  }
  return payload;
}

module.exports = {
  viewerModeFromBinding,
  listAllowedChildrenForBinding,
  buildWidgetContext,
  widgetReconfigureMessage,
};
