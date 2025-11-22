Script Inventory Auditor

A lightweight Node/TypeScript tool that scans a webpage in a headless browser, collects every script that executes, and outputs a structured inventory to help with PCI DSS v4.0 6.4.3 and 11.6.1 compliance.
It supports HTML, JSON and console output, plus optional diffing between scans.

⭐ Features

Crawls a target URL in a real browser (Puppeteer)

Captures:

Script origin (first-party/third-party)

Script type (inline/external/module)

Script URLs

Inline script hashes

Outputs results to:

Terminal

HTML report

JSON file

Diff mode to compare the current scan to a previous result set

Simple CLI usage

📦 Installation
git clone https://github.com/<your-org>/script-inventory-auditor
cd script-inventory-auditor
npm install

🚀 Usage
Basic scan

Scans a webpage and prints results to the terminal:

npm run dev https://www.example.com

Scan with depth

Depth controls how many internal links the crawler follows:

npm run dev https://www.example.com 2

Scan and output to HTML
npm run dev https://www.example.com 2 report.html


This produces report.html alongside the CLI output.

Scan and save JSON
npm run dev https://www.example.com 2 report.json

Diff two scans
npm run diff old-scan.json new-scan.json diff.html


Outputs added/removed/modified scripts in HTML or JSON.

📁 Project Structure
src/
  cli.ts             # CLI entry point
  scanner.ts         # Puppeteer fetch + script extraction logic
  reporter.ts        # HTML + JSON output generator
  diff.ts            # JSON diffing logic
  types.ts           # Shared TypeScript interfaces
dist/                # Compiled JS after build

⚙️ Inline Script Handling

Inline scripts are captured and stored as:

SHA-256 hash

First line preview

Script length (bytes)

Raw bodies are not saved unless you add that functionality yourself.

🔒 PCI DSS v4 Mapping (High Level)
Requirement	How This Tool Helps
6.4.3 – Script authorisation & inventory	Produces a script inventory with source, type, and origin metadata
11.6.1 – Change detection for scripts	Diff reports show newly added, removed or changed scripts
6.3.2 – Integrity controls	Inline script hashing helps detect unauthorised changes
🧪 Development

Compile TypeScript:

npm run build


Run tests:

npm test


Lint:

npm run lint

🛠 Requirements

Node 18+

npm

Chromium is auto-downloaded by Puppeteer

📜 License

MIT