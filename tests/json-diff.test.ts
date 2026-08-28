import { describe, expect, it } from 'vitest';
import { diffJson } from '../src/json-diff.js';

describe('diffJson', () => {
  it('reports added, removed, and changed values with stable paths', () => {
    const changes = diffJson(
      { id: 'rel_1', owner: { id: 'usr_1', name: 'Maya' }, rollbackReady: true },
      { id: 'rel_1', owner: { name: 'Maya' }, rollbackReady: false, region: 'us-east-1' },
    );

    expect(changes).toEqual([
      { path: '$.owner.id', before: 'usr_1', after: undefined, type: 'removed' },
      { path: '$.region', before: undefined, after: 'us-east-1', type: 'added' },
      { path: '$.rollbackReady', before: true, after: false, type: 'changed' },
    ]);
  });

  it('ignores volatile paths and their children', () => {
    const changes = diffJson(
      { status: 'healthy', meta: { checkedAt: '10:00', trace: 'abc' } },
      { status: 'healthy', meta: { checkedAt: '10:01', trace: 'def' } },
      ['$.meta'],
    );

    expect(changes).toEqual([]);
  });

  it('tracks array positions', () => {
    expect(diffJson(['ready', 'approved'], ['ready', 'held'])).toEqual([
      { path: '$[1]', before: 'approved', after: 'held', type: 'changed' },
    ]);
  });
});
