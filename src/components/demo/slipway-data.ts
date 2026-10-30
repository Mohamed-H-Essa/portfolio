// Slipway's chaos-day evidence for its project page (SlipwayChaos.astro). Real data only:
// k6's per-request log of chaos-day run 1 (k8s_platform_bootstrap, .local/chaos/20261030-115711/
// requests.log: 56,206 requests at 50 req/s), binned to 10 s; event times from its timeline.log.
// Values written {{NUMBER: …}} are not measured/final yet: docs/pr/slipway.md lists them.

export interface ChaosRun {
  id: string;
  start: string; // wall clock of the first request (UTC+2)
  end: string;
  bin: number; // seconds per bar
  failedPct: number[]; // share of requests that failed in each bar, 0–100
  // seconds from start: the window each experiment covers on this run's strip
  windows: Partial<Record<ChaosEvent, [number, number]>>;
}

export type ChaosEvent = 'release' | 'pod-kill' | 'node-loss' | 'db-failover' | 'bad-release';
export const EVENTS: ChaosEvent[] = ['release', 'pod-kill', 'node-loss', 'db-failover', 'bad-release'];

export const RUN1: ChaosRun = {
  id: 'run1',
  start: '11:57',
  end: '12:16',
  bin: 10,
  // prettier-ignore
  failedPct: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26,54,42,57,48,43,52,50,50,52,47,52,51,47,48,49,47,53,49,51,53,50,52,45,51,54,44,46,54,45,53,49,48,51,51,42,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  windows: {
    release: [120, 210], // 11:59:11 make release → 12:00:41 client view taken
    'pod-kill': [335, 357], // 12:02:46 delete → 12:03:08
    'node-loss': [478, 841], // 12:05:09 docker stop → 12:11:12 last failed request
  },
};

/** Outcome of each experiment: held (as designed), broke (and was fixed), or pending (run 2). */
export const VERDICT: Record<ChaosEvent, 'held' | 'broke' | 'pending'> = {
  release: 'held',
  'pod-kill': 'held',
  'node-loss': 'broke',
  'db-failover': 'pending',
  'bad-release': 'pending',
};

/** Measured values still to come from chaos-day run 2 (same text in every language). */
export const N = {
  nodeLossRun2: '{{NUMBER: node loss after the fixes, run 2}}',
  dbNewPrimary: '{{NUMBER: db failover, time to a new primary}}',
  dbFailed: '{{NUMBER: db failover, failed requests}}',
  pageAfter: '{{NUMBER: bad release, time to page}}',
  recoverAfter: '{{NUMBER: bad release, revert to clean traffic}}',
};
