# `<ino-dock>` — Icon dock

> **Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row
> "ino-dock" (rev-2 amendment `a21a93c`).
> **Board approval:** `f55baa72` on INO-377.
> **Issue:** INO-481 (INO-31 Phase B5).
> **Parity benchmark:** PrimeNG 22.1.1 `Dock` — a macOS-style magnifying icon strip. PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it (see the decisions record §1).
> **Decisions record:** `web/src/app/components/dock/SPEC.md`.

A horizontal (`bottom`) or vertical (`side`) strip of icon buttons with CSS-only
magnify-on-hover, built as an APG menubar (`role="menubar"`/`"menuitem"`) so Arrow keys rove a
single tab stop across the items. An `activeId` input marks the current item; each item shows a
tooltip-style visible label on hover/focus in addition to its accessible name.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoDockItem[]` | `[]` | `label` (a11y name + hover label fallback), `icon`, `tooltip`, `disabled`, `command`, `id`, `data` |
| `position` | `'bottom' \| 'side'` | `'bottom'` | Layout axis — row vs. column; see Variants |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Icon/button size — fixed px geometry, not the shared `InoControlSize` scale |
| `activeId` | `string \| null` | `null` | Matches an item's `id`; drives the active-item state |
| `ariaLabel` | `string` | `'Application dock'` | Accessible name for the `menubar` |
| `magnify` | `boolean` | `true` | Kill switch for the hover-magnify effect, independent of (and composing with) reduced motion |

Output: `itemClick: { originalEvent, item }`.

### Variants

- **`position="bottom"`** (default) — items lay out as a horizontal row; the hover/focus label
  appears above the icon.
- **`position="side"`** — items lay out as a vertical column; the hover/focus label appears to
  the inline-end of the icon. The component assumes a left-anchored dock by default (the label
  reads away from the edge); a right-anchored dock is a consumer positioning concern, not a
  second input (`SPEC.md` §2).
- **`size="sm" | "md" | "lg"`** — 36 / 44 / 52px buttons, 16 / 20 / 24px icons. Fixed px, not
  token-driven, so the dense register never shrinks a floating dock the way it would a form row
  (`SPEC.md` §3).
- **Magnify-on-hover** (all variants) — the hovered or keyboard-focused item scales to 1.22× via
  CSS `transform`; disabled items never magnify.

### Structure (anatomy)

```
ino-dock
└── nav.ino-dock__frame        aria-label — bordered, elevated pill surface
    └── ul.ino-dock__bar       role=menubar, aria-orientation, roving-tabindex keydown
        └── li.ino-dock__item  role=none — anchors the label's absolute position
            ├── button.ino-dock__btn   role=menuitem, aria-label, aria-current when active
            │   └── .ino-dock__icon    glyph, aria-hidden
            └── .ino-dock__label       tooltip-style visible label, hover/focus-within only
```

## States

| State | Behavior |
|---|---|
| default | Flat icon on a bordered, elevated pill surface |
| hover | Sunken-surface background fill |
| hover-magnify | Hovered item scales to 1.22×; off under `prefers-reduced-motion: reduce` (fully off, not just un-animated) or `magnify="false"` |
| focus-visible | `--ino-focus-ring`; also triggers magnify, so keyboard users get the same affordance as pointer users |
| active (pressed) | Flat `--ino-color-accent-active` fill |
| active-item | Persistent accent-gradient fill + on-accent icon color, `aria-current="true"` — set via `activeId` matching an item's `id` |
| disabled | Real `disabled` attribute + `aria-disabled="true"`, 50% opacity, muted color, skipped entirely by keyboard roving, never magnifies |

## Labels and fields

Every item has one accessible name (`label`) and one visible hover/focus label
(`tooltip ?? label`), shown via `:hover`/`:focus-within` on the item and positioned per
`position` (above for `bottom`, inline-end for `side`). The visible label is `aria-hidden` since
`aria-label` already carries the name to assistive tech. Labels are `white-space: nowrap` — kept
short by convention rather than truncated by the component. RTL: all label offsets use logical
properties, so both placements mirror correctly under `dir="rtl"` (spot-checked on this page).

## Accessibility contract

**Roles / ARIA** — `ul.ino-dock__bar` is `role="menubar"` with `aria-orientation` following
`position` (`horizontal` for `bottom`, `vertical` for `side`); each `li` is `role="none"`; each
`button` is `role="menuitem"` with `aria-label` (accessible name) and `aria-disabled`/the real
`disabled` attribute when inert. The active item additionally carries `aria-current="true"`.

**Keyboard** — one roving tab stop across the strip. `ArrowLeft`/`ArrowRight` move and wrap when
`position="bottom"`; `ArrowUp`/`ArrowDown` move and wrap when `position="side"` (the inactive
pair is a no-op). `Home`/`End` jump to the first/last navigable item. Disabled items are skipped
entirely by the roving navigation and are never a tab stop. Activation is native `<button>`
behavior — click, or `Enter`/`Space` on the focused item.

**SR announcements** — there is no live region: activating an item is an immediate navigation/
command, not an async state change the way a toggle's `aria-pressed` flip is. The active item's
`aria-current="true"` is announced when a screen reader lands on that button, same as any other
`aria-current` consumer.

**Contrast** — every color is a role token (`--ino-color-*`, `--ino-focus-ring`); the active-item
fill uses the same `--ino-gradient-accent` / `--ino-color-on-accent` pairing every checked/
selected control in this library uses, AA-guaranteed by construction in all 3 themes.

## Deliberate omissions

- **Neighbor magnify falloff** — the full macOS effect also scales nearby icons by pointer
  distance; that needs per-frame `mousemove` math, out of proportion for "magnify-on-hover."
  Only the hovered/focused item itself scales. (`SPEC.md` §4)
- **Viewport auto-fixing** — the component never positions itself against the viewport; like
  `<ino-speeddial>`, the consumer anchors the host. (`SPEC.md` §1)
- **A `side: 'left' | 'right'` sub-axis** — the doc 26 row is a binary `bottom | side`; `side`
  assumes a left anchor by default. (`SPEC.md` §2)
- **Drag-to-reorder** — `items` order is caller-controlled; no built-in reordering.
- **Auto-hide / reveal-on-proximity** — a shell-level behavior, not this component's.
- **Badges/notification dots** — not in the §5 row; `data` on an item lets a consumer render its
  own badge overlay if needed.
- **`<ino-tooltip>` composition** — the visible label is a bespoke element instead, so its timing
  stays in lockstep with the magnify transform rather than composing two independent show/hide
  systems. (`SPEC.md` §7)
- **`ControlValueAccessor`** — not applicable; a dock is a navigation/launcher strip, not a form
  control.

## Mobile parity

**Web-only by spec.** The doc 26 §5 row's mobile disposition for `ino-dock` is "Web-only; no RN/
Flutter port needed": no React Native or Flutter port is planned, and none ships. Both mobile
platforms have their own native app-switcher/dock conventions (iOS home screen, Android
navigation/taskbar), so a ported web dock widget would duplicate rather than complement
platform-native navigation — if a mobile-specific launcher need materializes it gets its own
spec-first ticket rather than a port of this one.
