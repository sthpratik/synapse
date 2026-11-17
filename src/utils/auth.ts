import { AuthConfig } from '../types/config';

export interface ResolvedAuth {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
}

/**
 * Resolve auth config into headers / query params for K6 and Node fetchers.
 */
export function resolveAuth(auth?: AuthConfig): ResolvedAuth {
  const headers: Record<string, string> = {};
  const queryParams: Record<string, string> = {};

  if (!auth) {
    return { headers, queryParams };
  }

  switch (auth.type) {
    case 'bearer': {
      if (!auth.token) {
        throw new Error('auth.type "bearer" requires auth.token');
      }
      headers['Authorization'] = `Bearer ${auth.token}`;
      break;
    }
    case 'basic': {
      if (!auth.username) {
        throw new Error('auth.type "basic" requires auth.username');
      }
      const credentials = Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      break;
    }
    case 'apiKey': {
      if (!auth.token) {
        throw new Error('auth.type "apiKey" requires auth.token');
      }
      const location = auth.in || 'header';
      if (location === 'query') {
        const param = auth.queryParam || 'api_key';
        queryParams[param] = auth.token;
      } else {
        const headerName = auth.header || 'X-API-Key';
        headers[headerName] = auth.token;
      }
      break;
    }
    default:
      throw new Error(`Unsupported auth type: ${(auth as AuthConfig).type}`);
  }

  return { headers, queryParams };
}

/**
 * Merge request headers with auth headers (auth wins on conflict unless request already set Authorization).
 */
export function mergeHeaders(
  requestHeaders: Record<string, string> = {},
  auth?: AuthConfig
): Record<string, string> {
  const { headers: authHeaders } = resolveAuth(auth);
  return { ...authHeaders, ...requestHeaders };
}
