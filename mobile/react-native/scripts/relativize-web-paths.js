#!/usr/bin/env node
// Expo's static web export (metro, no expo-router) hardcodes root-absolute asset paths
// (href="/favicon.ico", src="/_expo/...") into index.html. That's fine served from a
// domain root, but breaks once the same output is hosted under a GitHub Pages subpath
// (e.g. /INOVIXUX-Brand/mobile-preview/react-native/). Rewrite them to relative paths
// so the export works from any subpath, since the app itself never navigates to other
// absolute routes (single-screen SPA shell, verified against the bundled JS — see
// INO-107).
const fs = require("fs");
const path = require("path");

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: relativize-web-paths.js <export-output-dir>");
  process.exit(1);
}

const indexPath = path.join(outDir, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

// Rewrite href="/x" / src="/x" to href="./x" / src="./x", but leave protocol-relative
// ("//host/...") and already-relative ("./", "../") references alone.
const rewritten = html.replace(/(href|src)="\/(?!\/)/g, '$1="./');

if (rewritten === html) {
  console.warn(`relativize-web-paths: no absolute paths found in ${indexPath} (nothing to do)`);
} else {
  fs.writeFileSync(indexPath, rewritten);
  console.log(`relativize-web-paths: rewrote absolute paths to relative in ${indexPath}`);
}
