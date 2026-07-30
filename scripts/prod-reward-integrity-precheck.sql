\echo '=== PRECHECK 1: status distribution (expect only pending/approved/denied/auto) ==='
SELECT status, COUNT(*)
FROM reward_redemption
GROUP BY status
ORDER BY status;

\echo '=== PRECHECK 2: negative star_cost (expect 0 rows) ==='
SELECT id, reward_id, child_id, star_cost, status
FROM reward_redemption
WHERE star_cost < 0;

\echo '=== PRECHECK 3 (informational): multiple approved per reward_id (valid for repeatable rewards) ==='
SELECT reward_id, COUNT(*) AS approved_count
FROM reward_redemption
WHERE status IN ('approved', 'auto')
GROUP BY reward_id
HAVING COUNT(*) > 1;
