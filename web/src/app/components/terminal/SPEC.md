# `<ino-terminal>` — SPEC (INO-479, INO-31 B5)

Read-eval-print-style scrollback widget: a fixed-height log of echoed commands and
their output, with a single text input line beneath it. Doc 26 §5 row: prompt
template, command history, scrollback, welcome message; `focused`/`busy` states;
fixed-height scales; `aria-label`; `role=log` + `aria-live` polite output; input
textbox semantics. Web-only (docs/dev tooling) — no RN/Flutter port.

## 1. Anatomy

```
.ino-terminal                     wrapper — fixed block-size by `size`, monospace
├── .ino-terminal__log            role="log", aria-live="polite", scrollable transcript
│   └── .ino-terminal__line       one per entry — data-line-type: system|input|output|error
│       └── .ino-terminal__line-prompt   rendered only on data-line-type="input" (echo)
└── .ino-terminal__input-row      hidden entirely when `readonly`
    ├── .ino-terminal__prompt     static prompt glyph, aria-hidden
    └── .ino-terminal__input      native <input type="text">, textbox semantics
```

The component never executes commands itself — it is a transcript + input shell.
The consumer listens for `commandSubmit`, does whatever work the command implies,
and calls `writeOutput()` (optionally after toggling `busy`) to append the result.
This mirrors the division of labor in `ino-speeddial` (`command` callback / `itemClick`
output): the component owns presentation and keyboard/ARIA contract, the consumer
owns semantics.

## 2. API

| Input | Type | Default | Notes |
|---|---|---|---|
| `prompt` | `string` | `'$'` | glyph(s) shown before the input caret and echoed before each submitted command in scrollback |
| `welcomeMessage` | `string[]` | `[]` | `system`-type lines rendered once, above any history, at mount |
| `ariaLabel` | `string` | `'Terminal'` | names the log region (`"<ariaLabel> output"`) and the input (`"<ariaLabel> command input"`) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | fixed scrollback block-size: 200 / 320 / 440px (§5) |
| `busy` | `boolean` | `false` | a command is "running": input disabled, animated busy row replaces the prompt row, announced via the log's `aria-live` |
| `disabled` | `boolean` | `false` | whole widget inert: input gets native `disabled`, dimmed, not focusable |
| `readonly` | `boolean` | `false` | no input row at all — pure log viewer; scrollback remains selectable/scrollable |

Outputs: `commandSubmit: string` (trimmed command text, fired on `Enter` when not
busy/disabled/readonly and the input is non-empty).

Public methods:
- `writeOutput(text: string | string[], type: 'output' | 'error' | 'system' = 'output')`
  — appends one or more lines and scrolls to bottom.
- `clear()` — empties the scrollback (matches shell `clear` semantics — the welcome
  message is not restored).
- `focusInput()` — focuses the input programmatically (no-op when disabled/readonly).

## 3. Behavior

- **Submit** — `Enter` in the input, when not busy/disabled/readonly and the trimmed
  value is non-empty: echoes an `input`-type line (`prompt` + command text), pushes
  the command onto the recall history, emits `commandSubmit`, clears the input, resets
  the history cursor to "new".
- **Command history (recall, not scrollback)** — `ArrowUp` steps backward through
  previously submitted commands, replacing the input value; `ArrowDown` steps forward
  and, once past the newest entry, restores the in-progress draft the user was typing
  before they started recalling. Recall never mutates scrollback.
- **Scrollback (transcript)** — every line (`welcomeMessage`, echoed `input`, and
  anything appended via `writeOutput`) renders in the `role="log"` region in order;
  the region auto-scrolls to its own bottom whenever a line is appended, via a
  post-render scroll (same `setTimeout(…, 0)` idiom `ino-speeddial` uses for
  post-render focus) since the fixed-height log clips overflow.
- **Welcome message** — `welcomeMessage` lines are seeded as `system`-type scrollback
  entries in `ngOnInit`, before any command history exists; re-assigning the input
  after mount does not re-seed (matches a shell banner printing once at session start).
