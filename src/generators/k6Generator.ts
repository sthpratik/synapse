import { SynapseConfig, GeneratedParameter } from '../types/config';
import { ParameterGenerator } from './parameterGenerator';
import { UrlConstructor } from './urlConstructor';
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

    // Set execution options
    if (execution.concurrent) {
      options.vus = execution.concurrent;
    }
    
    if (execution.iterations) {
      options.iterations = execution.iterations;
    }
    
    if (execution.duration) {
      options.duration = execution.duration;
    }

    // Merge with k6Options
    options = { ...options, ...k6Options };

    return `export let options = ${JSON.stringify(options, null, 2)};`;
  }

  private async generateTestData(): Promise<string> {
    if (this.config.execution.mode === 'batch') {
      return await this.generateBatchData();
    } else {
      return await this.generateConstructData();
    }
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
    if (!this.config.parameters) {
      return `
function constructUrl() {
  return '${this.config.baseUrl}';
}`;
    }

    const parameterGenerators = this.config.parameters.map(param => {
      switch (param.type) {
        case 'integer':
          return `
  // ${param.name}: integer parameter
  const ${param.name} = Math.floor(Math.random() * (${param.max || 100} - ${param.min || 0} + 1)) + ${param.min || 0};`;
        
        case 'string':
          const charset = this.getCharsetForScript(param.charset || 'alphanumeric', param.customChars);
          return `
  // ${param.name}: string parameter
  const ${param.name}Charset = '${charset}';
  let ${param.name} = '';
  for (let i = 0; i < ${param.length || 10}; i++) {
    ${param.name} += ${param.name}Charset.charAt(Math.floor(Math.random() * ${param.name}Charset.length));
  }`;
        
        case 'array':
          return `
  // ${param.name}: array parameter
  const ${param.name}Values = ${JSON.stringify(param.values)};
  const ${param.name} = ${param.name}Values[Math.floor(Math.random() * ${param.name}Values.length)];`;
        
        case 'csv':
          // For CSV, we'll pre-load the data
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

    // Generate CSV data loading
    const csvDataLoaders = await Promise.all(
      this.config.parameters
        .filter(param => param.type === 'csv')
        .map(async param => {
          const data = await this.loadCsvColumn(param.file!, param.column!);
          return `const ${param.name}Data = ${JSON.stringify(data)};`;
        })
    );

    return `
${csvDataLoaders.join('\n')}

function constructUrl() {
${parameterGenerators}
  
  let url = '${this.config.baseUrl}';
  const params = [];
${this.config.parameters.map(param => 
  `  params.push('${param.name}=' + encodeURIComponent(${param.name}));`
).join('\n')}
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
}`;
  }

  private generateMainFunction(): string {
    const method = this.config.request?.method || 'GET';
    const headers = this.config.request?.headers || {};
    const body = this.config.request?.body;

    let requestOptions = '';
    if (Object.keys(headers).length > 0 || body) {
      const options: any = {};
      if (Object.keys(headers).length > 0) {
        options.headers = headers;
      }
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = body;
      }
      requestOptions = `, ${JSON.stringify(options, null, 2)}`;
    }

    const urlFunction = this.config.execution.mode === 'batch' ? 'getRandomUrl()' : 'constructUrl()';

    return `
export default function() {
  const url = ${urlFunction};
  
  const response = http.${method.toLowerCase()}(url${requestOptions});
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
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
