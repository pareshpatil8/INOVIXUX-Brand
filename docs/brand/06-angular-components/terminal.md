# `<ino-terminal>` — Terminal

> Built to doc 26 §2 Component Publish Contract as INO-479 (INO-31 Wave B5).
>
> Web-only component — not ported to React Native or Flutter.

Read-eval-print-style scrollback widget: a fixed-height log of echoed commands and their output, with a single text input line beneath it. Designed for documentation viewers, dev tooling, and shell-like interfaces.

---

## Structure

Three functional regions stacked vertically:

| Region | Role |
|---|---|
| **Log region** | `role="log"` scrollback transcript, displays command echoes, output, and messages |
| **Input row** | Text input for the current command and static prompt glyph |
| **Busy row** | Animated dots, shown while `busy=true` to indicate a running command |

The component is a presentation shell — it never executes commands itself. The consumer listens for `commandSubmit`, does whatever work the command implies, and calls `writeOutput()` to append the result. This division of labor matches `ino-speeddial` (command callback / itemClick output): the component owns the interface, the consumer owns the semantics.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `prompt` | `string` | `'$'` | Glyph(s) shown before the input caret and echoed before each submitted command in scrollback |
| `welcomeMessage` | `string[]` | `[]` | `system`-type lines rendered once at mount, above any command history; re-assigning after mount does not re-seed |
| `ariaLabel` | `string` | `'Terminal'` | Accessible name root for the log region (`"<ariaLabel> output"`) and input (`"<ariaLabel> command input"`) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Fixed scrollback block-size: 200 / 320 / 440px — density-immune, same idiom as `ino-speeddial` FAB diameters |
| `busy` | `boolean` | `false` | Command is running: input disabled, animated busy row replaces the prompt row, announced via aria-live |
| `disabled` | `boolean` | `false` | Whole widget inert: input gets native `disabled`, dimmed, not focusable |
| `readonly` | `boolean` | `false` | No input row at all — pure log viewer; scrollback remains selectable/scrollable |

**Output:** `commandSubmit: string` — emitted on `Enter` when not busy/disabled/readonly and the input is non-empty; fires the trimmed command text.

**Public methods:**
- `writeOutput(text: string \| string[], type: 'output' \| 'error' \| 'system' = 'output')` — appends one or more lines and auto-scrolls to bottom.
- `clear()` — empties the scrollback (matches shell `clear`; the welcome message is not restored).
- `focusInput()` — focuses the input programmatically (no-op when disabled/readonly).

---

## Behavior

**Submit** — `Enter` in the input (when not busy/disabled/readonly and trimmed input is non-empty): echoes an `input`-type line (`prompt` + text), pushes onto recall history, emits `commandSubmit`, clears input, resets history cursor.

**Command history (recall)** — `ArrowUp` steps backward through submitted commands, replacing input; `ArrowDown` steps forward. Once past the newest entry, `ArrowDown` restores the in-progress draft the user was typing before they started recalling. Recall never mutates scrollback.

**Scrollback** — every line (`welcomeMessage`, echoed `input`, appended output) renders in `role="log"` in order; auto-scrolls to bottom on each append via post-render `setTimeout(…, 0)` (same idiom as `ino-speeddial`).

**Click-to-focus** — pointer down in `.ino-terminal__log` focuses the input (unless disabled/readonly), matching real terminal emulators where the visible caret is the only input affordance.

**Busy** — while `busy`, input is disabled and input row replaced by animated `…` row (gated behind `prefers-reduced-motion`); `commandSubmit` cannot fire until `busy` is set back to `false`.

**Error lines** — `writeOutput(text, 'error')` renders in danger-safe text color. This maps to the §2 contract's "invalid/error (where applicable)" row at the line level rather than the widget level — a shell signals failure by what a command printed, not by recoloring its own chrome.

---

## States

