# INO-31 — Angular Theme Contract & Component Specs (Phase 2/3 boundary)

This repo (`INOVIXUX-Brand`) holds brand/design-system source, not the KYB Angular app itself —
so everything below is a **contract to hand to the app repo**, written precisely enough to
implement without re-deciding anything, not a working Angular project. Once the actual app repo
is reachable by an agent/dev, this file is the spec to build against.

## 1. Wiring `tokens.css` into an Angular app

```jsonc
// angular.json
{
  "projects": {
    "kyb-app": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "src/styles/tokens.css",   // this file, copied in verbatim, unmodified
              "src/styles.scss"          // app-level styles that consume the tokens
            ]
          }
        }
      }
    }
  }
}
```

`tokens.css` is plain CSS custom properties on `:root` — no PostCSS/SCSS preprocessing required.
Component SCSS then reads tokens the normal way:

```scss
// risk-badge.component.scss
.badge {
  background: var(--ino-color-risk-high-fill);
  color: var(--ino-color-risk-high-on-fill);
  border-radius: var(--ino-radius-pill);
  padding: var(--ino-space-1) var(--ino-space-3);
  font: var(--ino-type-label-weight) var(--ino-type-label-size) / 1 var(--ino-font-mono);
  letter-spacing: var(--ino-type-label-tracking);
}
```

## 2. Density as an `@Input`, not a global

```ts
@Component({ selector: 'ino-risk-table', ... })
export class RiskTableComponent {
  @Input() density: 'dense' | 'fluid' = 'dense';

  @HostBinding('attr.data-density') get densityAttr() { return this.density; }
}
```

`tokens.css` §9 already defines both `[data-density="dense"]` and `[data-density="fluid"]` — the
component only needs to set the attribute; no token duplication in component code.

## 3. Component contracts (spec-level — signatures + template structure, not full implementations)

Each maps 1:1 to a section of `docs/brand/mockups/foundation-v5-verified-line.html`, per the
Phase-2 checklist in `03-vetra-structural-foundation.md`.

### `<ino-nav>`
- **Inputs:** `links: { label: string; href: string }[]`, `ctaLabel: string`
- **Outputs:** `ctaClick: EventEmitter<void>`
- **Structure:** logo slot (`<ng-content select="[logo]">`) + `<nav>` link list + CTA button
  using the `.btn.primary` pattern (`background: var(--ino-color-on-surface); color: var(--ino-color-surface)`).

### `<ino-hero>`
- **Inputs:** `eyebrow: string`, `headline: string`, `lead: string`
- **Content projection:** dashboard-mock slot (keeps the live dashboard markup out of the shell
  component — the hero shell shouldn't know about risk-table internals).
- **Typography:** binds to `--ino-type-display-*` tokens; must implement the `<=640px` step to
  `--ino-type-display-size-sm` via a media query in the component's own SCSS (token file defines
  the value, component owns the breakpoint).

### `<ino-feature-grid>`
- **Inputs:** `items: { icon: string; title: string; description: string }[]`
- **Structure:** CSS grid, `grid-template-columns: repeat(4, 1fr)`, cards using
  `--ino-color-surface-raised` is *not* used here (v5 uses flat `surface` for fcards, `raised`
  only for the dashboard/metric panels) — preserve that distinction, it's intentional depth
  hierarchy (raised = "live data", flat = "static description").

### `<ino-metric-panel>`
- **Inputs:** `label: string`, `value: number`, `delta: string`, `rows: {label: string; value: string; status: 'high'|'medium'|'low'}[]`
- **Behavior:** owns the count-up animation — see `CountUpDirective` below, applied to the
  `value` binding, not re-implemented per panel.
- **Row status → RAG token:** `status` maps directly to `--ino-color-risk-{status}-fill` /
  `-on-fill` — the component should not accept a raw color input; that would reopen the
  unaudited-color-pair risk the README's contrast section exists to prevent.

### `<ino-tier-card>` *(deployment tiers, not commercial pricing — INO-14 hold still applies)*
- **Inputs:** `name: string`, `description: string`, `features: string[]`, `highlighted: boolean`
- Must render a visible "illustrative, not commercial" note when `highlighted` context is a
  paid-tier concept — carry the v5 HTML's explicit non-commercial framing into the component,
  don't let it get lost in translation to a "real" component.

### `<ino-footer>`
- **Inputs:** `columns: { heading: string; links: {label: string; href: string}[] }[]`
- Structure: `grid-template-columns: 1.4fr repeat(4, 1fr)`, matches v5 exactly.

### `CountUpDirective`
```ts
@Directive({ selector: '[inoCountUp]', standalone: true })
export class CountUpDirective implements OnChanges {
  @Input('inoCountUp') target = 0;
  // rAF-driven count from current displayed value to `target` over
  // var(--ino-motion-duration-countup) (900ms), eased with
  // var(--ino-motion-easing-decelerate). Ports directly from the vanilla JS
  // in foundation-v5-verified-line.html (bottom of file) — same math, wrapped
  // as a directive instead of a page-load script.
  // Must check `matchMedia('(prefers-reduced-motion: reduce)')` and jump to
  // target immediately (no animation) if true.
}
```

## 4. `spartan/ui` boundary

Where `spartan/ui` primitives are adopted (tabs for the tier toggle, table for dense risk data),
they provide **behavior only** — keyboard nav, ARIA roles, focus trapping. Every visual property
(color, spacing, radius, type) still comes from `tokens.css` via the component SCSS layer
described in §1, not from spartan/ui's default styling. This is the same "roles not raw values"
discipline as the color tokens: a primitive-library upgrade should never require a re-theme.

## 5. Known gap at this handoff

None of the above has been executed against a real Angular workspace — there isn't one in this
repo. This document is the contract; the actual `.component.ts` files are Phase 3 work items,
to be opened as a follow-up once the KYB app repo is in scope for an agent to touch.
