# `<ino-radio>` / `<ino-radio-group>` — component spec

**Issue:** [INO-159](/INO/issues/INO-159) (INO-31 U-4)
**Parity benchmark:** PrimeNG 22.1.1 `RadioButton` — `specs/primeng/llms-22.1.1.txt` line 38, route
`https://primeng.dev/radiobutton`. PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.
**Gap closed:** `docs/brand/16-design-system-parity-vs-echeque-reference.md` line 171 —
"⚠️ group only, no standalone, no size" — and E-2, "Hover missing on all three binary controls".
**Depended on:** W0-2 (INO-124, control-size scale), merged (`done`) before this issue started.
**Predecessor note:** `ino-checkbox`'s own uplift (INO-158) deferred creating a standalone single
radio to this issue rather than fixing it under `checkbox/**`'s merge-hygiene rule — see
`checkbox/SPEC.md` §6. This issue is that deferred work.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Roving tabindex is native, not custom (issue's explicit ask)

`<ino-radio-group>` predates this issue as raw `<input type="radio">`s sharing one `name`; that is
already the correct implementation of the WAI-ARIA APG "radio group" roving-tabindex pattern — every
evergreen browser gives a set of same-`name` radios a single shared tab stop plus arrow-key cycling
between them, with no author JavaScript. Extracting the per-row markup into `<ino-radio>` does not
change this: `<ino-radio>` still renders one real `<input type="radio">` per instance, and the
`name` @Input is still the thing that ties N of them into one native group — Angular component
boundaries are invisible to this browser behavior, which operates purely on the rendered DOM.

**Both forms stay correct for the same reason:**
- **Grouped** (`<ino-radio-group>`): passes one shared `name` to every child `<ino-radio>` —
  unchanged behavior from before this issue, just now routed through a reusable component.
- **Standalone** (bare `<ino-radio>`, PrimeNG's `RadioButton` shape): a lone radio gets its own
  auto-generated `name` (an incrementing counter, same idiom `<ino-checkbox>`'s `controlId` and the
  pre-existing `<ino-radio-group>` `name` already use) so it doesn't accidentally join any other
  radio's native group. A caller wiring up several independent `<ino-radio>`s as their own set (not
  via `<ino-radio-group>`) passes the same explicit `name` to each — at that point the same native
  roving-tabindex behavior applies, because the browser only looks at the rendered `name` attribute,
  never at which Angular component tree produced it.

No custom `keydown` handling was written or is needed for either form.

---

## 2. Eight states — all carried (DoD row 5)

Same set `<ino-checkbox>` carries, adapted from a multi-select box to a single-select dot:

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | `accent-color: var(--ino-color-accent)` on the native input |
| Hover | ✅ **(new)** | `filter: brightness(1.15)` — same "no lighten hook on `accent-color`" workaround `ino-checkbox`/`ino-button` use |
| Active/pressed | ✅ | `accent-color` swaps to `--ino-color-accent-active` (pre-existing) plus `filter: brightness(0.9)` **(new)** |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset`, unchanged |
| Disabled | ✅ | `:disabled` — `cursor: not-allowed`, row/label dim to `--ino-color-on-surface-muted` |
| Readonly | ✅ **(new)** | Same click-cancel approach as `<ino-checkbox>` — see §3 |
| Invalid | ✅ **(new)** | `invalid` boolean @Input (not an `error` string — see §4) paints a `box-shadow` ring via `[aria-invalid='true']` |
| Loading/busy | ✅ **(new)** | `aria-busy` + `[disabled]="disabled || loading"` + an adjacent spinner, matching `<ino-checkbox>`'s "keep the last committed value on screen" treatment |

---

## 3. Readonly (DoD row 5, new state)

Native `readonly` has no effect on `<input type="radio">` (a text-input-only IDL attribute per the
HTML Standard, same gap `<ino-checkbox>` documents), so it is enforced imperatively: `(click)` calls
`event.preventDefault()` when `readonly` (or `loading`) is true, canceling the native selection
before it happens. Content stays fully legible and the control stays focusable — only the
interactive affordances withdraw, matching `<ino-checkbox>`'s readonly trade exactly.

---

## 4. `invalid: boolean`, not `error: string` (DoD row 5, deliberate API difference from `<ino-checkbox>`)

`<ino-checkbox>` takes `error: string` because a standalone checkbox commonly owns its own
validation message ("I agree to the terms" + "Required to continue"). A radio's natural unit of
validity is the *group* ("Choose a plan" → "Please choose a plan"), which `<ino-radio-group>`
already carries as its own `error: string` + `errorId`/`aria-describedby` on the `<fieldset>` —
unchanged by this issue. Giving the standalone `<ino-radio>` the same string-message API would
invite a caller to render N duplicate error messages, one per option, inside a single group.
`<ino-radio>` therefore only takes `invalid: boolean` (matching PrimeNG `RadioButton`'s own
`invalid` input shape) for the visual/ARIA ring; message ownership stays exclusively at the group
level, or with whatever the caller wraps a fully standalone radio in.

---

## 5. `<ino-radio-group>` composes `<ino-radio>` (DoD scope, closes "no standalone" + "no size" gaps)

Mirrors the call `<ino-checkbox-group>` already made for `<ino-checkbox>` (INO-158): the group is a
thin `<fieldset>`/`<legend>` wrapper around N `<ino-radio>` rows, passing `name`, `size`, resolved
`checked`, combined `disabled`, and `readonly` down — rather than re-implementing native inputs
inline a second time. Every state and size `<ino-radio>` carries applies per-row for free; the
group's own stylesheet shrank to fieldset/legend/error/layout only, with all interactive styling
now living in `ino-radio.component.scss`.

**Group-level `disabled`** relies on the native `fieldset:disabled` cascade (every `<ino-radio>`'s
native `<input>` is a real light-DOM descendant of this `<fieldset>` under Angular's default
`ViewEncapsulation.Emulated`) **and** is passed down explicitly as
`[disabled]="disabled || !!option.disabled"`, because the cascade only flips the native `:disabled`
pseudo-class — it does not know about `<ino-radio>`'s own `disabled`-driven dimming class.

**`checkedChange` guard.** `<ino-radio>`'s `checkedChange` only ever emits `true` for a user click
(a native radio cannot be unchecked by clicking the already-checked one), but
`<ino-radio-group>.onChange` guards on the boolean explicitly rather than assuming it, so the
contract stays correct even if a future caller drives `<ino-radio>` some other way.

---

## 6. Size API: control-size scale minus `--ino-control-height` (DoD row 3)

`size="sm" | "default" | "lg"` reads the Wave 0 control-size scale's icon-size, font-size and gap
aliases — the same three-alias subset `<ino-checkbox>`/`<ino-tag>` read, for the same reason: the
icon-size alias (16/20/24px) is the closer fit for a compact circular control than
`--ino-control-height` (44/36/52px, sized for a full-height control like `ino-button`/`ino-input`).

The row still reads `--ino-row-min-height` (falling back to `--ino-target-comfortable`) as its
`min-height`, independently of dot size, per DoD row 4 — identical to `<ino-checkbox>`'s row
treatment.

---

## 7. ARIA contract (DoD row 8)

**`<ino-radio>`** — native `radio` role (implicit, from `<input type="radio">`). `aria-checked` is
implicit from `checked`. `aria-invalid` reflects `invalid` (new). `aria-readonly` is **not** bound —
unlike `checkbox`, `radio` does not support `aria-readonly` in the WAI-ARIA states-and-properties
table, so the attribute would be invalid ARIA if added; the readonly *behavior* (§3) still applies,
enforced purely in script, with no corresponding ARIA attribute — the same restriction
`<ino-checkbox>`'s spec notes radio lacks relative to checkbox. `aria-busy` reflects `loading`.

**`<ino-radio-group>`** — native `group` role (implicit, from `<fieldset>` + `<legend>`), unchanged.
`aria-describedby` on the `<fieldset>` wires in the shared error message, unchanged.

**Keyboard** — Tab moves focus onto the group once, landing on the checked radio (or the first, if
none checked); Arrow Up/Down/Left/Right cycle selection among same-`name` radios, immediately
selecting on move (native browser behavior, per §1). Space has no effect on an already-focused
native radio beyond re-confirming the current selection (also native). No custom keydown handling.

**Contrast and targets** — the dot itself is >= the WCAG 2.2 SC 2.5.8 24px floor at `default`/`lg`
(20px/24px, matching `<ino-checkbox>`'s box sizing exactly); the effective click target is the full
label row via `--ino-row-min-height`/`--ino-target-comfortable`, always >= 32px even in dense mode.
Focus ring, invalid ring and the danger error text all resolve through tokens audited across all
three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`inline-size`/`block-size`, `border-inline-start-color`); no
`left`/`right`/`top`/`bottom` anywhere in either component's stylesheet.

---

## 8. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue.

- **Capacitor** — not a separate port; the same Angular components/CSS render inside the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoRadio.tsx` + `InoRadioGroup.tsx`. RN has
  no native radio primitive, so this is a from-scratch `Pressable`-drawn dot, mirroring
  `InoCheckbox.tsx`'s own from-scratch approach; `accessibilityRole="radio"` +
  `accessibilityState={{ checked }}` (boolean only — no `'mixed'` state exists for radios, unlike
  checkbox's tri-state).
- **Flutter** — `mobile/flutter/lib/widgets/ino_radio.dart` + `ino_radio_group.dart`, same
  from-scratch `GestureDetector` + `Container` approach as `ino_checkbox.dart` (not Material's
  built-in `Radio`, to keep full `InoPalette`/`InoControlSize` token control); `Semantics.checked`
  set directly (no `mixed`).

RN and Flutter have no native mutual-exclusion primitive either — both group ports manage `value` as
a single selected string and pass down per-item `checked = value == option.value`, the direct mobile
equivalent of the web group's `[checked]="option.value === value"` binding.

---

## 9. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `checkbox/SPEC.md`, re-verified for this issue: DoD row 11
describes "one appended line in the `check-theme-parity.mjs` component registry", but no such
registry exists in the file (confirmed by reading it in full). Nothing appended;
`node scripts/check-theme-parity.mjs` passes unchanged. Component-level token adherence is covered
by `check-ds-adherence.mjs`'s directory-scope walk instead.

---

## 10. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
