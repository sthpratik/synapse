import { getByPath, omitPaths, normalizeJsonString, pathExists } from '../src/utils/jsonPath';

describe('jsonPath utils', () => {
  const sample = { data: { items: [{ id: 1 }, { id: 2 }], meta: { ts: 123 } } };

  it('reads dotted paths', () => {
    expect(getByPath(sample, 'data.items.0.id')).toBe(1);
    expect(getByPath(sample, '$.data.meta.ts')).toBe(123);
  });

  it('reports existence', () => {
    expect(pathExists(sample, 'data.meta.ts')).toBe(true);
    expect(pathExists(sample, 'data.missing')).toBe(false);
  });

  it('omits paths', () => {
    const cleaned = omitPaths(sample, ['data.meta.ts']) as any;
    expect(cleaned.data.meta.ts).toBeUndefined();
    expect(cleaned.data.items[0].id).toBe(1);
  });

  it('normalizes JSON key order', () => {
    const a = normalizeJsonString('{"b":1,"a":2}');
    const b = normalizeJsonString('{"a":2,"b":1}');
    expect(a).toBe(b);
  });
});
