import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { SynapseConfig } from './types/config';
import { ConfigValidator } from './validators/configValidator';
import { K6Generator } from './generators/k6Generator';
import { ComparisonPostProcessor } from './comparison/postProcessor.js';
import { ensureK6Installed } from './utils/k6-checker.js';
import { writeHtmlReport } from './comparison/htmlReport.js';
import { ExitCode } from './utils/exitCodes';

export interface RunOptions {
  outputDir: string;
  dryRun?: boolean;
  keepScript?: boolean;
  enableComparison?: boolean;
  comparisonOnly?: boolean;
  saveScreenshots?: boolean;
  /** Force fail-on-diff even if not set in config */
  failOnDiff?: boolean;
}

export interface SimpleTestOptions {
  url: string;
  concurrent: number;
  requests: number;
  outputDir: string;
  dryRun?: boolean;
  keepScript?: boolean;
}

export class SynapseRunner {
  private validator: ConfigValidator;

  constructor() {
    this.validator = new ConfigValidator();
  }

  async run(configPath: string, options: RunOptions): Promise<void> {
    console.log(chalk.blue('📋 Loading configuration...'));
    const config = await this.loadConfig(configPath);

    console.log(chalk.blue('✅ Validating configuration...'));
    await this.validator.validate(config);

    const hasComparison = config.comparison?.enabled && options.enableComparison;
    const failOnDiff = options.failOnDiff ?? config.comparison?.failOnDiff ?? false;

    if (options.comparisonOnly) {
      if (!config.comparison?.enabled) {
        console.error(chalk.red('❌ Comparison not enabled in config'));
        process.exit(ExitCode.CONFIG_ERROR);
      }
      console.log(chalk.blue('🔍 Running comparison only...'));
      const summary = await this.runComparisonOnly(config, options.outputDir, options.saveScreenshots);
      if (failOnDiff && summary.failedThreshold > 0) {
        console.error(chalk.red(`❌ Comparison failed thresholds (${summary.failedThreshold}/${summary.total})`));
        process.exit(ExitCode.COMPARISON_FAILED);
      }
      return;
    }

    console.log(chalk.blue('🔧 Generating K6 script...'));
    const scriptPath = await this.generateK6Script(config, options.outputDir);

    if (options.dryRun) {
      console.log(chalk.yellow('🏃 Dry run mode - K6 script generated but not executed'));
      console.log(chalk.blue(`📄 Script location: ${scriptPath}`));
      if (hasComparison) {
        console.log(chalk.yellow('💡 Comparison would run after load test'));
      }
      return;
    }

    console.log(chalk.blue('🚀 Running K6 load test...'));
    await this.runK6Test(scriptPath, options.outputDir);

    if (hasComparison) {
      console.log(chalk.blue('🔍 Processing comparison results...'));
      const summary = await this.processComparison(config, options.outputDir, options.saveScreenshots, failOnDiff);
      if (failOnDiff && summary && summary.failedThreshold > 0) {
        if (!options.keepScript && fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        console.error(chalk.red(`❌ Comparison failed thresholds (${summary.failedThreshold}/${summary.total})`));
        process.exit(ExitCode.COMPARISON_FAILED);
      }
    }

    if (!options.keepScript) {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
      console.log(chalk.gray('🗑️  Cleaned up generated script'));
    } else {
      console.log(chalk.blue(`📄 K6 script saved: ${scriptPath}`));
    }

    console.log(chalk.green('✅ Load test completed!'));
  }

  async generateScript(configPath: string, outputPath: string): Promise<void> {
    const config = await this.loadConfig(configPath);
    await this.validator.validate(config);

    const generator = new K6Generator(config);
    const script = await generator.generateK6Script();

    fs.writeFileSync(outputPath, script);
  }

  async runSimpleTest(options: SimpleTestOptions): Promise<void> {
    console.log(chalk.blue('📋 Creating simple test configuration...'));

    const config: SynapseConfig = {
      name: 'Simple Load Test',
      baseUrl: options.url,
      execution: {
        mode: 'construct',
        concurrent: options.concurrent,
        iterations: options.requests
      },
      request: {
        method: 'GET',
        checks: [
          { status: 200 },
          { maxDuration: 500 }
        ]
      }
    };

    console.log(chalk.blue('🔧 Generating K6 script...'));
    const scriptPath = await this.generateK6Script(config, options.outputDir);

    if (options.dryRun) {
      console.log(chalk.yellow('🏃 Dry run mode - K6 script generated but not executed'));
      console.log(chalk.blue(`📄 Script location: ${scriptPath}`));
      return;
    }

    console.log(chalk.blue('🚀 Running K6 load test...'));
    await this.runK6Test(scriptPath, options.outputDir);

    if (!options.keepScript) {
      fs.unlinkSync(scriptPath);
      console.log(chalk.gray('🗑️  Cleaned up generated script'));
    } else {
      console.log(chalk.blue(`📄 K6 script saved: ${scriptPath}`));
    }

    console.log(chalk.green('✅ Load test completed!'));
  }

  private async loadConfig(configPath: string): Promise<SynapseConfig> {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.parse(configContent) as SynapseConfig;
  }

  private async generateK6Script(config: SynapseConfig, outputDir: string): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const generator = new K6Generator(config);
    const script = await generator.generateK6Script();

    const scriptPath = path.join(outputDir, 'test.js');
    fs.writeFileSync(scriptPath, script);

    return scriptPath;
  }

