# `<ino-float-label>` — component spec

**Issue:** INO-141 (INO-31 T-18, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `FloatLabel` — `specs/primeng/llms-22.1.1.txt` line 62, route
`https://primeng.dev/floatlabel`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it. PrimeNG makes label placement a wrapper *component*, not a per-control prop — this
issue corrects doc 16 rev 2, which had wrongly logged the same gap as a `labelMode` variant missing
on 7 individual controls. Variants ported 1:1 from the benchmark: `over`, `in`, `on`.
**Depends on:** W0-3 (INO-125, form-label token set + `--ino-color-label*` roles) — `done`, merged
before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Why this is a stateful wrapper, not a CSS-only one (DoD row 1/7/11)

PrimeNG's Angular `FloatLabel` projects **two** children — the control, then a `<label>` — and
reacts to the control's own `:focus`/`:not(:placeholder-shown)` pseudo-classes purely in CSS.
That shape was the first one built here too, and it was reverted: reacting to a *projected* child's
CSS state from this component's *own* stylesheet requires `::ng-deep` (Angular's emulated view
encapsulation attaches a scoping attribute to every element a component's own template creates, but
never to `<ng-content>` children, so a plain descendant selector silently matches nothing).
`node scripts/check-ds-adherence.mjs` flags `::ng-deep` outright (`doc 16 §4.3 "Layer 4" / N-11`) —
the design-system parity doc records the override/escape-hatch contract as an **open, undecided**
governance question for the CTO/board, not something one Tier-1 component issue should resolve by
introducing the exact escape hatch that decision is meant to gate.

The shipped design avoids the piercing problem entirely instead of asking for an exemption from it:

- `<ino-float-label>` **composes `<ino-label>` in its own template** (`label` is an `@Input`, the
  same shape `ino-input` already uses) instead of projecting one. Styling it needs no piercing —
  it is this component's own element, scoped normally.
- Only the bare control (`<input>`/`<textarea>`/`<select>`) is projected via `<ng-content>`. This
  component locates it with a plain `querySelector` in `ngAfterContentInit` (not `@ContentChild`,
  which has no raw-tag-selector overload for native elements) and attaches `focus`/`blur`/`input`
  listeners via `Renderer2` to derive a `floated` boolean, applied as a **host class**
  (`.ino-float-label--floated`). The `in`/`on` variants' permanent top-padding reservation on the
  control is set the same way — `Renderer2.setStyle` on the one DOM node this component already
  holds a reference to, not a selector reaching across the projection boundary.
- `<select>` has no meaningful "empty" rest state (a native select always shows a value) — its
  label is unconditionally floated, detected once in `ngAfterContentInit`.

Net effect for a caller: near-identical markup to the PrimeNG benchmark, minus the second projected
`<label>` (replaced by a `label`/`for` input pair):

```html
<ino-float-label for="username" label="Username" variant="over">
  <input id="username" />
</ino-float-label>
```

This is JS-driven on **every** platform now (see §6) — web, React Native, and Flutter all derive
"floated" from focus/value listeners rather than web being the CSS-only odd one out, which is a more
consistent contract across the three tracks than the benchmark's own CSS-only web behaviour.

---

## 2. State ownership split (DoD row 5)

`<ino-float-label>` is a positioning wrapper, not a form control, of the eight states:

| State | Owner | Reason |
|---|---|---|
| Default / hover / active / focus-visible / loading | The wrapped control | It renders its own chrome for all of these (e.g. `ino-input`'s own `:hover`/`:focus-visible`/`loading`, or a bare `<input>`'s native focus ring) — this wrapper only positions the label that names it |
| Disabled | Both | `[disabled]` forwards straight to the internal `<ino-label disabled>` (dims per `--ino-color-label-disabled`) **and** sets a `.ino-float-label--disabled` host class the wrapper's own SCSS uses to keep the label's opacity in visual step; the projected control's own disabled styling is the caller's responsibility, unchanged |
| Readonly / Invalid | Forwarded to the internal `<ino-label>` | `<ino-float-label readonly invalid>` forwards 1:1 to `<ino-label>`'s own `readonly`/`invalid` inputs — the same values that component already exposes, not a duplicated state machine |

No CSS on this component ever reads the projected control's `:disabled`/`:read-only`/`aria-invalid`
directly (§1) — every state input is explicit, matching `ino-input`'s own convention.

---

## 3. Variants built (DoD row 6)

| Variant | Behaviour |
|---|---|
| `over` (default) | Rest: label overlaps the control like a placeholder, body-sized, vertically centred. Floated: label moves fully above the control's top edge. |
| `in` | Control permanently reserves top space (`Renderer2`-applied `padding-block-start`/`min-block-size`, §1); rest label sits low-and-centred inside that taller box, floated label docks to the reserved top strip. |
| `on` | Same docking as `in`, plus a background cutout (`--ino-float-label-on-bg`, defaults to `--ino-color-surface`) behind the floated label so it reads as sitting on the control's border line rather than inside its fill. |

