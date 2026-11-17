import { K6Generator } from '../src/generators/k6Generator';
import { SynapseConfig } from '../src/types/config';

describe('K6Generator', () => {
  it('emits bearer auth headers and json body', async () => {
    const config: SynapseConfig = {
      name: 'api',
      baseUrl: 'https://api.example.com/items',
      execution: { mode: 'construct', concurrent: 2, iterations: 5, thinkTime: 0 },
      auth: { type: 'bearer', token: 'tok_123' },
      request: {
        method: 'POST',
        json: { name: 'widget' },
        checks: [
          { status: 201, name: 'created' },
          { jsonPath: 'id', name: 'has id' },
          { bodyContains: 'widget' }
        ]
      }
    };

    const script = await new K6Generator(config).generateK6Script();
    expect(script).toContain('Bearer tok_123');
    expect(script).toContain('application/json');
    expect(script).toContain('widget');
    expect(script).toContain('created');
    expect(script).toContain('has id');
    expect(script).toContain('http.post');
    expect(script).toContain('sleep(0)');
  });

  it('supports path parameters in constructed URLs', async () => {
    const config: SynapseConfig = {
      name: 'path',
      baseUrl: 'https://api.example.com/users/{userId}',
      execution: { mode: 'construct', iterations: 1 },
      parameters: [
        { name: 'userId', type: 'integer', min: 1, max: 3, in: 'path' },
        { name: 'verbose', type: 'static', value: '1', in: 'query' }
      ]
    };

    const script = await new K6Generator(config).generateK6Script();
    expect(script).toContain("url.replace('{userId}'");
    expect(script).toContain("params.push('verbose='");
  });

  it('supports apiKey query auth', async () => {
    const config: SynapseConfig = {
      name: 'key',
      baseUrl: 'https://api.example.com',
      execution: { mode: 'construct', iterations: 1 },
      auth: { type: 'apiKey', token: 'secret', in: 'query', queryParam: 'api_key' }
    };

    const script = await new K6Generator(config).generateK6Script();
    expect(script).toContain('api_key');
    expect(script).toContain('secret');
  });
});