  private async runK6Test(scriptPath: string, outputDir: string): Promise<void> {
    const k6Available = await ensureK6Installed(true);
    if (!k6Available) {
      const err: any = new Error('K6 not found');
      err.exitCode = ExitCode.DEPENDENCY_MISSING;
      throw err;
    }

    const outputFile = path.join(outputDir, 'results.json');
    const logFile = path.join(outputDir, 'k6.log');
    const command = `k6 run --out json=${outputFile} --console-output=${logFile} ${scriptPath}`;

    try {
      console.log(chalk.gray(`Running: ${command}`));
      execSync(command, { stdio: 'inherit' });
      console.log(chalk.green(`📊 Results saved to: ${outputFile}`));

      if (fs.existsSync(logFile)) {
        await this.parseComparisonLogs(logFile, outputDir);
      }
    } catch (error) {
      if (fs.existsSync(logFile)) {
        await this.parseComparisonLogs(logFile, outputDir);
      }
      // K6 non-zero usually means thresholds failed — preserve as general error for CI
      throw new Error('K6 test execution failed (thresholds may have been exceeded)');
    }
  }

  private async parseComparisonLogs(logFile: string, outputDir: string): Promise<void> {
    try {
      const logContent = fs.readFileSync(logFile, 'utf-8');
      const comparisonResults = [];

      const lines = logContent.split('\n');
      for (const line of lines) {
        if (line.includes('"type":"comparison"')) {
          try {
            const jsonStart = line.indexOf('{"type":"comparison"');
            if (jsonStart !== -1) {
              const jsonStr = line.substring(jsonStart);
              const data = JSON.parse(jsonStr);
              comparisonResults.push(data);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }

      if (comparisonResults.length > 0) {
        const csvHeaders = 'Iteration,URL1,URL2,ResponseTime(ms),URL1_Status,URL2_Status,URL1_Size,URL2_Size,SizeMatch,Similarity%,Timestamp\n';
        const csvRows = comparisonResults.map(r =>
          `${r.iteration},"${r.url1}","${r.url2}",${r.responseTime},${r.url1Status},${r.url2Status},${r.url1Size},${r.url2Size},${r.sizeMatch},${r.similarity},${r.timestamp}`
        ).join('\n');
        const csvContent = csvHeaders + csvRows;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        fs.writeFileSync(path.join(outputDir, 'comparison-results.json'), JSON.stringify(comparisonResults, null, 2));
        fs.writeFileSync(path.join(outputDir, `basic-comparison-${timestamp}.csv`), csvContent);

        console.log(chalk.green(`📊 Basic comparison results: ${comparisonResults.length} entries`));
        console.log(chalk.blue(`📁 Basic CSV: basic-comparison-${timestamp}.csv`));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not parse comparison logs'));
    }
  }

  async checkK6Installation(): Promise<boolean> {
    try {
      execSync('k6 version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async processComparison(
    config: SynapseConfig,
    outputDir: string,
    saveScreenshots?: boolean,
    failOnDiff?: boolean
  ) {
    const resultsPath = path.join(outputDir, 'comparison-results.json');

    if (!fs.existsSync(resultsPath)) {
      console.log(chalk.yellow('⚠️  No comparison results found, skipping detailed analysis'));
      console.log(chalk.blue('💡 Make sure K6 generated comparison data during the test'));
      return null;
    }

    if (config.comparison!.type === 'image' || config.comparison!.type === 'screenshot' || config.comparison!.type === 'visual-text' || config.comparison!.type === 'text') {
      const typeLabel = config.comparison!.type === 'image' ? '🖼️  image' :
                        config.comparison!.type === 'screenshot' ? '📸 screenshot' :
                        config.comparison!.type === 'visual-text' ? '🔍 visual-text' :
                        '📝 text';
      console.log(chalk.blue(`${typeLabel} Running detailed comparison...`));

      if (saveScreenshots) {
        console.log(chalk.yellow('📁 Debug mode: Screenshots will be saved to output/screenshots/'));
      }

      try {
        const processor = new ComparisonPostProcessor({
          type: config.comparison!.type,
          threshold: config.comparison!.threshold,
          timeout: config.comparison!.timeout,
          screenshot: config.comparison!.screenshot,
          saveScreenshots: saveScreenshots,
          outputDir: outputDir,
          saveDiffImages: true,
          ignoreJsonPaths: config.comparison!.ignoreJsonPaths,
          normalizeJson: config.comparison!.normalizeJson,
          minSimilarity: config.comparison!.minSimilarity,
          failOnDiff
        });

        return await processor.processResults(resultsPath, outputDir);
      } catch (error) {
        console.log(chalk.yellow('⚠️  Detailed comparison failed:'), error instanceof Error ? error.message : String(error));
        console.log(chalk.blue('💡 Basic comparison results are still available in CSV'));
        return null;
      }
    }

    console.log(chalk.blue('📝 Text comparison completed during K6 execution'));
    return null;
  }

  private async runComparisonOnly(config: SynapseConfig, outputDir: string, saveScreenshots?: boolean) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(chalk.blue('🔧 Generating URLs for comparison...'));

    if (saveScreenshots) {
      console.log(chalk.yellow('📁 Debug mode: Screenshots will be saved to output/screenshots/'));
    }

    const urls = await this.generateUrlsForComparison(config);

    console.log(chalk.blue(`📊 Generated ${urls.length} URL pairs for comparison`));

    const { Comparator } = await import('./comparison/index.js');
    const comparator = new Comparator({
      type: config.comparison!.type,
      threshold: config.comparison!.threshold,
      timeout: config.comparison!.timeout,
      screenshot: config.comparison!.screenshot,
      saveScreenshots: saveScreenshots || true,
      outputDir: outputDir,
      saveDiffImages: true,
      ignoreJsonPaths: config.comparison!.ignoreJsonPaths,
      normalizeJson: config.comparison!.normalizeJson,
      minSimilarity: config.comparison!.minSimilarity
    });

    const results: Array<{ row: number; url1: string; url2: string; result: any; viewport?: string }> = [];
    for (let i = 0; i < urls.length; i++) {
      const { url1, url2 } = urls[i];
      process.stdout.write(`\r⏳ Comparing ${i + 1}/${urls.length}...`);

      const viewportResults = await comparator.compareAllViewports(url1, url2);
      for (const result of viewportResults) {
        results.push({
          row: i + 1,
          url1,
          url2,
          result,
          viewport: result.viewport
        });
      }
    }

    console.log('\n📊 Generating comparison report...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const reportName = `${config.comparison!.type}-comparison-${timestamp}.csv`;
    const outputPath = path.join(outputDir, reportName);

    const csvReport = this.generateComparisonCsv(results, config.comparison!.type);
    fs.writeFileSync(outputPath, csvReport);

    const failedThreshold = results.filter(r => {
      if (!r.result.success) return true;
      if (r.result.passedThreshold === false) return true;
      if (r.result.visualTextPassed === false) return true;
      if (r.result.textMatch === false && config.comparison!.type === 'text') return true;
      return false;
    }).length;

    const successful = results.filter(r => r.result.success).length;
    const avgSimilarity = results
      .filter(r => r.result.similarity !== undefined || r.result.screenshotSimilarity !== undefined)
      .reduce((sum, r) => sum + (r.result.screenshotSimilarity ?? r.result.similarity ?? 0), 0) / (results.length || 1);

    const htmlPath = writeHtmlReport(results, {
      title: `Synapse ${config.comparison!.type} comparison`,
      type: config.comparison!.type,
      outputDir,
      fileName: `comparison-report-${timestamp}.html`,
      summary: {
        total: results.length,
        successful,
        failed: results.length - successful,
        avgSimilarity: Math.round(avgSimilarity * 100) / 100,
        failedThreshold
      }
    });

    console.log(chalk.green(`✅ Comparison complete! Report: ${outputPath}`));
    console.log(chalk.green(`📁 HTML Report: ${htmlPath}`));

    return {
      total: results.length,
      successful,
      failed: results.length - successful,
      failedThreshold,
      successRate: Math.round((successful / (results.length || 1)) * 10000) / 100,
      avgSimilarity: Math.round(avgSimilarity * 100) / 100
    };
  }

  private async generateUrlsForComparison(config: SynapseConfig): Promise<Array<{url1: string, url2: string}>> {
    const { ParameterGenerator } = await import('./generators/parameterGenerator.js');
    const { UrlConstructor } = await import('./generators/urlConstructor.js');

    const paramGenerator = new ParameterGenerator();
    const urlConstructor = new UrlConstructor(config);

    const iterations = config.execution.iterations || 10;
    const urls = [];

    for (let i = 0; i < iterations; i++) {
      const parameters = config.parameters ?
        await Promise.all(config.parameters.map(async param => {
          const value = await paramGenerator.generateParameter(param);
          return { name: param.name, value };
        })) : [];

      const url1 = urlConstructor.constructUrlWithPathParams(parameters);
      const url2 = url1.replace(config.baseUrl, config.comparison!.baseUrl2);

      urls.push({ url1, url2 });
    }

    return urls;
  }

  private generateComparisonCsv(results: any[], type: 'image' | 'text' | 'screenshot' | 'visual-text'): string {
    const baseHeaders = 'Row,URL1,URL2,Success,ResponseTime(ms),URL1_Status,URL2_Status,URL1_Size,URL2_Size';

    let specificHeaders = '';
    if (type === 'image' || type === 'screenshot') {
      specificHeaders = ',Width1,Height1,Width2,Height2,DiffPixels,Similarity%,PassedThreshold,Screenshot1,Screenshot2,DiffImage,Viewport';
    } else if (type === 'text') {
      specificHeaders = ',TextMatch,Similarity%,PassedThreshold';
    } else if (type === 'visual-text') {
      specificHeaders = ',TextMatch,TextSimilarity%,Width1,Height1,Width2,Height2,ScreenshotDiffPixels,ScreenshotSimilarity%,VisualTextPassed,PassedThreshold,Screenshot1,Screenshot2,DiffImage,Viewport';
    }

    const errorHeaders = ',Error,ErrorDetails';
    const headers = baseHeaders + specificHeaders + errorHeaders + '\n';

    const rows = results.map(({ row, url1, url2, result }) => {
      const base = `${row},"${url1}","${url2}",${result.success},${result.responseTime},${result.url1Status},${result.url2Status},${result.url1Size || ''},${result.url2Size || ''}`;

      let specific = '';
      if (type === 'image' || type === 'screenshot') {
        specific = `,${result.width1 || ''},${result.height1 || ''},${result.width2 || ''},${result.height2 || ''},${result.diffPixels || result.screenshotDiffPixels || ''},${result.similarity || result.screenshotSimilarity || ''},${result.passedThreshold ?? ''},"${result.screenshot1Path || ''}","${result.screenshot2Path || ''}","${result.diffImagePath || ''}","${result.viewport || ''}"`;
      } else if (type === 'text') {
        specific = `,${result.textMatch || ''},${result.similarity || result.textSimilarity || ''},${result.passedThreshold ?? ''}`;
      } else if (type === 'visual-text') {
        specific = `,${result.textMatch || ''},${result.textSimilarity || ''},${result.width1 || ''},${result.height1 || ''},${result.width2 || ''},${result.height2 || ''},${result.screenshotDiffPixels || ''},${result.screenshotSimilarity || ''},${result.visualTextPassed || ''},${result.passedThreshold ?? ''},"${result.screenshot1Path || ''}","${result.screenshot2Path || ''}","${result.diffImagePath || ''}","${result.viewport || ''}"`;
      }

      const error = `,"${result.error || ''}","${result.errorDetails || ''}"`;
      return base + specific + error;
    }).join('\n');

    return headers + rows;
  }
}
