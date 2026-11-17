import * as Joi from 'joi';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { SynapseConfig } from '../types/config';

export class ConfigValidator {
  private schema: Joi.ObjectSchema;

  constructor() {
    this.schema = this.createSchema();
  }

  async validate(config: SynapseConfig): Promise<void> {
    const { error } = this.schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    await this.validateCustomRules(config);
  }

  async validateFile(configPath: string): Promise<boolean> {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.parse(configContent) as SynapseConfig;
      await this.validate(config);
      return true;
    } catch (error) {
      console.error('Validation error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  private createSchema(): Joi.ObjectSchema {
    const parameterSchema = Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('integer', 'string', 'array', 'csv', 'url', 'static').required(),
      min: Joi.number().when('type', { is: 'integer', then: Joi.optional() }),
      max: Joi.number().when('type', { is: 'integer', then: Joi.optional() }),
      length: Joi.number().positive().optional(),
      charset: Joi.string().valid('alphanumeric', 'alpha', 'numeric', 'custom').when('type', { is: 'string', then: Joi.optional() }),
      customChars: Joi.string().when('charset', { is: 'custom', then: Joi.required(), otherwise: Joi.optional() }),
      values: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number())).when('type', { is: 'array', then: Joi.required() }),
      file: Joi.string().when('type', { is: Joi.valid('csv', 'url'), then: Joi.required() }),
      column: Joi.string().when('type', { is: Joi.valid('csv', 'url'), then: Joi.required() }),
      encoding: Joi.string().valid('base64').when('type', { is: 'url', then: Joi.optional() }),
      value: Joi.alternatives().try(Joi.string(), Joi.number()).when('type', { is: 'static', then: Joi.required() }),
      unique: Joi.boolean().optional(),
      in: Joi.string().valid('query', 'path').optional()
    });

    const checkSchema = Joi.object({
      status: Joi.alternatives().try(Joi.number().integer(), Joi.valid('ok')).optional(),
      maxDuration: Joi.number().positive().optional(),
      jsonPath: Joi.string().optional(),
      equals: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
      bodyContains: Joi.string().optional(),
      name: Joi.string().optional()
    }).or('status', 'maxDuration', 'jsonPath', 'bodyContains');

    const viewportSchema = Joi.object({
      width: Joi.number().positive().required(),
      height: Joi.number().positive().required(),
      name: Joi.string().optional()
    });

    return Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      baseUrl: Joi.string().uri().required(),
      execution: Joi.object({
        mode: Joi.string().valid('construct', 'batch').required(),
        concurrent: Joi.number().positive().optional(),
        iterations: Joi.number().positive().optional(),
        duration: Joi.string().optional(),
        thinkTime: Joi.number().min(0).optional()
      }).required(),
      k6Options: Joi.object().optional(),
      parameters: Joi.array().items(parameterSchema).optional(),
      batch: Joi.object({
        file: Joi.string().required(),
        column: Joi.string().required()
      }).when('execution.mode', { is: 'batch', then: Joi.required() }),
      auth: Joi.object({
        type: Joi.string().valid('bearer', 'basic', 'apiKey').required(),
        token: Joi.string().optional(),
        username: Joi.string().optional(),
        password: Joi.string().optional(),
        header: Joi.string().optional(),
        queryParam: Joi.string().optional(),
        in: Joi.string().valid('header', 'query').optional()
      }).optional(),
      request: Joi.object({
        method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS').optional(),
        headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        body: Joi.string().optional(),
        json: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
        checks: Joi.array().items(checkSchema).optional()
      }).optional(),
      output: Joi.object({
        format: Joi.string().valid('json', 'influxdb', 'cloud').optional(),
        file: Joi.string().optional()
      }).optional(),
      comparison: Joi.object({
        enabled: Joi.boolean().required(),
        type: Joi.string().valid('image', 'text', 'screenshot', 'visual-text').optional().default('image'),
        baseUrl2: Joi.string().uri().when('enabled', { is: true, then: Joi.required() }),
        threshold: Joi.number().min(0).max(1).optional().default(0.1),
        timeout: Joi.number().positive().optional().default(30000),
        reportFormat: Joi.string().valid('csv', 'json', 'html').optional().default('csv'),
        failOnDiff: Joi.boolean().optional(),
        minSimilarity: Joi.number().min(0).max(100).optional(),
        ignoreJsonPaths: Joi.array().items(Joi.string()).optional(),
        normalizeJson: Joi.boolean().optional(),
        screenshot: Joi.object({
          viewport: Joi.object({
            width: Joi.number().positive().optional().default(1920),
            height: Joi.number().positive().optional().default(1080),
            name: Joi.string().optional()
          }).optional(),
          viewports: Joi.array().items(viewportSchema).optional(),
          waitUntil: Joi.string().valid('load', 'networkidle').optional().default('networkidle'),
          timeout: Joi.number().positive().optional().default(30000),
          fullPage: Joi.boolean().optional(),
          selector: Joi.string().optional(),
          masks: Joi.array().items(Joi.string()).optional(),
          waitForSelector: Joi.string().optional()
        }).optional()
      }).optional()
    });
  }

  private async validateCustomRules(config: SynapseConfig): Promise<void> {
    // Construct mode may omit parameters (hits baseUrl only)
    if (config.execution.mode === 'batch' && !config.batch) {
      throw new Error('Batch mode requires batch configuration');
    }

    if (config.parameters) {
      for (const param of config.parameters) {
        if ((param.type === 'csv' || param.type === 'url') && param.file) {
          if (!fs.existsSync(param.file)) {
            throw new Error(`File not found for parameter '${param.name}': ${param.file}`);
          }
        }

        if (param.type === 'array' && (!param.values || param.values.length === 0)) {
          throw new Error(`Array parameter '${param.name}' must have at least one value`);
        }

        if (param.type === 'integer' && param.min !== undefined && param.max !== undefined && param.min > param.max) {
          throw new Error(`Invalid range for parameter '${param.name}': min (${param.min}) > max (${param.max})`);
        }

        if (param.type === 'static' && param.value === undefined) {
          throw new Error(`Static parameter '${param.name}' must have value defined`);
        }
      }
    }

    if (config.batch?.file && !fs.existsSync(config.batch.file)) {
      throw new Error(`Batch file not found: ${config.batch.file}`);
    }

    if (!config.execution.iterations && !config.execution.duration) {
      throw new Error('Either iterations or duration must be specified');
    }

    if (config.auth) {
      if (config.auth.type === 'bearer' && !config.auth.token) {
        throw new Error('Bearer auth requires token');
      }
      if (config.auth.type === 'basic' && !config.auth.username) {
        throw new Error('Basic auth requires username');
      }
      if (config.auth.type === 'apiKey' && !config.auth.token) {
        throw new Error('API key auth requires token');
      }
    }

    if (config.request?.json && config.request?.body) {
      throw new Error('request.json and request.body cannot both be set');
    }

    if (config.comparison?.enabled) {
      if (!config.comparison.baseUrl2) {
        throw new Error('Comparison mode requires baseUrl2 to be specified');
      }

      if (config.comparison.threshold !== undefined && (config.comparison.threshold < 0 || config.comparison.threshold > 1)) {
        throw new Error('Comparison threshold must be between 0 and 1');
      }
    }
  }
}
