# `<ino-speeddial>` — SPEC (INO-493, INO-31 B5)

FAB (floating action button) that expands into a small menu of action buttons.
Doc 26 §5 row: linear/circle/quarter-circle layouts, optional mask, open +
disabled-action states, fab sm/md/lg, action tooltips/labels, menu-button
semantics. Web-only — mobile uses native FAB patterns.

## 1. Anatomy

```
.ino-speeddial                  wrapper (position: relative; consumer places the host)
├── .ino-speeddial__mask        optional full-viewport scrim (mask=true, open only)
├── .ino-speeddial__fab         trigger button — aria-haspopup=menu, aria-expanded
│   └── __fab-icon              glyph, rotates 45° while open
└── .ino-speeddial__menu        role=menu, permanently mounted, visibility-toggled
    └── .ino-speeddial__action  li role=none, one per item
        ├── __action-btn        role=menuitem, aria-label from item.label
        │   └── __action-icon   glyph, aria-hidden
        └── __action-label      tooltip-style visible label, hover/focus only, aria-hidden
```

The host never positions itself against the viewport (unlike `ino-scrolltop`);
the consumer anchors it (screen corner, card corner, toolbar end). The menu and
mask overlay at `--ino-z-overlay` (+1 for the dial) while open.

## 2. API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoSpeedDialItem[]` | `[]` | `label` required (a11y name + tooltip), `icon`, `command`, `disabled` |
| `type` | `'linear' \| 'circle' \| 'quarter-circle'` | `'linear'` | expansion layout |
| `direction` | `'up' \| 'down' \| 'left' \| 'right' \| 'up-left' \| 'up-right' \| 'down-left' \| 'down-right'` | `'up'` | cardinal values for linear; corner values name the quadrant a quarter-circle opens into; `circle` ignores it |
| `radius` | `number` | `80` | px from FAB center to action centers (circle/quarter only) |
| `mask` | `boolean` | `false` | scrim behind the open dial; clicking it closes |
| `disabled` | `boolean` | `false` | disables the FAB trigger |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | FAB diameter 36/44/52px fixed (matches the fluid control scale; density-immune — see §5); actions stay 36px |
| `ariaLabel` | `string` | `'Speed dial'` | names both the FAB and the menu |
| `icon` | `string` | `'+'` | FAB glyph |

Outputs: `openChange: boolean`, `itemClick: { originalEvent, item }`.
Public methods: `show()`, `close(returnFocus: boolean)`.

## 3. Behavior

- **Open/close** — FAB click toggles. Opening never traps focus; the menu is a
  transient APG menu. Light dismiss: click outside closes (without stealing
  focus), `Escape` closes with focus return to the FAB, `Tab` out closes.
- **Menu-button keyboard map (on the FAB)** — `Enter`/`Space`/`ArrowDown` open
  and focus the first action; `ArrowUp` opens and focuses the last.
- **Menu keyboard map** — `ArrowDown`/`ArrowRight` next (wraps),
  `ArrowUp`/`ArrowLeft` previous (wraps), `Home`/`End` first/last, `Escape`
  close + focus FAB. Roving tabindex across action buttons.
- **Activation** — runs `item.command`, emits `itemClick`, closes, returns
  focus to the FAB.
- **Disabled action** — `aria-disabled="true"`, skipped by the roving tabindex
  (library precedent: `ino-context-menu`), never activatable, muted colors.
- **Permanent mount** — the menu toggles `visibility`, never `*ngIf`, so the
  open/close transition runs and the accessibility tree keeps one stable node.
- **Stagger** — actions reveal at 30ms steps (reversed on close); all motion is
  gated behind `prefers-reduced-motion: no-preference`.

## 4. RTL

Directions are **physical**: a FAB anchors to a screen corner, not to text
flow, so `direction="left"` always expands toward the physical left. An RTL
layout that anchors the FAB to the bottom-left corner passes the mirrored
direction at the call site. Internal spacing uses logical properties; the
centering transforms are symmetric and RTL-safe.

## 5. Tokens

Colors/elevation: `--ino-gradient-accent` + `--ino-color-on-accent` (FAB),
`--ino-color-surface`/`--ino-color-on-surface` + `--ino-color-border-strong` +
`--ino-elevation-neutral-3` (actions), `--ino-color-overlay-scrim` (mask),
`--ino-focus-ring`/`--ino-focus-ring-offset`. Motion:
`--ino-motion-duration-fast` / `--ino-motion-easing-standard`.

Diameters are **fixed px geometry literals** (36/44/52 FAB, 36 action), the same idiom as
`ino-scrolltop`'s 44px: the values match the fluid `--ino-control-height-*` scale, but
consuming the tokens directly would let the dense register (which docs pages render in)
shrink the sm FAB to 28px and the actions to 28px. A FAB is not a form row — density must
not resize it, and the fixed px keep every target comfortably above the SC 2.5.8 floor in
both registers.
