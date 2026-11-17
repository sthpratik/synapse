import { resolveAuth, mergeHeaders } from '../src/utils/auth';

describe('resolveAuth', () => {
  it('resolves bearer tokens', () => {
    const result = resolveAuth({ type: 'bearer', token: 'abc' });
    expect(result.headers.Authorization).toBe('Bearer abc');
  });

  it('resolves basic auth', () => {
    const result = resolveAuth({ type: 'basic', username: 'u', password: 'p' });
    expect(result.headers.Authorization).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
  });

  it('resolves apiKey in header', () => {
    const result = resolveAuth({ type: 'apiKey', token: 'k', header: 'X-Key' });
    expect(result.headers['X-Key']).toBe('k');
  });

  it('resolves apiKey in query', () => {
    const result = resolveAuth({ type: 'apiKey', token: 'k', in: 'query', queryParam: 'key' });
    expect(result.queryParams.key).toBe('k');
  });

  it('throws when bearer token missing', () => {
    expect(() => resolveAuth({ type: 'bearer' })).toThrow(/token/);
  });

  it('merges request headers over auth', () => {
    const headers = mergeHeaders(
      { 'X-Custom': '1', Authorization: 'override' },
      { type: 'bearer', token: 'abc' }
    );
    expect(headers.Authorization).toBe('override');
    expect(headers['X-Custom']).toBe('1');
  });
});
