import { Parameter, GeneratedParameter } from '../types/config';
import * as fs from 'fs';
import csv from 'csv-parser';

export class ParameterGenerator {
  private csvCache: Map<string, any[]> = new Map();

  async generateParameter(param: Parameter): Promise<string | number> {
    switch (param.type) {
      case 'integer':
        return this.generateInteger(param);
      case 'string':
        return this.generateString(param);
      case 'array':
        return this.generateFromArray(param);
      case 'csv':
        return await this.generateFromCsv(param);
      case 'url':
        return await this.generateUrl(param);
      default:
        throw new Error(`Unsupported parameter type: ${param.type}`);
    }
  }

  private generateInteger(param: Parameter): number {
    const min = param.min || 0;
    const max = param.max || 100;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    
    if (param.length) {
      return parseInt(value.toString().padStart(param.length, '0'));
    }
    
    return value;
  }

  private generateString(param: Parameter): string {
    const length = param.length || 10;
    const charset = this.getCharset(param.charset || 'alphanumeric', param.customChars);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  }

  private generateFromArray(param: Parameter): string | number {
    if (!param.values || param.values.length === 0) {
      throw new Error(`Array parameter '${param.name}' must have values defined`);
    }
    
    const randomIndex = Math.floor(Math.random() * param.values.length);
    return param.values[randomIndex];
  }

  private async generateFromCsv(param: Parameter): Promise<string> {
    if (!param.file || !param.column) {
      throw new Error(`CSV parameter '${param.name}' must have file and column defined`);
    }

    const data = await this.loadCsvData(param.file);
    if (data.length === 0) {
      throw new Error(`No data found in CSV file: ${param.file}`);
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const value = data[randomIndex][param.column];
    
    if (value === undefined) {
      throw new Error(`Column '${param.column}' not found in CSV file: ${param.file}`);
    }
    
    return value.toString();
  }

  private async generateUrl(param: Parameter): Promise<string> {
    const url = await this.generateFromCsv(param);
    
    if (param.encoding === 'base64') {
      return Buffer.from(url).toString('base64');
    } else if (param.encoding === 'url') {
      return encodeURIComponent(url);
    }
    
    return url;
  }

  private async loadCsvData(filePath: string): Promise<any[]> {
    if (this.csvCache.has(filePath)) {
      return this.csvCache.get(filePath)!;
    }

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          this.csvCache.set(filePath, results);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  private getCharset(type: string, customChars?: string): string {
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

  async generateParameterSet(parameters: Parameter[]): Promise<GeneratedParameter[]> {
    const generated: GeneratedParameter[] = [];
    
    for (const param of parameters) {
      const value = await this.generateParameter(param);
      generated.push({ name: param.name, value });
    }
    
    return generated;
  }
}
