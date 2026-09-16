# `<ino-icon-field>` — component spec

**Issue:** INO-138 (INO-31 T-16, Form group)
**Contract:** the sanctioned icon-slot mechanism referenced by other Tier-1 form components (a
wrapper, not an `@Input() icon` re-implemented per control).
**Parity benchmark:** PrimeNG 22.1.1 [`IconField`](https://primeng.dev/iconfield)
(`specs/primeng/llms-22.1.1.txt` line 67 — "IconField wraps an input and an icon"). PrimeNG is a
benchmark, **not** a runtime dependency.
**Docs:** `docs/brand/06-angular-components/icon-field.md`.
**Preview:** `docs/brand/06-angular-components/previews/icon-field.html`.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Side-by-side layout, not PrimeNG's icon-overlaps-input pattern

PrimeNG's `IconField` positions its icon absolutely *inside* the wrapped `<input>`'s own box
(`p-icon-field-left`/`-right` push the icon over the input, and the input itself carries extra
`padding-left`/`padding-right` set by a global stylesheet rule to leave room). That only works
because PrimeNG's `InputText` and `IconField` are siblings maintained in the same library, so the
library can freely couple one component's padding to another's icon width.

That coupling doesn't hold here. `ino-input`, `ino-select`, and every other Tier-1 control in this
repo are already fully self-styled leaf components — each owns its own border, background,
`--ino-control-height`, and internal `padding-inline`. Overlapping an icon inside one of those boxes
from `<ino-icon-field>` would mean reaching into a sibling component's internal padding and
resizing it based on whether an icon happens to be present — exactly the kind of cross-component
coupling this issue's own framing ("a wrapper, NOT an `@Input() icon` on every control") is trying
to avoid. It would also have to special-case every control this wrapper might ever be asked to
hold, forever.

Instead `<ino-icon-field>` is a 3-column CSS Grid — `iconLeading` slot | projected control |
`iconTrailing` slot — vertically centered, with icons living *outside* the control's own box rather
than inside it. This is a deliberate, permanent divergence from the PrimeNG reference, not a
temporary gap:

- It works with any projected control, present or future, with zero knowledge of that control's
  internal padding.
- It is why DoD row 5's focus-ring requirement is trivially satisfied: this wrapper never applies
  `overflow: hidden` and never touches the control's own box, so the control's native
  `:focus-visible` ring renders completely unclipped — exactly as it would unwrapped.
- Grid column order, like flexbox row order, is an inline-axis concept, not a physical one, so
  under `dir="rtl"` the `iconLeading` slot (column 1, first in template order) automatically
  renders at the trailing edge of the reversed row with no extra CSS — DoD row 8's RTL requirement
  falls out of the layout choice itself rather than needing `inset-inline-start`/`-end` bookkeeping.

## 2. CSS Grid, not flexbox + `::ng-deep`

The first draft of this component used a flex row and reached for `flex: 1 1 auto`/
`inline-size: 100%` rules targeting the projected control and a projected `<svg>` icon directly.
That draft failed `node scripts/check-ds-adherence.mjs`'s `no-escape-hatch` rule — those rules only
work via `::ng-deep`, and this repo has explicitly decided (`16-design-system-parity-vs-echeque-
reference.md` §4.3 Layer 4 / register item N-11) that **no escape hatch is sanctioned yet**, with
the lint's own message pointing at the correct fix: "change the component API instead."

The reason a flex row needs `::ng-deep` at all: content projected via `<ng-content>` is written in
the *consumer's* template, so under Angular's Emulated encapsulation it carries the consumer's
`_ngcontent-*` attribute, not `<ino-icon-field>`'s. A selector authored in this stylesheet — even
one as simple as `.ino-icon-field__control > *` — compiles to
`.ino-icon-field__control[_ngcontent-a] > *[_ngcontent-a]`, which can never match a projected
element tagged with a *different* attribute. Flexbox's stretch-to-fill mechanism (`flex-grow`) is a
property of the ITEM, so making a projected child grow requires exactly the cross-boundary selector
Emulated encapsulation forbids.

CSS Grid's default `justify-items`/`align-items: stretch` (both left unset here, i.e. at their
default) sidestep the problem entirely: they are properties of the CONTAINER, and grid stretches
every item that occupies a track *by structural position alone* — no selector ever has to reach the
projected element for it to fill its column. `<ino-icon-field>` uses this twice, both times by
nesting a nested single-track grid and letting whatever lands inside it — via plain content
projection — become that grid's sole item automatically:

1. `.ino-icon-field__control { display: grid; grid-template-columns: minmax(0, 1fr); }` — the
   projected control (`<ino-input>`, a native `<input>`, …) becomes this inner grid's one item and
   stretches to fill it.
2. `.ino-icon-field__icon { display: grid; }` (one implicit track, sized to the token box) — a
   projected `<svg>` becomes this inner grid's one item and stretches to fill the token-sized
   (`--ino-control-icon-size`) box, instead of rendering at whatever intrinsic `width`/`height` the
   caller's inline SVG happens to carry.

No selector in this component's stylesheet targets a projected element, and no `::ng-deep` appears
anywhere in it.

## 3. Icon variants: leading-only / trailing-only / both / neither

