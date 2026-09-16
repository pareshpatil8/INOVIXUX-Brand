# `<ino-input-group>` — component spec

**Issue:** INO-139 (INO-31 T-17, Form group)
**Contract:** the general prefix/suffix ADDON mechanism for form controls — text labels, buttons,
checkboxes/radios, or several of any of those, on either side of a control, presented as one
visually-bordered unit. Distinct from `<ino-icon-field>` (T-16/INO-138), which is a lightweight
icon-only wrapper — see that component's own doc comment/SPEC.md for the split of responsibility.
**Parity benchmark:** PrimeNG 22.1.1 [`InputGroup`](https://primeng.dev/inputgroup)
(`specs/primeng/llms-22.1.1.txt` line 73 — "Text, icon, buttons and other content can be grouped
next to an input."). PrimeNG is a benchmark, **not** a runtime dependency.
**Docs:** `docs/brand/06-angular-components/input-group.md`.
**Preview:** `docs/brand/06-angular-components/previews/input-group.html`.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. No border-collapsing/corner-stripping trick — the group draws its OWN frame instead

Bootstrap's `.input-group` and PrimeNG's `InputGroup`/`InputGroupAddon` both achieve the classic
"seamless" look — square inner corners where two addons touch, a single hairline where borders
overlap — by having one stylesheet reach directly into every child (`.input-group > .form-control`,
`.input-group > .btn`, …) and override ITS border-radius/margin. That is viable there because the
group and every child it touches are maintained in the same library/stylesheet.

That access does not exist here. `<ino-input-group>` receives its addons and control entirely via
`<ng-content>`, written in the CONSUMER's template. Under Angular's Emulated view encapsulation,
every element in that consumer template — an `<ino-button>` host, a plain `<button>`, a native
`<input type="checkbox">` — carries the CONSUMER's `_ngcontent-*` scoping attribute, never this
component's. A selector authored in `ino-input-group.component.scss`, even one as simple as
`.ino-input-group__addon > button`, compiles to
`.ino-input-group__addon[_ngcontent-a] > button[_ngcontent-a]`, which can never match a projected
`<button>` tagged with a *different* attribute (`_ngcontent-b`, from the consumer's template). This
is the identical structural fact `<ino-icon-field>`'s SPEC.md §2 documents for `::ng-deep`/flexbox —
it is not specific to flex-grow, it applies to ANY selector targeting projected content. This
repo's `check-ds-adherence.mjs` bans `::ng-deep`/`/deep/`/`::part()` outright (no sanctioned escape
hatch yet — doc 16 §4.3 Layer 4 / N-11), so there is no way to reach in even if we wanted to.

`<ino-input-group>` therefore does not attempt to strip a projected addon's own border-radius or
collapse it against the control's. Instead it draws **one shared frame on its own `:host`** — the
same `--ino-color-border` / `--ino-radius-md` / `--ino-color-surface-sunken` tokens `ino-input`'s
own `.ino-field__control` reads (see that component's SCSS) — so a group wrapping a control is a
visual *superset* of that control's own frame (DoD row 5's own wording), not a mismatched box. If
the caller nests an already-bordered control (`<ino-input>`) inside, the two frames simply nest
(an outer group border around an inner control border) rather than merging into one hairline. This
is a deliberate, permanent divergence from the Bootstrap/PrimeNG reference, not a temporary gap:
the alternative would require either a sanctioned `::part()`/`::ng-deep`-style mechanism (not
approved yet, N-11) or teaching every current and future wrapped control to accept a "borderless
inside a group" mode from the outside — exactly the kind of cross-component coupling
`<ino-icon-field>`'s own SPEC.md (§1) already rejected for the identical reason.

## 2. Two things ARE reachable across the projection boundary, and this component uses both

Encapsulation only blocks *selector matching* across the projection boundary — it does not affect
two other CSS mechanisms, and `<ino-input-group>` relies on both instead of fighting the boundary:

- **Custom property inheritance.** A `var(--ino-color-accent)` set on an ANCESTOR element resolves
  for every descendant that reads that same custom property name, via normal DOM-tree inheritance,
  completely independent of `_ngcontent-*` attributes. This component doesn't currently need a
  projected child to *read* one of its custom properties (no addon in this repo exposes a
  border-color hook to receive), but it's the mechanism that keeps the door open for a future one
  to (e.g. a from-scratch "flush" addon variant) without ever needing a new selector.
- **Property inheritance.** `color`, `font-family`, `font-size` are inherited CSS properties by
  specification — they flow down the real DOM tree the same way, regardless of encapsulation.
  Setting them on `.ino-input-group__addon` (this component's own wrapper `<span>`) means a plain
  projected text addon (`<span groupAddonStart>$</span>`, or even bare projected text with no
  wrapping element at all) picks up the right look with zero selector ever targeting it. A styled
  interactive addon (`ino-button`, a native `<input>`) sets its own explicit `color` and simply
  overrides the inherited value, which is correct — per DoD, "button/checkbox/radio addons keep
  their own native semantics; the group just supplies layout."

## 3. Multi-addon groups need no separate API

DoD asks for "more than one addon on the same side" (two buttons; a select + text prefix). Angular
projects **every** element matching a given `<ng-content select="...">` into that one outlet, in
template order, not just the first match. So `[groupAddonStart]` / `[groupAddonEnd]` already
support one addon or many with the exact same markup shape — a caller adds a second
`groupAddonEnd`-marked element and it lands in the same slot, laid out by that slot's own
`display: flex` row. No `@Input() addons: Addon[]` array API, no `*ngFor`, and no version skew
between "one addon" and "many addons" to maintain.

## 4. Addon slot is `flex`, not the single-track `grid` `<ino-icon-field>` uses for its icon boxes

`<ino-icon-field>`'s icon boxes are single-item grids (`display: grid`, one implicit track) because
they only ever hold exactly one projected `<svg>` and need it to STRETCH to fill a token-sized box.
`<ino-input-group>`'s addon slots hold a variable NUMBER of addons (§3) at their own intrinsic
size — a checkbox next to a text label next to a button never wants to be stretched to fill the
slot the way a lone icon does. `display: flex` lays out however many children land in the slot,
left-to-right in the inline direction, sized to content — the correct behaviour for zero, one, or
several addons without a container-type branch. The projected CONTROL still gets the single-track
grid treatment (`.ino-input-group__control`), because there is exactly one of it and it must fill
the remaining track — same reasoning as `<ino-icon-field>`'s control slot.

## 5. State model — what this wrapper owns vs. what stays on the wrapped control/addon

This wrapper has no native control, value, or click handler of its own, so several of the DoD's
eight states are either a caller-mirrored flag or explicitly out of scope, mirroring
`<ino-icon-field>`'s treatment of `disabled`:

| State | Mechanism |
|---|---|
| default | base `:host` frame — `--ino-color-border` / `--ino-radius-md` / `--ino-color-surface-sunken` |
| hover | `:host(:hover)` darkens the frame to `--ino-color-on-surface-muted`, mirroring `ino-input`'s own `:hover` border treatment |
| active/pressed | **not implemented on the group.** The group is not itself an activatable element — no click handler, no native semantics. "Pressed" belongs entirely to whichever addon `<button>` is actually pressed, and that is that button's own native `:active` styling, completely untouched by this wrapper. Recorded here per DoD row 6 rather than silently dropped. |
| focus-visible | approximated via `:host(:focus-within)` — the host itself is never directly focusable (no `tabindex`), so there is no true `:focus-visible` state OF THE HOST to hook; `:focus-within` fires when the projected control (or an addon) inside receives focus, which is the moment the DoD asks the frame to react. Recolors the frame to `--ino-color-accent` plus a real `outline: var(--ino-focus-ring)` — the same tokens `ino-input`'s own `:focus-visible` reads, so the two rings agree if a reviewer sees both at once. |
| disabled | caller-mirrored `disabled` `@Input` (this wrapper has no native `disabled` to read) — dims the frame to `opacity: 0.5`; does not (and cannot) disable the projected control/addons — the caller sets `[disabled]` on those directly, same contract as `<ino-icon-field>`'s `disabled`. |
| readonly | caller-mirrored `readonly` `@Input`. Flattens the background from `--ino-color-surface-sunken` (writable/"inset") to `--ino-color-surface` (flat/settled) while keeping the border and content at full strength — same trade `ino-virtual-scroller`'s `[data-readonly]` makes: content stays fully legible, only the "editable" affordance recedes. |
| invalid | caller-mirrored `invalid` `@Input`. Border only, recolored to `--ino-color-danger` — the fill stays neutral so addon/control content keeps its audited contrast against `--ino-color-surface-sunken` rather than against a tinted background, same trade `ino-virtual-scroller`'s `[data-invalid]` makes. |
| loading/busy | caller-mirrored `loading` `@Input`, reflected as `aria-busy` on the host. `cursor: progress` only — deliberately NOT also dimmed like disabled, because a busy group (e.g. awaiting an async validation on the wrapped control) is still genuinely interactive from the reviewer's point of view, unlike disabled which truly blocks it. |

## 6. Motion — one transition, gated

`border-color` on the shared frame transitions at `--ino-motion-duration-fast` /
`--ino-motion-easing-standard` (the hover/focus-within/invalid recolors above are all the same
property changing) — a state-transition color echo, not an enter/exit animation, matching
`<ino-icon-field>`'s §6 classification of its own icon-recolor transition. Gated behind
`@media (prefers-reduced-motion: reduce) { transition: none; }` per the Wave 0 motion contract
(INO-127). There is no enter/exit animation because this component has no mount/unmount visual
state of its own — it is present for the lifetime of its projected content, same as
`<ino-icon-field>`.

## 7. Accessibility — `role="group"` is conditional on a caller-supplied `label`

A bare `role="group"` with no accessible name announces as "group" and nothing else — worse than no
role, and the projected control (an `<ino-input>` with its own `<label for>`, or a native labeled
`<input>`) almost always already carries the real accessible name; adding an unconditional
`role="group"`/`aria-label` at this wrapper's level would duplicate or shadow that labeling rather
than add information, which the DoD explicitly warns against ("the group must not duplicate
labeling that the projected control already provides"). So `role="group"` and `aria-label` are only
reflected when a caller explicitly sets `@Input() label` — the rarer case where the GROUP as a
whole (not any one control inside it) needs naming, e.g. a "select this row" checkbox sitting next
to a company-name input, where the meaningful unit for AT is "select + name," not either piece
alone. Addon `<button>`s are real `<button>` elements the caller writes directly — this component
renders none of its own interactive elements — so native keyboard operability,
`:focus-visible`, and `aria-*` semantics on those addons are already correct with zero extra
plumbing here.

## 8. Mobile parity (per plan rev 9 §5)

Capacitor-only, per this issue's own scope. `<ino-input-group>` renders the identical Angular
component and the identical CSS in the Capacitor webview — no browser-only API is used anywhere in
this component (content projection, CSS Grid/flex, and CSS custom properties only — no `window`,
`document.querySelector`, etc.), so DoD row 9 is satisfied by construction, not by a separate
mobile build. React Native and Flutter carry no input-group **widget**, same finding as
`<ino-icon-field>`'s own SPEC.md §8 (pending INO-138 — that component is still on its own
unmerged branch as of this writing, not yet part of this checkout): on both of those tracks,
gluing a button/checkbox/text label next to a text field is conventionally composed directly in
the screen's own layout (a `View`/`Row` mixing a `TextInput` with a sibling
`Button`/`Checkbox`/`Text`), not through a shared wrapper component — there is no native primitive
this component would be porting, and no existing mobile call site asks for one. This is a scope
statement, not a gap discovered after the fact.

## 9. Registry finding (recorded per prior precedent)

Same finding as `tag/SPEC.md` §8, `toast-container/SPEC.md` §7, and `<ino-icon-field>`'s own
SPEC.md §9 (pending INO-138, see §8 above): DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry," but no
such registry exists in the file (confirmed by reading it in full — it is a token-contract audit
script: CSS ↔ React Native ↔ Flutter token parity, not a per-component manifest). Nothing appended
here; `node scripts/check-theme-parity.mjs` passes unchanged with this component added.

---

## Files touched

- `web/src/app/components/input-group/ino-input-group.component.ts` — `InoInputGroupComponent`,
  `size`/`label`/`disabled`/`readonly`/`invalid`/`loading` `@Input`s.
- `web/src/app/components/input-group/ino-input-group.component.html` — `groupAddonStart` /
  default / `groupAddonEnd` content projection.
- `web/src/app/components/input-group/ino-input-group.component.scss` — layout, size API, states.
- `docs/brand/06-angular-components/input-group.md` — API + variants + a11y contract.
- `docs/brand/06-angular-components/previews/input-group.html` — variant preview.
- This file.

No change to `web/src/tokens.css` — every value this component reads (`--ino-control-height*`,
`--ino-control-padding-inline*`, `--ino-control-gap*`, `--ino-control-font-size*`,
`--ino-color-border`, `--ino-color-border-soft`, `--ino-color-surface-sunken`,
`--ino-color-surface`, `--ino-color-on-surface-muted`, `--ino-color-accent`,
`--ino-color-danger`, `--ino-radius-md`, `--ino-focus-ring`, `--ino-focus-ring-offset`,
`--ino-font-display`, `--ino-motion-duration-fast`, `--ino-motion-easing-standard`) already
existed, and no change outside `web/src/app/components/input-group/**` and this issue's own
docs/preview files.
