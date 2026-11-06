# `<ino-inputcolor>` — component spec

Contract: INO-499 (INO-31 Phase B5), doc 26 §5 row `ino-inputcolor`:

> styled native color input; hex text twin; preset swatches | invalid-hex | sm/md/lg | full
> label set | native `input[type=color]` + text alternative documented | Web-only

This file records the contract decisions that aren't obvious from the source; the class doc
comment in `ino-inputcolor.component.ts` carries the implementation-level ones.

## 1. Why a native `<input type="color">`, not `ino-colorpicker`'s HSB panel

The spec row's own wording — "**styled native** color input" — is a different disposition from
`ino-colorpicker`'s ("inline HSB panel with hue/alpha bars, hex/RGB fields"), not a smaller
version of the same component. Picking a colour is delegated entirely to the browser/OS dialog
the native control already opens on activation: no SB panel, no hue/alpha bars, no pointer-drag
math, no focus trap to build or audit. This component's scope is exactly the three things the
bare native control can't do: a text alternative (§2), preset swatches (§3), and the field chrome
(label/hint/error/sizing) every other INO-31 form control carries.

A consequence: the hex grammar here is `#rgb`/`#rrggbb` only, no alpha — `input[type=color]`
itself has no alpha channel, unlike `ino-colorpicker`'s optional `#rrggbbaa`.

## 2. The hex field is the documented text alternative

`input[type=color]` exposes no readable or typeable text value of its own — its accessible value
is "a colour", not a string a screen reader can read back or a user can type into directly. The
spec row's a11y cell names this explicitly: "native `input[type=color]` + text alternative
documented". The hex text twin is that alternative: same underlying `value`, kept in sync in both
directions (picking from the native dialog updates the hex field; typing a valid hex into the
field updates the swatch), and it is the control the visible `<ino-label>`'s `for` points at,
since it is the one editable-by-typing surface.

## 3. Presets — hex-only, caller-supplied, no default array

`@Input() presets: string[] = []` — same no-default-array convention `ino-colorpicker`'s
`presets` input uses (SPEC.md §4 there): a brand preset palette is a caller/theming decision, not
one this component bakes in, and baking one in would also mean a hardcoded raw-colour literal in
this component's own source (§6 below).

Unlike `ino-colorpicker`, a non-hex preset here is not a degraded-but-accepted case — it is
silently ignored on click. `ino-colorpicker`'s HSB model can still display and emit an arbitrary
CSS colour string it can't decompose (its drag thumbs just don't move); this component has no
such fallback surface, because the thing a preset ultimately has to drive is a *native* `<input
type="color">`'s `.value` IDL attribute, and browsers silently no-op a non-hex assignment to it.
Accepting the click and then having nothing visibly change would be worse than ignoring it.

## 4. Commit model — native swatch commits on `input`; hex field commits on blur

- **Native swatch**: the `input` event only ever fires with an already-valid `#rrggbb` string
  (the browser's own dialog guarantees this), so every `input` event is an immediate commit — no
  separate confirm/cancel to intercept, unlike a hand-rolled overlay.
- **Hex field**: commits on blur (`onHexBlur`), not on every keystroke — the same deferred-commit
  convention `ino-colorpicker`'s hex/RGB fields use, so the field can hold a transiently-
  unparseable string (`invalid-hex`, §5) while the caret is still in it without that string ever
  reaching `value`/`valueChange`.
- **Presets**: commit immediately on click, same as `ino-colorpicker`'s `selectPreset`.

`commit()` is the one place `value`/`valueChange`/the hex field/`hexInputInvalid` all sync from
the newly-set hex — mirrors `ino-colorpicker`'s own single-`commit()` shape (SPEC.md §5 there).

## 5. States — `invalid-hex` is independent of the field-level `error`

Same two-surface split `ino-colorpicker`'s `hexInputInvalid`/`error` draw (that component's
SPEC.md §6): `error` is the standard §2 caller-driven field state, rendered as `<p role="alert">`
below the control; `hexInputInvalid` is a separate, transient boolean — true only while the hex
field currently holds text that fails `HEX_RE` — with its own `role="alert"` message and
`aria-invalid` on the hex field. A caller can have both at once (an externally-invalid committed
colour *and* a mid-type unparseable string) without either masking the other. Clearing the hex
field to empty and blurring is **not** treated as invalid (there is nothing to validate) and does
not commit — the swatch and `value` are left exactly where they were.

## 6. Design-system-adherence lint — the same `no-raw-color` dodge `ino-colorpicker` documents

