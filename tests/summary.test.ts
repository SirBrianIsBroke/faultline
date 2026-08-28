import { describe, expect, it } from 'vitest';
import { classifyAttempts, summarize, verdictFor } from '../src/summary.js';
import type { CheckResult } from '../src/types.js';

function check(status: CheckResult['status'], severity: CheckResult['severity']): CheckResult {
  return {
    id: `${status}-${severity}`,
    title: 'Check',
    description: 'Fixture check',
    kind: 'api',
    severity,
    status,
    summary: 'Summary',
    durationMs: 100,
    evidence: [],
    attempts: [],
  };
}

describe('release summary', () => {
  it('weights failed and flaky checks without exceeding 100', () => {
    const summary = summarize([
      check('failed', 'critical'),
      check('failed', 'high'),
      check('flaky', 'medium'),
      check('passed', 'low'),
    ]);

    expect(summary).toEqual({ total: 4, passed: 1, failed: 2, flaky: 1, riskScore: 66, durationMs: 400 });
    expect(verdictFor(summary)).toBe('hold');
  });

  it('ships only when every check is stable and passing', () => {
    const summary = summarize([check('passed', 'critical'), check('passed', 'low')]);
    expect(summary.riskScore).toBe(0);
    expect(verdictFor(summary)).toBe('ship');
  });
});

describe('attempt classification', () => {
  it('marks mixed outcomes as flaky', () => {
    expect(classifyAttempts(['passed', 'failed'])).toBe('flaky');
  });

  it('preserves a stable outcome', () => {
    expect(classifyAttempts(['failed', 'failed'])).toBe('failed');
    expect(classifyAttempts(['passed', 'passed'])).toBe('passed');
  });
});
