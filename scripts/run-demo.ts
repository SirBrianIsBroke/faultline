import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../faultline.config.js';
import { runFaultline } from '../src/runner.js';
import { startFixtureServer, stopFixtureServer } from './fixture-server.js';

const baseline = await startFixtureServer(4311, 'baseline');
const candidate = await startFixtureServer(4312, 'candidate');

try {
  const { report, reportPath } = await runFaultline(config, {
    outputDirectory: '.faultline/runs',
    commit: 'a9c2e71',
    branch: 'release/2.8.0',
  });
  const publicDirectory = path.resolve('dashboard/public');
  const publicArtifacts = path.join(publicDirectory, 'artifacts');
  await mkdir(publicArtifacts, { recursive: true });
  await writeFile(path.join(publicDirectory, 'sample-report.json'), await readFile(reportPath));

  const sourceArtifacts = path.join(path.dirname(reportPath), 'artifacts');
  for (const filename of await readdir(sourceArtifacts)) {
    await copyFile(path.join(sourceArtifacts, filename), path.join(publicArtifacts, filename));
  }

  process.stdout.write(`Faultline demo complete: ${report.verdict.toUpperCase()} · risk ${report.summary.riskScore}/100\n`);
  process.stdout.write(`${report.summary.passed} passed · ${report.summary.failed} failed · ${report.summary.flaky} flaky\n`);
} finally {
  await Promise.all([stopFixtureServer(baseline), stopFixtureServer(candidate)]);
}
