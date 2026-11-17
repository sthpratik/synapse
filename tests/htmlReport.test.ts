import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateHtmlReport, writeHtmlReport } from '../src/comparison/htmlReport';

describe('htmlReport', () => {
  it('renders summary and escapes html', () => {
    const html = generateHtmlReport(
      [
        {
          row: 1,
          url1: 'https://a.example/<x>',
          url2: 'https://b.example',
          result: {
            success: false,
            responseTime: 12,
            url1Status: 200,
            url2Status: 200,
            similarity: 80,
            error: 'boom <script>'
          }
        }
      ],
      {
        title: 'Report',
        type: 'image',
        outputDir: '/tmp',
        summary: { total: 1, successful: 0, failed: 1, avgSimilarity: 80 }
      }
    );

    expect(html).toContain('Report');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('boom &lt;script&gt;');
    expect(html).toContain('FAIL');
  });

  it('writes file to disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-html-'));
    const out = writeHtmlReport([], {
      title: 'Empty',
      type: 'text',
      outputDir: dir,
      fileName: 'out.html'
    });
    expect(fs.existsSync(out)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
