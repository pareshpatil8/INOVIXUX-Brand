# `<ino-speeddial>` — Speed Dial

> Built to doc 26 §2 Component Publish Contract as INO-493 (INO-31 Wave B5).
>
> Web-only component — not ported to React Native or Flutter (mobile uses native FAB patterns).

Floating action button (FAB) that expands into a small menu of action buttons, laid out as a
straight line, a full circle, or a quarter-circle arc, with an optional full-viewport mask.
Designed for a primary "create/act" affordance anchored to a screen or container corner.

---

## Structure

```
ino-speeddial
├── mask            optional scrim behind the open dial (mask=true)
├── FAB trigger     aria-haspopup="menu", aria-expanded, gradient-accent fill
└── action menu     role="menu", permanently mounted, visibility-toggled
    └── action      role="menuitem" button + tooltip-style visible label
```

The host never positions itself against the viewport (unlike `ino-scrolltop`) — the consumer
anchors it. The expanded menu overlays at `--ino-z-overlay` and reserves no layout space.

### Usage

```html
<ino-speeddial
  [items]="[
    { label: 'New file', icon: '📄', command: onNew },
    { label: 'Upload',   icon: '⬆',  command: onUpload },
    { label: 'Delete',   icon: '🗑',  command: onDelete, disabled: true }
  ]"
  type="linear"
  direction="up"
  ariaLabel="Document actions"
></ino-speeddial>
```

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoSpeedDialItem[]` | `[]` | `label` (required — accessible name + tooltip), `icon`, `command`, `disabled` |
| `type` | `'linear' \| 'circle' \| 'quarter-circle'` | `'linear'` | expansion layout |
| `direction` | `'up' \| 'down' \| 'left' \| 'right' \| 'up-left' \| 'up-right' \| 'down-left' \| 'down-right'` | `'up'` | cardinal values for `linear`; corner values name the quadrant a `quarter-circle` opens into; `circle` ignores it |
| `radius` | `number` | `80` | px from FAB center to action centers (`circle`/`quarter-circle` only) |
| `mask` | `boolean` | `false` | full-viewport scrim behind the open dial; clicking it closes |
| `disabled` | `boolean` | `false` | disables the FAB trigger |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | FAB diameter 36 / 44 / 52px, fixed (density-immune) |
| `ariaLabel` | `string` | `'Speed dial'` | names both the FAB and the menu |
| `icon` | `string` | `'+'` | FAB glyph; rotates 45° while open |

| Output | Payload | Notes |
|---|---|---|
| `openChange` | `boolean` | fires on every open/close, any cause |
| `itemClick` | `{ originalEvent, item }` | fires on action activation, after `item.command` |

Public methods: `show()` opens without moving focus; `close(returnFocus)` closes, optionally
returning focus to the FAB.

### Sizing & density

FAB diameters are fixed px geometry (sm 36 / md 44 / lg 52 — the fluid control-height
values), the same idiom as `ino-scrolltop`'s fixed 44px. Action buttons stay one fixed 36px
size on every FAB size — above the SC 2.5.8 24px floor. Deliberately **not** bound to the
`--ino-control-height-*` tokens: the dense register (which docs pages render in) remaps
those down (sm → 28px), and a FAB is not a form row, so density must not resize it. The
docs demo shows the dial unchanged in both registers.

---

## States

| State | Treatment |
|---|---|
| closed (default) | FAB only; menu `visibility: hidden`, `aria-hidden`, zero tab stops |
| open | actions revealed with 30ms stagger; FAB icon rotates 45°; `aria-expanded="true"` |
| hover (FAB) | `brightness(1.08)` on the gradient fill |
| hover (action) | sunken surface + accent icon; label chip appears |
| focus-visible | shared `--ino-focus-ring` on FAB and actions |
| active | flat `--ino-color-accent-active` fill (press signal per INO-123 convention) |
| disabled (dial) | native `disabled` on the FAB: muted fill, no shadow, never opens |
| disabled (action) | `aria-disabled="true"`, muted, skipped by keyboard navigation, not activatable |

---

## Keyboard Navigation (APG Menu Button Pattern)

| Key | Context | Action |
|---|---|---|
| `Enter` / `Space` / `ArrowDown` | FAB | opens the dial and focuses the first action |
| `ArrowUp` | FAB | opens the dial and focuses the last action |
| `ArrowDown` / `ArrowRight` | menu | next action, wraps |
| `ArrowUp` / `ArrowLeft` | menu | previous action, wraps |
| `Home` / `End` | menu | first / last action |
| `Enter` / `Space` | menu | activates the focused action, closes, focus returns to the FAB |
| `Escape` | menu or FAB | closes, focus returns to the FAB |
| `Tab` | menu | closes and moves focus on naturally |

Roving tabindex across the action buttons; disabled actions are skipped (library precedent:
`ino-context-menu`). Mouse open does not move focus; clicking outside (or on the mask) closes
without stealing focus.

---

## Accessibility contract

**Role / ARIA**

- FAB: native `<button>` with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` pointing
  at the menu's id, named by `ariaLabel`
