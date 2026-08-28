import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runApiChecks } from './api-runner.js';
import { runBrowserChecks } from './browser-runner.js';
import { summarize, verdictFor } from './summary.js';
import type { FaultlineConfig, FaultlineReport } from './types.js';

export interface RunOptions {
  outputDirectory?: string;
  commit?: string;
  branch?: string;
}

function createRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function runFaultline(
  config: FaultlineConfig,
  options: RunOptions = {},
): Promise<{ report: FaultlineReport; reportPath: string }> {
  const runId = createRunId();
  const outputRoot = path.resolve(options.outputDirectory ?? '.faultline/runs');
  const runDirectory = path.join(outputRoot, runId);
  const artifactDirectory = path.join(runDirectory, 'artifacts');
  await mkdir(runDirectory, { recursive: true });

  const [browserChecks, apiChecks] = await Promise.all([
    runBrowserChecks(config, artifactDirectory),
    runApiChecks(config),
  ]);
  const checks = [...browserChecks, ...apiChecks];
  const summary = summarize(checks);
  const report: FaultlineReport = {
    schemaVersion: 1,
    runId,
    project: config.project,
    commit: options.commit ?? process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
    branch: options.branch ?? process.env.GITHUB_REF_NAME ?? 'working-tree',
    createdAt: new Date().toISOString(),
    baselineUrl: config.baselineUrl,
    candidateUrl: config.candidateUrl,
    verdict: verdictFor(summary),
    summary,
    checks,
  };
  const reportPath = path.join(runDirectory, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}
