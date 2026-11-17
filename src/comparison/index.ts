import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Screenshotter } from './screenshotter.js';
import { ScreenshotConfig } from '../types/config.js';
import { normalizeJsonString, omitPaths } from '../utils/jsonPath.js';

export interface ComparisonConfig {
  type: 'image' | 'text' | 'screenshot' | 'visual-text';
  timeout?: number;
  threshold?: number;
  screenshot?: ScreenshotConfig;
  saveScreenshots?: boolean;
  outputDir?: string;
  /** Always write diff PNGs when dimensions match */
  saveDiffImages?: boolean;
  ignoreJsonPaths?: string[];
  normalizeJson?: boolean;
  minSimilarity?: number;
}

export interface ComparisonResult {
  success: boolean;
  responseTime: number;
  url1Status: number;
  url2Status: number;
  url1Size?: number;
  url2Size?: number;
  width1?: number;
  height1?: number;
  width2?: number;
  height2?: number;
  diffPixels?: number;
  similarity?: number;
  textMatch?: boolean;
  textSimilarity?: number;
  screenshotSimilarity?: number;
  screenshotDiffPixels?: number;
  visualTextPassed?: boolean;
  screenshot1Path?: string;
  screenshot2Path?: string;
  diffImagePath?: string;
  viewport?: string;
  passedThreshold?: boolean;
  error?: string;
  errorDetails?: string;
}

export class Comparator {
  private config: ComparisonConfig;
  private screenshotter: Screenshotter;

  constructor(config: ComparisonConfig = { type: 'image' }) {
    this.config = {
      timeout: 30000,
      threshold: 0.1,
      saveDiffImages: true,
      ...config
    };
    this.screenshotter = new Screenshotter(
      config.screenshot,
      config.saveScreenshots || false,
      config.outputDir
    );
  }

