import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { importOpenApi } from '../src/importers/openapi';
import { importHar } from '../src/importers/har';

describe('importers', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-import-'));

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('imports OpenAPI 3 document', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Demo API', version: '1.0.0' },
      servers: [{ url: 'https://demo.example.com/v1' }],
      paths: {
        '/pets/{petId}': {
          get: {
            parameters: [
              { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
              { name: 'tag', in: 'query', schema: { type: 'string', enum: ['dog', 'cat'] } }
            ],
            responses: { '200': { description: 'ok' } }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' }
        }
      }
    };

    const file = path.join(tmp, 'openapi.json');
    fs.writeFileSync(file, JSON.stringify(spec));
    const config = importOpenApi(file, { name: 'Pets' });

    expect(config.name).toBe('Pets');
    expect(config.baseUrl).toContain('/pets/{petId}');
    expect(config.request?.method).toBe('GET');
    expect(config.parameters?.some(p => p.name === 'petId' && p.in === 'path')).toBe(true);
    expect(config.parameters?.some(p => p.name === 'tag' && p.type === 'array')).toBe(true);
    expect(config.auth?.type).toBe('bearer');
  });

  it('imports HAR into batch config + CSV', () => {
    const har = {
      log: {
        entries: [
          { request: { method: 'GET', url: 'https://example.com/a' } },
          { request: { method: 'GET', url: 'https://example.com/style.css' } },
          { request: { method: 'GET', url: 'https://example.com/a' } },
          { request: { method: 'POST', url: 'https://example.com/submit' } },
          { request: { method: 'GET', url: 'https://example.com/b' } }
        ]
      }
    };

    const file = path.join(tmp, 'capture.har');
    const csvPath = path.join(tmp, 'urls.csv');
    fs.writeFileSync(file, JSON.stringify(har));

    const { config, urls } = importHar(file, { outputCsv: csvPath });
    expect(urls).toEqual(['https://example.com/a', 'https://example.com/b']);
    expect(config.execution.mode).toBe('batch');
    expect(config.batch?.file).toBe(csvPath);
    expect(fs.readFileSync(csvPath, 'utf8')).toContain('https://example.com/b');
  });
});
