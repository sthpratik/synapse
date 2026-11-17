import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { Comparator } from '../src/comparison/index';

async function png(color: { r: number; g: number; b: number }, size = 16): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: color
    }
  }).png().toBuffer();
}

describe('Comparator', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-cmp-'));

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('compares identical images at 100% and skips diff file', async () => {
    const img = await png({ r: 10, g: 20, b: 30 });
    const comparator = new Comparator({
      type: 'image',
      outputDir: tmp,
      saveDiffImages: true,
      threshold: 0.1
    });

    const result = await (comparator as any).compareImages(img, img, 5, 200, 200);
    expect(result.success).toBe(true);
    expect(result.similarity).toBe(100);
    expect(result.passedThreshold).toBe(true);
    expect(result.diffImagePath).toBeUndefined();
  });

  it('writes a diff image when pixels differ', async () => {
    const a = await png({ r: 255, g: 0, b: 0 });
    const b = await png({ r: 0, g: 0, b: 255 });
    const comparator = new Comparator({
      type: 'image',
      outputDir: tmp,
      saveDiffImages: true,
      threshold: 0.1,
      minSimilarity: 99
    });

    const result = await (comparator as any).compareImages(a, b, 5, 200, 200);
    expect(result.success).toBe(true);
    expect(result.similarity!).toBeLessThan(100);
    expect(result.passedThreshold).toBe(false);
    expect(result.diffImagePath).toBeTruthy();
    expect(fs.existsSync(result.diffImagePath!)).toBe(true);
  });

  it('normalizes JSON and ignores paths for text compare', async () => {
    const comparator = new Comparator({
      type: 'text',
      normalizeJson: true,
      ignoreJsonPaths: ['meta.ts']
    });

    const left = Buffer.from(JSON.stringify({ meta: { ts: 1 }, a: 1, b: 2 }));
    const right = Buffer.from(JSON.stringify({ b: 2, a: 1, meta: { ts: 999 } }));
    const result = (comparator as any).compareText(left, right, 1, 200, 200);
    expect(result.textMatch).toBe(true);
    expect(result.similarity).toBe(100);
  });
});
