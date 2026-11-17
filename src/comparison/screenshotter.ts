import fs from 'fs';
import path from 'path';
import { ScreenshotConfig, ViewportConfig } from '../types/config.js';

export interface ScreenshotResult {
  screenshot1: Buffer;
  screenshot2: Buffer;
  success: boolean;
  error?: string;
  savedPaths?: { path1: string; path2: string };
  viewport?: ViewportConfig;
}

export class Screenshotter {
  private config: ScreenshotConfig;
  private saveScreenshots: boolean;
  private outputDir?: string;

  constructor(config?: ScreenshotConfig, saveScreenshots: boolean = false, outputDir?: string) {
    this.config = {
      viewport: { width: 1920, height: 1080 },
      waitUntil: 'networkidle',
      timeout: 30000,
      fullPage: false,
      ...config
    };
    this.saveScreenshots = saveScreenshots;
    this.outputDir = outputDir;
  }

  /** Viewports to capture — multi-viewport list wins over single viewport. */
  getViewports(): ViewportConfig[] {
    if (this.config.viewports && this.config.viewports.length > 0) {
      return this.config.viewports;
    }
    return [this.config.viewport || { width: 1920, height: 1080 }];
  }

  async captureScreenshots(url1: string, url2: string, viewport?: ViewportConfig): Promise<ScreenshotResult> {
    const activeViewport = viewport || this.getViewports()[0];

    try {
      const puppeteer = await import('puppeteer');

      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      try {
        const page = await browser.newPage();
        await page.setViewport({
          width: activeViewport.width,
          height: activeViewport.height
        });

        const screenshot1 = await this.capturePage(page, url1);
        const screenshot2 = await this.capturePage(page, url2);

        let savedPaths: { path1: string; path2: string } | undefined;

        if (this.saveScreenshots && this.outputDir) {
          const timestamp = Date.now();
          const screenshotsDir = path.join(this.outputDir, 'screenshots');

          if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
          }

          const vpLabel = activeViewport.name || `${activeViewport.width}x${activeViewport.height}`;
          const savedPath1 = path.join(screenshotsDir, `url1-${vpLabel}-${timestamp}.png`);
          const savedPath2 = path.join(screenshotsDir, `url2-${vpLabel}-${timestamp}.png`);

          fs.writeFileSync(savedPath1, screenshot1);
          fs.writeFileSync(savedPath2, screenshot2);

          savedPaths = { path1: savedPath1, path2: savedPath2 };
          console.log(`\n📸 Screenshots saved: ${savedPath1}, ${savedPath2}`);
        }

        return {
          screenshot1: Buffer.from(screenshot1),
          screenshot2: Buffer.from(screenshot2),
          success: true,
          savedPaths,
          viewport: activeViewport
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      return {
        screenshot1: Buffer.alloc(0),
        screenshot2: Buffer.alloc(0),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        viewport: activeViewport
      };
    }
  }

  private async capturePage(page: any, url: string): Promise<Buffer> {
    await page.goto(url, {
      waitUntil: this.config.waitUntil === 'networkidle' ? 'networkidle2' : 'load',
      timeout: this.config.timeout
    });

    if (this.config.waitForSelector) {
      await page.waitForSelector(this.config.waitForSelector, { timeout: this.config.timeout });
    }

    if (this.config.masks && this.config.masks.length > 0) {
      // Use Function body string to avoid requiring DOM lib types in Node builds
      await page.evaluate(
        (selectors: string[]) => {
          const doc = (globalThis as any).document;
          for (const selector of selectors) {
            doc.querySelectorAll(selector).forEach((el: any) => {
              el.style.visibility = 'hidden';
              el.style.background = '#000';
              el.style.color = 'transparent';
            });
          }
        },
        this.config.masks
      );
    }

    if (this.config.selector) {
      const element = await page.$(this.config.selector);
      if (!element) {
        throw new Error(`Screenshot selector not found: ${this.config.selector}`);
      }
      const buffer = await element.screenshot({ type: 'png' });
      return Buffer.from(buffer);
    }

    const buffer = await page.screenshot({
      type: 'png',
      fullPage: !!this.config.fullPage
    });
    return Buffer.from(buffer);
  }
}
