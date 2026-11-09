#!/usr/bin/env node
/*
 * Minimal static file server with SPA deep-link fallback — INO-375, for the Playwright
 * gates (doc 26 §7 D-gate 3a/3b).
 *
 * Why this exists rather than `ng serve` or an http-server dependency:
 *
 *  * The visual-snapshot gate has to photograph the SAME bytes Pages publishes. That is a
 *    `--configuration production` build (AOT, SCSS budgets, minified, hashed). `ng serve`
 *    runs the development configuration, so a snapshot taken against it is a picture of
 *    something we never ship.
 *  * A new dependency (http-server, serve, sirv) to hand back files from a directory is
 *    the wrong rung of the ladder when `node:http` does it in 40 lines, and every
 *    dependency added to the root install is one more thing in the critical path of a
 *    gate that must not become flaky.
 *  * GitHub Pages has no rewrite rules, so deploy-pages.yml copies index.html to 404.html
 *    to make Angular deep links work. This server reproduces exactly that behaviour, so
 *    `/docs/components/datepicker` resolves in the test run the same way it resolves in
 *    production — a deep-link 404 here would be a real Pages bug, not a harness artifact.
 *
 * Usage:  node scripts/serve-static.mjs <root-dir> [port]
 * Prints "listening on http://127.0.0.1:<port>" once ready (Playwright's webServer waits
 * on the port, not on the line, but it makes a failed CI run readable).
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';

const rootArg = process.argv[2];
const port = Number(process.argv[3] ?? 4300);
if (!rootArg) {
  console.error('usage: node scripts/serve-static.mjs <root-dir> [port]');
  process.exit(2);
}
const root = resolve(rootArg);
if (!existsSync(root)) {
  console.error(`serve-static: ${root} does not exist — run \`npx ng build --configuration production\` in web/ first.`);
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Angular's production build emits index.csr.html when SSR/prerender is configured and
// index.html otherwise — deploy-pages.yml already branches on the same pair.
const indexCandidates = ['index.csr.html', 'index.html'];
const indexFile = indexCandidates.map((f) => join(root, f)).find((p) => existsSync(p));
if (!indexFile) {
  console.error(`serve-static: neither index.csr.html nor index.html under ${root}`);
  process.exit(2);
}

function send(res, status, file) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    // Snapshot stability: a cached stylesheet from a previous run in the same browser
    // context would silently photograph the wrong build.
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0].split('#')[0]);
  // normalize() collapses `..`; the startsWith check is what actually contains the
  // request inside root — a traversal attempt falls through to the SPA fallback.
  const candidate = normalize(join(root, urlPath));
  if (candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()) {
    send(res, 200, candidate);
    return;
  }
  const dirIndex = join(candidate, 'index.html');
  if (candidate.startsWith(root) && existsSync(dirIndex)) {
    send(res, 200, dirIndex);
    return;
  }
  // SPA fallback — same substitution deploy-pages.yml makes via 404.html. Status 200
  // rather than 404 so Playwright's `page.goto` doesn't have to special-case it.
  send(res, 200, indexFile);
}).listen(port, '127.0.0.1', () => {
  console.log(`serve-static: listening on http://127.0.0.1:${port} (root ${root})`);
});