| State | Class | Applies | Purpose |
|---|---|---|---|
| **focused** | `ino-terminal--focused` | Container `.ino-terminal` | Visible ring the moment input has focus, any modality — real terminals highlight the active pane this way |
| **busy** | `ino-terminal__busy-row` visible | Input row region | Animated dots, input replaced by busy indicator |
| **disabled** | `ino-terminal--disabled` | Container `.ino-terminal` | Container dimmed; input native `disabled` |
| **readonly** | Input row hidden | Input row region | No input, pure log viewer |

**Deliberate omissions:**
- `active` (pointer-press): text `<input>` has no meaningful pressed affordance.
- `hover`: no bespoke hover beyond browser's native text-cursor and scrollbar.

---

## Sizing

Fixed px block-size for scrollback region, independent of `--ino-control-height-*` density scale — same idiom as `ino-speeddial` FAB diameters and `ino-scrolltop` (44px). A multi-line transcript is not a form control, so dense register (docs pages render here) must not shrink scrollback to unreadable.

| `size` | Block-size |
|---|---|
| `sm` | 200px |
| `md` (default) | 320px |
| `lg` | 440px |

The input row height follows `--ino-control-height` (live, register-aware — normal for a text input) as normal.

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `Enter` | Submit command (when not busy/disabled/readonly, trimmed input non-empty) |
| `ArrowUp` | Recall previous command |
| `ArrowDown` | Recall next command or restore in-progress draft |

---

## Accessibility contract

**Role / ARIA**
- Log region carries `role="log"` and `aria-live="polite"` — screen readers announce new lines as they are appended.
- Input carries native `type="text"` textbox semantics with `aria-label` (bound to `<ariaLabel> command input"`).
- Log region gets `aria-label="<ariaLabel> output"`.
- Busy state announced via a separate `role="status"` region when `busy` toggles true.

**Keyboard:** All interaction keyboard-accessible (Enter to submit, arrow keys for history).

**Focus:** Container-level `focused` state and visible ring separate from input's own `focus-visible` ring — both exist and are visually distinct.

---

## Tokens

**Colors:**
- `--ino-color-surface-sunken` — log + input background
- `--ino-color-on-surface` — default / input text
- `--ino-color-on-surface-muted` — system/welcome lines, busy row, prompt glyphs
- `--ino-color-danger-text-safe` — error lines
- `--ino-color-border` — log border
- `--ino-focus-ring`, `--ino-focus-ring-offset` — container focused ring

**Typography:**
- `--ino-font-mono` — all transcript + input text
- `--ino-control-font-size` — text size for lines and input

**Motion:**
- `prefers-reduced-motion` gating on busy-row pulse animation

---

## RTL

All layout uses logical properties (`padding-inline`, `flex-direction: column`, etc.) for correct mirroring. Prompt glyph and monospace transcript text are left-to-right content regardless of document direction (shell output convention) — deliberate exception to RTL mirroring, documented in §5.

---

## Deliberate omissions

- **`active` (pointer-press)** — the only interactive element is a text `<input>`, which has
  no meaningful pressed affordance (unlike a button); the input's native caret/typing state
  already covers "the user is interacting with this."
- **`hover`** — no bespoke hover treatment beyond the browser's native text-cursor change over
  the input and default scrollbar hover in the log; a transcript has no hover-activatable
  targets.
- **Labels row** — the §2 contract's full "Labels" row (label, required marker, help text,
  error text, float/ifta integration) does not apply — doc 26 §5 scopes labeling to
  `aria-label` only, consistent with terminal not being a validated form field.
- **Form `ControlValueAccessor`** — matches every other INO-31 control to date; CVA adoption is
  a fleet-wide decision, not scoped to this ticket.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule) — done the moment the web component passes. |
| React Native | Not ported | Web-only per doc 26 §5 row — "Web-only (docs/dev tooling)." |
| Flutter | Not ported | Web-only per doc 26 §5 row — "Web-only (docs/dev tooling)." |
