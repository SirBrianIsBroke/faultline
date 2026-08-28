import type { FaultlineConfig } from './types.js';

export function defineConfig(config: FaultlineConfig): FaultlineConfig {
  if (!config.project.trim()) throw new Error('Faultline requires a project name.');
  if (!URL.canParse(config.baselineUrl)) throw new Error('baselineUrl must be a valid URL.');
  if (!URL.canParse(config.candidateUrl)) throw new Error('candidateUrl must be a valid URL.');
  if (config.stabilityRuns < 1) throw new Error('stabilityRuns must be at least 1.');

  const ids = [...config.browser, ...config.api].map((check) => check.id);
  if (new Set(ids).size !== ids.length) throw new Error('Check ids must be unique.');

  return config;
}
