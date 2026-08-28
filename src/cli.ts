#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { createJiti } from 'jiti';
import { runFaultline } from './runner.js';
import type { FaultlineConfig } from './types.js';

const program = new Command();
program
  .name('faultline')
  .description('Catch browser, visual, and API regressions before release.')
  .version('0.1.0');

program
  .command('run')
  .description('Run a Faultline suite')
  .option('-c, --config <path>', 'configuration file', 'faultline.config.ts')
  .option('-o, --output <path>', 'run output directory', '.faultline/runs')
  .action(async (options: { config: string; output: string }) => {
    const configPath = path.resolve(options.config);
    const jiti = createJiti(import.meta.url);
    const module = await jiti.import(configPath) as { default?: FaultlineConfig };
    if (!module.default) throw new Error(`No default configuration export found in ${configPath}`);

    const { report, reportPath } = await runFaultline(module.default, { outputDirectory: options.output });
    const icon = report.verdict === 'ship' ? '✓' : '×';
    process.stdout.write(`\n${icon} ${report.project}: ${report.verdict.toUpperCase()}\n`);
    process.stdout.write(`  ${report.summary.passed} passed · ${report.summary.failed} failed · ${report.summary.flaky} flaky\n`);
    process.stdout.write(`  Risk ${report.summary.riskScore}/100 · ${reportPath}\n\n`);
    process.exitCode = report.verdict === 'hold' ? 1 : 0;
  });

await program.parseAsync();
