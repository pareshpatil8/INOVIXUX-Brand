# `<ino-password>` — component spec

**Issue:** [INO-406](/INO/issues/INO-406) (INO-31 Phase B1, doc 26 §5 row `ino-password`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 table
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).
**Promoted from:** `<ino-input type="password">` — a bare `<input type="password">`, no reveal
toggle, no strength meter, no caps-lock detection, no policy hints. See `ino-input`'s own
`type` union (`web/src/app/components/input/ino-input.component.ts`).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Not a wrapper around `<ino-input>` (doc 26 §2 row 1)

The reveal-toggle button has to live inside `.ino-field__control-wrap`, absolutely positioned at
the trailing edge of the same control box the `<input>` sits in — the same relationship
`ino-select`'s trigger/chevron has. `ino-input` renders its own `.ino-field__control-wrap` with no
slot for extra trailing content, so composing around it (the `ino-icon-field`/`ino-input-group`
pattern `ino-input`'s own SPEC.md §1 uses) doesn't fit here: the toggle isn't a caller-supplied
icon, it's this component's own required affordance. `ino-password` therefore declares its own
`.ino-field` shell (duplicated, not shared — see the SCSS file header) rather than wrapping
`ino-input`.

---

## 2. Strength meter (doc 26 §5 Variants/Structure)

`showStrengthMeter` (default `true` — the row names this as the headline structural variant, not
an opt-in extra) renders a 4-segment bar plus a text label (`Too weak`/`Weak`/`Fair`/`Good`/
`Strong`), both inside an `aria-live="polite"` region (`.ino-password__meter`) so the label change
is announced as the user types, without the mid-keystroke interruption `aria-live="assertive"`
would cause.

Score is a fixed built-in heuristic (`scorePassword` in the `.ts` file) — length ≥ 8, upper+lower
case present, a digit present, a symbol present, plus a length ≥ 12 bonus, capped at 4 — not
pluggable. This is deliberately **not** the same mechanism as `policyRules` (§3): the meter is one
opinionated coarse signal, the policy panel is the place a caller states actual requirements. A
password can satisfy every `policyRules` row while the meter still reads "Fair" (e.g. long but no
symbol), and that's intended — the two surfaces answer different questions.

Segment fill color ramps `--ino-color-danger` → `--ino-color-warning` → `--ino-color-success` by
score, via `[attr.data-strength]` set on every segment (`:host([data-strength='N'])` would only
match the host; segments are descendants, so the attribute is set directly on each
`.ino-password__meter-seg--filled` element instead).

---

## 3. Policy hint panel (doc 26 §5 Variants/Structure)

`policyRules: InoPasswordPolicyRule[]` (`{ label, test: (value) => boolean }`) is **empty by
default**, which hides the panel — the same opt-in shape `ino-input`'s icon slots use (SPEC.md §1
there). `INO_PASSWORD_DEFAULT_POLICY_RULES` ships as a named export (length/case/digit/symbol) for
the docs page and any caller who wants a sane default rather than authoring rules from scratch;
the component itself does not apply it implicitly, since a real policy is a product/compliance
decision this component shouldn't guess at.

Each row re-evaluates `test(value)` on every keystroke (`OnPush` change detection still re-renders
because `value` is an `@Input`/template-bound property read fresh each check, same as the meter).

---

## 4. Reveal toggle (doc 26 §5 A11y: "reveal toggle labeled")

