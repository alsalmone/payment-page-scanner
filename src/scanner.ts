// src/scanner.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { PAYMENT_PAGES, SCAN_TIMEOUT_MS } from './config';
import { ScriptRecord, HeaderRecord, PageScan, ScanResult } from './types';

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function getOrigin(
  pageUrl: string,
  scriptUrl: string | null
): 'first-party' | 'third-party' | 'unknown' {
  if (!scriptUrl) return 'unknown';
  try {
    const pageHost = new URL(pageUrl).hostname;
    const scriptHost = new URL(scriptUrl, pageUrl).hostname;
    return pageHost === scriptHost ? 'first-party' : 'third-party';
  } catch {
    return 'unknown';
  }
}

async function scanPage(pageUrl: string): Promise<PageScan> {
  const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});


  const page = await browser.newPage();

  const headers: HeaderRecord[] = [];

  // Capture response headers for main document + scripts
  page.on('response', async (response) => {
    try {
      const request = response.request();
      const url = request.url();
      const resourceType = request.resourceType();
      if (resourceType === 'document' || resourceType === 'script') {
        const responseHeadersRaw = response.headers();
        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(responseHeadersRaw)) {
          responseHeaders[k.toLowerCase()] = Array.isArray(v)
            ? v.join(',')
            : String(v);
        }
        headers.push({
          pageUrl,
          url,
          headers: responseHeaders,
        });
      }
    } catch {
      // ignore header capture errors
    }
  });

  await page.goto(pageUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Allows page to log back to Node if needed
  await page.exposeFunction('scannerLog', (msg: any) => {
    // console.log('scannerLog:', msg);
  });

  // Watch for dynamically added <script> tags
  await page.evaluate(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).tagName === 'SCRIPT'
          ) {
            (window as any).scannerLog?.({
              event: 'script-added',
              outerHTML: (node as HTMLElement).outerHTML.slice(0, 500),
            });
          }
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    (window as any).__scriptObserver = observer;
  });

  // Wait for dynamic content
  await new Promise((resolve) => setTimeout(resolve, SCAN_TIMEOUT_MS));

  // Collect script info (initial pass)
  const scriptsBase: ScriptRecord[] = await page.evaluate(
    (pageUrlInner: string) => {
      const results: ScriptRecord[] = [];
      const scriptTags = Array.from(document.getElementsByTagName('script'));

      scriptTags.forEach((script, index) => {
        const src = script.getAttribute('src');
        const isInline = !src;

        const record: ScriptRecord = {
          pageUrl: pageUrlInner,
          scriptId: `${pageUrlInner}#${index}`,
          scriptUrl: src || null,
          isInline,
          inlineHash: undefined,
          origin: 'unknown',
          tagPosition: index,
        };

        results.push(record);
      });

      return results;
    },
    pageUrl
  );

  // Add inline hashes
  const scriptsWithHashes: ScriptRecord[] = [];

  for (const script of scriptsBase) {
    if (script.isInline) {
      const textContent = await page.evaluate((index: number) => {
        const scriptTags = Array.from(document.getElementsByTagName('script'));
        const scriptEl = scriptTags[index];
        return scriptEl?.textContent || '';
      }, script.tagPosition);

      scriptsWithHashes.push({
        ...script,
        inlineHash: sha256(textContent || ''),
      });
    } else {
      scriptsWithHashes.push(script);
    }
  }

  // Add origin based on hostname
  const scriptsFinal: ScriptRecord[] = scriptsWithHashes.map((s) => ({
    ...s,
    origin: getOrigin(pageUrl, s.scriptUrl),
  }));

  await browser.close();

  return {
    pageUrl,
    timestamp: new Date().toISOString(),
    scripts: scriptsFinal,
    headers,
  };
}

async function runScan() {
  const pages: PageScan[] = [];

  for (const url of PAYMENT_PAGES) {
    console.log(`Scanning ${url}...`);
    try {
      const pageScan = await scanPage(url);
      pages.push(pageScan);
      console.log(
        `Finished ${url}: ${pageScan.scripts.length} scripts, ${pageScan.headers.length} header records`
      );
    } catch (err) {
      console.error(`Error scanning ${url}`, err);
    }
  }

  const result: ScanResult = {
    scannedAt: new Date().toISOString(),
    pages,
  };

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const filename = `scan-${new Date().toISOString().slice(0, 10)}.json`;
  const outPath = path.join(outDir, filename);

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Scan written to ${outPath}`);
}

if (require.main === module) {
  runScan().catch((err) => {
    console.error('Scan failed', err);
    process.exit(1);
  });
}