- Menu: `role="menu"` (named by the same `ariaLabel`); actions are native `<button
  role="menuitem">` elements named by `item.label` via `aria-label`
- The visible label chip and the icons are `aria-hidden` — the menuitem's `aria-label` carries
  the same text, so nothing is double-announced
- The menu is permanently mounted; the closed state is `visibility: hidden` + `aria-hidden` +
  no tab stops, never `*ngIf`, so the accessibility tree keeps one stable node and open/close
  transitions can run

**Keyboard** — see the table above; full menu-button pattern with Esc-close and focus return.

**Contrast** — FAB is `--ino-gradient-accent` / `--ino-color-on-accent` (audited pair, 4.79:1+);
actions and label chips are `--ino-color-surface` / `--ino-color-on-surface` with a
`--ino-color-border-strong` 1px border for WCAG 1.4.11 non-text contrast when the shadow is
invisible; the mask uses `--ino-color-overlay-scrim` and never carries text.

**Targets** — smallest interactive element is the 36px action button (SC 2.5.8 floor is 24px);
the sm FAB is also 36px.

**Motion** — open/close stagger, icon rotation, and label fades are all gated behind
`prefers-reduced-motion: no-preference`; with reduced motion everything snaps instantly.

**RTL** — internal spacing uses logical properties; centering transforms are symmetric.
Expansion directions are deliberately physical — a FAB anchors to a screen corner, not text
flow — so an RTL layout passes the mirrored `direction` value at the call site.

---

## Deliberate omissions

- **`semi-circle` type.** PrimeNG offers linear / circle / semi-circle / quarter-circle; the
  doc 26 §5 row specifies "linear/circle/quarter directions", so semi-circle is out of scope.
  The arc math generalizes if a future row reinstates it.
- **Focus trap.** An open dial is a transient APG menu, not a modal: Tab moves on (closing the
  dial), and the optional mask is a click target, not a focus boundary. Trapping focus would
  contradict the menu-button pattern.
- **Tooltip component reuse.** Action labels are rendered inline by the dial rather than through
  `ino-tooltip`, because the label must also appear on keyboard focus of a roving-tabindex
  menuitem and follow the dial's own placement logic (side for vertical layouts, below for
  horizontal ones) — a positioning contract the generic tooltip directive does not carry.
- **Viewport collision handling.** The dial expands where the consumer pointed it; it does not
  flip direction at viewport edges. The consumer anchors a FAB to a corner and picks the
  direction that opens into the page — same contract as PrimeNG's SpeedDial.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule) — done the moment the web component passes. |
| React Native | Not ported | Web-only per doc 26 §5 row — mobile uses native FAB patterns. |
| Flutter | Not ported | Web-only per doc 26 §5 row — mobile uses native FAB patterns. |
