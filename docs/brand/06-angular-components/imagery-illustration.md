# Imagery & Illustration Direction — Brand System

> Parity benchmark: e-Cheque reference repo ships `brand-hero.svg` + `brand-illustration.svg`
> (`docs/brand/16-design-system-parity-vs-echeque-reference.md` row 12, structural-parity table).
> We ship no equivalent files yet — this document is the **direction spec**, not the assets.
>
> Gap register: closes **M-11** (imagery / illustration direction) in
> `docs/brand/16-design-system-parity-vs-echeque-reference.md`. Directly feeds the **Media**
> component group (Carousel, Compare, Gallery, Galleria, Image, ImageCompare — 6 components,
> currently 0 ✅ / 0 ⚠️ / 6 ❌, doc 16 §Media) by giving those components a palette, motion, and
> treatment contract to consume once they're built.
> Preview: [`previews/imagery-illustration.html`](previews/imagery-illustration.html).

## Scope of this deliverable

This is a **documentation-only spec**, not a component. Three reasons:

1. **No component to spec against yet.** The Media group is at zero coverage — there is no
   `<ino-image>` / `<ino-gallery>` / `<ino-carousel>` to bind this direction to. Building those is
   separate Wave 2 work; this issue only defines the visual language they'll inherit.
2. **`web/src/tokens.css` is frozen after Wave 0.** Every rule below resolves through *existing*
   semantic roles (`--ino-color-accent*`, `--ino-elevation-brand-*`, `--ino-space-*`,
   `--ino-radius-*`, `--ino-motion-*`). Nothing here requires a new token.
3. **No new binary assets.** No SVG/PNG illustration files ship with this issue. The spec gives the
   next engineer (or a contracted illustrator, per the CTO decision on this ticket) exact geometry,
   stroke, palette, and motion rules to draw against — same discipline as a component API doc
   written before the component exists.

Because there's no component directory, this issue touches only this doc and its preview —
narrower than the standard 11-row Definition of Done, which assumes a component. Rows that don't
apply to a docs-only deliverable (Size API, Density, the eight interactive states, mobile parity
tracks) are addressed below as "not applicable — no interactive component" rather than silently
skipped.

---

## 1. Illustration system

### Geometry

- **Line-based, not filled-shape.** Illustrations are built from stroked paths on a transparent
  background, matching the icon language already implied by `--ino-elevation-brand-*`'s use for
  "chosen/featured" surfaces (`web/src/tokens.css` §2) — filled brand illustrations would compete
  with, not support, the accent-tinted elevation system components already use to signal emphasis.
- **Grid.** Draw on a 24×24 base unit grid (matches `--ino-target-min: 24px`) at whatever multiple
  the composition needs — a hero illustration is typically 8–12 grid units per side. Corner
  rounding on any illustrated shape snaps to the existing radius scale (`--ino-radius-sm` 6px
  through `--ino-radius-xl` 14px) rather than a freehand curve, so an illustrated card edge and a
  real `<ino-card>` edge read as the same visual system.
- **Composition.** Geometric primitives (circles, rounded rects, straight/diagonal connective
  lines) over organic freehand forms. This keeps illustrations redrawable at any size without
  hinting artifacts, and keeps a contracted illustrator's output auditable against the same
  primitive-shape vocabulary a reviewer already knows from the component library.

### Stroke weight

No new `--ino-stroke-*` token is introduced (tokens.css is frozen). Stroke weight is a fixed SVG
authoring rule, scaled by viewBox rather than tokenized, because it's a drawing convention — not a
themeable role components bind to at runtime:

| Context | Stroke weight (at 1x, 24px grid unit) |
|---|---|
| Hero illustration (large, ≥320px rendered) | 1.5px |
| Inline / small illustration (<320px rendered) | 2px |

The heavier stroke at small sizes is the standard optical-correction rule (thin strokes
under-render at small pixel sizes) — not a token, because it's resolved once at authoring time per
asset, not switched at runtime.

### Palette

Illustration colour is drawn **entirely from the existing accent + neutral roles** — no new
palette, no illustration-specific colour token:

| Role | Token | Use in illustration |
|---|---|---|
| Primary stroke | `--ino-color-on-surface` | Default line colour — reads with body text, never competes with it |
| Accent stroke / fill | `--ino-color-accent` | The one or two "focal" elements per composition — a highlighted node, the subject of a hero |
| Accent gradient fill | `--ino-gradient-accent` | Large flat regions in a hero illustration (e.g. a background shape), reusing the same violet→indigo gradient buttons and CTAs already use |
| Muted / background strokes | `--ino-color-on-surface-muted` | Secondary, non-focal linework — grid lines, connective paths |
| Glow / ambient accent | `--ino-glow-accent` | Optional radial glow behind a hero subject — same token `<ino-tier-card>`-style "featured" surfaces already use |

