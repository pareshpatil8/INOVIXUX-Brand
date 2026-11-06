# `<ino-editor>` — Rich text editor

> **Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 row
> "ino-editor" (rev-2 amendment `a21a93c`).
> **Board approval:** `f55baa72` on INO-377.
> **Issue:** INO-475 (INO-31 Phase B5).
> **Parity benchmark:** PrimeNG 22.1.1 `Editor` (a Quill 2 wrapper). PrimeNG is a benchmark,
> **not a runtime dependency**; nothing here imports it — and neither Quill nor any other
> rich-text library is taken (see the decisions record §1).
> **Decisions record:** `web/src/app/components/editor/SPEC.md`.

A labeled rich-text control over `contenteditable` with zero runtime dependencies: a preset
toolbar (`basic`/`full`) drives the §5 format set (inline styles, lists, headings, code block,
links), paste is rebuilt against an allowlist, and an optional character budget counts what the
user reads (`textContent`), not markup. The field shell — label, help/error text, counter,
`aria-describedby` wiring — is the same contract `<ino-textarea>` ships.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Visible label; wired via `aria-labelledby` (a contenteditable is not labelable by `for`) |
| `ariaLabel` | `string` | `''` | Accessible-name fallback when no visible `label` is rendered |
| `placeholder` | `string` | `''` | Shown while empty (CSS `::before`); also exposed as `aria-placeholder` |
| `value` / `(valueChange)` | `string` (HTML) | `''` | Banana-in-a-box; both directions pass the sanitizer — no `ControlValueAccessor` (repo convention) |
| `preset` | `'basic' \| 'full'` | `'basic'` | Toolbar preset — see Variants |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Scales min-height, padding and font via the §12 control-size tokens |
| `maxLength` | `number \| null` | `null` | Character budget on `textContent`; typing blocks at the cap, deletion/formatting never do |
| `showCount` | `boolean` | `false` | `{count}/{maxLength}` counter; no-op without `maxLength` |
| `hint` / `error` | `string` | `''` | Help line / error line (error replaces hint, `role="alert"`) |
| `required`, `disabled`, `readonly` | `boolean` | `false` | Readonly keeps the content focusable, selectable and copyable |

### Variants

- **`preset="basic"`** — bold, italic, underline · bulleted list, numbered list.
- **`preset="full"`** — basic + heading 2, heading 3, code block · link, unlink · clear
  formatting. H1 is deliberately not offered (the host page owns its `<h1>`); "code" is a code
  *block* (`<pre>`). Re-activating the active block format reverts the line to a paragraph.
- **Sanitized paste** (both presets) — paste is parsed and rebuilt against the allowlist
  `p, br, strong, em, u, h2, h3, ul, ol, li, pre, code, a`, with `b/i/h1/div` normalized to
  `strong/em/h2/p`, every attribute stripped except `href` (kept only for `http:`/`https:`/
  `mailto:`, re-emitted with `rel="noopener noreferrer"`), and `script`/`style` dropped
  wholesale. The same sanitizer guards the `value` @Input, so a hostile bound string never
  reaches `innerHTML`.
- **Char limit** (both presets) — `maxLength` + `showCount`; see States for at-limit.

### Structure (anatomy)

```
ino-editor
├── .ino-editor__label        ino-label (id ← aria-labelledby), click focuses the editor
└── .ino-editor__frame        one bordered unit: border/hover/invalid live here
    ├── .ino-editor__toolbar  role="toolbar", aria-controls → textbox, roving tabindex
    │   ├── .ino-editor__btn  format toggles (aria-pressed) and action buttons
    │   └── .ino-editor__divider  aria-hidden group separator
    └── .ino-editor__content  role="textbox" aria-multiline, the contenteditable region
.ino-field__meta              hint | error (role=alert) | counter (aria-live=polite)
```

### Sizing — min-height scales

The content area's `min-block-size` is `calc(var(--ino-control-height) * 3)`, with `size`
re-pointing the same three aliases every sized control uses — so the minimum is 108/132/156 px
(sm/default/lg) in the fluid register and 84/96/120 px under `[data-density="dense"]`, tracking
both axes from one declaration. Content grows past the minimum; the host page constrains overall
height if it needs to. Toolbar buttons sit on the compact rung (`--ino-control-height-compact`),
the chrome register, and stay above the WCAG 2.5.8 24 px floor in both densities.

## States

