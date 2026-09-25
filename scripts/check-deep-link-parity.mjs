// Dependency-free source-contract audit. Run from any directory with Node.
//
// docs/brand/13-mobile-app-patterns.md §6.5: the path grammar *is* the Capacitor route table, and
// React Native / Flutter map onto those same strings rather than inventing their own — one link
// string has to resolve to the same screen on all three tracks or it can't go in a notification
// payload at all. This asserts the three PATHS tables referenced by
// `mobile/capacitor/app/src/app/deep-link/deep-link.contract.ts`,
// `mobile/flutter/lib/navigation/deep_link.dart` and `mobile/react-native/src/navigation/linking.ts`
// still agree.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

const capacitor = read('mobile/capacitor/app/src/app/deep-link/deep-link.contract.ts');
const flutter = read('mobile/flutter/lib/navigation/deep_link.dart');
const rn = read('mobile/react-native/src/navigation/linking.ts');

const capacitorPathsBlock = capacitor.match(/export const PATHS = \{([\s\S]*?)\} as const;/)?.[1];
assert.ok(capacitorPathsBlock, 'Capacitor PATHS table did not parse');
const capacitorPaths = Object.fromEntries(
  [...capacitorPathsBlock.matchAll(/(\w+):\s*'([^']+)',?$/gm)].map((m) => [m[1], m[2]]),
);
assert.ok(Object.keys(capacitorPaths).length >= 7, 'Capacitor PATHS table did not parse');

const flutterPaths = Object.fromEntries(
  [...flutter.matchAll(/static const String (\w+) = '([^']+)';/g)].map((m) => [m[1], m[2]]),
);
assert.deepEqual(flutterPaths, capacitorPaths, 'Flutter InoPaths must match Capacitor PATHS');

// React Navigation's `config.screens` nests paths without a leading slash and keys them by route
// name, not by the PATHS-style key — so reconstruct '/screen' or '/screen/:id' strings from the
// tree instead of diffing key names.
const rnLeaves = Object.fromEntries(
  [...rn.matchAll(/^\s*(\w+): '([^']+)',$/gm)]
    .filter((m) => m[1] !== 'initialRouteName')
    .map((m) => [m[1], `/${m[2]}`]),
);
const rnByPath = new Set(Object.values(rnLeaves));
const capacitorByPath = new Set(Object.values(capacitorPaths));
for (const path of capacitorByPath) {
  assert.ok(rnByPath.has(path), `React Native linking config is missing path ${path}`);
}
for (const path of rnByPath) {
  assert.ok(capacitorByPath.has(path), `React Native linking config has an extra path ${path} not in the Capacitor grammar`);
}

console.log('deep-link parity OK — Capacitor, Flutter and React Native path grammars agree');
