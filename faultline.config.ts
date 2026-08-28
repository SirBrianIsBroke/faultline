import { defineConfig } from './src/config.js';

export default defineConfig({
  project: 'Northstar Release Console',
  baselineUrl: 'http://127.0.0.1:4311',
  candidateUrl: 'http://127.0.0.1:4312',
  stabilityRuns: 2,
  browser: [
    {
      id: 'release-command-center',
      title: 'Release command center',
      description: 'Protects the primary approval path and its post-interaction visual state.',
      path: '/',
      severity: 'high',
      interactions: [
        { type: 'click', selector: '[data-testid="inspect-release"]' },
        { type: 'waitFor', selector: '[data-testid="release-drawer"]' },
      ],
      assertions: [
        {
          type: 'text',
          selector: '[data-testid="approval-action"]',
          value: 'Approve release',
          message: 'The primary approval action changed or disappeared.',
        },
      ],
      maxDiffPercent: 0.5,
    },
    {
      id: 'rollback-readiness',
      title: 'Rollback readiness',
      description: 'Verifies that operators retain a clear and usable rollback control.',
      path: '/rollback',
      severity: 'critical',
      assertions: [
        {
          type: 'text',
          selector: '[data-testid="rollback-status"]',
          value: 'Rollback ready',
          message: 'The candidate no longer reports a release-ready rollback plan.',
        },
      ],
      maxDiffPercent: 0.25,
    },
    {
      id: 'audit-log',
      title: 'Audit log',
      description: 'Guards the release history view against accidental UI drift.',
      path: '/audit',
      severity: 'medium',
      assertions: [
        {
          type: 'visible',
          selector: '[data-testid="audit-table"]',
          message: 'The audit table is not visible.',
        },
      ],
      maxDiffPercent: 0.1,
    },
  ],
  api: [
    {
      id: 'release-api-contract',
      title: 'Latest release contract',
      description: 'Protects the operator payload consumed by the release console.',
      path: '/api/releases/latest',
      severity: 'critical',
      expectedStatus: 200,
      maxLatencyRegressionPercent: 200,
      schema: {
        type: 'object',
        required: ['id', 'version', 'approvalStatus', 'rollbackReady', 'owner'],
        properties: {
          id: { type: 'string' },
          version: { type: 'string' },
          approvalStatus: { const: 'approved' },
          rollbackReady: { const: true },
          owner: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
    {
      id: 'health-api-contract',
      title: 'Service health contract',
      description: 'Confirms that deployment health remains stable across environments.',
      path: '/api/health',
      severity: 'low',
      expectedStatus: 200,
      maxLatencyRegressionPercent: 500,
      ignorePaths: ['$.checkedAt'],
      schema: {
        type: 'object',
        required: ['status', 'region', 'checkedAt'],
        properties: {
          status: { const: 'healthy' },
          region: { type: 'string' },
          checkedAt: { type: 'string' },
        },
      },
    },
  ],
});
