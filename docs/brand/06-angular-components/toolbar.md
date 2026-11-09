# `<ino-toolbar>` — Toolbar

> Built to doc 26 §2 Component Publish Contract as INO-443 (INO-31 Wave B2).
>
> Web-only component — not ported to React Native or Flutter.

Container component providing start/center/end content distribution with density-responsive sizing
and ARIA toolbar pattern keyboard navigation. Designed for top-of-page action bars, navigation
headers, and command palettes.

---

## Structure

Three optional content slots:

| Slot | Purpose | Justification |
|---|---|---|
| `start` | Left-aligned actions (LTR) / right-aligned (RTL) | Primary navigation, menu toggles |
| `center` | Centered content | Page titles, search inputs |
| `end` | Right-aligned actions (LTR) / left-aligned (RTL) | User profile, settings, save actions |

All three slots are optional — any combination is valid. Empty slots render as zero-width flex
containers and have no visual impact.

### Usage

Slot attributes go directly on each control (not on a wrapper div):

```html
<ino-toolbar ariaLabel="Main toolbar">
  <button slot="start" ino-button variant="secondary">Menu</button>
  <button slot="start" ino-button variant="ghost">New</button>
  <h2 slot="center" class="toolbar-title">Page Title</h2>
  <button slot="end" ino-button variant="ghost">Settings</button>
  <button slot="end" ino-button variant="primary">Save</button>
</ino-toolbar>
```

This makes controls direct flex children of the slot containers, ensuring `gap` and overflow
scrolling work correctly.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `ariaLabel` | `string` | *required* | Accessible name for the toolbar; maps to `aria-label` on the container |

No `@Output` events — toolbar is a structural container, not an interactive control.

### Density

Controlled by the global `[data-density]` attribute on a parent container (typically `<body>` or
feature root), not by a component input:

| Register | `min-height` | `padding-block` | Notes |
|---|---|---|---|
| dense | `--ino-row-min-height` (32px) | `--ino-space-row` (8px) | Docs pages render in dense by default |
| fluid | `--ino-row-min-height` (44px) | `--ino-space-row` (16px) | Comfortable spacing for desktop apps |

`padding-inline` is fixed at `--ino-space-4` (16px) in both registers. Uses the standard
`box-sizing: border-box` from the global reset.

---

## States

Toolbar is a structural container with no interactive states of its own. Individual controls
projected into slots carry their own states (hover, focus, disabled, etc.).

---

## Keyboard Navigation (APG Toolbar Pattern)

Implements the [ARIA Authoring Practices Guide toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)
with roving tabindex:

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves focus to the toolbar (first visit) or the most recently focused item within it |
| `ArrowRight` | Moves focus to the next focusable item; wraps to first |
| `ArrowLeft` | Moves focus to the previous focusable item; wraps to last |
| `Home` | Moves focus to the first focusable item |
| `End` | Moves focus to the last focusable item |

### Roving Tabindex Implementation

- First focusable item within the toolbar gets `tabindex="0"`; all others get `tabindex="-1"`
- When an arrow key moves focus, the new target gets `tabindex="0"` and all others become `"-1"`
- Toolbar is a single tab stop from outside (via the first item); arrow keys navigate within
- Dynamic content changes are observed via MutationObserver to maintain correct tabindex values

---

## Accessibility contract

**Role / ARIA**

- `role="toolbar"` on the host element
- `aria-label` (required input) names the toolbar
- Roving tabindex on toolbar items (first item gets `tabindex="0"`, others `"-1"`)

**Keyboard** — See Keyboard Navigation table above. Arrow keys and Home/End do NOT capture
focus when a text input, textarea, or select has focus (per WCAG 2.1.1 and APG guidelines).

**Contrast** — Toolbar background is `--ino-color-surface`, border is `--ino-color-border`. Both
resolve to audited pairs per theme; no toolbar-specific contrast assertions needed (tokens already
cover it).

**Targets** — Toolbar itself is not a target (structural container). Controls projected into slots
are responsible for meeting the 24px SC 2.5.8 floor — this is enforced on `ino-button` and
form-field components independently.

**RTL** — Uses `padding-inline`, `padding-block`, `border-block-end` (not `padding-left`/`top`/
`border-bottom`). Mirrors under `dir="rtl"` with no second stylesheet.

**Overflow scrolling** — `overflow-x: auto` on the toolbar container with `flex-wrap: nowrap` and
`flex-shrink: 0` on all slotted children. When content exceeds the toolbar width, horizontal
scrolling activates. Focused toolbar items automatically scroll into view during arrow-key
navigation, ensuring keyboard accessibility without requiring a separate scroll container tabstop.

---

## Deliberate omissions

- **`density` input.** An earlier implementation had `@Input() density: 'dense' | 'comfortable'`,
  which duplicated the design system's own `[data-density]` axis and created a second conflicting
  density register. Removed in favor of the global attribute (CTO review, INO-443 defect 3).
- **Dynamic slot detection.** An earlier implementation used `querySelector('[slot="..."]')` to
  conditionally render slot containers only when content was projected. This created a chicken-and-egg
  deadlock in Angular Ivy (content isn't attached until the view renders, but the view was gated on
  detecting the content). `@ContentChildren` is no help either — it cannot query an attribute
  selector like `[slot="start"]`, only a directive, which every `slot="start"` call site would have
  to adopt. Current implementation always renders all three slot containers and collapses the unused
  ones with `:empty { display: none }`, the same idiom `ino-card`/`ino-panel`/`ino-drawer` use for
  optional projected-content wrappers, so an unused slot is zero-width **and** contributes no `gap`
  gutter (CTO review, INO-443 defect 7; gutter fixed in INO-864).

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule) — done the moment the web component passes. |
| React Native | Not ported | Web-only per doc 26 §5 row specification |
| Flutter | Not ported | Web-only per doc 26 §5 row specification |
