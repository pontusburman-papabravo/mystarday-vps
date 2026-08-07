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
    const children = await getChildrenForParent(row.created_by_parent_id, { allowedRoles: ['primary', 'shared'] });
    return children.map(childDisplayRow);
  }

  return [];
}

async function buildWidgetContext(binding, activeChildId) {
  const allowed = await listAllowedChildrenForBinding(binding);
  let active = allowed.find((c) => c.id === activeChildId) || null;
  if (!active && allowed.length > 0) {
    active = allowed[0];
  }
  const canSwitch = binding.mode !== 'child_session' && allowed.length > 1;
  const widgetProfile = binding.mode === 'child_session' || allowed.length <= 1
    ? 'personal'
    : 'family';
  return {
    viewer_mode: viewerModeFromBinding(binding),
    active_child: active,
    allowed_children: allowed,
    can_switch_children: canSwitch,
    widget_profile: widgetProfile,
  };
}

module.exports = {
  viewerModeFromBinding,
  listAllowedChildrenForBinding,
  buildWidgetContext,
};
