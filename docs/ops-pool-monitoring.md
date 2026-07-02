# Postgres pool monitoring (M4)

Production uses `pg.Pool` with **`max: 5`** (`src/lib/db.js`). HTTP requests, 13+ midnight schedulers, and long-lived SSE connections (`/api/events`) share that budget.

## What to watch

- **`pool.waitingCount`** — clients queued waiting for a free connection. Sustained `> 0` under normal load means the pool is saturated.
- **Connection timeouts** — `connectionTimeoutMillis: 5000` yields fast failure instead of indefinite hangs; correlate spikes with `waitingCount`.
- **Statement timeouts** — `statement_timeout: 15000` on the pool; slow queries hold slots and amplify starvation.

## Operational checklist

1. Log or export `waitingCount` periodically in production (e.g. health/metrics sidecar or journal grep after incidents).
2. After **PR-D** scheduler locks land, re-evaluate whether `max: 5` is still appropriate — fewer concurrent `pool.query` calls from schedulers may reduce pressure without raising `max`.
3. Before raising `max`, check Postgres `max_connections` on the VPS and Neon/serverless limits.

No application code change is required for M4; this is monitoring and capacity planning only.
