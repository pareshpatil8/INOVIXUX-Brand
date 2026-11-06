# `<ino-inputmask>` — component spec

**Issue:** [INO-404](/INO/issues/INO-404) (INO-31 Phase B1, doc 26 §5 row `ino-inputmask`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 table
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Slot-array model, not string diffing (doc 26 §2 row 1)

Internal state (`_slots`) is one entry per mask token — `null` for an unfilled editable slot, the
typed character otherwise — the same model `ino-input-otp` uses for its per-box `_chars`
(`../input-otp/ino-input-otp.component.ts`), generalized to a single native `<input>` instead of
one input per box. `(keydown)` intercepts every printable key, Backspace, and Delete directly
rather than reading the post-edit DOM value on `(input)`, because a masked field's displayed
string always contains literal separators the user didn't type (`/`, `-`, the GSTIN `Z`) —
diffing old-vs-new displayed strings to recover "what did the user actually type" is the fragile
part of most mask implementations; owning the model and only ever rendering `displayValue` from
it sidesteps that entirely. `(input)` is kept as a resync fallback for input paths `keydown` can't
see cleanly (composed/IME text, some mobile virtual keyboards): if the native value ever drifts
from `displayValue`, it's rebuilt from scratch by re-threading the raw characters through
`placeChar` in order.

---

## 2. Mask grammar and India-stack presets (doc 26 §5 Variants/Structure)

Grammar (`mask-tokens.ts`): `9` required digit, `a` required letter, `A` required letter
(auto-uppercased), `*` required letter-or-digit, `?` marks everything after it optional (doesn't
consume a slot), `\` escapes the next character as a literal even if it's a token char (e.g. `\9`
for a literal digit `9`), anything else is a literal separator.

`INO_INPUTMASK_PRESETS` (`mask-presets.ts`) ships the five India-stack presets the spec row names —
PAN, GSTIN, IFSC, phone, date — as a typed constants module, the same "tokens live in a shared TS
file, not duplicated per call site" convention `InoControlSize`/`INO_CONTROL_SIZES`
(`../control-size.ts`) already established. These aren't CSS custom properties (a mask pattern
isn't a themeable value), so they ship as plain data both the web component and the RN/Flutter
ports import from their own platform-native copy (§9). `preset` takes precedence over
`mask`/`placeholderChar` when set.

---

## 3. Value contract: compact raw string (doc 26 §2 row 1)

`value`/`valueChange` (banana-in-a-box, matching `ino-input`'s convention) carry the **compact raw
string** — typed characters only, literals and unfilled-slot gaps excluded — since that's what a
caller almost always wants to store (a PAN, not `"ABCDE_234F"`). `maskComplete` fires once, the
moment every required (non-`?`-optional) slot holds a character — mirrors `ino-input-otp`'s
`complete` output.

---

## 4. States (doc 26 §2 row 2 — standard set + row-specific)

| State | Carried? | Mechanism |
|---|---|---|
| Default | ✅ | unchanged |
| Hover | ✅ | `:hover:not(:disabled):not(:read-only)` |
| Active/pressed | ✅ | `:active:not(:disabled):not(:read-only)`, `--ino-color-accent-active` |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | ✅ | native `disabled`, `:disabled` |
| Readonly | ✅ | native `readonly`, `:read-only:not(:disabled)` |
| Invalid | ✅ | `error` input, `aria-invalid`, `aria-describedby`, `role="alert"` message |
| Incomplete | ✅ new | derived, not settable — see §5 below |
| Loading/busy | ✅ | `loading` input; spinner + `aria-busy`, keydown/paste ignored while true |

`incomplete` (doc 26 §5 States row) is derived, not a settable `@Input`: true once the user has
typed anything but a required slot is still empty; `error` remains the caller-driven state (e.g. a
failed PAN checksum), independent of completeness — same separation `ino-input-otp` draws between
its own derived-complete state and `error`. Rendered as an amber border, distinct from and
subordinate to `error`'s red (`.ino-field__control--error` and the `--incomplete` host class are
mutually exclusive in the template, since a caller sets `error` only once completeness has already
been validated).

---

## 5. A11y: mask announced via description + caret management (doc 26 §5 A11y row)

The mask's format is announced via `aria-describedby` (`formatId`) — a visually-hidden paragraph
built from `describeMask()` (`./mask-tokens.ts`), e.g. `"Format: 5 letters, 4 digits, 1 letter.
Empty characters shown as \"_\"."` — appended to whichever of hint/error is already wired into
`describedBy`, not replacing it.

Caret management rules: typing a character advances the caret past any trailing literal run to the
next editable slot; Backspace/Delete clear the previous/next editable slot (or the full selection,
if one exists) and land the caret there; paste threads the clipboard text through the same
`applyStream` engine as a resync and places the caret just past the last slot touched; focus (with
nothing selected) jumps the caret to the first empty editable slot rather than leaving it wherever
the browser's default focus placement lands. Caret position is set imperatively in
`placeCaret` — under `OnPush`, the native `value` Angular renders from `displayValue` hasn't
flushed to the DOM yet the same tick, so both the value and the selection are set on the real
element directly.

---

## 6. Sizing (doc 26 §2 row 3)

`size="sm" | "default" | "lg"` — identical three-alias re-point to `ino-input`
(`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`). Density
(`--ino-row-min-height` fallback chain) falls out for free, same idiom.

---

## 7. Labels (doc 26 §2 row 4 / §5 "full label set")

`label` renders through `<ino-label>` (same as `ino-input`) — real `<label for>`, `[required]`
marker, `[invalid]="!!error"`, `[disabled]`, `[readonly]` forwarded straight through. `hint`/`error`
render as a paragraph below the field, `error` winning when both are set, wired into
`aria-describedby` alongside the format description (§5).

---

## 8. Monospace/tabular rendering (visual)

`font-variant-numeric: tabular-nums` plus a fixed `letter-spacing` keep the mask skeleton's literal
separators from shifting horizontally as placeholder underscores are replaced by typed characters
— a masked field's width would otherwise visibly jiggle per keystroke with a proportional font.

---

## 9. Mobile parity (doc 26 §5 Notes: "India-stack mask presets shipped as tokens; port both")

Ports to both mobile tracks per `docs/brand/17-phase-2-implementation-program.md` §5, same split
`ino-password`'s SPEC.md §9 documents:

- **Capacitor** — not a separate port; renders the same Angular component/CSS.
- **React Native** — `mobile/react-native/src/components/InoInputMask.tsx`. Re-derives the full
  slot set from `onChangeText`'s raw string every change instead of intercepting `keydown` — RN has
  no reliable per-keystroke interception the way a web `<input>` does — which is the same
  `applyStream`/resync path the web component itself falls back to for IME/paste. Mask grammar and
  presets are duplicated in-file rather than imported, since the two runtimes don't share a build
  graph.
- **Flutter** — `mobile/flutter/lib/widgets/ino_inputmask.dart`. Same re-derive-on-change approach
  via `TextEditingController`, same duplicated grammar/presets.

Both ports carry the incomplete/invalid visual states and the format description (as
`accessibilityHint`/`Semantics.hint`), since neither depends on `keydown`-only behavior.

---

## 10. Merge hygiene (doc 26 §2 row 1, "does the component source actually use tokens")

Touches only `web/src/app/components/inputmask/**`,
`mobile/react-native/src/components/InoInputMask.tsx`,
`mobile/flutter/lib/widgets/ino_inputmask.dart`, this issue's docs page + preview
(`docs/brand/06-angular-components/inputmask.md`, `previews/inputmask.html`), and the generated
`design-system.manifest.json` / `web/public/design-system/manifest.json` /
`component-docs-extract.json` (all regenerated via their own scripts, never hand-edited). No
change to `web/src/tokens.css` — every value this component needed already existed.
