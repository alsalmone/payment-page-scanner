// src/diff.ts
import fs from 'fs';
import path from 'path';
import { ScanResult, ScriptRecord } from './types';

function loadScan(filePath: string): ScanResult {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

interface DiffItem {
  pageUrl: string;
  scriptId: string;
  changeType: 'new' | 'removed' | 'changed';
  oldRecord?: ScriptRecord;
  newRecord?: ScriptRecord;
}

function indexScripts(scan: ScanResult): Map<string, ScriptRecord> {
  const map = new Map<string, ScriptRecord>();
  for (const page of scan.pages) {
    for (const script of page.scripts) {
      const key = `${page.pageUrl}||${script.scriptUrl || 'INLINE'}||${script.tagPosition}`;
      map.set(key, script);
    }
  }
  return map;
}

function diffScans(oldScan: ScanResult, newScan: ScanResult): DiffItem[] {
  const diffs: DiffItem[] = [];
  const oldIndex = indexScripts(oldScan);
  const newIndex = indexScripts(newScan);

  // New or changed scripts
  for (const [key, newScript] of newIndex.entries()) {
    const oldScript = oldIndex.get(key);
    const [pageUrl] = key.split('||');

    if (!oldScript) {
      diffs.push({
        pageUrl,
        scriptId: key,
        changeType: 'new',
        newRecord: newScript,
      });
    } else {
      const changed =
        (newScript.scriptUrl || '') !== (oldScript.scriptUrl || '') ||
        (newScript.inlineHash || '') !== (oldScript.inlineHash || '') ||
        newScript.origin !== oldScript.origin;

      if (changed) {
        diffs.push({
          pageUrl,
          scriptId: key,
          changeType: 'changed',
          oldRecord: oldScript,
          newRecord: newScript,
        });
      }
    }
  }

  // Removed scripts
  for (const [key, oldScript] of oldIndex.entries()) {
    if (!newIndex.has(key)) {
      const [pageUrl] = key.split('||');
      diffs.push({
        pageUrl,
        scriptId: key,
        changeType: 'removed',
        oldRecord: oldScript,
      });
    }
  }

  return diffs;
}

// CLI: npx ts-node src/diff.ts output/old.json output/new.json
if (require.main === module) {
  const [, , oldPath, newPath] = process.argv;
  if (!oldPath || !newPath) {
    console.error('Usage: ts-node src/diff.ts <oldScan.json> <newScan.json>');
    process.exit(1);
  }

  const oldScan = loadScan(path.resolve(oldPath));
  const newScan = loadScan(path.resolve(newPath));
  const diffs = diffScans(oldScan, newScan);

  console.log(JSON.stringify(diffs, null, 2));
}
