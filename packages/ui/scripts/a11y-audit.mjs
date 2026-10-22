// Runs axe (including colour contrast, which jsdom can't check) against every
// Storybook story in real Chromium, across colour schemes, age modes and RTL.
// Usage: pnpm build-storybook && pnpm a11y
import axe from 'axe-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../storybook-static');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(file.endsWith('/') ? path.join(file, 'index.html') : file);
    res
      .writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const { entries } = JSON.parse(await readFile(path.join(root, 'index.json'), 'utf8'));
const ids = Object.values(entries)
  .filter((e) => e.type === 'story')
  .map((e) => e.id);

const combos = [
  ...['light', 'dark'].flatMap((scheme) =>
    ['standard', 'teen', 'working', 'simple'].map((mode) => ({ scheme, mode, locale: 'en-AU' })),
  ),
  { scheme: 'light', mode: 'standard', locale: 'en-XA' },
  { scheme: 'dark', mode: 'simple', locale: 'ar-XB' },
];

// Page-level rules don't apply to components rendered in isolation.
const rules = {
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
};

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let violations = 0;

// Storybook's a11y addon runs axe in the same page; wait for it rather than collide.
async function runAxe(page) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await page.evaluate((r) => window.axe.run(document, { rules: r }), rules);
    } catch (e) {
      if (attempt > 10 || !String(e).includes('already running')) throw e;
      await page.waitForTimeout(250);
    }
  }
}

for (const c of combos) {
  for (const id of ids) {
    await page.goto(
      `${base}/iframe.html?id=${id}&viewMode=story&globals=scheme:${c.scheme};mode:${c.mode};locale:${c.locale}`,
    );
    await page.waitForSelector('#storybook-root > *', { timeout: 15000 });
    // Let entrance animations finish (react-native-web adds role="dialog" afterwards).
    await page.waitForTimeout(500);
    await page.addScriptTag({ content: axe.source });
    const result = await runAxe(page);
    for (const v of result.violations) {
      violations++;
      console.error(`✗ ${id} [${c.scheme}/${c.mode}/${c.locale}] ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.error(`    ${n.html.slice(0, 160)}`);
    }
  }
}

await browser.close();
server.close();
console.log(`${ids.length} stories × ${combos.length} combinations: ${violations} violation(s).`);
process.exit(violations ? 1 : 0);
