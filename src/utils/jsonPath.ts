/**
 * Minimal dotted JSON path reader (e.g. "data.items.0.id").
 * Supports object keys and numeric array indexes. No filters / wildcards.
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/^\$\.?/, '').split('.').filter(Boolean);
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Remove listed dotted paths from a deep clone of the object.
 */
export function omitPaths(obj: unknown, paths: string[]): unknown {
  if (!paths.length) return obj;
  const clone = JSON.parse(JSON.stringify(obj));

  for (const path of paths) {
    const parts = path.replace(/^\$\.?/, '').split('.').filter(Boolean);
    if (!parts.length) continue;

    let current: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current == null || typeof current !== 'object') {
        current = null;
        break;
      }
      current = current[parts[i]];
    }
    if (current && typeof current === 'object') {
      delete current[parts[parts.length - 1]];
    }
  }

  return clone;
}

/**
 * Stable JSON stringify with sorted object keys (recursive).
 */
export function normalizeJsonString(input: string | unknown): string {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return input.trim();
    }
  }
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function pathExists(obj: unknown, path: string): boolean {
  return getByPath(obj, path) !== undefined;
}