Rule: **at most one accent focal point per composition.** An illustration with three
accent-coloured elements has no hierarchy — same reasoning `alert.md` gives for why `info` isn't
the accent colour: something that's everywhere isn't a signal.

### Cross-theme behaviour

Because every colour is a semantic role, **no illustration needs a per-theme variant** — this is
the same "component never branches on `data-theme`" contract every other piece of the system
follows (doc 16, INO-92). What differs between themes is contrast, not geometry:

| Theme | Primary stroke resolves to | Accent resolves to |
|---|---|---|
| dark (`:root`) | `--ino-primitive-gray-500`-family (via `on-surface`) on near-black | `--ino-primitive-violet-500` on near-black — high contrast, strokes read crisp |
| light (`[data-theme="light"]`) | dark charcoal-family on off-white | same violet, now on a light ground — verify per-asset that thin strokes (1.5–2px) don't wash out against `--ino-color-surface`; increase to the small-size 2px rule if a light-theme render looks thin |
| high-contrast (`[data-theme="high-contrast"]`) | `--ino-color-on-surface` at its high-contrast value (boosted per `tokens.css` §2c) | `--ino-color-accent` at its high-contrast value. **Glow effects (`--ino-glow-accent`, `--ino-elevation-brand-*`) are omitted entirely** — same "no shadow gradients in high-contrast mode" rule tokens.css already applies to elevation, because a soft radial glow is a luminance gradient that reduces edge clarity for the low-vision users who opt into this theme |

An SVG asset that hardcodes a hex value instead of consuming these roles at the CSS layer (`fill:
var(--ino-color-accent)` on inline SVG, or a `currentColor`-driven stroke) fails this spec the same
way a hardcoded component colour fails DoD row 1 — this is the enforcement point for any future
illustration asset, checked the same way `check-theme-parity.mjs` checks component CSS.

---

## 2. Photography treatment rules

For product screenshots, team photography, or any raster image (not line illustration):

- **Duotone-over-accent, not full colour, for any photo used as a background or decorative
  element.** Apply `--ino-color-accent` as one pole of a duotone map and `--ino-color-surface` (per
  theme) as the other. A full-colour photo sitting behind text is a contrast-audit liability every
  time it changes; a duotone mapped to two already-audited roles inherits their contrast guarantee.
- **Full-colour photography is reserved for content the user is here to see** — a document
  preview, an uploaded ID, a report thumbnail. Never for decorative/marketing imagery in the
  product chrome itself.
- **Corner treatment** follows the same radius scale as illustrations: `--ino-radius-lg` (10px) for
  an inline thumbnail, `--ino-radius-xl` (14px) for a hero-scale photo, matching `<ino-card>`'s own
  radius so a photographic hero and a card share one visual language.
- **Elevation** on a raised photographic element uses `--ino-elevation-brand-1/2/3`
  (`web/src/tokens.css` §2) exactly as a featured tier-card would — never a hand-rolled shadow.
- High-contrast theme: duotone photography maps to the theme's boosted `--ino-color-accent` /
  `--ino-color-surface` pair automatically (no separate high-contrast photo treatment needed,
  because the mapping is role-based, not baked into the asset).

---

## 3. Hero-image spec

The hero region (page-top marketing/dashboard-empty-state banner) combines geometry + palette +
motion into one composition contract:

| Property | Rule |
|---|---|
| Canvas | 16:9 desktop, 1:1 or 4:5 mobile crop — same aspect-ratio discipline as a photographic hero, cropped, never scaled/distorted |
| Background | `--ino-color-surface` (theme base) — never a custom hero-only background colour |
| Focal treatment | One accent-gradient (`--ino-gradient-accent`) shape or one `--ino-glow-accent` radial, never both at full strength in the same composition — see "one accent focal point" rule in §1 |
| Corner radius | `--ino-radius-xl` (14px) when the hero sits inside a card-like container; `0` (full-bleed) when it spans the viewport edge-to-edge, matching `<ino-alert variant="banner">`'s own full-bleed rule |
| Elevation | `--ino-elevation-brand-3` when the hero is a raised/floating panel; `--ino-elevation-0` (none) when it's full-bleed and flush with the page background |
| Empty-state variant | Same geometry rules at a smaller (≤240px) scale, muted-stroke-only (no accent focal point) — an empty state should read as calm/neutral, not as a marketing moment |

---

## 4. Motion

Illustration and hero-image motion is **entrance-only** — a static composition doesn't loop or
idle-animate, which would compete with the content it's meant to frame.

