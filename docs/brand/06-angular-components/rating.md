# `<ino-rating>` — Rating

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-rating`. Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
> [INO-471](/INO/issues/INO-471).
> Parity benchmark: PrimeNG 22.1.1 `Rating` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/rating/SPEC.md`.

A `role="radiogroup"` of stars: star *N* is a radio representing "rate N", so selecting it fills
every star up to that index. Click, or focus the group and use the Arrow keys (selection follows
focus, the APG radiogroup pattern). Ported to both mobile platforms.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>`, pointing at the radiogroup |
| `ariaLabel` | `string` | `''` | Accessible name when no visible `label` is wanted; `label` wins when both are set |
| `value` | `number` | `0` | Banana-in-a-box with `valueChange`; integer `0`–`count`, `0` means unrated |
| `count` | `number` | `5` | Configurable star count (the §5 row's named variant) |
| `iconFilled` | `string` | `'★'` | Filled-star glyph; plain text content, any short string ("custom icons") |
| `iconEmpty` | `string` | `'☆'` | Empty-star glyph |
| `cancelable` | `boolean` | `false` | Clicking the already-selected star clears `value` to `0` — the row's clear/cancel toggle; see [Clear/cancel toggle](#clearcancel-toggle) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Star glyph size — local three-rung scale, **not** `InoControlSize`; see [Sizing](#sizing) |
| `hint` | `string` | `''` | Hidden while `error` is set; wired via `aria-describedby` |
| `error` | `string` | `''` | Renders a `role="alert"` message under the group and a danger outline; `aria-readonly`-style invalid affordance |
| `required` | `boolean` | `false` | Decorative `*` marker on the label |
| `disabled` | `boolean` | `false` | `0.5` opacity; click and keyboard input blocked, `aria-disabled` set |
| `readonly` | `boolean` | `false` | Fully legible (no opacity drop); click and keyboard input blocked, `aria-readonly` set |

`valueChange: EventEmitter<number>` fires once per committed change — every click, Arrow-key
move, Home/End jump, and Space/Enter confirm. A change that resolves to the current value does
not re-emit.

### Variants

| Axis | Values |
|---|---|
| Star count | Any positive integer via `count` (default `5`) |
| Icon glyph | Default `★`/`☆`, or any custom `iconFilled`/`iconEmpty` string |
| Clear/cancel | Off (default) or `cancelable={true}` |
| Value precision | Integer only — no half-star increments |
| Size | `sm` / `md` (default) / `lg` |
| Interactivity | Editable (default), `readonly`, `disabled` |

### Structure (anatomy)

| Part | Element | Notes |
|---|---|---|
| Group | `div.ino-rating__group` | `role="radiogroup"`, owns the keyboard handler |
| Star | `span.ino-rating__star` | One per index `1..count`, `role="radio"`; filled when `index <= displayValue` |
| Label | `<ino-label>` | Optional; points at the group via `aria-label`, not `for` (a radiogroup has no single focusable id) |

### Sizing

`size: 'sm' | 'md' | 'lg'` re-points `--ino-rating-star-size` to `--ino-space-5/6/7`
(20/24/32px) — the frozen Wave 0 space scale, since tokens.css mints no new tokens after Wave 0.
This is a **local three-rung union**, deliberately not `InoControlSize`: the varying dimension is
a glyph `font-size`, not a control height against a text baseline — the same reasoning as
`ino-knob`'s dial scale. Density: stars are not a text-entry control and have no dense-register
height row; they render identically in dense and fluid.

### Clear/cancel toggle

When `cancelable` is `true`, clicking the star that already matches `value` clears it to `0`
instead of re-committing the same value. There is no separate cancel icon (PrimeNG ships one
ahead of the stars) — one gesture does both jobs, matching how every other radio-adjacent toggle
in this library already behaves. See `SPEC.md` §2 for the full reasoning.

### Hover-preview

Hovering any star previews the value a click there would commit — every star up to the hovered
index renders filled — without mutating `value` or emitting `valueChange`. It resets on
`pointerleave` from the group. Pointer-only: there is no keyboard equivalent, because in a
radiogroup Arrow-key movement *is* the commit (selection follows focus), so there is nothing to
preview between moving and selecting.

---

## States

| State | Surface |
|---|---|
| default | Filled stars in the warning (gold) role up to `value`; empty stars in the muted on-surface role |
| hover-preview | Filled stars extend to the hovered star without committing (see above) |
| focus-visible | Standard `--ino-focus-ring` outline on the focused star (roving tabindex — one tab stop for the whole group) |
| active | Native `:active` press feedback on click |
| disabled | `0.5` opacity, input blocked, `aria-disabled` |
| readonly | Input blocked, no opacity drop, `aria-readonly` |
| invalid | `error` set — danger outline around the group (3:1 non-text boundary) + `role="alert"` error text |
| empty | `value = 0` — every star renders empty; a valid, announced state, not a placeholder |

All states demonstrated in the live demo in all 3 themes.

---

## Labels and fields

`label` renders through `<ino-label>` (required marker, disabled/invalid/readonly styling) but
points at the group via `aria-label`, not a native `for`/`id` pairing — a radiogroup has no single
focusable element to target. `hint`/`error` render under the stars and are wired to the group via
`aria-describedby` (error wins; hint hides while `error` is set). For label-less compact usage set
`ariaLabel` — the spec row's Labels cell names both "own label" and the value being announced.
"Value announced" needs no extra wiring: native radiogroup semantics mean a screen reader landing
on the checked star announces its label, checked state, and position.

---

## Accessibility contract

**Role / ARIA** — `role="radiogroup"` on the container, with `aria-label` from `label`, falling
back to `ariaLabel`, then `'Rating'`. `aria-disabled`/`aria-readonly` are set on the group when
`disabled`/`readonly` are true — `radiogroup` supports `aria-readonly` directly, unlike the bare
`radio`/`group` roles (a gotcha this program already hit on `ino-toggle-button`), so no per-star
workaround is needed. Each star carries `role="radio"`, `aria-checked` (`true` only for the star
matching `value`), `aria-label` ("N star"/"N stars"), and `aria-posinset`/`aria-setsize` for
position announcements. `hint`/`error` are referenced via `aria-describedby` on the group.

**Keyboard** — APG radiogroup pattern (selection follows focus):

| Key | Behavior |
|---|---|
| ArrowRight / ArrowDown | Move to and select the next star (clamped at `count`) |
| ArrowLeft / ArrowUp | Move to and select the previous star (clamped at `1`) |
| Home | Jump to and select the first star |
| End | Jump to and select the last star |
| Space / Enter | Confirm selection of the focused star |
| Tab | Move focus to the next control (one tab stop for the whole group) |

All keys call `event.preventDefault()` so the page does not scroll while the group has focus.

**Focus behavior** — only one star is ever in the Tab sequence (roving tabindex): it defaults to
the star matching `value` (or star 1 when `value` is `0`), then tracks whichever star was last
interacted with — independently of `value`, so a cancel-to-clear click keeps focus on the clicked
star rather than jumping back to star 1. `:focus-visible` draws the standard `--ino-focus-ring`;
the high-contrast theme's 3px ring override flows through the token.

**SR announcements** — landing on a star announces its label, checked state, and position
natively (standard radiogroup behavior — no custom live region needed). Setting `error` injects a
`role="alert"` message announced immediately.

**Contrast** — WCAG 2.2 AA in all 3 themes, gated by `check-theme-parity`. Both the filled-star
role (`--ino-color-warning`) and the empty-star role (`--ino-color-on-surface-muted`) are
non-text/icon roles (3:1 minimum).

**RTL** — logical properties only in CSS. Arrow-key selection is deliberately *not* mirrored in
RTL, matching the `ino-knob`/`ino-slider` precedent: ArrowRight always moves to the next star in
DOM order regardless of locale, the same convention native radiogroups and sliders already use.

Full contract: `SPEC.md` §8.

---

## Deliberate omissions

- **No half-star increments** — the spec row says "integer values" explicitly; PrimeNG's `0.5`
  step mode is not supported.
- **No innerHTML/SVG custom icons** — `iconFilled`/`iconEmpty` render via auto-escaped text
  interpolation, never `[innerHTML]`, avoiding an XSS surface for a cosmetic input.
- **No separate cancel icon** — see [Clear/cancel toggle](#clearcancel-toggle).
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only); CVA adoption is a fleet-wide decision.

**PrimeNG mapping:** PrimeNG `Rating` → `ino-rating`; star count, readonly, disabled, and the
cancel affordance are all covered (PrimeNG's dedicated cancel icon becomes the click-selected-
star-to-clear gesture; its `onIcon`/`offIcon` template inputs become the plain `iconFilled`/
`iconEmpty` string inputs; its optional half-star stepping is deliberately absent — "integer
values" per the spec row).

---

## Mobile parity

- **Disposition: Port both** (doc 26 §5 row: "Port both"). `mobile/flutter/lib/widgets/ino_rating.dart`
  and `mobile/react-native/src/components/InoRating.tsx` reproduce the same variant/state surface:
  configurable `count`, custom icon glyphs, `cancelable` clear-on-tap-selected, `sm`/`md`/`lg`
  sizing, `readonly`, `disabled`, and an invalid/error state.
- **Hover-preview is web-only** — touch has no hover; both mobile ports omit it by platform
  constraint, the same carry-forward `ino-slider`'s mobile ports already document for pointer-only
  states.
- **Keyboard parity** — Flutter and RN both expose the same tap-to-select interaction; the Arrow
  key radiogroup pattern is a desktop/web-input-method concept and has no mobile equivalent (no
  hardware keyboard assumption), matching every other INO-31 mobile port's keyboard carve-out.
- **Capacitor** — the Angular component/CSS render in the Capacitor WebView unchanged, including
  hover-preview on devices with an attached pointer.
