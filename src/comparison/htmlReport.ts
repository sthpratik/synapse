import * as fs from 'fs';
import * as path from 'path';
import { ComparisonResult } from './index';

export interface HtmlReportRow {
  row: number | string;
  url1: string;
  url2: string;
  result: ComparisonResult;
  viewport?: string;
}

export interface HtmlReportOptions {
  title?: string;
  type: string;
  outputDir: string;
  fileName?: string;
  summary?: {
    total: number;
    successful: number;
    failed: number;
    avgSimilarity?: number;
    avgResponseTime?: number;
    passedThreshold?: number;
    failedThreshold?: number;
  };
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rel(fromDir: string, filePath?: string): string {
  if (!filePath) return '';
  try {
    return path.relative(fromDir, filePath).replace(/\\/g, '/');
  } catch {
    return filePath;
  }
}

/**
 * Generate a self-contained HTML comparison report with optional diff/screenshot previews.
 */
export function generateHtmlReport(rows: HtmlReportRow[], options: HtmlReportOptions): string {
  const title = options.title || `Synapse ${options.type} comparison`;
  const summary = options.summary || {
    total: rows.length,
    successful: rows.filter(r => r.result.success).length,
    failed: rows.filter(r => !r.result.success).length
  };

  const cards = rows.map((row, index) => {
    const r = row.result;
    const similarity = r.screenshotSimilarity ?? r.similarity ?? r.textSimilarity;
    const passClass = r.success && (r.visualTextPassed !== false) ? 'pass' : 'fail';
    const diffImg = rel(options.outputDir, r.diffImagePath);
    const shot1 = rel(options.outputDir, r.screenshot1Path);
    const shot2 = rel(options.outputDir, r.screenshot2Path);

    return `
    <article class="card ${passClass}">
      <header>
        <h3>#${esc(row.row)}${row.viewport ? ` · ${esc(row.viewport)}` : ''}</h3>
        <span class="badge">${esc(passClass.toUpperCase())}</span>
      </header>
      <div class="meta">
        <div><strong>URL1</strong><a href="${esc(row.url1)}" target="_blank" rel="noopener">${esc(row.url1)}</a></div>
        <div><strong>URL2</strong><a href="${esc(row.url2)}" target="_blank" rel="noopener">${esc(row.url2)}</a></div>
        <div class="stats">
          <span>Status ${esc(r.url1Status)} / ${esc(r.url2Status)}</span>
          <span>${esc(r.responseTime)} ms</span>
          ${similarity !== undefined ? `<span>Similarity ${esc(similarity)}%</span>` : ''}
          ${r.diffPixels !== undefined ? `<span>Diff px ${esc(r.diffPixels)}</span>` : ''}
          ${r.textMatch !== undefined ? `<span>Text ${r.textMatch ? 'match' : 'diff'}</span>` : ''}
        </div>
        ${r.error ? `<p class="error">${esc(r.error)}${r.errorDetails ? `: ${esc(r.errorDetails)}` : ''}</p>` : ''}
      </div>
      <div class="media">
        ${shot1 ? `<figure><img src="${esc(shot1)}" alt="screenshot 1 row ${index}" /><figcaption>URL1</figcaption></figure>` : ''}
        ${shot2 ? `<figure><img src="${esc(shot2)}" alt="screenshot 2 row ${index}" /><figcaption>URL2</figcaption></figure>` : ''}
        ${diffImg ? `<figure class="diff"><img src="${esc(diffImg)}" alt="diff row ${index}" /><figcaption>Diff</figcaption></figure>` : ''}
      </div>
    </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root { --bg:#0f1419; --panel:#1a2332; --text:#e7ecf3; --muted:#9aa7b8; --pass:#1f9d55; --fail:#e12d39; --line:#2b3648; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:linear-gradient(180deg,#0b1017,#121a24 40%,#0f1419); color:var(--text); }
    header.page { padding:2rem 1.5rem 1rem; max-width:1100px; margin:0 auto; }
    header.page h1 { margin:0 0 .5rem; font-size:1.75rem; }
    header.page p { margin:0; color:var(--muted); }
    .summary { display:flex; flex-wrap:wrap; gap:.75rem; margin:1.25rem 0 0; }
    .pill { background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:.4rem .85rem; font-size:.9rem; }
    main { max-width:1100px; margin:0 auto; padding:1rem 1.5rem 3rem; display:grid; gap:1rem; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:1rem; }
    .card.pass { border-color: rgba(31,157,85,.45); }
    .card.fail { border-color: rgba(225,45,57,.55); }
    .card header { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:.75rem; }
    .card h3 { margin:0; font-size:1.05rem; }
    .badge { font-size:.75rem; font-weight:700; letter-spacing:.04em; padding:.25rem .55rem; border-radius:999px; }
    .pass .badge { background:rgba(31,157,85,.2); color:#6fe3a1; }
    .fail .badge { background:rgba(225,45,57,.2); color:#ff8b93; }
    .meta a { color:#8ec5ff; word-break:break-all; text-decoration:none; }
    .meta strong { display:block; color:var(--muted); font-size:.75rem; margin-top:.5rem; }
    .stats { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.75rem; }
    .stats span { background:#121925; border:1px solid var(--line); border-radius:8px; padding:.25rem .5rem; font-size:.8rem; color:var(--muted); }
    .error { color:#ff8b93; margin:.75rem 0 0; }
    .media { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:.75rem; margin-top:1rem; }
    figure { margin:0; background:#0d131c; border-radius:10px; overflow:hidden; border:1px solid var(--line); }
    figure img { display:block; width:100%; height:auto; }
    figcaption { padding:.4rem .6rem; font-size:.75rem; color:var(--muted); }
    figure.diff { outline:1px solid rgba(225,45,57,.35); }
  </style>
</head>
<body>
  <header class="page">
    <h1>${esc(title)}</h1>
    <p>Generated by Synapse · ${esc(new Date().toISOString())}</p>
    <div class="summary">
      <div class="pill">Total ${esc(summary.total)}</div>
      <div class="pill">Successful ${esc(summary.successful)}</div>
      <div class="pill">Failed ${esc(summary.failed)}</div>
      ${summary.avgSimilarity !== undefined ? `<div class="pill">Avg similarity ${esc(summary.avgSimilarity)}%</div>` : ''}
      ${summary.avgResponseTime !== undefined ? `<div class="pill">Avg response ${esc(summary.avgResponseTime)} ms</div>` : ''}
      ${summary.failedThreshold !== undefined ? `<div class="pill">Below threshold ${esc(summary.failedThreshold)}</div>` : ''}
    </div>
  </header>
  <main>
    ${cards || '<p>No comparison rows.</p>'}
  </main>
</body>
</html>`;
}

export function writeHtmlReport(rows: HtmlReportRow[], options: HtmlReportOptions): string {
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }
  const fileName = options.fileName || `comparison-report-${Date.now()}.html`;
  const outputPath = path.join(options.outputDir, fileName);
  fs.writeFileSync(outputPath, generateHtmlReport(rows, options));
  return outputPath;
}
