// src/report.ts
import fs from 'fs';
import path from 'path';
import { ScanResult, ScriptRecord } from './types';

function usage() {
  console.error('Usage: ts-node src/report.ts <scan.json> <report.html>');
  process.exit(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scriptRow(pageUrl: string, script: ScriptRecord): string {
  const scriptUrl = script.scriptUrl || 'INLINE';
  const origin = script.origin;
  const tagPos = script.tagPosition;
  const inlineHash = script.inlineHash || '';

  return `
    <tr>
      <td>${escapeHtml(pageUrl)}</td>
      <td>${escapeHtml(scriptUrl)}</td>
      <td>${escapeHtml(origin)}</td>
      <td>${tagPos}</td>
      <td><code>${escapeHtml(inlineHash)}</code></td>
    </tr>
  `;
}

function generateHtml(scan: ScanResult): string {
  const allScripts: ScriptRecord[] = [];
  let rows = '';

  for (const page of scan.pages) {
    for (const script of page.scripts) {
      allScripts.push(script);
      rows += scriptRow(page.pageUrl, script);
    }
  }

  const totalScripts = allScripts.length;
  const totalPages = scan.pages.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment Page Script Scan Report</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 20px;
      color: #222;
    }
    h1, h2 {
      margin-bottom: 0.2rem;
    }
    .meta {
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
      color: #555;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.9rem;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      vertical-align: top;
    }
    th {
      background: #f4f4f4;
      text-align: left;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    code {
      font-family: "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.8rem;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <h1>Payment Page Script Scan Report</h1>
  <div class="meta">
    <div><strong>Scanned at:</strong> ${escapeHtml(scan.scannedAt)}</div>
    <div><strong>Pages scanned:</strong> ${totalPages}</div>
    <div><strong>Total scripts:</strong> ${totalScripts}</div>
  </div>

  <h2>Scripts</h2>
  <table>
    <thead>
      <tr>
        <th>Page URL</th>
        <th>Script URL / INLINE</th>
        <th>Origin</th>
        <th>Tag position</th>
        <th>Inline hash (SHA-256)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

if (require.main === module) {
  const [, , scanPathArg, htmlOutArg] = process.argv;

  if (!scanPathArg || !htmlOutArg) {
    usage();
  }

  const scanPath = path.resolve(scanPathArg);
  const htmlOutPath = path.resolve(htmlOutArg);

  if (!fs.existsSync(scanPath)) {
    console.error(`Scan file not found: ${scanPath}`);
    process.exit(1);
  }

  const scanJson = fs.readFileSync(scanPath, 'utf8');
  const scan: ScanResult = JSON.parse(scanJson);

  const html = generateHtml(scan);
  fs.writeFileSync(htmlOutPath, html, 'utf8');

  console.log(`HTML report written to ${htmlOutPath}`);
}
