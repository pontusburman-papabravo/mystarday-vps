'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const access = require('../src/lib/family-people-access');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const CHILD_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CHILD_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PED_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('D2 Familj people/access honesty', () => {
  describe('adversarial presentation', () => {
    it('does not treat error or loading as empty', () => {
      assert.equal(access.peopleLoadOutcome(null, false), 'loading');
      assert.equal(access.peopleLoadOutcome(false, false), 'error');
      assert.equal(access.peopleLoadOutcome(true, false), 'ok_empty');
      assert.equal(access.peopleLoadOutcome(true, true), 'ok_items');
      assert.equal(access.peopleTreatAsEmpty('error'), false);
      assert.equal(access.peopleTreatAsEmpty('loading'), false);
      assert.equal(access.shouldShowPeopleSections('error'), false);
      assert.equal(access.shouldShowPeopleSections('ok_empty'), true);
    });

    it('sibling-only viewer sees only overlapping child access, never family-wide', () => {
      const scoped = [{ id: CHILD_A, name: 'Astrid', role: 'shared' }];
      const parent = {
        linked_child_ids: [CHILD_A, CHILD_B],
        linked_children: [
          { child_id: CHILD_A, role: 'shared' },
          { child_id: CHILD_B, role: 'primary' },
        ],
      };
      const visible = access.visibleAccessChildren(scoped, parent);
      assert.deepEqual(visible.map((c) => c.id), [CHILD_A]);
      assert.equal(visible[0].role, 'shared');
      const shown = access.accessPresentation({ scopedChildren: scoped, parent, canEdit: false });
      assert.equal(shown.kind, 'readonly-names');
      assert.equal(shown.visible.length, 1);
    });

    it('revoked or sibling-only-hidden links are not shown as active names', () => {
      const scoped = [{ id: CHILD_A, name: 'Astrid', role: 'shared' }];
      const parent = {
        linked_child_ids: [CHILD_B],
        linked_children: [{ child_id: CHILD_B, role: 'shared' }],
      };
      const shown = access.accessPresentation({ scopedChildren: scoped, parent, canEdit: false });
      assert.equal(shown.kind, 'readonly-none');
    });

    it('pending invite with hidden child ids is child-specific, not family-wide', () => {
      const scoped = [{ id: CHILD_A, name: 'Astrid' }];
      assert.equal(access.inviteAccessCaption([CHILD_B], scoped).kind, 'child_specific_hidden');
      assert.equal(access.inviteAccessCaption([CHILD_A], scoped).kind, 'child_specific');
      assert.equal(access.inviteAccessCaption([], scoped).kind, 'unspecified');
    });

    it('actions follow primary-parent server gate, not JWT admin alone', () => {
      assert.equal(access.canEditMemberAccess({ viewerHasPrimary: false }), false);
      assert.equal(access.canEditMemberAccess({ viewerHasPrimary: true }), true);
      assert.equal(access.canDeleteMember({
        viewerHasPrimary: true,
        viewerIsAdmin: false,
        isSelf: false,
        isOnlyAdult: false,
        targetIsAdmin: true,
      }), false);
      assert.equal(access.canDeleteMember({
        viewerHasPrimary: true,
        viewerIsAdmin: true,
        isSelf: false,
        isOnlyAdult: false,
        targetIsAdmin: false,
      }), true);
      assert.equal(access.canDeleteMember({
        viewerHasPrimary: false,
        viewerIsAdmin: true,
        isSelf: false,
        isOnlyAdult: false,
        targetIsAdmin: false,
      }), false);
    });

    it('cross-family pedagogs are scoped to viewer children; revoked pedagogs stay out', () => {
      const links = [
        {
          parent_id: PED_ID,
          parent_name: 'Kim',
          email: 'kim@school.example',
          child_id: CHILD_A,
          role: 'pedagog',
          revoked_at: null,
        },
        {
          parent_id: PED_ID,
          parent_name: 'Kim',
          email: 'kim@school.example',
          child_id: CHILD_B,
          role: 'pedagog',
          revoked_at: null,
        },
        {
          parent_id: 'dead',
          parent_name: 'Old',
          child_id: CHILD_A,
          role: 'pedagog',
          revoked_at: '2026-01-01',
        },
      ];
      const scoped = access.scopePedagogsToViewer(links, [CHILD_A]);
      assert.equal(scoped.length, 1);
      assert.deepEqual(scoped[0].childIds, [CHILD_A]);
      assert.equal(access.scopePedagogsToViewer(links, [CHILD_B])[0].childIds.length, 1);
      assert.deepEqual(access.scopePedagogsToViewer(links, []), []);
    });

    it('pending pedagog invites without visible children are dropped', () => {
      const invites = [
        { id: 1, email: 'a@b.c', child_ids: [CHILD_B] },
        { id: 2, email: 'c@d.e', child_ids: [CHILD_A, CHILD_B] },
      ];
      const shown = access.scopeInvitesToViewer(invites, [CHILD_A]);
      assert.equal(shown.length, 1);
      assert.equal(shown[0].id, 2);
      assert.deepEqual(shown[0].childIds, [CHILD_A]);
      assert.deepEqual(shown[0].child_ids, [CHILD_A]);
      assert.ok(!JSON.stringify(shown).includes(CHILD_B));
    });

    it('family-wide empty child_ids stay visible; hidden-only invites are omitted', () => {
      const invites = [
        { id: 'ia', email: 'hidden@example.com', child_ids: [CHILD_B] },
        { id: 'ifamily', email: 'family@example.com', child_ids: [] },
      ];
      const shown = access.scopeInvitesToViewer(invites, [CHILD_A]);
      assert.deepEqual(shown.map((inv) => inv.id), ['ifamily']);
      assert.ok(!JSON.stringify(shown).includes('hidden@example.com'));
      assert.ok(!JSON.stringify(shown).includes(CHILD_B));
    });

    it('scopeParentLinksToViewer strips hidden child ids from family adults', () => {
      const parent = {
        id: 'p1',
        name: 'Anna',
        linked_child_ids: [CHILD_A, CHILD_B],
        linked_children: [
          { child_id: CHILD_A, role: 'primary' },
          { child_id: CHILD_B, role: 'shared' },
        ],
      };
      const scoped = access.scopeParentLinksToViewer(parent, [CHILD_B]);
      assert.deepEqual(scoped.linked_child_ids, [CHILD_B]);
      assert.deepEqual(scoped.linked_children.map((c) => c.child_id), [CHILD_B]);
      assert.ok(!JSON.stringify(scoped).includes(CHILD_A));
    });
  });

  it('GET /api/family stays caller-scoped and includes role-aware links', () => {
    const core = read('src/routes/family/core.js');
    assert.match(core, /allChildren: childrenWithPin/);
    assert.match(core, /getChildrenForParent/);
    assert.match(core, /revoked_at IS NULL/);
    assert.match(core, /linked_children/);
    assert.match(core, /viewer_has_primary/);
    assert.match(core, /scopePedagogsToViewer/);
    assert.match(core, /scopeInvitesToViewer/);
    assert.match(core, /scopeParentLinksToViewer/);
    assert.match(core, /pendingInvites:\s*scopeInvitesToViewer\(invitesResult\.rows/);
    assert.match(core, /child_ids/);
    assert.doesNotMatch(core, /FROM child WHERE family_id = \$1 ORDER BY sort_order ASC, created_at ASC/);
  });

  it('Familj UI keeps error off empty people and uses the access helper', () => {
    const src = read('public/js/family.js');
    assert.doesNotMatch(src, /allChildren \|\| \[\]/);
    assert.match(src, /familyData\?\.children \|\| \[\]/);
    assert.match(src, /data-access-readonly/);
    assert.match(src, /data-invite-state="pending"/);
    assert.match(src, /setFamilyPeopleSurface\('error'\)/);
    assert.match(src, /FamilyPeopleAccess/);
    assert.match(src, /viewer_has_primary/);
    assert.match(src, /data-people-role="pedagog"/);
    const html = read('public/family.html');
    assert.match(html, /pendingInvitesSection/);
    assert.match(html, /familyAdultsSection/);
    assert.match(html, /familyPedagogPeople/);
    assert.match(html, /family-people-access\.js/);
  });

  it('pedagog interest error is not hidden as empty', () => {
    const hub = read('public/js/family-hub.js');
    assert.match(hub, /data-pedagog-interest-state/);
    assert.match(hub, /Kunde inte ladda pedagogsamarbete/);
  });
});