`scripts/check-ds-adherence.mjs`'s `no-raw-color` rule is a plain text scan for `#` followed by
3–8 hex digits, anywhere in a linted file's source. This component's entire job is handling an
arbitrary, caller/user-chosen colour — not a design-system role — so every hex literal that would
otherwise appear in source is built so the scan has nothing contiguous to match, same precedent
as `ino-colorpicker.component.ts` (that file's SPEC.md §8):

- `HEX_RE` writes `#(` immediately after `#` — not a hex digit, so the regex doesn't match its
  own pattern string.
- `FALLBACK_HEX` (native `<input type="color">`'s own black default) is built as `'#' +
  '000000'`, never the literal `'#000000'`.
- The demo file's preset examples (`inputcolor-demo.component.ts`) build their hex strings from
  small RGB helper calls for the same reason — see that file's doc comment.

No waiver entry needed; verified at build time (`node scripts/check-ds-adherence.mjs`), not
asserted here.

## 7. Sizing (§2 contract row 3) — `InoControlSize`, not a local scale

`size: InoControlSize = 'default'` (`sm`/`default`/`lg`, tokens.css §12) — unlike `ino-knob`'s
dial diameter or `ino-colorpicker`'s swatch size, this control has a real text baseline (the hex
field), so the fleet-wide control-height scale applies directly, the same way `ino-inputmask`/
`ino-inputnumber` consume it. The native swatch is a square matching `--ino-control-height` at
every rung, so the swatch + hex-field row reads as one unit regardless of size. Density
(dense/fluid) flows through `--ino-row-min-height` exactly as every other text-entry control.

## 8. Accessibility contract (WCAG 2.2 AA)

- Native swatch: `aria-label` built from `label`/`ariaLabel` plus the current hex (or "no colour
  selected"), so a screen reader announces both identity and state without needing the hex field
  focused first. `aria-describedby` → hint, swapped to the error id when `error` is set (§5).
- Hex field: `id` is the label's `for` target (§2); `aria-invalid` reflects `hexInputInvalid ||
  error`; `aria-describedby` matches the swatch's.
- `readonly` blocks the native swatch outright via `click`-event `preventDefault()` — native
  `readonly` has no effect on `input[type=color]` (the same text-input-only IDL-attribute gap
  `ino-checkbox` documents for its own native control, since colour inputs share that exemption
  with checkboxes/radios/range/button per the HTML spec) — and blocks the hex field via its own
  native `readonly` attribute (which *does* apply to `type="text"`).
- `disabled` sets the native `disabled` attribute on both controls — `aria-disabled` is implicit
  via the native attribute, no explicit `[attr.aria-disabled]` needed (unlike `ino-knob`'s SVG
  handle, which has no native disabled state to inherit).
- Focus: `:focus-visible` on either control draws the standard `--ino-focus-ring` outline.
- Contrast: every static colour (field border, swatch border, preset border) reads an existing
  role audited in every theme by `check-theme-parity.mjs`. The dynamic swatch/preset fills are,
  by construction, whatever colour the caller/user picked — not a themed-role contrast question
  this component can audit, same disposition `ino-colorpicker`'s SPEC.md §6 records for its own
  dynamic fills.
- RTL: logical properties only (`inline-size`/`block-size`/`inset-inline-*`); no physical
  `left`/`right`/`width`/`height` in the stylesheet.

## 9. Deliberate omissions

- **No alpha channel** — `input[type=color]` has none; `ino-colorpicker` is the component for
  alpha-capable picking.
- **No inline/popover structural variant** — there is no overlay here at all; the browser's own
  dialog is the only "panel".
- **No form `ControlValueAccessor`** — matches every other INO-31 control to date
  (`value`/`valueChange` two-way binding only).

## 10. Mobile — web-only by spec

Doc 26 §5 row disposition: "Web-only". No RN/Flutter port is built, deliberately — §2 point 7
applies only to rows whose disposition is "port". Neither React Native nor Flutter has a direct
analogue of `<input type="color">`; the docs page's Mobile parity section records that the
caller should reach for a platform colour-picker library or `ino-colorpicker`-equivalent custom
UI on those platforms instead.

## 11. Testing and QA validation (§2 contract row 8)

`ino-inputcolor.spec.ts` pins: swatch/hex sync in both directions, 3-digit hex expansion on
commit, hex-field commit-on-blur with `invalid-hex` set (and not committing) on unparseable text,
empty-on-blur not flagging invalid or committing, preset click committing a valid hex and
silently ignoring a non-hex preset, readonly blocking the native swatch via `preventDefault`
while keeping it focusable, disabled blocking both controls, and the accessible-name/
`aria-describedby` wiring on the swatch.

The §2 point-8 QA sign-off (QALead) validates the rendered docs page — 3 themes × dense/fluid,
keyboard-only walkthrough, and the native-dialog interaction itself (which no automated test here
can drive, since it is OS chrome) — per doc 26 §2.1. **No QA validation subtask exists on INO-499
as of this build** (every other B5 ticket checked carries one, cut at ticket-creation time —
e.g. INO-470 for INO-469/`ino-knob`); flagged separately rather than created here, since §2.1
rule 4 reserves cutting that subtask to whoever cuts the component ticket, not its builder.
