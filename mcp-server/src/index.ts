#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { z } from 'zod';

const RunLoadTestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  concurrent: z.number().int().min(1).max(1000),
  requests: z.number().int().min(1).max(100000),
  output: z.string().optional(),
  dryRun: z.boolean().optional(),
  keepScript: z.boolean().optional(),
});

const CreateConfigSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  concurrent: z.number().int().min(1).max(1000).optional(),
  iterations: z.number().int().min(1).max(100000).optional(),
  type: z.enum(['basic', 'screenshot', 'visual-text', 'image', 'text', 'mobile', 'batch', 'advanced']).optional(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(['integer', 'string', 'array', 'csv', 'static', 'url']),
    min: z.number().optional(),
    max: z.number().optional(),
    values: z.array(z.union([z.string(), z.number()])).optional(),
    file: z.string().optional(),
    column: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
  })).optional(),
});

class SynapseMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'synapse-mcp-server',
        version: '1.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_load_test',
          description: 'Run a simple load test against a URL with specified concurrent users and total requests',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', format: 'uri', description: 'Target URL to test' },
              concurrent: { type: 'number', minimum: 1, maximum: 1000, description: 'Number of concurrent users' },
              requests: { type: 'number', minimum: 1, maximum: 100000, description: 'Total number of requests to make' },
              output: { type: 'string', description: 'Output directory for results (optional)' },
              dryRun: { type: 'boolean', description: 'Generate script without running (optional)' },
              keepScript: { type: 'boolean', description: 'Keep generated K6 script (optional)' },
            },
            required: ['url', 'concurrent', 'requests'],
          },
        },
        {
          name: 'create_config',
          description: 'Create a Synapse configuration file (optionally from a template type)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Test name' },
              url: { type: 'string', format: 'uri', description: 'Base URL for testing' },
              concurrent: { type: 'number', minimum: 1, maximum: 1000 },
              iterations: { type: 'number', minimum: 1, maximum: 100000 },
              type: {
                type: 'string',
                enum: ['basic', 'screenshot', 'visual-text', 'image', 'text', 'mobile', 'batch', 'advanced'],
                description: 'Init template type',
              },
              parameters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['integer', 'string', 'array', 'csv', 'static', 'url'] },
                    min: { type: 'number' },
                    max: { type: 'number' },
                    values: { type: 'array' },
                    file: { type: 'string' },
                    column: { type: 'string' },
                    value: {},
                  },
                  required: ['name', 'type'],
                },
              },
            },
            required: ['name', 'url'],
          },
        },
        {
          name: 'run_config_test',
          description: 'Run load test from a configuration file',
          inputSchema: {
            type: 'object',
            properties: {
              config: { type: 'string', description: 'Path to configuration file (default: synapse.yml)' },
              output: { type: 'string' },
              dryRun: { type: 'boolean' },
              compare: { type: 'boolean', description: 'Enable comparison post-processing' },
              failOnDiff: { type: 'boolean', description: 'Fail when comparison thresholds miss' },
            },
          },
        },
        {
          name: 'validate_config',
          description: 'Validate a Synapse configuration file',
          inputSchema: {
            type: 'object',
            properties: {
              config: { type: 'string', description: 'Path to configuration file to validate' },
            },
            required: ['config'],
          },
        },
        {
          name: 'compare_urls',
          description: 'Compare URL pairs from a CSV file (image/text/screenshot/visual-text)',
          inputSchema: {
            type: 'object',
            properties: {
              file: { type: 'string', description: 'CSV path with url1,url2 columns' },
              type: { type: 'string', enum: ['image', 'text', 'screenshot', 'visual-text'] },
              output: { type: 'string' },
              failOnDiff: { type: 'boolean' },
              saveScreenshots: { type: 'boolean' },
            },
            required: ['file'],
          },
        },
        {
          name: 'import_spec',
          description: 'Import OpenAPI or HAR into synapse.yml',
          inputSchema: {
            type: 'object',
            properties: {
              openapi: { type: 'string', description: 'Path to OpenAPI file' },
              har: { type: 'string', description: 'Path to HAR file' },
              output: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
        {
          name: 'doctor',
          description: 'Check Synapse dependencies (Node, K6, Puppeteer, Sharp)',
          inputSchema: {
            type: 'object',
            properties: {
              json: { type: 'boolean' },
            },
          },
        },
        {
          name: 'init_config',
          description: 'Initialize a Synapse config from a built-in template',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              type: {
                type: 'string',
                enum: ['basic', 'screenshot', 'visual-text', 'image', 'text', 'mobile', 'batch', 'advanced'],
              },
              output: { type: 'string' },
            },
            required: ['url'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'run_load_test':
            return await this.runLoadTest(args);
          case 'create_config':
            return await this.createConfig(args);
          case 'run_config_test':
            return await this.runConfigTest(args);
          case 'validate_config':
            return await this.validateConfig(args);
          case 'compare_urls':
            return await this.compareUrls(args);
          case 'import_spec':
            return await this.importSpec(args);
          case 'doctor':
            return await this.doctor(args);
          case 'init_config':
            return await this.initConfig(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private run(command: string, timeout = 300000) {
    const output = execSync(command, { encoding: 'utf8', timeout });
    return {
      content: [
        {
          type: 'text',
          text: `Success!\n\nCommand: ${command}\n\nOutput:\n${output}`,
        },
      ],
    };
  }

  private async runLoadTest(args: any) {
    const params = RunLoadTestSchema.parse(args);
    let command = `synapse test --url "${params.url}" --concurrent ${params.concurrent} --requests ${params.requests}`;
    if (params.output) command += ` --output "${params.output}"`;
    if (params.dryRun) command += ' --dry-run';
    if (params.keepScript) command += ' --keep-script';
    return this.run(command);
  }

  private async createConfig(args: any) {
    const params = CreateConfigSchema.parse(args);
    if (params.type) {
      let command = `synapse init --name "${params.name}" --url "${params.url}" --type ${params.type}`;
      return this.run(command, 60000);
    }

    const config = {
      name: params.name,
      baseUrl: params.url,
      execution: {
        mode: 'construct',
        concurrent: params.concurrent || 10,
        iterations: params.iterations || 100,
      },
      parameters: params.parameters || [],
      request: {
        method: 'GET',
      },
    };

    const yamlContent = this.objectToYaml(config);
    const fs = require('fs');
    fs.writeFileSync('synapse.yml', yamlContent);
    return {
      content: [{ type: 'text', text: `Configuration file created!\n\nFile: synapse.yml\n\n${yamlContent}` }],
    };
  }

  private async runConfigTest(args: any) {
    let command = 'synapse run';
    if (args.config) command += ` --config "${args.config}"`;
    if (args.output) command += ` --output "${args.output}"`;
    if (args.dryRun) command += ' --dry-run';
    if (args.compare) command += ' --compare';
    if (args.failOnDiff) command += ' --fail-on-diff';
    return this.run(command);
  }

  private async validateConfig(args: any) {
    return this.run(`synapse validate --config "${args.config}"`, 60000);
  }

  private async compareUrls(args: any) {
    let command = `synapse compare --file "${args.file}"`;
    if (args.type) command += ` --type ${args.type}`;
    if (args.output) command += ` --output "${args.output}"`;
    if (args.failOnDiff) command += ' --fail-on-diff';
    if (args.saveScreenshots) command += ' --save-screenshots';
    return this.run(command);
  }

  private async importSpec(args: any) {
    let command = 'synapse import';
    if (args.openapi) command += ` --openapi "${args.openapi}"`;
    if (args.har) command += ` --har "${args.har}"`;
    if (args.output) command += ` --output "${args.output}"`;
    if (args.name) command += ` --name "${args.name}"`;
    return this.run(command, 60000);
  }

  private async doctor(args: any) {
    return this.run(`synapse doctor${args?.json ? ' --json' : ''}`, 60000);
  }

  private async initConfig(args: any) {
    let command = `synapse init --url "${args.url}"`;
    if (args.name) command += ` --name "${args.name}"`;
    if (args.type) command += ` --type ${args.type}`;
    if (args.output) command += ` --output "${args.output}"`;
    return this.run(command, 60000);
  }

  private objectToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.objectToYaml(item, indent + 2)}`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
      }
    }

    return yaml;
  }

  async runServer() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Synapse MCP server running on stdio');
  }
}

const server = new SynapseMCPServer();
server.runServer().catch(console.error);
