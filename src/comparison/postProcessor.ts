import fs from 'fs';
import path from 'path';
import { Comparator, ComparisonResult, ComparisonConfig } from './index.js';
import { writeHtmlReport } from './htmlReport.js';

interface K6ComparisonResult {
  iteration: number;
  url1: string;
  url2: string;
  responseTime: number;
  url1Status: number;
  url2Status: number;
  url1Size: number;
  url2Size: number;
  timestamp: string;
  textMatch?: boolean;
  sizeMatch?: boolean;
  similarity?: number;
}

interface DetailedComparisonResult extends K6ComparisonResult {
  detailedComparison?: ComparisonResult;
}

export interface PostProcessSummary {
  total: number;
  successful: number;
  failed: number;
  failedThreshold: number;
  successRate: number;
  avgSimilarity: number;
}

export class ComparisonPostProcessor {
  private comparator: Comparator;
  private failOnDiff: boolean;
  private lastSummary: PostProcessSummary | null = null;

  constructor(config: ComparisonConfig & { failOnDiff?: boolean }) {
    this.comparator = new Comparator(config);
    this.failOnDiff = !!config.failOnDiff;
  }

  getSummary(): PostProcessSummary | null {
    return this.lastSummary;
  }

  async processResults(resultsPath: string, outputDir: string): Promise<PostProcessSummary> {
    console.log('🔍 Processing comparison results...');

    const rawResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as K6ComparisonResult[];
    const detailedResults: DetailedComparisonResult[] = [];

    for (let i = 0; i < rawResults.length; i++) {
      const result = rawResults[i];
      process.stdout.write(`\r⏳ Processing ${i + 1}/${rawResults.length}...`);

      if (result.url1Status === 200 && result.url2Status === 200) {
        try {
          const detailedComparison = await this.comparator.compare(result.url1, result.url2);
          detailedResults.push({
            ...result,
            detailedComparison
          });
        } catch (error) {
          detailedResults.push({
            ...result,
            detailedComparison: {
              success: false,
              responseTime: 0,
              url1Status: result.url1Status,
              url2Status: result.url2Status,
              error: 'Post-processing failed',
              errorDetails: error instanceof Error ? error.message : String(error)
            }
          });
        }
      } else {
        detailedResults.push(result);
      }
    }

    console.log('\n📊 Generating detailed report...');

    const csvReport = this.generateDetailedCsvReport(detailedResults);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const csvPath = path.join(outputDir, `detailed-comparison-${timestamp}.csv`);
    fs.writeFileSync(csvPath, csvReport);

    const jsonPath = path.join(outputDir, `detailed-comparison-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(detailedResults, null, 2));

    const summary = this.generateSummary(detailedResults, outputDir, timestamp);

    const htmlPath = writeHtmlReport(
      detailedResults.map(r => ({
        row: r.iteration,
        url1: r.url1,
        url2: r.url2,
        result: r.detailedComparison || {
          success: false,
          responseTime: r.responseTime,
          url1Status: r.url1Status,
          url2Status: r.url2Status,
          error: 'No detailed comparison'
        },
        viewport: r.detailedComparison?.viewport
      })),
      {
        title: 'Synapse detailed comparison',
        type: 'detailed',
        outputDir,
        fileName: `comparison-report-${timestamp}.html`,
        summary: {
          total: summary.total,
          successful: summary.successful,
          failed: summary.failed,
          avgSimilarity: summary.avgSimilarity,
          failedThreshold: summary.failedThreshold
        }
      }
    );

    console.log(`✅ Detailed analysis complete!`);
    console.log(`📁 CSV Report: ${csvPath}`);
    console.log(`📁 JSON Report: ${jsonPath}`);
    console.log(`📁 HTML Report: ${htmlPath}`);

    this.lastSummary = summary;
    return summary;
  }

  private generateDetailedCsvReport(results: DetailedComparisonResult[]): string {
    const headers = [
      'Iteration', 'URL1', 'URL2', 'LoadTest_ResponseTime(ms)', 'URL1_Status', 'URL2_Status',
      'URL1_Size', 'URL2_Size', 'LoadTest_SizeMatch', 'LoadTest_Similarity%',
      'Pixelmatch_Success', 'Pixelmatch_ResponseTime(ms)', 'Image_Width1', 'Image_Height1',
      'Image_Width2', 'Image_Height2', 'Pixelmatch_DiffPixels', 'Pixelmatch_Similarity%',
      'TextMatch', 'TextSimilarity%', 'ScreenshotSimilarity%', 'ScreenshotDiffPixels',
      'VisualTextPassed', 'PassedThreshold', 'Screenshot1', 'Screenshot2', 'DiffImage',
      'Viewport', 'Error', 'ErrorDetails', 'Timestamp'
    ].join(',') + '\n';

    const rows = results.map(r => {
      const d = r.detailedComparison;
      return [
        r.iteration,
        `"${r.url1}"`,
        `"${r.url2}"`,
        r.responseTime,
        r.url1Status,
        r.url2Status,
        r.url1Size,
        r.url2Size,
        r.sizeMatch || '',
        r.similarity || '',
        d?.success || '',
        d?.responseTime || '',
        d?.width1 || '',
        d?.height1 || '',
        d?.width2 || '',
        d?.height2 || '',
        d?.diffPixels || '',
        d?.similarity || '',
        d?.textMatch || '',
        d?.textSimilarity || '',
        d?.screenshotSimilarity || '',
        d?.screenshotDiffPixels || '',
        d?.visualTextPassed || '',
        d?.passedThreshold ?? '',
        `"${d?.screenshot1Path || ''}"`,
        `"${d?.screenshot2Path || ''}"`,
        `"${d?.diffImagePath || ''}"`,
        `"${d?.viewport || ''}"`,
        `"${d?.error || ''}"`,
        `"${d?.errorDetails || ''}"`,
        r.timestamp
      ].join(',');
    }).join('\n');

    return headers + rows;
  }

  private generateSummary(results: DetailedComparisonResult[], outputDir: string, timestamp: string): PostProcessSummary {
    const total = results.length;
    const successful = results.filter(r => r.detailedComparison?.success).length;
    const failed = total - successful;
    const failedThreshold = results.filter(r => {
      const d = r.detailedComparison;
      if (!d) return true;
      if (d.passedThreshold === false) return true;
      if (d.visualTextPassed === false) return true;
      return !d.success;
    }).length;

    const avgK6ResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / (total || 1);
    const withDetailed = results.filter(r => r.detailedComparison?.responseTime);
    const avgDetailedResponseTime = withDetailed
      .reduce((sum, r) => sum + (r.detailedComparison?.responseTime || 0), 0) / (withDetailed.length || 1);

    const withSim = results.filter(r => r.detailedComparison?.success && r.detailedComparison.similarity !== undefined);
    const avgSimilarity = withSim
      .reduce((sum, r) => sum + (r.detailedComparison?.similarity || 0), 0) / (withSim.length || 1);

    const summary = {
      timestamp: new Date().toISOString(),
      totals: {
        total,
        successful,
        failed,
        failedThreshold,
        successRate: Math.round((successful / (total || 1)) * 10000) / 100
      },
      performance: {
        avgK6ResponseTime: Math.round(avgK6ResponseTime),
        avgDetailedResponseTime: Math.round(avgDetailedResponseTime),
        avgSimilarity: Math.round(avgSimilarity * 100) / 100
      },
      errors: results
        .filter(r => r.detailedComparison?.error)
        .reduce((acc, r) => {
          const error = r.detailedComparison?.error || 'Unknown';
          acc[error] = (acc[error] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    };

    const summaryPath = path.join(outputDir, `comparison-summary-${timestamp}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`📈 Summary:`);
    console.log(`   Total: ${total}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Below threshold / mismatch: ${failedThreshold}`);
    console.log(`   Success Rate: ${summary.totals.successRate}%`);
    console.log(`   Avg K6 Response Time: ${summary.performance.avgK6ResponseTime}ms`);
    console.log(`   Avg Detailed Response Time: ${summary.performance.avgDetailedResponseTime}ms`);
    console.log(`   Avg Similarity: ${summary.performance.avgSimilarity}%`);

    return {
      total,
      successful,
      failed,
      failedThreshold,
      successRate: summary.totals.successRate,
      avgSimilarity: summary.performance.avgSimilarity
    };
  }
}
