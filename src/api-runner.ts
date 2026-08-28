import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { diffJson } from './json-diff.js';
import { classifyAttempts } from './summary.js';
import type { ApiCheckConfig, CheckAttempt, CheckResult, FaultlineConfig } from './types.js';

interface TimedResponse {
  status: number;
  body: unknown;
  durationMs: number;
}

const Ajv = Ajv2020 as unknown as new (options: Record<string, unknown>) => {
  compile: (schema: Record<string, unknown>) => ValidateFunction;
};

async function request(url: string, method: string): Promise<TimedResponse> {
  const started = performance.now();
  const response = await fetch(url, { method, headers: { accept: 'application/json' } });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // A non-JSON response is still useful evidence for a failed contract check.
  }
  return { status: response.status, body, durationMs: Math.round(performance.now() - started) };
}

async function runAttempt(
  config: FaultlineConfig,
  check: ApiCheckConfig,
): Promise<{ attempt: CheckAttempt; changes: number; latencyRegression: number }> {
  const started = performance.now();
  const [baseline, candidate] = await Promise.all([
    request(new URL(check.path, config.baselineUrl).toString(), check.method ?? 'GET'),
    request(new URL(check.path, config.candidateUrl).toString(), check.method ?? 'GET'),
  ]);
  const failures: string[] = [];

  if (candidate.status !== check.expectedStatus) {
    failures.push(`Expected HTTP ${check.expectedStatus}; candidate returned ${candidate.status}.`);
  }

  if (check.schema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(check.schema);
    if (!validate(candidate.body)) {
      const detail = validate.errors?.map((error: ErrorObject) => `${error.instancePath || '$'} ${error.message}`).join(', ');
      failures.push(`Candidate response broke the schema: ${detail ?? 'unknown schema error'}.`);
    }
  }

  const changes = diffJson(baseline.body, candidate.body, check.ignorePaths).length;
  if (changes > 0) failures.push(`${changes} contract ${changes === 1 ? 'change' : 'changes'} detected against baseline.`);

  const latencyRegression = baseline.durationMs === 0
    ? 0
    : Math.round(((candidate.durationMs - baseline.durationMs) / baseline.durationMs) * 100);
  if (
    check.maxLatencyRegressionPercent !== undefined
    && latencyRegression > check.maxLatencyRegressionPercent
  ) {
    failures.push(`Latency regressed ${latencyRegression}%, above the ${check.maxLatencyRegressionPercent}% budget.`);
  }

  return {
    attempt: {
      status: failures.length ? 'failed' : 'passed',
      durationMs: Math.round(performance.now() - started),
      failures,
    },
    changes,
    latencyRegression,
  };
}

export async function runApiChecks(config: FaultlineConfig): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of config.api) {
    const attempts: CheckAttempt[] = [];
    let changes = 0;
    let latencyRegression = 0;
    for (let attempt = 0; attempt < config.stabilityRuns; attempt += 1) {
      try {
        const result = await runAttempt(config, check);
        attempts.push(result.attempt);
        changes = Math.max(changes, result.changes);
        latencyRegression = Math.max(latencyRegression, result.latencyRegression);
      } catch (error) {
        attempts.push({
          status: 'failed',
          durationMs: 0,
          failures: [error instanceof Error ? error.message : 'Unknown API failure'],
        });
      }
    }

    const status = classifyAttempts(attempts.map((attempt) => attempt.status));
    const firstFailure = attempts.flatMap((attempt) => attempt.failures)[0];
    results.push({
      id: check.id,
      title: check.title,
      description: check.description,
      kind: 'api',
      severity: check.severity,
      status,
      summary: status === 'passed' ? 'Candidate preserved the API contract and performance budget.' : firstFailure ?? 'Regression detected.',
      durationMs: attempts.reduce((total, attempt) => total + attempt.durationMs, 0),
      evidence: [
        { label: 'Contract changes', value: String(changes), tone: changes ? 'negative' : 'positive' },
        { label: 'Latency delta', value: `${latencyRegression}%`, tone: latencyRegression > 0 ? 'warning' : 'positive' },
        { label: 'Stability runs', value: String(config.stabilityRuns), tone: status === 'flaky' ? 'warning' : 'neutral' },
      ],
      attempts,
    });
  }

  return results;
}
