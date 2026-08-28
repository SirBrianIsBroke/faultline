export interface JsonChange {
  path: string;
  before: unknown;
  after: unknown;
  type: 'added' | 'removed' | 'changed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldIgnore(path: string, ignorePaths: string[]): boolean {
  return ignorePaths.some((ignored) => path === ignored || path.startsWith(`${ignored}.`));
}

export function diffJson(
  before: unknown,
  after: unknown,
  ignorePaths: string[] = [],
  path = '$',
): JsonChange[] {
  if (shouldIgnore(path, ignorePaths)) return [];

  if (Object.is(before, after)) return [];

  if (Array.isArray(before) && Array.isArray(after)) {
    const changes: JsonChange[] = [];
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      changes.push(...diffJson(before[index], after[index], ignorePaths, `${path}[${index}]`));
    }
    return changes;
  }

  if (isRecord(before) && isRecord(after)) {
    const changes: JsonChange[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      const nextPath = `${path}.${key}`;
      if (!(key in before)) {
        if (!shouldIgnore(nextPath, ignorePaths)) {
          changes.push({ path: nextPath, before: undefined, after: after[key], type: 'added' });
        }
      } else if (!(key in after)) {
        if (!shouldIgnore(nextPath, ignorePaths)) {
          changes.push({ path: nextPath, before: before[key], after: undefined, type: 'removed' });
        }
      } else {
        changes.push(...diffJson(before[key], after[key], ignorePaths, nextPath));
      }
    }
    return changes;
  }

  return [{ path, before, after, type: 'changed' }];
}
