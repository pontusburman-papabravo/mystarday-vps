/**
 * Browser copy of src/lib/family-people-access.js (D2 presentation only).
 */
(function (global) {
  'use strict';

  function peopleLoadOutcome(resOk, hasItems) {
    if (resOk === null) return 'loading';
    if (resOk === false) return 'error';
    return hasItems ? 'ok_items' : 'ok_empty';
  }

  function viewerHasPrimaryRole(scopedChildren) {
    return (scopedChildren || []).some(function (c) { return c && c.role === 'primary'; });
  }

  function canEditMemberAccess(opts) {
    return !!(opts && opts.viewerHasPrimary);
  }

  function canDeleteMember(opts) {
    opts = opts || {};
    if (opts.isSelf || opts.isOnlyAdult || !opts.viewerHasPrimary) return false;
    if (opts.targetIsAdmin && !opts.viewerIsAdmin) return false;
    return true;
  }

  function linkedChildIds(parent) {
    if (!parent) return [];
    if (Array.isArray(parent.linked_child_ids) && parent.linked_child_ids.length) {
      return parent.linked_child_ids.map(String);
    }
    return (parent.linked_children || []).map(function (row) {
      return String(row.child_id || row.id);
    });
  }

  function visibleAccessChildren(scopedChildren, parent) {
    const linked = {};
    linkedChildIds(parent).forEach(function (id) { linked[id] = true; });
    const roleById = {};
    (parent && parent.linked_children ? parent.linked_children : []).forEach(function (row) {
      const id = String(row.child_id || row.id);
      if (row.role) roleById[id] = row.role;
    });
    return (scopedChildren || []).filter(function (c) { return linked[String(c.id)]; })
      .map(function (c) {
        return { id: c.id, name: c.name, role: roleById[String(c.id)] || c.role || null };
      });
  }

  function accessPresentation(opts) {
    opts = opts || {};
    const visible = visibleAccessChildren(opts.scopedChildren, opts.parent);
    if (opts.canEdit) return { kind: 'edit', children: opts.scopedChildren || [], visible: visible };
    if (!visible.length) return { kind: 'readonly-none', children: [], visible: visible };
    return { kind: 'readonly-names', children: visible, visible: visible };
  }

  function inviteAccessCaption(inviteChildIds, scopedChildren) {
    const ids = Array.isArray(inviteChildIds) ? inviteChildIds.map(String) : [];
    if (!ids.length) return { kind: 'unspecified', names: [] };
    const visible = (scopedChildren || []).filter(function (c) {
      return ids.indexOf(String(c.id)) >= 0;
    });
    if (!visible.length) return { kind: 'child_specific_hidden', names: [] };
    return { kind: 'child_specific', names: visible.map(function (c) { return c.name; }) };
  }

  function shouldShowPeopleSections(outcome) {
    return outcome === 'ok_items' || outcome === 'ok_empty';
  }

  function settingsPeopleEntryVisible(opts) {
    return !opts || opts.accountType !== 'educator';
  }

  global.FamilyPeopleAccess = {
    peopleLoadOutcome: peopleLoadOutcome,
    viewerHasPrimaryRole: viewerHasPrimaryRole,
    canEditMemberAccess: canEditMemberAccess,
    canDeleteMember: canDeleteMember,
    linkedChildIds: linkedChildIds,
    visibleAccessChildren: visibleAccessChildren,
    accessPresentation: accessPresentation,
    inviteAccessCaption: inviteAccessCaption,
    shouldShowPeopleSections: shouldShowPeopleSections,
    settingsPeopleEntryVisible: settingsPeopleEntryVisible,
  };
})(typeof window !== 'undefined' ? window : global);
