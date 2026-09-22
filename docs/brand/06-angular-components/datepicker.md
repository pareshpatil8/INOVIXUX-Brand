# `<ino-datepicker>` — DatePicker

> Parity benchmark: PrimeNG 22.1.1 `DatePicker` (`specs/primeng/llms-22.1.1.txt` line 52,
> route `https://primeng.dev/datepicker`) — benchmark only, **not a runtime dependency**.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md`.
> Preview: [`previews/datepicker.html`](previews/datepicker.html).
> Decisions record: `web/src/app/components/datepicker/SPEC.md`.

Labeled date / date-range / multi-date control with an optional time picker, month/year drill-up
views, and inline or overlay (popover) display (INO-154, INO-31 T-8, Form group). Follows this
repo's `@Input() value` / `@Output() valueChange` banana-in-a-box convention (see `ino-input`'s doc
comment) rather than a `ControlValueAccessor` — no Reactive/Template-driven Forms module is wired
up anywhere in this repo yet. Full keyboard grid navigation follows the WAI-ARIA APG "Date Picker
Dialog" pattern — see [Accessibility contract](#accessibility-contract).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` (overlay mode only) |
| `hint` | `string` | `''` | Rendered below the trigger field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as a `role="alert"` message |
| `placeholder` | `string` | `'Select date'` | Trigger field placeholder text |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Trigger field height / padding-inline / font-size — see [Size API](#size-api) |
| `selectionMode` | `'single' \| 'range' \| 'multiple'` | `'single'` | See [Variants](#variants) |
| `value` | `Date \| Date[] \| null` | `null` | Banana-in-a-box with `valueChange`; shape depends on `selectionMode` — SPEC.md §1 |
| `inline` | `boolean` | `false` | Renders the calendar grid directly, no popup/backdrop/focus-trap |
| `showTime` | `boolean` | `false` | Adds the time picker below the date grid |
| `hourFormat` | `'12' \| '24'` | `'24'` | Time picker hour display |
| `minDate` / `maxDate` | `Date \| null` | `null` | Inclusive bounds; out-of-range cells are disabled |
| `disabledDates` | `Date[]` | `[]` | Specific dates disabled regardless of range |
| `disabledDayOfWeek` | `number[]` | `[]` | `0`(Sun)–`6`(Sat) weekdays disabled every week |
| `locale` | `string` | `'en-IN'` | Drives month/weekday names and first-day-of-week — see [Locale](#locale) |
| `required` | `boolean` | `false` | Adds a visible `*` marker (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Trigger removed from focus order; grid non-interactive |
| `readonly` | `boolean` | `false` | Trigger stays focusable; panel does not open |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy` on the host |
| `closeOnEscape` | `boolean` | `true` | Overlay mode only |
| `closeOnBackdrop` | `boolean` | `true` | Overlay mode only |

`valueChange: EventEmitter<Date | Date[] | null>` fires on every selection/time edit.
`openChange: EventEmitter<boolean>` fires when the overlay panel opens/closes (no-op inline).

### Size API

Reads the same `--ino-control-height` / `--ino-control-padding-inline` / `--ino-control-font-size`
/ `--ino-control-gap` alias set as `ino-input`/`ino-paginator`, applied to the **trigger field**
only. The calendar grid's date cells do not scale with `size` — they track
`--ino-row-min-height`/`--ino-target-min` directly (see [Density](#density) below), since even
`size="sm"` still needs a usable 7-column grid.

### Density

`[data-density="dense"|"fluid"]` re-resolves `--ino-row-min-height` (32px dense / 44px fluid,
tokens.css §10), which every date-grid cell's `min-inline-size`/`min-block-size` reads with a
fallback to `--ino-target-min` (24px) outside any density ancestor.

### Variants

| Axis | Values |
|---|---|
| Selection mode | `single` (one `Date`), `range` (`[start, end]`, click twice), `multiple` (toggle, sorted ascending on emit) |
| View | `date` grid (default), `month` grid (12 cells), `year` grid (12-year page) — click the header to drill up, click a month/year to drill back down |
| Time | Optional `showTime` — hour/minute spinners + (12h) AM/PM toggle + a `Done` button that closes the overlay |
| Display | `inline` (calendar rendered directly) vs. overlay/popover (default — anchored under the trigger field, reuses `<ino-modal>`'s scrim + `InoFocusTrapDirective` contract) |

### Locale

Month/weekday names come from `Intl.DateTimeFormat(locale, …)`, never a hardcoded English array,
so a non-English `locale` input isn't silently mistranslated. First-day-of-week reads
`Intl.Locale(locale).weekInfo.firstDay` where the runtime supports it (Chromium/Node 20+); falls
back to Monday (`1`) — the common APAC/India convention this repo's `en-IN` default targets —
everywhere else. Date formatting in the trigger field and grid uses the same `Intl` machinery, so
`en-IN` renders DD/MM/YYYY-style rather than US MM/DD/YYYY.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Trigger border, transparent grid cells |
| Hover | `:hover` | Trigger border darkens; grid cell / nav / heading get a `surface-sunken` fill |
| Active/pressed | `:active` | Trigger border → `accent-active`; grid cell background → `surface-sunken` with `accent-active` text (also set explicitly for the keyboard-only Enter/Space path, which never fires `:hover`) |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` on the trigger and on every interactive grid/header element — never a hand-rolled outline |
| Disabled | `disabled` input | Trigger `opacity: 0.5`, removed from focus order; grid becomes fully inert |
| Readonly | `readonly` input | Trigger stays focusable, `aria-readonly="true"`, `surface-raised` fill, panel never opens |
| Invalid | `error` input set | Trigger border → `--ino-color-danger`, `aria-invalid="true"` |
| Loading/busy | `loading` input | Trailing spinner on the trigger, `aria-busy` on the host, panel never opens |

---

## Motion

Popover open uses `ino-datepicker-rise` (`translateY(-4px)` → `0`, opacity `0` → `1`) on
`--ino-motion-duration-base` / `--ino-motion-easing-decelerate`. Month/nav/cell hover-background
and trigger border-color transitions use `--ino-motion-duration-fast` /
`--ino-motion-easing-standard`. The loading spinner uses `--ino-motion-duration-slow` linear
rotation, matching `ino-input`/`ino-button`. A single `@media (prefers-reduced-motion: reduce)`
rule on the host (`* { transition: none !important; animation: none !important; }`) is the one
place every animated rule in this component is disabled — the individual rise/spin animations are
declared unconditionally rather than each repeating a
`@media (prefers-reduced-motion: no-preference)` gate.

---

## Accessibility contract

**Role / ARIA** — the overlay panel is `role="dialog"` `aria-modal="true"`
`aria-labelledby` pointing at the month/year heading (WAI-ARIA APG "Date Picker Dialog"). The date/
month/year grid is `role="grid"`, each week is `role="row"`, each date button is
`role="gridcell"` with `aria-selected`, `aria-disabled` and `aria-current="date"` (today) as
appropriate. The trigger button is `aria-haspopup="dialog"` / `aria-expanded`.

**Keyboard** — roving `tabindex` on the date grid (one cell is `tabindex="0"`, the rest `-1`):

| Key | Action |
|---|---|
| `Left` / `Right` | ±1 day |
| `Up` / `Down` | ±1 week |
| `Home` / `End` | Start / end of the visible week |
| `PageUp` / `PageDown` | ±1 month |
| `Shift+PageUp` / `Shift+PageDown` | ±1 year |
| `Enter` / `Space` | Select the focused date |
| `Escape` | Close the overlay (no-op inline) |

Month/year drill views are plain focusable `<button>`s (Tab + Enter/Space), not a second roving-
tabindex grid — APG's grid pattern targets the day grid specifically (SPEC.md §5).

**Contrast** — text/border/fill pairs reuse the existing audited roles (`on-surface`,
`on-surface-muted`, `accent`/`on-accent`, `danger`); selected/range-endpoint cells use the same
solid `accent`/`on-accent` pairing `ino-paginator`'s active-page pill already established — no
`color-mix()` translucent tint (banned by `check-ds-adherence.mjs`'s `no-raw-color` rule).

**Target size** — every interactive header/nav/spinner/confirm element and every date cell clears
the WCAG 2.2 SC 2.5.8 24px floor (`--ino-target-min`) at minimum, `--ino-row-min-height` (44px) in
fluid density, and the trigger field clears `--ino-control-height-default` (44px, comfortable) at
`default`/`lg` sizes.

**RTL** — logical properties only (`padding-inline`, `inset-inline-start/end`,
`margin-block-end`, `border-block-start`); no `left`/`right`/`top`/`bottom` anywhere in the
stylesheet.

---

## Deliberate omissions

- **Seconds picker.** The time picker stops at hour/minute, matching the issue's scope — see
  `SPEC.md` §4.
- **Multiple simultaneous month panels** (PrimeNG's `numberOfMonths`). Not carried — one month
  panel at a time, matching the issue's scope.
- **Month/year grid keyboard roving-tabindex.** Only the day grid gets the full APG roving-
  tabindex treatment; month/year cells are plain tab-order buttons — see [Keyboard](#accessibility-contract)
  above and `SPEC.md` §5.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port," plan rev 9 §5), satisfied by DoD rows 1–8 plus the 44px
  touch-target check already covered by `--ino-control-height-default`.
- **React Native** — `mobile/react-native/src/components/InoDatepicker.tsx`. Single-mode calendar
  grid only (touch + external-keyboard arrow selection), `size`, `disabled`/`loading`,
  `minDate`/`maxDate`. Range, multiple-selection, month/year drill views and the time picker are
  **not** ported — see `SPEC.md`'s "Mobile parity" section for the full reasoning.
- **Flutter** — `mobile/flutter/lib/widgets/ino_datepicker.dart`. Same reduced scope as the React
  Native port (single-mode grid, `InoControlSize`, `disabled`/`loading`, `minDate`/`maxDate`).