  async compare(url1: string, url2: string): Promise<ComparisonResult> {
    const startTime = Date.now();

    try {
      if (this.config.type === 'screenshot') {
        return await this.compareScreenshots(url1, url2, startTime);
      }

      if (this.config.type === 'visual-text') {
        return await this.compareVisualText(url1, url2, startTime);
      }

      const [response1, response2] = await Promise.all([
        this.fetchContent(url1),
        this.fetchContent(url2)
      ]);

      const responseTime = Date.now() - startTime;

      if (!response1.success || !response2.success) {
        return {
          success: false,
          responseTime,
          url1Status: response1.status,
          url2Status: response2.status,
          error: 'Failed to fetch one or both URLs',
          errorDetails: `URL1: ${response1.error || 'OK'}, URL2: ${response2.error || 'OK'}`
        };
      }

      if (this.config.type === 'image') {
        return await this.compareImages(
          response1.data!,
          response2.data!,
          responseTime,
          response1.status,
          response2.status
        );
      }

      return this.compareText(
        response1.data!,
        response2.data!,
        responseTime,
        response1.status,
        response2.status
      );
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        url1Status: 0,
        url2Status: 0,
        error: 'Comparison failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Compare across all configured viewports (screenshot / visual-text).
   * Returns one result per viewport; for single-viewport configs returns one item.
   */
  async compareAllViewports(url1: string, url2: string): Promise<ComparisonResult[]> {
    if (this.config.type !== 'screenshot' && this.config.type !== 'visual-text') {
      return [await this.compare(url1, url2)];
    }

    const viewports = this.screenshotter.getViewports();
    const results: ComparisonResult[] = [];

    for (const viewport of viewports) {
      const startTime = Date.now();
      if (this.config.type === 'screenshot') {
        results.push(await this.compareScreenshots(url1, url2, startTime, viewport));
      } else {
        results.push(await this.compareVisualText(url1, url2, startTime, viewport));
      }
    }

    return results;
  }

  private async fetchContent(url: string): Promise<{ success: boolean; data?: Buffer; status: number; contentType?: string; error?: string }> {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const timeout = setTimeout(() => {
        resolve({ success: false, status: 0, error: 'Timeout' });
      }, this.config.timeout);

      client.get(url, (res) => {
        clearTimeout(timeout);

        const statusCode = res.statusCode || 0;
        const contentType = res.headers['content-type'] || '';

        if (statusCode < 200 || statusCode >= 300) {
          resolve({ success: false, status: statusCode, error: `HTTP ${statusCode}` });
          return;
        }

        if (this.config.type === 'image' && !contentType.startsWith('image/')) {
          resolve({
            success: false,
            status: statusCode,
            error: `Invalid content-type: ${contentType} (expected image/*)`
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ success: true, data: Buffer.concat(chunks), status: statusCode, contentType });
        });
        res.on('error', (error) => {
          resolve({ success: false, status: statusCode, error: error.message });
        });
      }).on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, status: 0, error: error.message });
      });
    });
  }

  private async compareImages(
    buffer1: Buffer,
    buffer2: Buffer,
    responseTime: number,
    status1: number,
    status2: number,
    meta?: { screenshot1Path?: string; screenshot2Path?: string; viewport?: string }
  ): Promise<ComparisonResult> {
    try {
      const [img1Info, img2Info] = await Promise.all([
        sharp(buffer1).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(buffer2).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      ]);

      const img1 = {
        width: img1Info.info.width,
        height: img1Info.info.height,
        data: img1Info.data
      };
      const img2 = {
        width: img2Info.info.width,
        height: img2Info.info.height,
        data: img2Info.data
      };

      if (img1.width !== img2.width || img1.height !== img2.height) {
        return {
          success: false,
          responseTime,
          url1Status: status1,
          url2Status: status2,
          url1Size: buffer1.length,
          url2Size: buffer2.length,
          width1: img1.width,
          height1: img1.height,
          width2: img2.width,
          height2: img2.height,
          diffPixels: -1,
          similarity: 0,
          passedThreshold: false,
          screenshot1Path: meta?.screenshot1Path,
          screenshot2Path: meta?.screenshot2Path,
          viewport: meta?.viewport,
          error: 'Image dimensions mismatch'
        };
      }

      const diff = new PNG({ width: img1.width, height: img1.height });
      const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
        threshold: this.config.threshold
      });

      const totalPixels = img1.width * img1.height;
      const similarity = Math.round((1 - (diffPixels / totalPixels)) * 10000) / 100;
      const minSimilarity = this.config.minSimilarity ?? Math.round((1 - (this.config.threshold || 0.1)) * 10000) / 100;
      const passedThreshold = similarity >= minSimilarity;

      let diffImagePath: string | undefined;
      if ((this.config.saveDiffImages || this.config.saveScreenshots) && this.config.outputDir && diffPixels > 0) {
        const diffsDir = path.join(this.config.outputDir, 'diffs');
        if (!fs.existsSync(diffsDir)) {
          fs.mkdirSync(diffsDir, { recursive: true });
        }
        const vp = meta?.viewport ? `-${meta.viewport}` : '';
        diffImagePath = path.join(diffsDir, `diff${vp}-${Date.now()}.png`);
        fs.writeFileSync(diffImagePath, PNG.sync.write(diff));
      }

      return {
        success: true,
        responseTime,
        url1Status: status1,
        url2Status: status2,
        url1Size: buffer1.length,
        url2Size: buffer2.length,
        width1: img1.width,
        height1: img1.height,
        width2: img2.width,
        height2: img2.height,
        diffPixels,
        similarity,
        passedThreshold,
        diffImagePath,
        screenshot1Path: meta?.screenshot1Path,
        screenshot2Path: meta?.screenshot2Path,
        viewport: meta?.viewport
      };
    } catch (error) {
      return {
        success: false,
        responseTime,
        url1Status: status1,
        url2Status: status2,
        url1Size: buffer1.length,
        url2Size: buffer2.length,
        screenshot1Path: meta?.screenshot1Path,
        screenshot2Path: meta?.screenshot2Path,
        viewport: meta?.viewport,
        error: 'Image processing failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private compareText(
    buffer1: Buffer,
    buffer2: Buffer,
    responseTime: number,
    status1: number,
    status2: number
  ): ComparisonResult {
    let text1 = buffer1.toString('utf-8');
    let text2 = buffer2.toString('utf-8');

    if (this.config.normalizeJson || (this.config.ignoreJsonPaths && this.config.ignoreJsonPaths.length > 0)) {
      try {
        let obj1 = JSON.parse(text1);
        let obj2 = JSON.parse(text2);
        if (this.config.ignoreJsonPaths?.length) {
          obj1 = omitPaths(obj1, this.config.ignoreJsonPaths);
          obj2 = omitPaths(obj2, this.config.ignoreJsonPaths);
        }
        text1 = this.config.normalizeJson ? normalizeJsonString(obj1) : JSON.stringify(obj1);
        text2 = this.config.normalizeJson ? normalizeJsonString(obj2) : JSON.stringify(obj2);
      } catch {
        // Not JSON — fall back to raw text compare
        if (this.config.normalizeJson) {
          text1 = text1.trim();
          text2 = text2.trim();
        }
      }
    }

    const textMatch = text1 === text2;
    const similarity = textMatch ? 100 : this.approxTextSimilarity(text1, text2);

    return {
      success: true,
      responseTime,
      url1Status: status1,
      url2Status: status2,
      url1Size: buffer1.length,
      url2Size: buffer2.length,
      textMatch,
      similarity,
      textSimilarity: similarity,
      passedThreshold: textMatch
    };
  }

  private approxTextSimilarity(a: string, b: string): number {
    if (!a.length && !b.length) return 100;
    const maxLen = Math.max(a.length, b.length);
    let same = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) same++;
    }
    return Math.round((same / maxLen) * 10000) / 100;
  }

  private async compareScreenshots(
    url1: string,
    url2: string,
    startTime: number,
    viewport?: { width: number; height: number; name?: string }
  ): Promise<ComparisonResult> {
    try {
      const result = await this.screenshotter.captureScreenshots(url1, url2, viewport);
      const responseTime = Date.now() - startTime;
      const vpLabel = result.viewport?.name || (result.viewport ? `${result.viewport.width}x${result.viewport.height}` : undefined);

      if (!result.success) {
        return {
          success: false,
          responseTime,
          url1Status: 0,
          url2Status: 0,
          viewport: vpLabel,
          error: 'Screenshot capture failed',
          errorDetails: result.error
        };
      }

      // Always persist screenshots when we will emit HTML/diff reports
      let screenshot1Path = result.savedPaths?.path1;
      let screenshot2Path = result.savedPaths?.path2;
      if ((!screenshot1Path || !screenshot2Path) && this.config.outputDir) {
        const screenshotsDir = path.join(this.config.outputDir, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        const ts = Date.now();
        const label = vpLabel || 'default';
        screenshot1Path = path.join(screenshotsDir, `url1-${label}-${ts}.png`);
        screenshot2Path = path.join(screenshotsDir, `url2-${label}-${ts}.png`);
        fs.writeFileSync(screenshot1Path, result.screenshot1);
        fs.writeFileSync(screenshot2Path, result.screenshot2);
      }

      const imageResult = await this.compareImages(
        result.screenshot1,
        result.screenshot2,
        responseTime,
        200,
        200,
        { screenshot1Path, screenshot2Path, viewport: vpLabel }
      );

      return {
        ...imageResult,
        screenshotSimilarity: imageResult.similarity,
        screenshotDiffPixels: imageResult.diffPixels,
        screenshot1Path,
        screenshot2Path,
        viewport: vpLabel
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        url1Status: 0,
        url2Status: 0,
        error: 'Screenshot comparison failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async compareVisualText(
    url1: string,
    url2: string,
    startTime: number,
    viewport?: { width: number; height: number; name?: string }
  ): Promise<ComparisonResult> {
    try {
      const [response1, response2] = await Promise.all([
        this.fetchContent(url1),
        this.fetchContent(url2)
      ]);

      const fetchTime = Date.now() - startTime;

      if (!response1.success || !response2.success) {
        return {
          success: false,
          responseTime: fetchTime,
          url1Status: response1.status,
          url2Status: response2.status,
          error: 'Failed to fetch content for visual-text comparison',
          errorDetails: `URL1: ${response1.error || 'OK'}, URL2: ${response2.error || 'OK'}`
        };
      }

      const textResult = this.compareText(response1.data!, response2.data!, fetchTime, response1.status, response2.status);
      const screenshotResult = await this.screenshotter.captureScreenshots(url1, url2, viewport);
      const totalTime = Date.now() - startTime;
      const vpLabel = screenshotResult.viewport?.name || (screenshotResult.viewport ? `${screenshotResult.viewport.width}x${screenshotResult.viewport.height}` : undefined);

      if (!screenshotResult.success) {
        return {
          ...textResult,
          responseTime: totalTime,
          viewport: vpLabel,
          error: 'Screenshot capture failed in visual-text mode',
          errorDetails: screenshotResult.error
        };
      }

      let screenshot1Path = screenshotResult.savedPaths?.path1;
      let screenshot2Path = screenshotResult.savedPaths?.path2;
      if ((!screenshot1Path || !screenshot2Path) && this.config.outputDir) {
        const screenshotsDir = path.join(this.config.outputDir, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        const ts = Date.now();
        const label = vpLabel || 'default';
        screenshot1Path = path.join(screenshotsDir, `url1-${label}-${ts}.png`);
        screenshot2Path = path.join(screenshotsDir, `url2-${label}-${ts}.png`);
        fs.writeFileSync(screenshot1Path, screenshotResult.screenshot1);
        fs.writeFileSync(screenshot2Path, screenshotResult.screenshot2);
      }

      const imageResult = await this.compareImages(
        screenshotResult.screenshot1,
        screenshotResult.screenshot2,
        totalTime,
        200,
        200,
        { screenshot1Path, screenshot2Path, viewport: vpLabel }
      );

      const minSimilarity = this.config.minSimilarity ?? Math.round((1 - (this.config.threshold || 0.1)) * 10000) / 100;
      const visualTextPassed = !!textResult.textMatch && (imageResult.similarity || 0) >= minSimilarity;

      return {
        success: true,
        responseTime: totalTime,
        url1Status: response1.status,
        url2Status: response2.status,
        url1Size: response1.data!.length,
        url2Size: response2.data!.length,
        textMatch: textResult.textMatch,
        textSimilarity: textResult.similarity,
        width1: imageResult.width1,
        height1: imageResult.height1,
        width2: imageResult.width2,
        height2: imageResult.height2,
        screenshotSimilarity: imageResult.similarity,
        screenshotDiffPixels: imageResult.diffPixels,
        visualTextPassed,
        passedThreshold: visualTextPassed,
        screenshot1Path,
        screenshot2Path,
        diffImagePath: imageResult.diffImagePath,
        viewport: vpLabel
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        url1Status: 0,
        url2Status: 0,
        error: 'Visual-text comparison failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