DoD row 6 asks for leading-only, trailing-only, and both. The template always renders both
`<ng-content select="[iconLeading]">` and `[iconTrailing]` wrapper `<span>`s; `.ino-icon-field__icon
:empty { display: none; }` (the same trick `ino-tag`'s `.ino-tag__icon:empty` already uses) means a
slot with nothing projected into it collapses to zero footprint, so all three (plus the fourth,
degenerate "neither" case — a bare field-less wrapper, not asked for but not excluded either) fall
out of one template with no `*ngIf`/`*ngComponentOutlet` branching.

## 4. Icons are `aria-hidden` on the WRAPPER, not delegated to the caller

Both `<ng-content select="[iconLeading]">` and `[iconTrailing]` sit inside a `<span aria-hidden=
"true">` in this component's own template — the hiding is guaranteed by the wrapper regardless of
whether the caller remembers to mark their own `<svg>` decorative. This matches DoD row 8's
"icons must be `aria-hidden`" requirement without depending on every call site getting it right,
and matches the semantics stated in the issue: the wrapped control (an `<ino-input>`, a `<select>`,
whatever carries the real `<label for>`) is where the accessible name and description live; the
icon is purely decorative chrome around it. `<ino-icon-field>` itself adds no role, no `tabindex`,
and no other interactive semantics of its own — it is not a focusable or activatable element.

## 5. `disabled` is a caller-mirrored flag, not derived state

`<ino-icon-field>` has no native control of its own, so it has nothing to read a real `disabled`
state from. `disabled` is a plain `@Input` the caller sets in parallel with the projected control's
own `[disabled]` — it dims the icons (`opacity: 0.5`) and reflects `aria-disabled` on the wrapper
for any AT that walks it, but it cannot and does not disable the projected control itself. This is
the same shape as `ino-tag`'s `disabled` (a presentational-only flag on a component with no native
disabled concept), documented here so it isn't mistaken for a `ControlValueAccessor`-style
propagation this component doesn't (and structurally can't) implement.

## 6. Motion — none, by design

There is no enter/exit transition in this component (DoD row 7). `<ino-icon-field>` is a pure
layout wrapper that is present for the lifetime of its projected control — there is no
show/hide/mount state of its own to animate. The one motion declaration that does exist
(`color` transitioning on the icon boxes at `--ino-motion-duration-fast` for the focus-within
recolor in §7 below) is a micro-interaction easing, not an enter/exit animation, and is gated behind
`@media (prefers-reduced-motion: reduce)` → `transition: none` per the Wave 0 motion contract
(INO-127).

## 7. Focus-within icon recolor, not a second focus ring

DoD row 5 asks for focus-visible on the wrapped control to "still show correctly." Because the
icons live outside the control's box (§1), there is nothing for this wrapper to clip — the
control's own `:focus-visible` ring is unaffected. On top of that baseline correctness, this
component adds one small enhancement: `:host(.ino-icon-field:focus-within) .ino-icon-field__icon`
recolors the icons to `--ino-color-accent` while the projected control has focus, so the icon reads
as part of the same interactive unit rather than a static neighbour. This is a color echo, not a
second ring — `check-theme-parity.mjs` already audits the `on-surface`/`accent` pair per theme, so
no new contrast pair is introduced by this rule.

## 8. Mobile parity (per plan rev 9 §5)

Capacitor-only, per this issue's own scope. `<ino-icon-field>` renders the identical Angular
component and the identical CSS in the Capacitor webview — no browser-only API is used anywhere in
this component (no `window`, `document.querySelector`, IntersectionObserver, etc. — the whole
component is content projection plus CSS custom properties), so DoD row 9 is satisfied by
construction, not by a separate mobile build. React Native and Flutter carry no icon-field
**widget**: on both of those tracks a leading/trailing icon next to a text field is conventionally
composed directly in the screen's own layout (a `View`/`Row` with an `Icon` beside a `TextInput`/
`TextField`), not through a shared wrapper component — there is no native primitive this component
would be porting, and no existing mobile call site asks for one. This is a scope statement, not a
gap discovered after the fact.

## 9. Registry finding (recorded per prior precedent)

Same finding as `tag/SPEC.md` §8, `toast-container/SPEC.md` §7, and `button.md`'s "Deliberate
omissions" section: DoD row 11 describes "one appended line in the `check-theme-parity.mjs`
component registry," but no such registry exists in the file (confirmed by reading it in full —
408 lines — it is a token-contract audit script: CSS ↔ React Native ↔ Flutter token parity, not a
per-component manifest). Nothing appended here; `node scripts/check-theme-parity.mjs` passes
unchanged with this component added.

---

## Files touched

- `web/src/app/components/icon-field/ino-icon-field.component.ts` — `InoIconFieldComponent`,
  `size`/`disabled` `@Input`s.
- `web/src/app/components/icon-field/ino-icon-field.component.html` — `iconLeading` / default /
  `iconTrailing` content projection.
- `web/src/app/components/icon-field/ino-icon-field.component.scss` — layout, size API, states.
- `docs/brand/06-angular-components/icon-field.md` — API + variants + a11y contract.
- `docs/brand/06-angular-components/previews/icon-field.html` — variant preview.
- This file.

No change to `web/src/tokens.css` — every value this component reads (`--ino-control-icon-size*`,
`--ino-control-gap*`, `--ino-color-on-surface-muted`, `--ino-color-accent`,
`--ino-motion-duration-fast`, `--ino-motion-easing-standard`) already existed, and no change
outside `web/src/app/components/icon-field/**` and this issue's own docs/preview files.
