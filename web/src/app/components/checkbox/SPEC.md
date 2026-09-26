# `<ino-checkbox>` / `<ino-checkbox-group>` — component spec

**Issue:** [INO-158](/INO/issues/INO-158) (INO-31 U-3)
**Parity benchmark:** PrimeNG 22.1.1 `Checkbox` — `specs/primeng/llms-22.1.1.txt` line 42, route
`https://primeng.dev/checkbox`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap closed:** `docs/brand/16-design-system-parity-vs-echeque-reference.md` rows for
`ino-checkbox` — "no indeterminate, no group, no size" (§ line 151) and "Hover missing on all
three binary controls" (E-2).
**Depended on:** W0-2, merged (`done`) before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Eight states — all carried (DoD row 5)

Unlike `ino-tag` (a non-interactive label), a checkbox is a real form control, so all eight states
apply:

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `accent-color: var(--ino-color-accent)` on the native input |
| Hover | ✅ **(new)** | `filter: brightness(1.15)` — the same "no lighten hook on `accent-color`" workaround `ino-button`'s primary variant already uses, since a native checkbox exposes no paintable border to retint |
| Active/pressed | ✅ | `accent-color` swaps to `--ino-color-accent-active` (pre-existing) plus `filter: brightness(0.9)` **(new)** so the press reads even on an unchecked box, where the accent swap alone has nothing to paint yet |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset`, unchanged |
| Disabled | ✅ | `:disabled` — `cursor: not-allowed`, row/label dim to `--ino-color-on-surface-muted` |
| Readonly | ✅ **(new)** | See §4 below — not a CSS-only state |
| Invalid | ✅ | Pre-existing `error` text input now additionally paints a ring on the box itself via `[aria-invalid='true']` **(new)**, so the invalid signal isn't text-only — `box-shadow: var(--ino-invalid-ring)` (INO-257's Wave 0 token), on a different channel from the focus outline, so a focused invalid checkbox shows **both** rings. See §12 |
| Loading/busy | ✅ **(new)** | `aria-busy` + `[disabled]="disabled || loading"` + an adjacent spinner (not an overlay — see §5) |

---

## 2. Indeterminate / tri-state (DoD scope, gap row "no indeterminate")

`indeterminate` binds directly to the native `HTMLInputElement.indeterminate` DOM property via
Angular's `[indeterminate]="indeterminate"` property binding — no `ElementRef`/`Renderer2`
directive needed, since Angular binds `[prop]` straight to any real DOM property the host element
exposes, and `indeterminate` is one (it just isn't reflected as an HTML *attribute*, which is why
`[attr.indeterminate]` would silently do nothing and a naive implementation might reach for
imperative DOM code that isn't actually required here).

Browsers already expose a `true` `indeterminate` IDL property to the accessibility tree as the
mixed checked state (HTML-AAM's checkbox mapping) — so the ARIA contract is satisfied by the
property binding alone. `[attr.aria-checked]="indeterminate ? 'mixed' : null"` is bound explicitly
in addition, because the DoD names `aria-checked="mixed"` literally and this keeps the value
present in rendered markup for any tooling that greps attributes rather than evaluating the live
accessibility tree. Both sources agree (same value), so there's no conflict between the implicit
native mapping and the explicit attribute.

**Resolving interaction.** Clicking (or pressing Space on) an indeterminate checkbox always
resolves it to a concrete `checked` value — this is native `<input>` behavior, not something this
component adds. `onChange` mirrors that by clearing `this.indeterminate` and emitting
`indeterminateChange(false)`; without that, a caller bound via `[(indeterminate)]="isIndeterminate"`
would leave `isIndeterminate` stuck `true`, and the next change-detection pass would reapply
`[indeterminate]="true"` to the DOM and silently fight the user's click back to the mixed state.

Visually, no extra CSS is needed: `accent-color` already themes the native indeterminate dash the
same way it themes the checked fill, in every evergreen browser.

---

## 3. Size API: control-size scale minus `--ino-control-height` (DoD row 3)

`size="sm" | "default" | "lg"` reads the Wave 0 control-size scale's icon-size, font-size and gap
aliases (`--ino-control-icon-size-*`, `--ino-control-font-size-*`, `--ino-control-gap-*`) — the same
three-alias subset `ino-tag` reads, for the same reason: `--ino-control-icon-size` is exactly the
"how big is this compact square element" alias the scale already provides (16/20/24px), a closer
fit than reusing `--ino-control-height` (44/36/52px, sized for a full-height control like
`ino-button`/`ino-input`) for a small square box.

The row itself still reads `--ino-row-min-height` (falling back to `--ino-target-comfortable`, a
token, not a literal) as its `min-height`, per DoD row 4 — so the *label row*'s click target stays
on the control-height/row-height family regardless of which box size is painted inside it. Box size
and row/target height are two different scales answering two different questions (how big does the
box render vs. how tall is the tappable row), matching how `ino-tag` treats `--ino-row-min-height`
as an independent opt-in floor from its own font/padding/gap size trio.

---

## 4. Readonly (DoD row 5, new state)

Native `readonly` has no effect on `<input type="checkbox">` — it is a text-input-only IDL
attribute per the HTML Standard (§4.10.5.1's list of elements `readonly` applies to does not
include checkbox/radio). A `readonly` `@Input` therefore has to be enforced imperatively: the
`(click)` handler calls `event.preventDefault()` whenever `readonly` is true, which cancels the
native check *before* it happens (Space-triggered activation fires a synthetic `click` in every
evergreen browser, so one handler covers both mouse and keyboard — no separate `keydown` handler
needed).

Visually this follows the same trade `ino-virtual-scroller`'s readonly state already documents:
content stays fully legible (unlike disabled's `opacity: 0.5`) and the control stays
keyboard-reachable and focusable (focus ring still works) — only the interactive affordances
(hover feedback, pointer cursor) withdraw, via a `.ino-checkbox--readonly` block whose (0,3,0)
specificity outranks the (0,2,0) hover rule regardless of source order.

`aria-readonly="true"` is bound on the input — `checkbox` is one of the roles that supports
`aria-readonly` per the WAI-ARIA spec's states-and-properties table (unlike, say, `radio`), so this
is a valid, non-conflicting addition alongside the implicit native `checkbox` role.

---

## 5. Loading/busy (DoD row 5, new state)

The box keeps its last committed `checked`/`indeterminate` value on screen — it never blanks or
swaps to a spinner-in-place-of-checkbox, unlike `ino-tag`'s icon-slot swap, because a checkbox's
own paint *is* its accessible value; replacing it mid-fetch would visually lie about the current
state while a caller is (for example) optimistically re-validating a submitted answer. Instead a
small spinner (half the box's own size, so it scales with `size`) renders as a sibling immediately
after the box, matching the "adjacent affordance" treatment rather than an overlay.

`[disabled]="disabled || loading"` blocks interaction while busy (same call `ino-button`'s `loading`
already makes for its own control), and `aria-busy="true"` is bound on the input so assistive tech
announces the pending state. The spinner border uses `--ino-color-on-surface-muted` rather than
`currentColor` (which `ino-tag`/`ino-button`'s spinners use) because a checkbox's own `color` isn't
meaningfully set — the box has no text of its own to inherit from.

---

## 6. `ino-checkbox-group` (DoD scope, gap row "no group")

A `<fieldset>`/`<legend>` wrapping N `<ino-checkbox>`s that share one `name` and one validation
message — the same WCAG/WAI-ARIA APG pattern `ino-radio-group` already uses for radios, adapted for
a `string[]` value instead of a single selected value (checkboxes are a multi-select set, radios
are mutually exclusive).

**Why compose `ino-checkbox`, not reimplement native inputs inline** (as `ino-radio-group` does
with raw `<input type="radio">`): `ino-checkbox` already carries the full state/size contract this
issue just built, and re-deriving all eight states a second time inside the group component would
immediately drift from the standalone component. `ino-radio-group` predates this issue's uplift and
has no equivalent single-radio component to compose yet — that drift is a separate, pre-existing
gap (`docs/brand/16-…md` row "no standalone single radio"), not something this issue's merge-hygiene
rule (touch only `checkbox/**`) allows fixing here.

**Group-level `disabled`** relies on the native `fieldset:disabled` cascade (every `ino-checkbox`'s
native `<input>` is a real light-DOM descendant of the `<fieldset>` — Angular's default
`ViewEncapsulation.Emulated` scopes CSS, not the DOM tree, so there's no shadow boundary blocking
the cascade) **and** is passed down explicitly as `[disabled]="disabled || !!option.disabled"`,
because the native cascade only flips the `:disabled` pseudo-class; it has no way to also flip
`ino-checkbox`'s own `disabled`-driven dimming class, which needs the `@Input` set directly.

**Shared validation.** One `error` string renders once below the `fieldset`, wired via
`aria-describedby` on the fieldset itself — identical to `ino-radio-group`'s existing pattern, not
duplicated per-item (an individual `ino-checkbox`'s own `error` `@Input` is for a *single* checkbox's
own validity, a different, narrower case than the group's shared message).

---

## 7. ARIA contract (DoD row 8)

**`ino-checkbox`** — native `checkbox` role (implicit, from `<input type="checkbox">`). No explicit
`role` attribute needed or added. `aria-checked` is implicit from `checked`/`indeterminate` in every
case except the explicit `mixed` binding described in §2. `aria-invalid` + `aria-describedby` wire
the error message in (pre-existing, unchanged). `aria-readonly` (§4) and `aria-busy` (§5) are new.

**`ino-checkbox-group`** — native `group` role (implicit, from `<fieldset>` + `<legend>`), same as
`ino-radio-group`. `aria-describedby` on the `fieldset` wires in the shared error message.

**Keyboard.** Tab to move focus between checkboxes (native, one stop per checkbox — unlike a radio
group's roving tabindex, every checkbox in a set is independently tab-reachable, matching native
HTML and the WAI-ARIA APG checkbox pattern). Space toggles the focused checkbox. No custom keydown
handling beyond the `readonly` click-cancel in §4.

**Contrast and targets.** Box size at every `size` value stays >= the WCAG 2.2 SC 2.5.8 24px floor
(16px `sm` is the box's *visual* size, not its target — the effective click target is the full
label row per `--ino-row-min-height`/`--ino-target-comfortable`, both >= 32px even in dense mode);
`default`/`lg` boxes are 20px/24px. Focus ring and invalid ring both resolve through
`--ino-focus-ring`/`--ino-invalid-ring`, audited across all three themes by
`check-theme-parity.mjs` — including the invalid ring's SC 1.4.11 3:1 budget against all three
surface roles and the never-flatten/never-thin rules.

---

## 8. RTL

Logical properties only: `inline-size`/`block-size` (box, input, spinner), `border-inline-start-color`
(spinner, mirroring `ino-tag`/`ino-button`'s spinner convention). No `left`/`right`/`top`/`bottom`
anywhere in either component's stylesheet.

---

## 9. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor** — not a separate port; the same Angular components/CSS render inside the Capacitor
  WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoCheckbox.tsx` (+ `InoCheckboxGroup`).
  RN has no native `indeterminate` visual for a checkbox-shaped `View` (there is no native checkbox
  primitive at all — this is a from-scratch `View`+`Pressable` implementation, unlike `ino-tag`'s RN
  port which only had to restyle a `View`), so the indeterminate glyph is drawn explicitly (a short
  dash) rather than delegated to a native control, and `accessibilityState={{ checked: 'mixed' }}`
  carries the ARIA-equivalent mixed state — RN's `accessibilityState.checked` accepts
  `true | false | 'mixed'` directly, the same three-way value `aria-checked` does on web.
- **Flutter** — `mobile/flutter/lib/widgets/ino_checkbox.dart` (+ `InoCheckboxGroup`), same
  from-scratch approach as the RN port rather than wrapping Flutter's built-in `Checkbox` (even
  with `tristate: true`, Material's own widget pulls its own theming/sizing/ripple defaults that
  don't track `InoPalette`/`InoControlSize`) — `GestureDetector` + `Container`, themed via
  `InoPalette`/`InoControlSize`. `indeterminate` surfaces through `Semantics.mixed`, Flutter's
  tri-state semantics flag — the direct equivalent of RN's `accessibilityState.checked === 'mixed'`
  and web's `aria-checked="mixed"`.

Neither mobile palette needed a new field for this component — checkbox styling is entirely
`accent`/`onAccent`/`border`/`danger`, all of which are already ported.

---

## 10. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `virtual-scroller/SPEC.md` §6 and `tag/SPEC.md` §8, re-verified for this issue: DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but no
such registry exists in the file (confirmed by reading it in full — it is a token-contract audit
script: CSS mirror byte-parity, colour roles across 3 themes × 2 mobile ports, space/radius/target/
duration scales, control-size scale, data-viz tokens). Nothing appended; `node
scripts/check-theme-parity.mjs` passes unchanged. Component-level token adherence is covered by
`check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 11. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `ng build` (web/) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token; box-size/font-size/gap resolve through the control-size scale, spinner size derives from the box size via `calc()` |
| `[data-theme]` branch in either component | none |

---

## 12. Invalid ring — converged onto `--ino-invalid-ring` (INO-269)

**Supersedes the State-7 decision this file originally recorded.** The ring shipped as a hand-rolled
`outline: 2px solid var(--ino-color-danger)` guarded by `:not(:focus-visible)`. Both halves of that
are gone:

```scss
&[aria-invalid='true'] {
  box-shadow: var(--ino-invalid-ring);
}
```

**Why the guard existed, and why it no longer has to.** `outline` was the only ring channel the Wave
0 contract offered, and State 4's focus ring already owns it; `box-shadow` was reserved for the
themed elevation scale (tokens.css §8). Two rings could not share one property, so the guard made
focus win outright while focused. That was a correct read of the constraint — but it cost the user
the State-7 chrome affordance for exactly as long as they were interacting with the failing control.
INO-257 (W0-7) added `--ino-invalid-ring` on the box-shadow channel, the constraint is gone, and
both affordances now paint at once. `ino-radio` was the first component onto the token; this brings
`ino-checkbox` and `ino-toggle` alongside it, so all three binary controls share one idiom.

**Two defects closed:**

1. A focused invalid checkbox showed no invalid ring at all. Only the danger-coloured `error` text
   remained — the mitigation the old comment cited, but a text-only signal for the whole interaction.
2. The ring stayed 2px in high-contrast while the focus ring widened to 3px, because the weight was
   a literal in this stylesheet rather than the token's. High-contrast now widens the invalid ring to
   3px with it (`check-theme-parity.mjs` enforces never-flatten and never-thin).

**The two rings stack, they do not collide.** `--ino-invalid-ring` is spread-only (`0 0 0 Npx`), so
it paints from the border box outward; the focus outline starts at `--ino-focus-ring-offset` (2px).
In dark/light the 2px ring fills 0–2px and the 2px outline fills 2–4px — adjacent, no overlap. In
high-contrast the 3px ring fills 0–3px and the 3px outline fills 2–5px, so the outline overpaints
the ring's outer 1px and 2px of coral stays visible, which is the behaviour tokens.css §12 documents
deliberately for that theme.

**No change to the `error: string` API, the ARIA contract (§7), or the mobile ports (§9)** — the
ports paint their own danger border and never read this CSS token.
