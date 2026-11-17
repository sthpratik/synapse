import { SynapseConfig, GeneratedParameter, RequestCheck } from '../types/config';
import { ParameterGenerator } from './parameterGenerator';
import { UrlConstructor } from './urlConstructor';
import { mergeHeaders, resolveAuth } from '../utils/auth';
import * as fs from 'fs';
import csv from 'csv-parser';

export class K6Generator {
  private parameterGenerator: ParameterGenerator;
  private urlConstructor: UrlConstructor;

  constructor(private config: SynapseConfig) {
    this.parameterGenerator = new ParameterGenerator();
    this.urlConstructor = new UrlConstructor(config);
  }

  async generateK6Script(): Promise<string> {
    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

${this.generateOptions()}

${await this.generateTestData()}

${this.generateMainFunction()}
`;
    return script;
  }

  private generateOptions(): string {
    const execution = this.config.execution;
    const k6Options = this.config.k6Options || {};

    let options: any = {};

    if (execution.concurrent) {
      options.vus = execution.concurrent;
    }

    if (execution.iterations) {
      options.iterations = execution.iterations;
    }

    if (execution.duration) {
      options.duration = execution.duration;
    }

    options = { ...options, ...k6Options };

    return `export let options = ${JSON.stringify(options, null, 2)};`;
  }

  private async generateTestData(): Promise<string> {
    if (this.config.execution.mode === 'batch') {
      return await this.generateBatchData();
    }
    return await this.generateConstructData();
  }

  private async generateBatchData(): Promise<string> {
    if (!this.config.batch) {
      throw new Error('Batch mode requires batch configuration');
    }

    const urls = await this.loadUrlsFromCsv(this.config.batch.file, this.config.batch.column);

    return `
const testUrls = ${JSON.stringify(urls, null, 2)};

function getRandomUrl() {
  return testUrls[Math.floor(Math.random() * testUrls.length)];
}`;
  }

  private async generateConstructData(): Promise<string> {
    if (!this.config.parameters || this.config.parameters.length === 0) {
      const authQuery = this.authQuerySuffix('url');
      return `
function constructUrl() {
  let url = '${this.config.baseUrl}';
${authQuery}
  return url;
}`;
    }

    const parameterGenerators = this.config.parameters.map(param => {
      switch (param.type) {
        case 'integer':
          return `
  // ${param.name}: integer parameter
  const ${param.name} = Math.floor(Math.random() * (${param.max || 100} - ${param.min || 0} + 1)) + ${param.min || 0};`;

        case 'string': {
          const charset = this.getCharsetForScript(param.charset || 'alphanumeric', param.customChars);
          return `
  // ${param.name}: string parameter
  const ${param.name}Charset = '${charset}';
  let ${param.name} = '';
  for (let i = 0; i < ${param.length || 10}; i++) {
    ${param.name} += ${param.name}Charset.charAt(Math.floor(Math.random() * ${param.name}Charset.length));
  }`;
        }

        case 'array':
          return `
  // ${param.name}: array parameter
  const ${param.name}Values = ${JSON.stringify(param.values)};
  const ${param.name} = ${param.name}Values[Math.floor(Math.random() * ${param.name}Values.length)];`;

        case 'csv':
          return `
  // ${param.name}: csv parameter (loaded from ${param.file})
  const ${param.name} = ${param.name}Data[Math.floor(Math.random() * ${param.name}Data.length)];`;

        case 'static':
          return `
  // ${param.name}: static parameter
  const ${param.name} = ${JSON.stringify(param.value)};`;

        default:
          return `  const ${param.name} = 'default';`;
      }
    }).join('\n');

    const csvDataLoaders = await Promise.all(
      this.config.parameters
        .filter(param => param.type === 'csv' || param.type === 'url')
        .map(async param => {
          const data = await this.loadCsvColumn(param.file!, param.column!);
          return `const ${param.name}Data = ${JSON.stringify(data)};`;
        })
    );

    const pathParams = this.config.parameters.filter(p => p.in === 'path');
    const queryParams = this.config.parameters.filter(p => p.in !== 'path');

    const pathReplacements = pathParams.map(param =>
      `  url = url.replace('{${param.name}}', encodeURIComponent(String(${param.name})));`
    ).join('\n');

    const queryPushes = queryParams.map(param =>
      `  params.push('${param.name}=' + encodeURIComponent(${param.name}));`
    ).join('\n');

    const authQuery = this.authQuerySuffix('url');

    return `
${csvDataLoaders.join('\n')}

function constructUrl() {
${parameterGenerators}
  
  let url = '${this.config.baseUrl}';
${pathReplacements}
  const params = [];
${queryPushes}
  
  if (params.length > 0) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + params.join('&');
  }
${authQuery}
  
  return url;
}`;
  }

  private authQuerySuffix(urlVar: string): string {
    if (!this.config.auth) return '';
    const { queryParams } = resolveAuth(this.config.auth);
    if (!Object.keys(queryParams).length) return '';
    const entries = Object.entries(queryParams)
      .map(([k, v]) => `'${k}=' + encodeURIComponent(${JSON.stringify(v)})`)
      .join(` + '&' + `);
    return `
  ${urlVar} += (${urlVar}.indexOf('?') >= 0 ? '&' : '?') + ${entries};`;
  }

  private generateMainFunction(): string {
    const method = this.config.request?.method || 'GET';
    const requestOptions = this.buildRequestOptionsLiteral(method);
    const urlFunction = this.config.execution.mode === 'batch' ? 'getRandomUrl()' : 'constructUrl()';
    const thinkTime = this.config.execution.thinkTime ?? 1;

    if (this.config.comparison?.enabled) {
      return this.generateComparisonFunction(urlFunction, method, requestOptions, thinkTime);
    }

    const checks = this.generateChecksBlock();

    return `
export default function() {
  const url = ${urlFunction};
  
  const response = http.${method.toLowerCase()}(url${requestOptions});
  
${checks}
  
  sleep(${thinkTime});
}`;
  }

  private buildRequestOptionsLiteral(method: string): string {
    const headers = mergeHeaders(this.config.request?.headers || {}, this.config.auth);
    const options: any = {};

    if (Object.keys(headers).length > 0) {
      options.headers = { ...headers };
    }

    if (this.config.request?.json !== undefined) {
      options.headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      options.body = JSON.stringify(this.config.request.json);
    } else if (this.config.request?.body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = this.config.request.body;
    }

    if (!Object.keys(options).length) {
      return '';
    }

    return `, ${JSON.stringify(options, null, 2)}`;
  }

  private generateChecksBlock(responseVar = 'response'): string {
    const configured = this.config.request?.checks;
    if (configured && configured.length > 0) {
      const entries = configured.map(check => this.checkToK6Entry(check, responseVar));
      return `  check(${responseVar}, {\n${entries.join(',\n')}\n  });`;
    }

    return `  check(${responseVar}, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });`;
  }

  private checkToK6Entry(checkCfg: RequestCheck, responseVar: string): string {
    const name = checkCfg.name || this.defaultCheckName(checkCfg);

    if (checkCfg.status === 'ok') {
      return `    ${JSON.stringify(name)}: (r) => r.status >= 200 && r.status < 300`;
    }
    if (typeof checkCfg.status === 'number') {
      return `    ${JSON.stringify(name)}: (r) => r.status === ${checkCfg.status}`;
    }
    if (checkCfg.maxDuration !== undefined) {
      return `    ${JSON.stringify(name)}: (r) => r.timings.duration < ${checkCfg.maxDuration}`;
    }
    if (checkCfg.bodyContains) {
      return `    ${JSON.stringify(name)}: (r) => String(r.body).indexOf(${JSON.stringify(checkCfg.bodyContains)}) !== -1`;
    }
    if (checkCfg.jsonPath) {
      const equalsPart = checkCfg.equals !== undefined
        ? ` && String(val) === ${JSON.stringify(String(checkCfg.equals))}`
        : '';
      // Inline minimal path walker for K6 (no external deps)
      return `    ${JSON.stringify(name)}: (r) => {
      try {
        const data = r.json();
        const parts = ${JSON.stringify(checkCfg.jsonPath.replace(/^\$\.?/, ''))}.split('.').filter(Boolean);
        let val = data;
        for (const p of parts) { val = val == null ? undefined : val[p]; }
        return val !== undefined${equalsPart};
      } catch (e) { return false; }
    }`;
    }

    return `    ${JSON.stringify(name)}: (r) => r.status === 200`;
  }

  private defaultCheckName(checkCfg: RequestCheck): string {
    if (checkCfg.status !== undefined) return `status is ${checkCfg.status}`;
    if (checkCfg.maxDuration !== undefined) return `duration < ${checkCfg.maxDuration}ms`;
    if (checkCfg.jsonPath) return `json path ${checkCfg.jsonPath}`;
    if (checkCfg.bodyContains) return `body contains ${checkCfg.bodyContains}`;
    return 'custom check';
  }

  private generateComparisonFunction(
    urlFunction: string,
    method: string,
    requestOptions: string,
    thinkTime: number
  ): string {
    const comparison = this.config.comparison!;

    return `
