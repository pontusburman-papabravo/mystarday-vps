/**
 * Reward row actions on /rewards.
 * Status is reward.is_active — the same flag the child treasure already filters on.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RewardRowActions = api;
})(typeof window !== 'undefined' ? window : global, function () {
  'use strict';

  function isRewardActive(reward) {
    return !reward || reward.is_active !== false;
  }

  function toggleActionKey(reward) {
    return isRewardActive(reward)
      ? 'library.rewards.deactivateAction'
      : 'library.rewards.activateAction';
  }

  function inactiveLabelKey() {
    return 'library.rewards.deactivatedLabel';
  }

  function countOf(reward, field) {
    const n = Number(reward && reward[field]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function deleteConfirm(reward) {
    const redemptions = countOf(reward, 'redemption_count');
    const goals = countOf(reward, 'goal_count');
    if (redemptions > 0) {
      return {
        titleKey: 'library.rewards.deleteTitle',
        bodyKey: 'library.rewards.deleteKeptHistory',
        params: { count: redemptions },
        permanent: false,
      };
    }
    if (goals > 0) {
      return {
        titleKey: 'library.rewards.deleteTitle',
        bodyKey: 'library.rewards.deleteWithGoals',
        params: { count: goals },
        permanent: true,
      };
    }
    return {
      titleKey: 'library.rewards.deleteTitle',
      bodyKey: 'library.rewards.deleteBody',
      params: {},
      permanent: true,
    };
  }

  function listAfterToggle(rewards, id, isActive) {
    return (rewards || []).map(function (reward) {
      if (String(reward.id) !== String(id)) return reward;
      return Object.assign({}, reward, { is_active: isActive === true });
    });
  }

  function listAfterDelete(rewards, id, body) {
    if (body && body.reward_deleted === true) {
      return (rewards || []).filter(function (reward) {
        return String(reward.id) !== String(id);
      });
    }
    return listAfterToggle(rewards, id, false);
  }

  return {
    isRewardActive: isRewardActive,
    toggleActionKey: toggleActionKey,
    inactiveLabelKey: inactiveLabelKey,
    deleteConfirm: deleteConfirm,
    listAfterToggle: listAfterToggle,
    listAfterDelete: listAfterDelete,
  };
});
