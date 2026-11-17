import { ConfigValidator } from '../src/validators/configValidator';
import { SynapseConfig } from '../src/types/config';

describe('ConfigValidator', () => {
  const validator = new ConfigValidator();

  const base = (): SynapseConfig => ({
    name: 't',
    baseUrl: 'https://api.example.com',
    execution: { mode: 'construct', iterations: 10 }
  });

  it('allows construct mode without parameters', async () => {
    await expect(validator.validate(base())).resolves.toBeUndefined();
  });

  it('validates auth + json body + checks', async () => {
    const config: SynapseConfig = {
      ...base(),
      auth: { type: 'bearer', token: 'secret' },
      request: {
        method: 'POST',
        json: { hello: 'world' },
        checks: [{ status: 201 }, { jsonPath: 'id' }, { maxDuration: 1000 }]
      }
    };
    await expect(validator.validate(config)).resolves.toBeUndefined();
  });

  it('rejects body + json together', async () => {
    const config: SynapseConfig = {
      ...base(),
      request: { body: '{}', json: { a: 1 } }
    };
    await expect(validator.validate(config)).rejects.toThrow(/json and request.body/);
  });

  it('rejects incomplete bearer auth', async () => {
    const config: SynapseConfig = {
      ...base(),
      auth: { type: 'bearer' }
    };
    await expect(validator.validate(config)).rejects.toThrow(/token/);
  });

  it('validates screenshot masks and viewports', async () => {
    const config: SynapseConfig = {
      ...base(),
      comparison: {
        enabled: true,
        type: 'screenshot',
        baseUrl2: 'https://v2.example.com',
        failOnDiff: true,
        screenshot: {
          masks: ['.ad', '#clock'],
          selector: '#main',
          fullPage: true,
          viewports: [
            { width: 390, height: 844, name: 'mobile' },
            { width: 1280, height: 720, name: 'desktop' }
          ]
        }
      }
    };
    await expect(validator.validate(config)).resolves.toBeUndefined();
  });

  it('requires iterations or duration', async () => {
    const config: SynapseConfig = {
      name: 't',
      baseUrl: 'https://api.example.com',
      execution: { mode: 'construct' }
    };
    await expect(validator.validate(config)).rejects.toThrow(/iterations or duration/);
  });
});