| Phase | Duration token | Easing token | Effect |
|---|---|---|---|
| Enter | `--ino-motion-duration-slow` (480ms) | `--ino-motion-easing-decelerate` | fade in + subtle scale (`0.98` → `1`) — a hero is a larger, slower-settling element than a toast (`--ino-motion-duration-base`, 200ms), matching `motion-contract.md`'s size-to-duration relationship |
| Focal accent glow (optional) | `--ino-motion-duration-countup` (900ms) | `--ino-motion-easing-standard` | glow opacity `0` → full, staggered ~150ms after the base composition settles, so the focal point reads as "arriving second," reinforcing it as the one thing to look at |

Both are plain CSS/SVG-SMIL or CSS transitions gated behind
`@media (prefers-reduced-motion: no-preference)`, following the same pattern as
`docs/brand/06-angular-components/motion-contract.md` §2: under `reduce`, the composition renders
in its settled end state with no scale/fade/glow animation — nothing is lost, only the transition
into view.

Illustrations use no `translateX`/directional movement, so RTL needs no mirrored motion variant —
scale and opacity are direction-agnostic.

---

## 5. Accessibility contract

- **Decorative vs. informational.** A hero illustration or photograph that carries no information
  beyond mood/branding is `aria-hidden="true"` (or `alt=""` for `<img>`), same rule
  `alert.md` gives for `.ino-alert__icon` (WCAG 2.2 SC 1.4.1 — never the sole carrier of meaning).
  A photograph that *is* the content (a document preview, an uploaded ID) gets a real, specific
  `alt` describing what's shown, not the generic filename.
- **Contrast is enforced on the *content that sits on top of* imagery, not the imagery itself.**
  Any text or interactive element overlaid on a hero image or duotone photo must independently
  clear WCAG 2.2 AA (4.5:1 text) against its *actual* rendered background — verified per
  composition, since a duotone photo's local luminance varies by region. Do not rely on a single
  global contrast check the way a flat-colour component can.
- **Motion respects `prefers-reduced-motion`** per §4 — this is the SC 2.3.3 (2.5.8-adjacent)
  concern, not a text-contrast one.
- **RTL** — geometry uses relative/percentage positioning and `transform: scale()`, never
  `left`/`right` offsets, so a hero composition doesn't need a mirrored asset under `dir="rtl"`.
  A composition with directional narrative content (e.g., an arrow implying a left-to-right flow)
  is the one case that *does* need a mirrored asset — flag that explicitly in the asset's own
  filename/spec when a future illustration has directional content, rather than assuming this
  general rule covers it.

---

## 6. Deliberate omissions

Recorded here rather than silently dropped (DoD §6 / §9, applied to a docs-only deliverable):

- **No actual illustration or photography assets ship with this issue.** Per the CTO decision on
  this ticket (INO-167 confirmation, accepted 2026-09-22): I'm authorized to draft this direction
  spec directly, not to produce final artwork — final asset production remains a contracted
  designer/illustrator engagement per the S-5 scope note in the design-system-engineer role
  instructions. This doc is what that contractor (or a future engineer building the Media group)
  draws against.
- **Size API / eight interactive states / density.** Not applicable — this is a static-asset
  direction spec, not an interactive component. Those rows apply once an actual `<ino-image>` /
  `<ino-gallery>` component is built against this spec (separate Wave 2 issue).
- **Mobile parity.** Web-only for this pass, explicitly: the geometry/palette/motion rules are
  platform-agnostic (they only reference colour roles, not CSS), so React Native and Flutter can
  consume the same direction once `mobile/react-native/src/theme/tokens.ts` /
  `mobile/flutter/lib/theme/tokens.dart` are the ones resolving `accent`/`surface` per theme — no
  separate mobile illustration spec is needed. Recorded as a decision, not an oversight.
- **No new `--ino-stroke-*` or `--ino-illustration-*` token family.** Stroke weight (§1) is a fixed
  authoring rule rather than a token because `web/src/tokens.css` is frozen after Wave 0 and stroke
  weight isn't themeable in the way colour/space/radius are — it's resolved once per asset at
  draw time.

---

## 7. Relationship to the Media component group

This spec is the palette/motion/treatment contract the eventual Media components (Carousel,
Compare, Gallery, Galleria, Image, ImageCompare — doc 16 §Media, 0/6 built) should consume:

- `<ino-image>`'s loading/error placeholder state should use the muted-stroke illustration
  language from §1 (a simple geometric "image" glyph on `--ino-color-surface-sunken`), not a
  generic browser broken-image icon.
- `<ino-gallery>` / `<ino-galleria>` thumbnail treatment inherits §2's photography rules
  (radius, elevation) directly.
- Building any of these six components is separate, unstarted Wave 2 work — this issue only
  removes the "we have no imagery direction at all" blocker (register item **M-11**) so that work
  has a contract to build against.
