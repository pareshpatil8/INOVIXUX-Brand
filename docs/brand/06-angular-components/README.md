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
