import type { CheckResult, FaultlineReport, RunSummary, Severity } from './types.js';

const severityWeight: Record<Severity, number> = {
  critical: 35,
  high: 24,
  medium: 14,
  low: 7,
};

export function summarize(checks: CheckResult[]): RunSummary {
  const failed = checks.filter((check) => check.status === 'failed');
  const flaky = checks.filter((check) => check.status === 'flaky');
  const risk = failed.reduce((score, check) => score + severityWeight[check.severity], 0)
    + flaky.reduce((score, check) => score + Math.round(severityWeight[check.severity] / 2), 0);

  return {
    total: checks.length,
    passed: checks.filter((check) => check.status === 'passed').length,
    failed: failed.length,
    flaky: flaky.length,
    riskScore: Math.min(100, risk),
    durationMs: checks.reduce((total, check) => total + check.durationMs, 0),
  };
}

export function verdictFor(summary: RunSummary): FaultlineReport['verdict'] {
  return summary.failed === 0 && summary.flaky === 0 ? 'ship' : 'hold';
}

export function classifyAttempts(statuses: Array<'passed' | 'failed'>): CheckResult['status'] {
  const unique = new Set(statuses);
  if (unique.size > 1) return 'flaky';
  return statuses[0] ?? 'failed';
}
