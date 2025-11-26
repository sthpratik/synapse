import fs from 'fs';
import path from 'path';
import { ScreenshotConfig } from '../types/config.js';

export interface ScreenshotResult {
  screenshot1: Buffer;
  screenshot2: Buffer;
  success: boolean;
  error?: string;
  savedPaths?: { path1: string; path2: string };
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
      ...config
    };
    this.saveScreenshots = saveScreenshots;
    this.outputDir = outputDir;
  }

  async captureScreenshots(url1: string, url2: string): Promise<ScreenshotResult> {
    try {
      // Dynamic import of puppeteer
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: this.config.viewport!.width,
        height: this.config.viewport!.height
      });

      // Capture screenshot 1
      await page.goto(url1, {
        waitUntil: this.config.waitUntil === 'networkidle' ? 'networkidle2' : 'load',
        timeout: this.config.timeout
      });
      const screenshot1 = await page.screenshot({ type: 'png' });

      // Capture screenshot 2
      await page.goto(url2, {
        waitUntil: this.config.waitUntil === 'networkidle' ? 'networkidle2' : 'load',
        timeout: this.config.timeout
      });
      const screenshot2 = await page.screenshot({ type: 'png' });

      await browser.close();

      let savedPaths: { path1: string; path2: string } | undefined;

      // Save screenshots if debug mode enabled
      if (this.saveScreenshots && this.outputDir) {
        const timestamp = Date.now();
        const screenshotsDir = path.join(this.outputDir, 'screenshots');
        
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const savedPath1 = path.join(screenshotsDir, `url1-${timestamp}.png`);
        const savedPath2 = path.join(screenshotsDir, `url2-${timestamp}.png`);

        fs.writeFileSync(savedPath1, screenshot1);
        fs.writeFileSync(savedPath2, screenshot2);

        savedPaths = { path1: savedPath1, path2: savedPath2 };
        console.log(`\n📸 Screenshots saved: ${savedPath1}, ${savedPath2}`);
      }

      return {
        screenshot1: Buffer.from(screenshot1),
        screenshot2: Buffer.from(screenshot2),
        success: true,
        savedPaths
      };

    } catch (error) {
      return {
        screenshot1: Buffer.alloc(0),
        screenshot2: Buffer.alloc(0),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
