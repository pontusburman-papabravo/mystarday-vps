'use strict';

/**
 * D2 — Familj people/access presentation.
 * Server authz (P0 deletion / member-children) stays authoritative.
 * This only decides what a viewer may be shown.
 */

const ACTIVE_FAMILY_ROLES = ['primary', 'shared'];
const PEDAGOG_ROLE = 'pedagog';

function peopleLoadOutcome(resOk, hasItems) {
  if (resOk === null) return 'loading';
  if (resOk === false) return 'error';
  return hasItems ? 'ok_items' : 'ok_empty';
}

function peopleTreatAsEmpty(outcome) {
  return outcome === 'ok_empty';
}

function viewerHasPrimaryRole(scopedChildren) {
  return (scopedChildren || []).some((c) => c && c.role === 'primary');
}

/**
 * Matches PUT /members/:id/children entry for editing *others*.
 * Self-edit is allowed on the server; UI stays conservative (primary only).
 */
function canEditMemberAccess({ viewerHasPrimary }) {
  return !!viewerHasPrimary;
}

/**
 * Matches DELETE /members/:id: primary gate + last-adult + cannot remove admin unless admin.
 */
function canDeleteMember({
  viewerHasPrimary,
  viewerIsAdmin,
  isSelf,
  isOnlyAdult,
  targetIsAdmin,
}) {
  if (isSelf || isOnlyAdult || !viewerHasPrimary) return false;
  if (targetIsAdmin && !viewerIsAdmin) return false;
  return true;
}

function linkedChildIds(parent) {
  if (!parent) return [];
  if (Array.isArray(parent.linked_child_ids) && parent.linked_child_ids.length) {
    return parent.linked_child_ids.map(String);
  }
  return (parent.linked_children || []).map((row) => String(row.child_id || row.id));
}

function visibleAccessChildren(scopedChildren, parent) {
  const allow = new Set((scopedChildren || []).map((c) => String(c.id)));
  const linked = new Set(linkedChildIds(parent));
  const roleById = {};
  (parent && parent.linked_children ? parent.linked_children : []).forEach((row) => {
    const id = String(row.child_id || row.id);
    if (row.role) roleById[id] = row.role;
  });
  return (scopedChildren || []).filter((c) => linked.has(String(c.id)) && allow.has(String(c.id)))
    .map((c) => ({
      id: c.id,
      name: c.name,
      role: roleById[String(c.id)] || c.role || null,
    }));
}

function accessPresentation({ scopedChildren, parent, canEdit }) {
  const visible = visibleAccessChildren(scopedChildren, parent);
  if (canEdit) {
    return { kind: 'edit', children: scopedChildren || [], visible };
  }
  if (!visible.length) {
    return { kind: 'readonly-none', children: [], visible };
  }
  return { kind: 'readonly-names', children: visible, visible };
}

function inviteAccessCaption(inviteChildIds, scopedChildren) {
  const ids = Array.isArray(inviteChildIds) ? inviteChildIds.map(String) : [];
  if (!ids.length) return { kind: 'unspecified', names: [] };
  const visible = (scopedChildren || []).filter((c) => ids.includes(String(c.id)));
  if (!visible.length) return { kind: 'child_specific_hidden', names: [] };
  return { kind: 'child_specific', names: visible.map((c) => c.name) };
}

function activeFamilyLinks(links) {
  return (links || []).filter((row) => {
    if (row.revoked_at) return false;
    return ACTIVE_FAMILY_ROLES.includes(row.role) || row.role === PEDAGOG_ROLE;
  });
}

function scopePedagogsToViewer(links, scopedChildIds) {
  const allow = new Set((scopedChildIds || []).map(String));
  const byParent = {};
  activeFamilyLinks(links).forEach((link) => {
    if (link.role !== PEDAGOG_ROLE) return;
    const childId = String(link.child_id);
    if (!allow.has(childId)) return;
    const key = String(link.parent_id);
    if (!byParent[key]) {
      byParent[key] = {
        parentId: link.parent_id,
        name: link.parent_name || link.name || null,
        email: link.email || null,
        childIds: [],
        role: PEDAGOG_ROLE,
      };
    }
    if (!byParent[key].childIds.includes(link.child_id)) {
      byParent[key].childIds.push(link.child_id);
    }
  });
  return Object.values(byParent);
}

function scopeInvitesToViewer(invites, scopedChildIds) {
  const allow = new Set((scopedChildIds || []).map(String));
  return (invites || []).filter((inv) => {
    const ids = Array.isArray(inv.child_ids || inv.childIds) ? (inv.child_ids || inv.childIds) : [];
    if (!ids.length) return true;
    return ids.some((id) => allow.has(String(id)));
  }).map((inv) => {
    const ids = Array.isArray(inv.child_ids || inv.childIds) ? (inv.child_ids || inv.childIds) : [];
    return {
      ...inv,
      childIds: ids.filter((id) => allow.has(String(id))),
    };
  });
}

function shouldShowPeopleSections(outcome) {
  return outcome === 'ok_items' || outcome === 'ok_empty';
}

function settingsPeopleEntryVisible({ accountType }) {
  return accountType !== 'educator';
}

module.exports = {
  ACTIVE_FAMILY_ROLES,
  PEDAGOG_ROLE,
  peopleLoadOutcome,
  peopleTreatAsEmpty,
  viewerHasPrimaryRole,
  canEditMemberAccess,
  canDeleteMember,
  linkedChildIds,
  visibleAccessChildren,
  accessPresentation,
  inviteAccessCaption,
  activeFamilyLinks,
  scopePedagogsToViewer,
  scopeInvitesToViewer,
  shouldShowPeopleSections,
  settingsPeopleEntryVisible,
};
