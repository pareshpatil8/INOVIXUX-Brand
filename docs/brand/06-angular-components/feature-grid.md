# `<ino-feature-grid>` — Feature grid

> Marketing-only component — no PrimeNG counterpart, so there is no parity benchmark line.
> One of the 5 components doc 26 §4 A4 flagged with "no docs at all" (INO-374, doc 26 §6 C5).
> No static preview and no `SPEC.md` exist for this component; both predate this doc.

A 4-column static description grid — bank-grade-security / compliance / product-feature callouts
on marketing and landing surfaces. Not a data table and not interactive: each item is an
icon/title/description triple, and the grid itself owns no selection, sorting, or async state.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoFeatureGridItem[]` | `[]` | `{ icon: string; title: string; description: string }[]` — `icon` is rendered as text content (an emoji or icon-font glyph), not an `<svg>` slot |

---

## Variants / Structure

One structural form: a CSS grid of `<article>` cards, one per `items` entry, each with an
`aria-hidden` icon span, an `<h3>` title and a `<p>` description. The grid reflows by container
width — 4 columns desktop, 2 tablet, 1 mobile — via CSS, not a component `@Input`; there is no
separate "compact" or "list" variant.

Deliberately uses the flat `--ino-color-surface` token for each card, not `-raised` — v5 reserves
"raised" surfaces for live-data cards (`ino-metric-panel`) only. Preserve that distinction; it is
the token system's depth hierarchy, not an arbitrary style choice (see the component's own
class-level doc comment).

---

## States

Presentational and non-interactive — no hover/focus/active/disabled/invalid state set applies;
`items` is caller-supplied static data, never touched after render (`OnPush`, no internal state).

The only state worth naming is **item count**:

- **Populated** — any number of items; the grid does not require a multiple of 4 and does not pad
  a short final row.
- **Empty** — `items: []` renders no cards and no placeholder/empty-state message. A caller that
  can reach a zero-item feature grid owns its own empty-state copy; this component does not guess
  one.

---

## Accessibility contract

**Role / ARIA** — no explicit role or landmark; the grid is a sequence of `<article>` elements in
normal reading order. The icon glyph is `aria-hidden="true"` on every card — it is decorative
alongside the title, not an independent piece of content — so only the title and description are
exposed to assistive tech.

**Keyboard** — none owned by this component. No item is focusable or activatable; if a caller needs
a clickable feature card, it wraps the content in its own `<a>`/`<button>` and owns that contract
(same pattern as `ino-card`'s `interactive` input, which this component does not have).

**Contrast** — card background/border/text token pairs are pre-existing tokens, audited across all
three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — the grid uses `gap`/`grid-template-columns` and logical padding; no `left`/`right` values
in the stylesheet.

---

## Deliberate omissions

- **Interactivity.** No `interactive`/clickable variant, unlike `ino-card`. A feature grid item
  that needs to be a link is out of this component's scope — compose `ino-card` instead.
- **Icon slot.** `icon` is a plain string rendered as text, not a projected `<ng-content>` slot for
  an `<svg>` — every current call site uses an emoji glyph. Revisit if a call site needs a real
  icon component.
- **Readonly / invalid states.** Not carried — the grid has no value of its own to lock or fail
  validation.

## Notes / mobile disposition

Web-only. This is a marketing/landing-page component, not part of the mobile app shell — no React
Native or Flutter port exists or is planned; nothing in doc 26's component backlog (§5) calls for
one.