export default function() {
  const url1 = ${urlFunction};
  const url2 = url1.replace('${this.config.baseUrl}', '${comparison.baseUrl2}');
  
  const startTime = Date.now();
  
  const response1 = http.${method.toLowerCase()}(url1${requestOptions});
  const response2 = http.${method.toLowerCase()}(url2${requestOptions});
  
  const responseTime = Date.now() - startTime;
  
  check(response1, {
    'url1 status is 200': (r) => r.status === 200,
  });
  
  check(response2, {
    'url2 status is 200': (r) => r.status === 200,
  });
  
  console.log(JSON.stringify({
    type: 'comparison',
    iteration: __ITER,
    url1: url1,
    url2: url2,
    responseTime: responseTime,
    url1Status: response1.status,
    url2Status: response2.status,
    url1Size: response1.body ? response1.body.length : 0,
    url2Size: response2.body ? response2.body.length : 0,
    sizeMatch: response1.status === 200 && response2.status === 200 ? response1.body.length === response2.body.length : false,
    similarity: response1.status === 200 && response2.status === 200 ? (response1.body.length === response2.body.length ? 100 : 0) : 0,
    timestamp: new Date().toISOString()
  }));
  
  sleep(${thinkTime});
}`;
  }

  private async loadUrlsFromCsv(filePath: string, column: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const urls: string[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => {
          if (data[column]) {
            urls.push(data[column]);
          }
        })
        .on('end', () => resolve(urls))
        .on('error', reject);
    });
  }

  private async loadCsvColumn(filePath: string, column: string): Promise<string[]> {
    return this.loadUrlsFromCsv(filePath, column);
  }

  private getCharsetForScript(type: string, customChars?: string): string {
    switch (type) {
      case 'alpha':
        return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      case 'numeric':
        return '0123456789';
      case 'alphanumeric':
        return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      case 'custom':
        return customChars || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      default:
        return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }
  }
}
