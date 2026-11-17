import * as fs from 'fs';
import * as path from 'path';
import { SynapseConfig } from '../types/config';

export interface HarImportOptions {
  name?: string;
  concurrent?: number;
  duration?: string;
  includeStatic?: boolean;
  outputCsv?: string;
}

const STATIC_EXT = /\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|mp3)(\?|$)/i;

/**
 * Convert a HAR capture into Synapse batch-mode config + URL CSV.
 */
export function importHar(filePath: string, options: HarImportOptions = {}): {
  config: SynapseConfig;
  urls: string[];
  csvPath: string;
} {
  const raw = fs.readFileSync(filePath, 'utf8');
  const har = JSON.parse(raw);
  const entries = har?.log?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('HAR file has no log.entries');
  }

  const urls: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const url = entry?.request?.url;
    const method = (entry?.request?.method || 'GET').toUpperCase();
    if (!url || typeof url !== 'string') continue;
    if (method !== 'GET' && method !== 'HEAD') continue;
    if (!options.includeStatic && STATIC_EXT.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  if (!urls.length) {
    throw new Error('No eligible GET/HEAD URLs found in HAR (try --include-static)');
  }

  const csvPath = options.outputCsv || path.join(path.dirname(filePath), 'har-urls.csv');
  const csvContent = ['url', ...urls.map(u => csvEscape(u))].join('\n') + '\n';
  fs.writeFileSync(csvPath, csvContent);

  const firstUrl = new URL(urls[0]);
  const baseUrl = `${firstUrl.protocol}//${firstUrl.host}`;

  const config: SynapseConfig = {
    name: options.name || 'Imported HAR Test',
    description: `Imported from ${filePath} (${urls.length} unique URLs)`,
    baseUrl,
    execution: {
      mode: 'batch',
      concurrent: options.concurrent || 10,
      duration: options.duration || '2m'
    },
    batch: {
      file: csvPath,
      column: 'url'
    },
    request: {
      method: 'GET',
      headers: {
        'User-Agent': 'Synapse Load Tester'
      },
      checks: [
        { status: 'ok' },
        { maxDuration: 3000 }
      ]
    },
    k6Options: {
      thresholds: {
        http_req_duration: ['p(95)<3000'],
        checks: ['rate>0.9']
      }
    }
  };

  return { config, urls, csvPath };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
