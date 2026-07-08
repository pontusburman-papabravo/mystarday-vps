/**
 * child-samling-memory.js — Min samling minnen (Fas D, gate: barnets_samling).
 * Pure helpers: reward memories + client diplomas. No API calls.
 */
(function () {
  'use strict';

  function lifetimeStars(universe) {
    const raw = universe && universe.stats && universe.stats.lifetime_stars;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function currentStreak(universe) {
    const raw = universe && universe.stats && universe.stats.streak;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function achievementCount(universe) {
    return ((universe && universe.achievements) || []).length;
  }

  /**
   * Completed reward memories from Skattkammaren redemptions (approved/auto).
   * Does not use spendable saldo from rewards API.
   */
  function rewardMemories(redemptions) {
    return (redemptions || [])
      .filter(function (r) {
        return r.status === 'approved' || r.status === 'auto';
      })
      .sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      })
      .slice(0, 12)
      .map(function (r) {
        const stars = Number(r.star_cost);
        return {
          reward_name: r.reward_name,
          reward_icon: r.reward_icon,
          created_at: r.created_at,
          stars_saved: Number.isFinite(stars) && stars > 0 ? Math.floor(stars) : 0,
        };
      });
  }

  const DIPLOMA_DEFS = [
    {
      id: 'trygg_start',
      emoji: '🌱',
      title: 'Trygg start',
      subtitle: 'Du fick ditt första trofé',
      isEarned: function (universe) {
        return achievementCount(universe) >= 1;
      },
    },
    {
      id: 'first_reward',
      emoji: '🎁',
      title: 'Jag klarade det',
      subtitle: 'Du sparade ihop till en belöning',
      isEarned: function (universe, memories) {
        return memories.length >= 1;
      },
    },
    {
      id: 'star_25',
      emoji: '⭐',
      title: 'Stjärnsamlare',
      subtitle: '25 stjärnor totalt',
      isEarned: function (universe) {
        return lifetimeStars(universe) >= 25;
      },
    },
    {
      id: 'star_100',
      emoji: '🌟',
      title: 'Superstjärna',
      subtitle: '100 stjärnor totalt',
      isEarned: function (universe) {
        return lifetimeStars(universe) >= 100;
      },
    },
    {
      id: 'streak_7',
      emoji: '🔥',
      title: 'Rutinhjälte',
      subtitle: '7 dagar i rad',
      isEarned: function (universe) {
        return currentStreak(universe) >= 7;
      },
    },
  ];

  function earnedDiplomas(universe, memories) {
    return DIPLOMA_DEFS.filter(function (d) {
      return d.isEarned(universe, memories);
    });
  }

  window.ChildSamlingMemory = {
    rewardMemories: rewardMemories,
    earnedDiplomas: earnedDiplomas,
    DIPLOMA_DEFS: DIPLOMA_DEFS,
  };
})();