- **Click-to-focus** — pointerdown anywhere in `.ino-terminal__log` focuses the input
  (unless disabled/readonly), matching real terminal emulators where the visible
  caret is the only input affordance.
- **Busy** — while `busy`, the input is disabled and the input row is replaced by an
  animated `…` busy row (gated behind `prefers-reduced-motion`); `commandSubmit`
  cannot fire again until the consumer sets `busy` back to `false`. This also
  satisfies the §2 contract's "loading (where applicable)" row — there is no separate
  loading treatment beyond `busy`, because for this component "a command is running"
  **is** the loading state.
- **Error lines** — `writeOutput(text, 'error')` renders the line in the danger-safe
  text color. This is the "invalid/error (where applicable)" row from the §2 standard
  state set, mapped to the line level rather than the whole widget: `ino-terminal`
  is a transcript, not a validated form field, so there is no single "the terminal is
  invalid" state — a shell signals failure by what a command printed, not by
  recoloring its own chrome. See §6 Notes.
- **Empty** — zero `welcomeMessage` and zero submitted commands renders the log empty
  (no lines, just the input row) — the §2 contract's "empty (where applicable)" row.

## 4. RTL

All layout uses logical properties (`padding-inline`, `inset-inline-start`, …) so the
log and input row mirror correctly. The prompt glyph and monospace transcript text
are left-to-right content regardless of document direction (shell output convention,
same treatment PrimeNG and every terminal emulator use) — this is a deliberate
exception to RTL mirroring, documented in §6.

## 5. Sizing

Fixed px block-size for the scrollback region, independent of the
`--ino-control-height-*` density scale — the same idiom as `ino-speeddial`'s FAB
diameters and `ino-scrolltop`'s 44px: a multi-line transcript is not a form control
row, so the dense register (which docs pages render in) must not shrink it to
something unreadable.

| `size` | Block-size |
|---|---|
| `sm` | 200px |
| `md` (default) | 320px |
| `lg` | 440px |

The input row's own height follows `--ino-control-height` (the live, register-aware
default — same token every other text input consumes) as normal: it is a real text
input and should participate in density like any other control, only the scrollback
region is fixed.

## 6. Tokens & notes

Colors: `--ino-color-surface-sunken` (log + input background, "input fields / code
blocks" role per tokens.css), `--ino-color-on-surface` (default/input text),
`--ino-color-on-surface-muted` (system/welcome lines, busy row), `--ino-color-danger-text-safe`
(error lines), `--ino-color-border` (log border), `--ino-focus-ring` /
`--ino-focus-ring-offset` (container `focused` ring — see below), `--ino-font-mono`
(all transcript + input text). Motion: `--ino-motion-duration-fast` /
`--ino-motion-easing-standard` for the busy-row pulse.

**`focused` vs `focus-visible`.** The ticket's extra state list is `focused, busy`.
`focused` is container-level: the whole `.ino-terminal` gets a visible ring the
moment its input has focus, by any input modality (mouse click or keyboard) —
real terminal emulators highlight the active pane this way. `focus-visible` is the
narrower, keyboard-only ring on the input element itself, part of the §2 standard
state set. Both exist and are visually distinct (container ring vs. input-only ring)
so neither subsumes the other.

**Deliberate omissions**
- **`active` (pointer-press).** The only interactive element is a text `<input>`,
  which has no meaningful pressed affordance (unlike a button). No discrete `active`
  treatment is implemented — the input's native caret/typing state already covers
  "the user is interacting with this."
- **`hover`.** No bespoke hover treatment beyond the browser's native text-cursor
  change over the input and default scrollbar hover in the log — a transcript has no
  hover-activatable targets.
- **Label/help/error text set.** The §2 contract's full "Labels" row (label, required
  marker, help text, error text, float/ifta integration) does not apply — doc 26 §5's
  terminal row scopes labeling to `aria-label` only, consistent with this not being a
  form field with a validation contract.
- **Mobile.** Doc 26 §5: "Web-only (docs/dev tooling)" — no React Native or Flutter
  port.
