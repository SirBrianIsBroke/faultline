import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { chromium, type Browser, type Page } from 'playwright';
import { PNG } from 'pngjs';
import { classifyAttempts } from './summary.js';
import type {
  ArtifactSet,
  BrowserCheckConfig,
  CheckAttempt,
  CheckResult,
  FaultlineConfig,
  PageAssertion,
} from './types.js';

async function applyInteractions(page: Page, check: BrowserCheckConfig): Promise<void> {
  for (const interaction of check.interactions ?? []) {
    if (interaction.type === 'click') await page.locator(interaction.selector).click();
    if (interaction.type === 'fill') await page.locator(interaction.selector).fill(interaction.value);
    if (interaction.type === 'waitFor') await page.locator(interaction.selector).waitFor();
  }
}

async function assertionFailure(page: Page, assertion: PageAssertion): Promise<string | null> {
  const locator = page.locator(assertion.selector).first();
  if (assertion.type === 'visible') {
    return (await locator.isVisible()) ? null : assertion.message;
  }

  const content = (await locator.textContent())?.trim() ?? '';
  return content.includes(assertion.value) ? null : assertion.message;
}

async function compareScreenshots(
  baselinePath: string,
  candidatePath: string,
  diffPath: string,
): Promise<number> {
  const baseline = PNG.sync.read(await readFile(baselinePath));
  const candidate = PNG.sync.read(await readFile(candidatePath));

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) return 100;

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const mismatchedPixels = pixelmatch(
    baseline.data,
    candidate.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: 0.12, includeAA: false },
  );

  await writeFile(diffPath, PNG.sync.write(diff));
  return Number(((mismatchedPixels / (baseline.width * baseline.height)) * 100).toFixed(2));
}

async function runAttempt(
  browser: Browser,
  config: FaultlineConfig,
  check: BrowserCheckConfig,
  artifactDirectory: string,
  attemptNumber: number,
): Promise<{ attempt: CheckAttempt; artifacts: ArtifactSet; diffPercent: number }> {
  const started = performance.now();
  const context = await browser.newContext({
    viewport: check.viewport ?? { width: 1440, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const baseline = await context.newPage();
  const candidate = await context.newPage();
  const failures: string[] = [];
  const filename = `${check.id}-${attemptNumber}`;
  const artifacts = {
    baseline: `artifacts/${filename}-baseline.png`,
    candidate: `artifacts/${filename}-candidate.png`,
    diff: `artifacts/${filename}-diff.png`,
  };

  try {
    await Promise.all([
      baseline.goto(new URL(check.path, config.baselineUrl).toString(), { waitUntil: 'networkidle' }),
      candidate.goto(new URL(check.path, config.candidateUrl).toString(), { waitUntil: 'networkidle' }),
    ]);
    await Promise.all([applyInteractions(baseline, check), applyInteractions(candidate, check)]);

    for (const assertion of check.assertions ?? []) {
      const [baselineFailure, candidateFailure] = await Promise.all([
        assertionFailure(baseline, assertion),
        assertionFailure(candidate, assertion),
      ]);
      if (baselineFailure) failures.push(`Baseline is invalid: ${baselineFailure}`);
      if (candidateFailure) failures.push(candidateFailure);
    }

    const baselinePath = path.join(artifactDirectory, `${filename}-baseline.png`);
    const candidatePath = path.join(artifactDirectory, `${filename}-candidate.png`);
    const diffPath = path.join(artifactDirectory, `${filename}-diff.png`);
    await Promise.all([
      baseline.screenshot({ path: baselinePath, animations: 'disabled' }),
      candidate.screenshot({ path: candidatePath, animations: 'disabled' }),
    ]);
    const diffPercent = await compareScreenshots(baselinePath, candidatePath, diffPath);
    if (diffPercent > check.maxDiffPercent) {
      failures.push(`Visual change is ${diffPercent}%, above the ${check.maxDiffPercent}% budget.`);
    }

    return {
      attempt: {
        status: failures.length ? 'failed' : 'passed',
        durationMs: Math.round(performance.now() - started),
        failures,
      },
      artifacts,
      diffPercent,
    };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'Unknown browser failure');
    return {
      attempt: {
        status: 'failed',
        durationMs: Math.round(performance.now() - started),
        failures,
      },
      artifacts,
      diffPercent: 100,
    };
  } finally {
    await context.close();
  }
}

export async function runBrowserChecks(
  config: FaultlineConfig,
  artifactDirectory: string,
): Promise<CheckResult[]> {
  await mkdir(artifactDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const results: CheckResult[] = [];
    for (const check of config.browser) {
      const attempts: CheckAttempt[] = [];
      let artifacts: ArtifactSet | undefined;
      let diffPercent = 0;

      for (let attemptNumber = 1; attemptNumber <= config.stabilityRuns; attemptNumber += 1) {
        const result = await runAttempt(browser, config, check, artifactDirectory, attemptNumber);
        attempts.push(result.attempt);
        artifacts = result.artifacts;
        diffPercent = Math.max(diffPercent, result.diffPercent);
      }

      const status = classifyAttempts(attempts.map((attempt) => attempt.status));
      const firstFailure = attempts.flatMap((attempt) => attempt.failures)[0];
      results.push({
        id: check.id,
        title: check.title,
        description: check.description,
        kind: 'browser',
        severity: check.severity,
        status,
        summary: status === 'passed' ? 'Candidate stayed inside the visual and behavior budget.' : firstFailure ?? 'Regression detected.',
        durationMs: attempts.reduce((total, attempt) => total + attempt.durationMs, 0),
        evidence: [
          { label: 'Visual change', value: `${diffPercent}%`, tone: diffPercent > check.maxDiffPercent ? 'negative' : 'positive' },
          { label: 'Allowed budget', value: `${check.maxDiffPercent}%`, tone: 'neutral' },
          { label: 'Stability runs', value: String(config.stabilityRuns), tone: status === 'flaky' ? 'warning' : 'neutral' },
        ],
        artifacts,
        attempts,
      });
    }
    return results;
  } finally {
    await browser.close();
  }
}