No PrimeNG `FloatLabel` variant is omitted — the benchmark ships exactly these three.

**`on` caveat:** the cutout assumes the wrapper sits directly on the app's base surface
(`--ino-color-surface`). A field rendered on a raised surface (a card, a modal) should override
`--ino-float-label-on-bg: var(--ino-color-surface-raised)` (or whichever role matches its actual
background) on the `<ino-float-label>` element itself, or the cutout patch will visibly mismatch the
surface behind it. This is a per-instance override of an existing role, not a new token.

---

## 4. RTL (DoD row 8)

Logical properties only: `inset-inline-start` for the label's horizontal position,
`padding-block-start`/`min-block-size` (set via `Renderer2`, §1) for the docked variants' reserved
space, `padding-inline` for the `on` cutout. `top`/`translateY` (block-axis vertical position) has
no logical-property distinction — RTL never mirrors the block axis, only inline. Verified with
`dir="rtl"` in the preview.

---

## 5. Touch targets (DoD row 8)

The label itself draws no target and is `pointer-events: none` (it sits absolutely positioned over
the control; without that it would steal clicks meant for the control beneath it). Clicking/tapping
anywhere the label used to intercept now reaches the control directly, and the control owns its own
target-size contract. This wrapper adds no interactive surface of its own — same non-interactive
posture `<ino-label>`'s own SPEC.md §1 documents.

---

## 6. Mobile parity (DoD row 9) — all three tracks ship

Per the plan (rev 9 §2 table, T-18: `M = 3`) and the issue text ("Mobile: All three tracks").

- **Capacitor** — not a separate port; the same Angular component and CSS render inside the
  Capacitor WebView (plan rev 9 §5, "Capacitor is not a port"). The 44px-target check is N/A here
  for the same reason as §5: the label draws no target of its own.
- **React Native** — `mobile/react-native/src/components/InoFloatLabel.tsx`. A **real, stateful**
  re-authoring, not a CSS translation (plan rev 9 §5, "React Native and Flutter are real ports"):
  RN has no `:focus`/`:placeholder-shown` pseudo-classes, so the caller passes its own field's
  `value`/`focused` state as props and the component drives an `Animated.Value` (top + font-size
  interpolation, `motion.durationFast`/`easingStandard`) off those two inputs — the same
  focus/value-driven shape web now uses (§1), just expressed as props instead of a `querySelector`.
  Colour roles: `onSurfaceMuted`, `onSurfaceSubtle`, `dangerTextSafe`, `surface` (the `on` variant's
  cutout).
- **Flutter** — `mobile/flutter/lib/widgets/ino_float_label.dart`. Same real-port shape: the caller
  supplies its `FocusNode`/`TextEditingController` (or a `hasValue` flag for a non-text control),
  and an internal `StatefulWidget` listens to both to drive an `AnimatedPositioned` +
  `AnimatedDefaultTextStyle` pair (`InoMotion.fast`/`easingStandard`). Same four colour roles as RN.

Both mobile ports render their own label `Text`/`Text.rich` rather than delegating to
`InoLabel`/`ino_label.dart` (unlike web's internal composition, §1) — see the registry divergence
in §7 for why that is a declared difference, not drift.

---

## 7. `check-theme-parity.mjs` — one line appended (DoD row 11)

Unlike `label/SPEC.md` §7 and `tag/SPEC.md` §8 (written before the component-level registry
existed), `check-theme-parity.mjs` now has a live `COMPONENT_REGISTRY` (added under INO-131, S-9 /
INO-171). This issue appends one alphabetically-inserted entry — `floatlabel`, before `focus-trap` —
declaring both mobile ports and the roles each one reads. Web's own stylesheet only references
`var(--ino-color-surface)` directly (the `on` cutout); the three label colour roles
(`onSurfaceMuted`/`onSurfaceSubtle`/`dangerTextSafe`) are declared as divergences on both mobile
platforms, because web delegates that colouring to the internal `<ino-label>` component's own
stylesheet (§1) while both mobile ports render their label text directly and so read those roles
inline.

- `node scripts/check-theme-parity.mjs` passes with the new entry.

---

## 8. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (one entry appended, §7) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes — 0 violations, no `::ng-deep` (§1) |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/font-size/duration | none — every value resolves through a token; the two component-scoped custom properties (`--ino-float-label-height`, `--ino-float-label-on-bg`) are aliases of existing tokens, not new values |
| `[data-theme]` branch in the component | none |