| State | Behavior |
|---|---|
| default | Sunken surface inside a single bordered frame (toolbar + content, no seams) |
| hover | Frame border lifts to `--ino-color-on-surface-muted` |
| focus-visible | Ring on the content area (inset, so it never collides with the frame); each toolbar button carries its own ring |
| active / pressed | Pressed format toggle: accent fill + on-accent text (the ino-toggle-button checked pairing) + `aria-pressed="true"` following the caret |
| invalid | `error` set → danger frame border, `aria-invalid="true"`, error line replaces hint |
| readonly | `contenteditable=false`, toolbar disabled, raised background; content stays in the tab order, selectable and copyable — never `disabled` for readonly |
| disabled | Out of the tab order, toolbar disabled, 50% opacity, `aria-disabled` |
| at-limit | Counter flips to danger + weight 600; text insertion blocks, deletion and formatting still work. Counter-only — at-limit is not invalid |
| empty | Placeholder in `--ino-color-on-surface-subtle` via CSS; `aria-placeholder` carries it to AT |

## Labels and fields

`label`, `hint`, `error`, required marker and the counter reuse the `<ino-textarea>` field-shell
contract. The one divergence: a contenteditable `<div>` is not a labelable element, so
`label[for]` cannot associate — the label carries an `id` the textbox references via
`aria-labelledby`, and click-to-focus (the thing `for` would have provided) is restored with a
click handler on the label wrapper. `hint`/`error`/counter compose into `aria-describedby`
(error replaces hint; the counter id appends when `showCount` + `maxLength` are set). Truncation:
the label ellipses per `<ino-label>`'s own contract; long un-breakable content wraps inside the
textbox (`pre` blocks soft-wrap with `white-space: pre-wrap`). RTL: all spacing is logical
properties; the toolbar and text flow mirror under `dir="rtl"` (spot-check on the docs page).

## Accessibility contract

**Roles / ARIA** — the strip is `role="toolbar"` with `aria-label="Text formatting"` and
`aria-controls` pointing at the textbox. The content region is `role="textbox"` with
`aria-multiline="true"`, `aria-labelledby` (or `aria-label`), `aria-describedby`
(hint/error/counter), `aria-invalid`, `aria-readonly`, `aria-required` and `aria-placeholder` as
applicable. Format toggles carry `aria-pressed` synced to the live selection via
`selectionchange`; action buttons (link/unlink/clear) don't. Every button has a text
`aria-label` and `title`.

**Keyboard** — the toolbar is one tab stop (APG roving tabindex): ArrowRight/ArrowLeft move and
wrap, Home/End jump, the last-focused button keeps the stop. Tab moves between toolbar, textbox
and out — never through every button. Inside the textbox, arrows are never intercepted; native
Ctrl/Cmd+B/I/U and Ctrl/Cmd+Z/Y work via the browser. The Link button prompts for a URL in a
modal, keyboard-trapped `window.prompt`.

**SR announcements** — activating a format toggle flips its `aria-pressed`, which screen readers
announce ("Bold, pressed"); moving the caret into formatted text updates the toggles the same
way. The counter is `aria-live="polite"` and part of `aria-describedby`, so the budget is
announced on focus and as it changes. The error line is `role="alert"`.

**Contrast** — every color is a role token (`--ino-color-*`, `--ino-focus-ring`); the danger
text rungs use `--ino-color-danger-text-safe`, link text uses `--ino-color-accent-text-safe`
(the AA-safe text splits), and the pressed toggle uses the accent-fill/on-accent pairing — in
all 3 themes, both densities.

## Deliberate omissions

- **Inline code** — `execCommand` has no inline-code primitive and hand-rolled Range surgery is
  out of proportion; "code" ships as a code block. (`SPEC.md` §2)
- **H1** — the host page owns its page title; the editor caps at H2/H3.
- **Link popover editor** — v1 captures URLs via `window.prompt`; a popover form adds chrome,
  not capability. Unsafe protocols are rejected either way.
- **Images, tables, embeds, font/color pickers** — not in the §5 format set.
- **Undo/redo buttons** — native Ctrl/Cmd+Z/Y already work; buttons would add no capability.
- **Loading state** — no async source feeds an editor directly; the host form owns submission
  state.
- **Auto-resize caps (`maxRows`)** — the content area grows; the host constrains height.
- **`ControlValueAccessor`** — plain `value`/`valueChange` is the repo-wide forms convention.
- **`document.execCommand` is deprecated** — recorded, not hidden: the §5 format set sits in the
  frozen-and-universal subset; if a browser ever drops it the toolbar degrades to no-ops while
  typing, paste sanitization, the char limit and the whole ARIA contract keep working
  (`SPEC.md` §1).

## Mobile parity

**Web-only by spec.** The doc 26 §5 row's mobile disposition for `ino-editor` is "Web-only;
heavy row — spec first": no React Native or Flutter port is planned, and none ships. Rich-text
editing on mobile is a platform-native concern (contenteditable webviews are a known
accessibility and IME minefield); if a mobile rich-text need materializes it gets its own
spec-first ticket rather than a port of this one.
