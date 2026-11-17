import { Command } from 'commander';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ExitCode } from '../utils/exitCodes';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

function checkCommand(cmd: string): { ok: boolean; detail: string } {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return { ok: true, detail: out.split('\n')[0] };
  } catch (error: any) {
    return { ok: false, detail: error?.message || 'not found' };
  }
}

export async function runDoctor(options: { json?: boolean } = {}): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const node = checkCommand('node --version');
  results.push({
    name: 'Node.js',
    ok: node.ok,
    detail: node.ok ? node.detail : 'Node.js >= 16 required',
    required: true
  });

  const k6 = checkCommand('k6 version');
  results.push({
    name: 'K6',
    ok: k6.ok,
    detail: k6.ok ? k6.detail : 'Install K6 or run synapse (postinstall may auto-install)',
    required: true
  });

  // Puppeteer / Chromium for screenshot comparison
  let puppeteerOk = false;
  let puppeteerDetail = 'puppeteer not installed';
  try {
    const puppeteerPath = require.resolve('puppeteer/package.json');
    const pkg = JSON.parse(fs.readFileSync(puppeteerPath, 'utf8'));
    puppeteerOk = true;
    puppeteerDetail = `puppeteer ${pkg.version}`;
  } catch {
    puppeteerDetail = 'Optional — needed for screenshot / visual-text comparison';
  }
  results.push({
    name: 'Puppeteer',
    ok: puppeteerOk,
    detail: puppeteerDetail,
    required: false
  });

  let sharpOk = false;
  let sharpDetail = 'sharp not installed';
  try {
    const sharpPath = require.resolve('sharp/package.json');
    const pkg = JSON.parse(fs.readFileSync(sharpPath, 'utf8'));
    sharpOk = true;
    sharpDetail = `sharp ${pkg.version}`;
  } catch {
    sharpDetail = 'Optional — needed for image comparison';
  }
  results.push({
    name: 'Sharp',
    ok: sharpOk,
    detail: sharpDetail,
    required: false
  });

  // Package identity
  try {
    const pkgPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    results.push({
      name: 'Synapse package',
      ok: true,
      detail: `${pkg.name}@${pkg.version} (CLI bin: synapse)`,
      required: true
    });
  } catch {
    results.push({
      name: 'Synapse package',
      ok: false,
      detail: 'Could not read package.json',
      required: true
    });
  }

  if (options.json) {
    console.log(JSON.stringify({ checks: results }, null, 2));
  } else {
    console.log(chalk.blue('🩺 Synapse doctor\n'));
    for (const check of results) {
      const icon = check.ok ? chalk.green('✔') : check.required ? chalk.red('✖') : chalk.yellow('⚠');
      const label = check.required ? 'required' : 'optional';
      console.log(`${icon} ${check.name} (${label}): ${check.detail}`);
    }
    const missingRequired = results.filter(r => r.required && !r.ok);
    if (missingRequired.length) {
      console.log(chalk.red(`\n${missingRequired.length} required check(s) failed.`));
    } else {
      console.log(chalk.green('\nAll required checks passed.'));
    }
  }

  return results;
}

export const doctorCommand = new Command('doctor')
  .description('Check local dependencies (Node, K6, Puppeteer, Sharp)')
  .option('--json', 'Print machine-readable JSON')
  .action(async (options) => {
    const results = await runDoctor(options);
    const failed = results.some(r => r.required && !r.ok);
    process.exit(failed ? ExitCode.DEPENDENCY_MISSING : ExitCode.SUCCESS);
  });
