import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Comparator, ComparisonResult } from '../comparison/index.js';
import { writeHtmlReport } from '../comparison/htmlReport.js';
import { ExitCode } from '../utils/exitCodes';

interface ComparisonRow {
  row: number;
  url1: string;
  url2: string;
  result: ComparisonResult;
  viewport?: string;
}

function generateCsvReport(results: ComparisonRow[], type: 'image' | 'text' | 'screenshot' | 'visual-text'): string {
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
      specific = `,${result.textMatch || ''},${result.similarity || ''},${result.passedThreshold ?? ''}`;
    } else if (type === 'visual-text') {
      specific = `,${result.textMatch || ''},${result.textSimilarity || ''},${result.width1 || ''},${result.height1 || ''},${result.width2 || ''},${result.height2 || ''},${result.screenshotDiffPixels || ''},${result.screenshotSimilarity || ''},${result.visualTextPassed || ''},${result.passedThreshold ?? ''},"${result.screenshot1Path || ''}","${result.screenshot2Path || ''}","${result.diffImagePath || ''}","${result.viewport || ''}"`;
    }

    const error = `,"${result.error || ''}","${result.errorDetails || ''}"`;
    return base + specific + error;
  }).join('\n');

  return headers + rows;
}

export const compareCommand = new Command('compare')
  .description('Compare images, text, screenshots, or both from CSV file')
  .requiredOption('-f, --file <path>', 'CSV file with URLs to compare')
  .option('--column1 <name>', 'First URL column name', 'url1')
  .option('--column2 <name>', 'Second URL column name', 'url2')
  .option('-t, --type <type>', 'Comparison type: image | text | screenshot | visual-text', 'image')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--threshold <value>', 'Image comparison threshold (0-1)', '0.1')
  .option('--min-similarity <pct>', 'Minimum similarity percent to pass (0-100)')
  .option('--viewport <size>', 'Viewport size for screenshots (WIDTHxHEIGHT)', '1920x1080')
  .option('--wait-until <strategy>', 'Wait strategy: load | networkidle', 'networkidle')
  .option('--selector <css>', 'CSS selector to screenshot')
  .option('--mask <css>', 'CSS selector to mask (repeatable)', (val, acc: string[] = []) => { acc.push(val); return acc; }, [] as string[])
  .option('--full-page', 'Capture full-page screenshots')
  .option('--wait-for-selector <css>', 'Wait for selector before capture')
  .option('--normalize-json', 'Normalize JSON before text compare')
  .option('--ignore-json-path <path>', 'JSON path to ignore (repeatable)', (val, acc: string[] = []) => { acc.push(val); return acc; }, [] as string[])
  .option('--save-screenshots', 'Save screenshots to output directory (debug mode)')
  .option('--fail-on-diff', 'Exit with code 3 when comparisons fail thresholds')
  .option('--no-html', 'Skip HTML report generation')
  .action(async (options) => {
    try {
      console.log('🔍 Starting comparison process...');

      if (!['image', 'text', 'screenshot', 'visual-text'].includes(options.type)) {
        throw new Error('Type must be: image, text, screenshot, or visual-text');
      }

      console.log('📄 Reading CSV file...');
      const csvContent = fs.readFileSync(options.file, 'utf-8');
      const records = parse(csvContent, { columns: true, skip_empty_lines: true });

      if (!records.length) {
        throw new Error('No data found in CSV file');
      }

      const [width, height] = options.viewport.split('x').map(Number);

      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      const comparator = new Comparator({
        type: options.type,
        timeout: parseInt(options.timeout),
        threshold: parseFloat(options.threshold),
        minSimilarity: options.minSimilarity ? parseFloat(options.minSimilarity) : undefined,
        screenshot: {
          viewport: { width, height },
          waitUntil: options.waitUntil,
          timeout: parseInt(options.timeout),
          selector: options.selector,
          masks: options.mask,
          fullPage: !!options.fullPage,
          waitForSelector: options.waitForSelector
        },
        saveScreenshots: options.saveScreenshots || options.type === 'screenshot' || options.type === 'visual-text',
        saveDiffImages: true,
        outputDir: options.output,
        normalizeJson: !!options.normalizeJson,
        ignoreJsonPaths: options.ignoreJsonPath
      });

      const results: ComparisonRow[] = [];

      console.log(`🚀 Processing ${records.length} comparisons...`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const url1 = record[options.column1];
        const url2 = record[options.column2];

        if (!url1 || !url2) {
          console.log(`⚠️  Row ${i + 1}: Missing URLs, skipping`);
          continue;
        }

        process.stdout.write(`\r⏳ Comparing ${i + 1}/${records.length}...`);

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

      console.log('\n📊 Generating report...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                       new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
      const reportName = `${options.type}-comparison-${timestamp}.csv`;
      const outputPath = path.join(options.output, reportName);

      const csvReport = generateCsvReport(results, options.type);
      fs.writeFileSync(outputPath, csvReport);

      const successful = results.filter(r => r.result.success).length;
      const failed = results.length - successful;
      const failedThreshold = results.filter(r => {
        if (!r.result.success) return true;
        if (r.result.passedThreshold === false) return true;
        if (r.result.visualTextPassed === false) return true;
        if (options.type === 'text' && r.result.textMatch === false) return true;
        return false;
      }).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.result.responseTime, 0) / (results.length || 1);

      let htmlPath: string | undefined;
      if (options.html !== false) {
        const avgSimilarity = results
          .filter(r => (r.result.similarity ?? r.result.screenshotSimilarity) !== undefined)
          .reduce((sum, r) => sum + (r.result.screenshotSimilarity ?? r.result.similarity ?? 0), 0) / (results.length || 1);

        htmlPath = writeHtmlReport(results, {
          title: `Synapse ${options.type} comparison`,
          type: options.type,
          outputDir: options.output,
          fileName: `comparison-report-${timestamp}.html`,
          summary: {
            total: results.length,
            successful,
            failed,
            avgResponseTime: Math.round(avgResponseTime),
            avgSimilarity: Math.round(avgSimilarity * 100) / 100,
            failedThreshold
          }
        });
      }

      console.log(`\n✅ Comparison complete!`);
      console.log(`📁 Report saved: ${outputPath}`);
      if (htmlPath) console.log(`📁 HTML report: ${htmlPath}`);
      console.log(`📈 Results:`);
      console.log(`   Total: ${results.length}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Below threshold / mismatch: ${failedThreshold}`);
      console.log(`   Avg Response Time: ${Math.round(avgResponseTime)}ms`);

      if (options.failOnDiff && failedThreshold > 0) {
        console.error(`❌ fail-on-diff: ${failedThreshold} comparison(s) did not meet thresholds`);
        process.exit(ExitCode.COMPARISON_FAILED);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(ExitCode.GENERAL_ERROR);
    }
  });
