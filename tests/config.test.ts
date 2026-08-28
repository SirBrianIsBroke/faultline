import { describe, expect, it } from 'vitest';
import { defineConfig } from '../src/config.js';

const base = {
  project: 'Console',
  baselineUrl: 'https://baseline.example.com',
  candidateUrl: 'https://candidate.example.com',
  stabilityRuns: 2,
  browser: [],
  api: [],
};

describe('defineConfig', () => {
  it('accepts a valid suite', () => {
    expect(defineConfig(base)).toEqual(base);
  });

  it('rejects duplicate ids across browser and API checks', () => {
    expect(() => defineConfig({
      ...base,
      browser: [{ id: 'shared', title: 'Browser', description: 'Browser', path: '/', severity: 'high', maxDiffPercent: 1 }],
      api: [{ id: 'shared', title: 'API', description: 'API', path: '/api', severity: 'high', expectedStatus: 200 }],
    })).toThrow('Check ids must be unique.');
  });

  it('rejects an invalid stability run count', () => {
    expect(() => defineConfig({ ...base, stabilityRuns: 0 })).toThrow('stabilityRuns must be at least 1.');
  });
});
