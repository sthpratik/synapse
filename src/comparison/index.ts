import https from 'https';
import http from 'http';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { Screenshotter } from './screenshotter.js';

export interface ComparisonConfig {
  type: 'image' | 'text' | 'screenshot' | 'visual-text';
  timeout?: number;
  threshold?: number;
  screenshot?: {
    viewport?: { width: number; height: number };
    waitUntil?: 'load' | 'networkidle';
    timeout?: number;
  };
  saveScreenshots?: boolean;
  outputDir?: string;
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
        return await this.compareImages(response1.data!, response2.data!, responseTime, response1.status, response2.status);
      } else {
        return this.compareText(response1.data!, response2.data!, responseTime, response1.status, response2.status);
      }

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

        // Check content type for images
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

  private async compareImages(buffer1: Buffer, buffer2: Buffer, responseTime: number, status1: number, status2: number): Promise<ComparisonResult> {
    try {
      // Use Sharp to decode any image format and convert to raw RGBA
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
          error: 'Image dimensions mismatch'
        };
      }

      const diffPixels = pixelmatch(img1.data, img2.data, null, img1.width, img1.height, {
        threshold: this.config.threshold
      });
      
      const totalPixels = img1.width * img1.height;
      const similarity = Math.round((1 - (diffPixels / totalPixels)) * 10000) / 100;

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
        similarity
      };

    } catch (error) {
      return {
        success: false,
        responseTime,
        url1Status: status1,
        url2Status: status2,
        url1Size: buffer1.length,
        url2Size: buffer2.length,
        error: 'Image processing failed',
        errorDetails: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private compareText(buffer1: Buffer, buffer2: Buffer, responseTime: number, status1: number, status2: number): ComparisonResult {
    const text1 = buffer1.toString('utf-8');
    const text2 = buffer2.toString('utf-8');
    const textMatch = text1 === text2;

    return {
      success: true,
      responseTime,
      url1Status: status1,
      url2Status: status2,
      url1Size: buffer1.length,
      url2Size: buffer2.length,
      textMatch,
      similarity: textMatch ? 100 : 0
    };
  }

  private async compareScreenshots(url1: string, url2: string, startTime: number): Promise<ComparisonResult> {
    try {
      const result = await this.screenshotter.captureScreenshots(url1, url2);
      const responseTime = Date.now() - startTime;

      if (!result.success) {
        return {
          success: false,
          responseTime,
          url1Status: 0,
          url2Status: 0,
          error: 'Screenshot capture failed',
          errorDetails: result.error
        };
      }

      const imageResult = await this.compareImages(
        result.screenshot1,
        result.screenshot2,
        responseTime,
        200,
        200
      );

      return {
        ...imageResult,
        screenshotSimilarity: imageResult.similarity,
        screenshotDiffPixels: imageResult.diffPixels,
        screenshot1Path: result.savedPaths?.path1,
        screenshot2Path: result.savedPaths?.path2
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

  private async compareVisualText(url1: string, url2: string, startTime: number): Promise<ComparisonResult> {
    try {
      // Fetch text content
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

      // Compare text
      const textResult = this.compareText(response1.data!, response2.data!, fetchTime, response1.status, response2.status);

      // Capture and compare screenshots
      const screenshotResult = await this.screenshotter.captureScreenshots(url1, url2);
      const totalTime = Date.now() - startTime;

      if (!screenshotResult.success) {
        return {
          ...textResult,
          responseTime: totalTime,
          error: 'Screenshot capture failed in visual-text mode',
          errorDetails: screenshotResult.error
        };
      }

      const imageResult = await this.compareImages(
        screenshotResult.screenshot1,
        screenshotResult.screenshot2,
        totalTime,
        200,
        200
      );

      const visualTextPassed = textResult.textMatch && (imageResult.similarity || 0) >= (100 - (this.config.threshold || 0.1) * 100);

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
        screenshot1Path: screenshotResult.savedPaths?.path1,
        screenshot2Path: screenshotResult.savedPaths?.path2
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
