## Component docs site (H-6 / INO-116)

`index.html` in this directory is the hosted component docs site: it fetches `_ds_manifest.json`
and renders every `previews/*.html` card, grouped by its `<!-- @dsCard group="…" -->` marker
(plan revision 9, doc 17 §2 row 10 / §8), with a link to the matching `<name>.md` contract doc.
Regenerate the manifest after adding or renaming a preview:

```sh
npm run docs:manifest
```

Serve this directory (or its `docs/brand/` parent) over HTTP to view it — `index.html` fetches
`_ds_manifest.json` as a sibling file, which browsers block under `file://`. From `docs/brand/`:

```sh
python3 -m http.server 8000
# open http://localhost:8000/06-angular-components/index.html
```

The same preview files this site renders are the exact artifact the Claude Design import (doc 17
§8) and the motion specimen (INO-117) consume — this is not a separate build.

## Claude Design importable bundle (S-3 / INO-165)

This directory, plus the two files it links to outside itself, **is** the importable bundle —
there is no separate packaged copy to maintain. Point Claude Design's GitHub import at this repo
and hand it these paths:

| Piece | Path | What it is |
|---|---|---|
| Docs site | `docs/brand/06-angular-components/index.html` | Renders every card below, grouped |
| Manifest | `docs/brand/06-angular-components/_ds_manifest.json` | Machine-readable index of every card (id, group, preview, doc) — 34 cards across 11 groups as of this write-up |
| Component cards | `docs/brand/06-angular-components/previews/*.html` | One `@dsCard`-marked file per component, first line `<!-- @dsCard group="…" -->` |
| Foundation cards | `docs/brand/06-angular-components/previews/{control-size-scale,elevation-type-rhythm-tokens,form-label-tokens}.html` | Same `@dsCard` convention, `group="Foundations"` |
| Token contract | `docs/brand/02-design-tokens/tokens.css` | The only source of every colour/space/radius/duration/shadow/font-size a card references — no card hardcodes a value or copies this file |
| Angular wiring contract | `docs/brand/02-design-tokens/angular-theme-contract.md` | How to wire `tokens.css` and this component source into a real Angular app |

Regenerate `_ds_manifest.json` (`npm run docs:manifest`) after adding a preview; nothing else in
the bundle needs a build step, so a plain GitHub-repo import sees the same thing `index.html`
renders locally.

**DesignSync round-trip dropped ([INO-299](/INO/issues/INO-299)):** the `DesignSync` tool that
would have driven an automated `list_projects` → `list_files` → `finalize_plan` → `write_files`
sync loop was withdrawn from the harness before it ever became available here, and there is no
adapter config to provision it into. That capability's requirement is already met by the live
Figma connector ([INO-166](/INO/issues/INO-166), `done`) — `get_design_context`, `use_figma`, Code
Connect. This bundle's scope is the static importable artifact set above; it does not attempt a
tool-driven sync.

# INO-31 — Phase 3: Angular Component Implementation (Workstream B)

**Status:** Component source complete for all 6 contracts + the count-up directive. Not built,
not tested against a real Angular compiler — there is still no target Angular workspace in this
repo, by design (see "Known gap," below).

This directory turns `docs/brand/02-design-tokens/angular-theme-contract.md` from a written
spec into real `.component.ts` / `.html` / `.scss` source, one folder per component, matching the
contract's signatures exactly:

| Component | Files |
|---|---|
| `<ino-nav>` | `src/components/nav/` |
| `<ino-hero>` | `src/components/hero/` |
| `<ino-feature-grid>` | `src/components/feature-grid/` |
| `<ino-metric-panel>` | `src/components/metric-panel/` |
| `<ino-tier-card>` | `src/components/tier-card/` |
| `<ino-footer>` | `src/components/footer/` |
| `CountUpDirective` | `src/directives/count-up.directive.ts` |

All components are:
- **Standalone** (`standalone: true`), `OnPush` change detection.
- **Token-only for visual properties** — no hardcoded color/spacing/type; everything reads
  `var(--ino-*)` from `tokens.css`. A re-theme (accent swap, mark swap) never touches these files.
- **Faithful to the contract's explicit boundaries** — e.g. `<ino-metric-panel>` accepts a closed
  `'high' | 'medium' | 'low'` status union, not a raw color, so a caller can't bypass the
  WCAG-audited RAG token pairs; `<ino-tier-card highlighted>` always renders the INO-14
  non-commercial disclaimer, matching the v5 HTML's framing.

## How to use this once a real Angular workspace exists

This is source, not a package — there's nothing to `npm install` here yet because there is no
`angular.json`/build target in this repo (intentional; see `angular-theme-contract.md` §5,
"Known gap at this handoff"). To bring it into the actual KYB Angular app once that repo is in
scope for an agent or dev to touch:

1. Copy `docs/brand/02-design-tokens/tokens.css` into the app's `src/styles/tokens.css`
   (verbatim, per the theme contract §1) and register it in `angular.json`'s global `styles` array.
2. Copy this directory's `src/` into the app, e.g. as `libs/design-system/src/` or
   `src/app/design-system/`, and copy `public-api.ts` alongside it as the import surface.
3. Self-host Geist / Geist Mono `.woff2` files into the app's `assets/` — flagged in the activity
   plan (`04-activity-plan-and-visual-samples.md`, row B) as the one remaining token-layer gap
   that needs a real build to verify (`@font-face` file paths can't be checked without a bundler).
4. Run the app's own lint/build/test — nothing here has been run through `ng build` or
   `ng test`, so treat first compile as the real verification step, not this handoff.

## What's intentionally NOT here

- No `angular.json`, no `tsconfig.json`, no `node_modules` — scaffolding a full installable
  Angular workspace inside a docs-only brand repo would be dead weight with nothing to build
  against, and risks silently drifting from whatever Angular/TypeScript version the real KYB app
  actually pins. The contract (peer ranges in `package.json`) is enough for a dev to wire this in
  correctly on the first try.
- No Angular Animations wiring for the tier-toggle / count-up beyond what's in
  `CountUpDirective` itself — `angular-theme-contract.md` §4 notes `spartan/ui` provides
  behavior primitives (tabs, focus trapping) once adopted; that adoption is still a Phase-3/4
  decision for the real app, not something to pre-guess here.
- No final logo SVG — that's workstream A (Brand Logo), blocked on either a human designer pass
  or Figma MCP authorization, tracked separately in `04-activity-plan-and-visual-samples.md`.

## Traceability

Every visual property in every file here traces to a named token in
`docs/brand/02-design-tokens/tokens.css` — if you find a hardcoded color, spacing value, or font
size anywhere in this directory, that's a bug against this repo's own design-token discipline,
not an intentional exception.
