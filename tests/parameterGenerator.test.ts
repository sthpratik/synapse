import { ParameterGenerator } from '../src/generators/parameterGenerator';
import { Parameter } from '../src/types/config';
import * as fs from 'fs';
import * as path from 'path';

describe('ParameterGenerator', () => {
  let generator: ParameterGenerator;

  beforeEach(() => {
    generator = new ParameterGenerator();
  });

  describe('generateInteger', () => {
    it('should generate integer within range', async () => {
      const param: Parameter = {
        name: 'testId',
        type: 'integer',
        min: 1,
        max: 10
      };

      const value = await generator.generateParameter(param) as number;
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('should pad integer with zeros when length specified', async () => {
      const param: Parameter = {
        name: 'testId',
        type: 'integer',
        min: 1,
        max: 99,
        length: 5
      };

      const value = await generator.generateParameter(param) as number;
      const valueStr = value.toString();
      expect(valueStr.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateString', () => {
    it('should generate string of specified length', async () => {
      const param: Parameter = {
        name: 'sessionId',
        type: 'string',
        length: 16,
        charset: 'alphanumeric'
      };

      const value = await generator.generateParameter(param) as string;
      expect(typeof value).toBe('string');
      expect(value.length).toBe(16);
    });

    it('should generate string with custom charset', async () => {
      const param: Parameter = {
        name: 'customId',
        type: 'string',
        length: 10,
        charset: 'custom',
        customChars: 'ABC123'
      };

      const value = await generator.generateParameter(param) as string;
      expect(typeof value).toBe('string');
      expect(value.length).toBe(10);
      expect(/^[ABC123]+$/.test(value)).toBe(true);
    });
  });

  describe('generateFromArray', () => {
    it('should generate value from array', async () => {
      const param: Parameter = {
        name: 'category',
        type: 'array',
        values: ['tech', 'business', 'health']
      };

      const value = await generator.generateParameter(param);
      expect(['tech', 'business', 'health']).toContain(value);
    });

    it('should throw error for empty array', async () => {
      const param: Parameter = {
        name: 'category',
        type: 'array',
        values: []
      };

      await expect(generator.generateParameter(param)).rejects.toThrow();
    });
  });

  describe('generateParameterSet', () => {
    it('should generate multiple parameters', async () => {
      const parameters: Parameter[] = [
        { name: 'id', type: 'integer', min: 1, max: 100 },
        { name: 'category', type: 'array', values: ['a', 'b', 'c'] },
        { name: 'session', type: 'string', length: 8 }
      ];

      const result = await generator.generateParameterSet(parameters);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('id');
      expect(result[1].name).toBe('category');
      expect(result[2].name).toBe('session');
    });
  });
});
