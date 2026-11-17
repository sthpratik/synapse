import * as fs from 'fs';
import * as yaml from 'yaml';
import { SynapseConfig, Parameter } from '../types/config';

export interface OpenApiImportOptions {
  name?: string;
  pathFilter?: string;
  method?: string;
  concurrent?: number;
  iterations?: number;
}

/**
 * Convert an OpenAPI 3.x (or Swagger 2) document into a Synapse YAML config.
 * Picks the first matching path+method (or first GET-like operation).
 */
export function importOpenApi(filePath: string, options: OpenApiImportOptions = {}): SynapseConfig {
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = filePath.endsWith('.json') ? JSON.parse(raw) : yaml.parse(raw);

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid OpenAPI document');
  }

  const baseUrl = resolveBaseUrl(doc);
  const operation = pickOperation(doc, options);
  if (!operation) {
    throw new Error('No suitable path/operation found in OpenAPI document');
  }

  const parameters = buildParameters(operation.pathItem, operation.operation, operation.path);
  const method = operation.method.toUpperCase();
  const requestBody = extractJsonExample(operation.operation);

  const config: SynapseConfig = {
    name: options.name || doc.info?.title || 'Imported OpenAPI Test',
    description: `Imported from ${filePath} · ${method} ${operation.path}`,
    baseUrl: joinUrl(baseUrl, toTemplatePath(operation.path)),
    execution: {
      mode: 'construct',
      concurrent: options.concurrent || 10,
      iterations: options.iterations || 50
    },
    parameters: parameters.length ? parameters : undefined,
    request: {
      method,
      headers: {
        'User-Agent': 'Synapse Load Tester',
        ...(requestBody ? { 'Content-Type': 'application/json' } : {})
      },
      ...(requestBody ? { json: requestBody } : {}),
      checks: [
        { status: 'ok', name: 'status ok' },
        { maxDuration: 2000, name: 'under 2s' }
      ]
    },
    k6Options: {
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        checks: ['rate>0.95']
      }
    }
  };

  // Auth hint from security schemes
  const auth = extractAuth(doc);
  if (auth) {
    config.auth = auth;
  }

  return config;
}

function resolveBaseUrl(doc: any): string {
  if (doc.openapi && Array.isArray(doc.servers) && doc.servers[0]?.url) {
    const serverUrl = String(doc.servers[0].url);
    if (serverUrl.startsWith('http')) return serverUrl.replace(/\/$/, '');
    return `https://api.example.com${serverUrl.startsWith('/') ? '' : '/'}${serverUrl}`.replace(/\/$/, '');
  }
  if (doc.swagger === '2.0') {
    const scheme = (doc.schemes && doc.schemes[0]) || 'https';
    const host = doc.host || 'api.example.com';
    const basePath = doc.basePath || '';
    return `${scheme}://${host}${basePath}`.replace(/\/$/, '');
  }
  return 'https://api.example.com';
}

function pickOperation(doc: any, options: OpenApiImportOptions) {
  const paths = doc.paths || {};
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const preferred = options.method ? [options.method.toLowerCase()] : methods;

  for (const pathKey of Object.keys(paths)) {
    if (options.pathFilter && !pathKey.includes(options.pathFilter)) continue;
    const pathItem = paths[pathKey];
    for (const method of preferred) {
      if (pathItem[method]) {
        return { path: pathKey, method, pathItem, operation: pathItem[method] };
      }
    }
  }
  return null;
}

function buildParameters(pathItem: any, operation: any, pathKey: string): Parameter[] {
  const combined = [...(pathItem.parameters || []), ...(operation.parameters || [])];
  const params: Parameter[] = [];
  const seen = new Set<string>();

  // Path placeholders even if not declared
  const pathPlaceholders = [...pathKey.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  for (const name of pathPlaceholders) {
    seen.add(name);
    params.push({
      name,
      type: 'integer',
      min: 1,
      max: 100,
      in: 'path'
    });
  }

  for (const p of combined) {
    if (!p?.name || seen.has(p.name)) continue;
    seen.add(p.name);
    const location = p.in === 'path' ? 'path' : 'query';
    if (p.in === 'header' || p.in === 'cookie') continue;

    const schema = p.schema || {};
    if (schema.enum && Array.isArray(schema.enum)) {
      params.push({ name: p.name, type: 'array', values: schema.enum, in: location });
    } else if (schema.type === 'integer' || schema.type === 'number') {
      params.push({
        name: p.name,
        type: 'integer',
        min: schema.minimum ?? 1,
        max: schema.maximum ?? 1000,
        in: location
      });
    } else if (schema.type === 'boolean') {
      params.push({ name: p.name, type: 'array', values: ['true', 'false'], in: location });
    } else {
      params.push({
        name: p.name,
        type: 'string',
        length: 8,
        charset: 'alphanumeric',
        in: location
      });
    }
  }

  return params;
}

function toTemplatePath(openApiPath: string): string {
  // Keep {param} placeholders for path substitution
  return openApiPath;
}

function joinUrl(base: string, pathPart: string): string {
  if (!pathPart || pathPart === '/') return base;
  return `${base.replace(/\/$/, '')}/${pathPart.replace(/^\//, '')}`;
}

function extractJsonExample(operation: any): Record<string, unknown> | unknown[] | undefined {
  const content = operation.requestBody?.content?.['application/json'];
  if (!content) return undefined;
  if (content.example !== undefined) return content.example;
  if (content.examples) {
    const first = Object.values(content.examples)[0] as any;
    if (first?.value !== undefined) return first.value;
  }
  if (content.schema?.example !== undefined) return content.schema.example;
  if (content.schema?.type === 'object') return {};
  return undefined;
}

function extractAuth(doc: any): SynapseConfig['auth'] | undefined {
  const schemes = doc.components?.securitySchemes || doc.securityDefinitions;
  if (!schemes) return undefined;
  const firstKey = Object.keys(schemes)[0];
  const scheme = schemes[firstKey];
  if (!scheme) return undefined;

  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { type: 'bearer', token: 'REPLACE_ME' };
  }
  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return { type: 'basic', username: 'REPLACE_ME', password: 'REPLACE_ME' };
  }
  if (scheme.type === 'apiKey') {
    return {
      type: 'apiKey',
      token: 'REPLACE_ME',
      in: scheme.in === 'query' ? 'query' : 'header',
      header: scheme.in === 'header' ? scheme.name : undefined,
      queryParam: scheme.in === 'query' ? scheme.name : undefined
    };
  }
  if (scheme.type === 'oauth2') {
    return { type: 'bearer', token: 'REPLACE_ME' };
  }
  return undefined;
}