A real `<button type="button">`, never an icon-only `<span>` with a click handler — `aria-label`
flips between `"Show password"`/`"Hide password"` and `aria-pressed` reflects `revealed`, so a
screen reader announces both the action and the current state, matching `ino-button`'s `variant:
'icon'` contract (caller/consumer must supply an accessible name — this component supplies its own
since the label is derived, not caller-provided). Toggling sets the underlying `<input type>`
between `password`/`text`; the value itself is never cleared or re-validated by the toggle.

---

## 5. Caps-lock warning (doc 26 §5 States: "caps-lock warning")

`(keydown)`/`(keyup)` both call `onKeyEvent`, which reads `event.getModifierState('CapsLock')` —
`keydown` alone misses the case where Caps Lock was already on before the field gained focus but
the user hasn't pressed a key that fires a `keyup` yet on some platforms; binding both events is
belt-and-braces for cross-browser modifier-state quirks. The warning renders as `role="status"`
(an implicit polite live region) rather than being folded into the `aria-live="polite"` meter
region, so it announces once when it appears/disappears rather than re-announcing on every
keystroke the meter region receives. Cleared on `blur` since the warning is only actionable while
actively typing into the field.

---

## 6. States (doc 26 §2 row 2 — standard set + row-specific)

| State | Carried? | Mechanism |
|---|---|---|
| Default | ✅ | unchanged |
| Hover | ✅ | `:hover:not(:disabled):not(:read-only)` |
| Active/pressed | ✅ | `:active:not(:disabled):not(:read-only)`, `--ino-color-accent-active` |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | ✅ | native `disabled`, `:disabled` |
| Readonly | ✅ | native `readonly`, `:read-only:not(:disabled)` |
| Invalid | ✅ | `error` input, `aria-invalid`, `aria-describedby`, `role="alert"` message |
| Caps-lock warning | ✅ new | `role="status"` inline message, see §5 |
| Loading/busy | ❌ deliberately omitted | Not applicable — a password field has no async-fetch state comparable to `ino-input`'s remote-validation `loading`; revisit if a future policy requires server-side strength checking mid-type |
| Empty | n/a | Native placeholder/value semantics; no separate empty-state markup needed for a single-line control |

---

## 7. Size API (doc 26 §2 row 3)

`size="sm" | "default" | "lg"` — identical three-alias re-point to `ino-input`
(`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`). Density
(`--ino-row-min-height` fallback chain) falls out for free, same idiom.

---

## 8. Labels (doc 26 §2 row 4 / §5 "full label set")

`label` renders through `<ino-label>` (same as `ino-input`) — real `<label for>`, `[required]`
marker, `[invalid]="!!error"`, `[disabled]`, `[readonly]` forwarded straight through. `hint`/`error`
render as a paragraph below the field, `error` winning when both are set, wired via
`aria-describedby`.

---

## 9. Mobile parity (doc 26 §5 Notes: "Promote from partial; port both")

Ports to all three tracks per `docs/brand/17-phase-2-implementation-program.md` §5, same split
`ino-input`'s SPEC.md §8 documents:

- **Capacitor** — not a separate port; renders the same Angular component/CSS.
- **React Native** — `mobile/react-native/src/components/InoPassword.tsx`. Reveal toggle, strength
  meter, policy hints, caps-lock warning are **not** carried (no reliable Caps Lock signal on a
  touch keyboard) — reveal toggle and strength meter are, since both are meaningful on a phone
  keyboard.
- **Flutter** — `mobile/flutter/lib/widgets/ino_password.dart`. Same scope as the RN port.

Caps-lock warning is web-only by design (§5): mobile soft keyboards don't expose a reliable
`getModifierState`-equivalent, and a physical-keyboard-attached-to-tablet edge case is out of scope
for this issue.

---

## 10. Merge hygiene (doc 26 §2 row 1, "does the component source actually use tokens")

Touches only `web/src/app/components/password/**`,
`mobile/react-native/src/components/InoPassword.tsx`,
`mobile/flutter/lib/widgets/ino_password.dart`, this issue's docs page + preview
(`docs/brand/06-angular-components/password.md`, `previews/password.html`), the generated
`component-registry.ts` / `design-system.manifest.json` / `web/public/design-system/manifest.json`
/ `_ds_manifest.json` (all regenerated via their own scripts, never hand-edited). No change to
`web/src/tokens.css` — every value this component needed already existed (`--ino-color-warning`
and `--ino-color-success` were already defined for all 3 themes per `check-theme-parity.mjs`, just
not previously consumed by a Form-group control).
