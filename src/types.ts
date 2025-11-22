// src/types.ts

export interface ScriptRecord {
  pageUrl: string;
  scriptId: string;
  scriptUrl: string | null;
  isInline: boolean;
  inlineHash?: string;
  origin: 'first-party' | 'third-party' | 'unknown';
  tagPosition: number;
}

export interface HeaderRecord {
  pageUrl: string;
  url: string;
  headers: Record<string, string>;
}

export interface PageScan {
  pageUrl: string;
  timestamp: string;
  scripts: ScriptRecord[];
  headers: HeaderRecord[];
}

export interface ScanResult {
  scannedAt: string;
  pages: PageScan[];
}
