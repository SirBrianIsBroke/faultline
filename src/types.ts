export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type CheckStatus = 'passed' | 'failed' | 'flaky';

export type Interaction =
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'waitFor'; selector: string };

export type PageAssertion =
  | { type: 'visible'; selector: string; message: string }
  | { type: 'text'; selector: string; value: string; message: string };

export interface BrowserCheckConfig {
  id: string;
  title: string;
  description: string;
  path: string;
  severity: Severity;
  viewport?: { width: number; height: number };
  interactions?: Interaction[];
  assertions?: PageAssertion[];
  maxDiffPercent: number;
}

export interface ApiCheckConfig {
  id: string;
  title: string;
  description: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  severity: Severity;
  expectedStatus: number;
  maxLatencyRegressionPercent?: number;
  schema?: Record<string, unknown>;
  ignorePaths?: string[];
}

export interface FaultlineConfig {
  project: string;
  baselineUrl: string;
  candidateUrl: string;
  stabilityRuns: number;
  browser: BrowserCheckConfig[];
  api: ApiCheckConfig[];
}

export interface Evidence {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

export interface ArtifactSet {
  baseline?: string;
  candidate?: string;
  diff?: string;
}

export interface CheckAttempt {
  status: 'passed' | 'failed';
  durationMs: number;
  failures: string[];
}

export interface CheckResult {
  id: string;
  title: string;
  description: string;
  kind: 'browser' | 'api';
  severity: Severity;
  status: CheckStatus;
  summary: string;
  durationMs: number;
  evidence: Evidence[];
  artifacts?: ArtifactSet;
  attempts: CheckAttempt[];
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  riskScore: number;
  durationMs: number;
}

export interface FaultlineReport {
  schemaVersion: 1;
  runId: string;
  project: string;
  commit: string;
  branch: string;
  createdAt: string;
  baselineUrl: string;
  candidateUrl: string;
  verdict: 'ship' | 'hold';
  summary: RunSummary;
  checks: CheckResult[];
}
