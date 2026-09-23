# `<ino-ifta-label>` — component spec

**Issue:** INO-142 (INO-31 T-20, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `IftaLabel` — `specs/primeng/llms-22.1.1.txt` line 68, route
`https://primeng.dev/iftalabel`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Depends on:** W0-3 (INO-125, form-label token set) and T-19 (INO-140, `<ino-label>`) — both
`done`, merged before this issue started.
**Family:** completes the label-placement trio with `<ino-label>` (T-19, the base leaf every
labelled control composes) and `<ino-float-label>` (T-18, the focus/fill-driven floating wrapper).

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Why this needs no `floated` state (contrast `<ino-float-label>`)

PrimeNG ships `IftaLabel` as a single, permanently-docked style: the label always renders small at
the field's top edge — it never rests as placeholder-like overlay text the way `FloatLabel`'s label
does before focus/fill. There is no rest/floated toggle to derive, so this component needs none of
`<ino-float-label>`'s `querySelector` + `focus`/`blur`/`input` `Renderer2` listeners or its
`floated` boolean (see that component's SPEC.md §1 for the full reasoning behind why *it* needs
them). The only DOM work this component does is reserving the docked label's permanent top space on
the projected control — done once in `ngAfterContentInit`, unconditionally, via `Renderer2.setStyle`
on the one native node this component already holds a reference to (not a `::ng-deep` selector
reaching across the `<ng-content>` projection boundary — the same escape-hatch-avoidance
`<ino-float-label>`'s SPEC.md §1 documents, restated here only because the same technique is reused,
not because the same piercing problem arose: no CSS on this component ever needs to react to the
projected control's own pseudo-classes, so there was never a `::ng-deep` temptation to resist).

```html
<ino-ifta-label for="username" label="Username">
  <input id="username" />
</ino-ifta-label>
```

Near-identical shape to `<ino-float-label>`'s own usage — the wrapped control is projected content,
the label is `label`/`for` inputs composing an internal `<ino-label>`, not a second projected child.

---

## 2. State ownership split (DoD row 5)

Same split `<ino-float-label>`'s SPEC.md §2 documents, for the same reason — this is a positioning
wrapper, not a form control:

| State | Owner | Reason |
|---|---|---|
| Default / hover / active / focus-visible / loading | The wrapped control | It renders its own chrome for all of these — this wrapper only positions the label that names it |
| Disabled | Both | `[disabled]` forwards to the internal `<ino-label disabled>` (dims per `--ino-color-label-disabled`) **and** sets a `.ino-ifta-label--disabled` host class the wrapper's own SCSS uses to keep the label's opacity in visual step |
| Readonly / Invalid | Forwarded to the internal `<ino-label>` | `<ino-ifta-label readonly invalid>` forwards 1:1 to `<ino-label>`'s own `readonly`/`invalid` inputs |

---

## 3. Variants (DoD row 6) — none built, none in the benchmark

Unlike `<ino-float-label>` (`over`/`in`/`on`), the PrimeNG `IftaLabel` route ships exactly one
visual style — there is no variant axis to port. This is a deliberate, complete parity match, not a
silently dropped scope: the benchmark itself has nothing further to port.

---

## 4. Motion (DoD row 7) — no enter/exit transition; deliberate, documented

The DoD asks for named enter/exit motion. This component has no enter/exit *state* to animate: the
label is permanently docked from first render (§1) — there is no rest-to-floated transition the way
`<ino-float-label>` has, and the PrimeNG benchmark itself ships zero animation on this route. The one
thing that changes post-mount is the label's own colour when `disabled`/`invalid` toggle, which
already uses `--ino-motion-duration-fast` + `--ino-motion-easing-standard` with a
`prefers-reduced-motion: reduce` branch that collapses it to an instant swap — consistent with
`<ino-input>`'s RN/Flutter ports, which switch `invalid`/`disabled` colour synchronously with no
animation on any platform. Mobile ports (§7) match that same instant-swap convention rather than
introducing an animation web itself doesn't have.

---

## 5. RTL (DoD row 8)

Logical properties only: `inset-inline-start` for the label's horizontal position, `padding-inline`
(inherited from `--ino-ifta-label-padding-inline`) for its inset math, `padding-block-start` (set via
`Renderer2`) for the projected control's reserved space. `top` (block-axis vertical position) has no
logical-property distinction — RTL never mirrors the block axis, only inline. Verified with
`dir="rtl"` in the preview.

Mobile ports (§7) mirror this with their own platform-native logical primitives — RN's `start` style
key and Flutter's `Positioned.directional(start:, textDirection:)` — not the web preview's `dir="rtl"`
check, which only exercises the Angular render path. (An earlier revision of this port hardcoded a
physical `left` offset on both mobile tracks — [INO-279](/INO/issues/INO-279) caught it; fixed.)

---

## 6. Touch targets (DoD row 8)

The label draws no target and is `pointer-events: none` — same non-interactive posture
`<ino-label>`'s and `<ino-float-label>`'s own SPEC.md files document. This wrapper adds no
interactive surface of its own; the projected control owns its own target-size contract unchanged.

---

## 7. Mobile parity (DoD row 9) — all three tracks ship

Per the plan (rev 9 §2 table, T-20) and the issue text ("Mobile: All three tracks").

- **Capacitor** — not a separate port; the same Angular component/CSS render inside the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoIftaLabel.tsx`. A **static** re-authoring
  (no `Animated` — §4): the label renders permanently docked, matching web's permanently-docked
  layout instead of `InoFloatLabel.tsx`'s focus/value-driven `Animated.Value` (pending INO-141).
  Colour roles: `onSurfaceMuted`, `onSurfaceSubtle`, `dangerTextSafe` (no `surface`/cutout role —
  there is no `on`-variant equivalent, §3).
- **Flutter** — `mobile/flutter/lib/widgets/ino_ifta_label.dart`. Same static shape: a stateless
  `Positioned.directional` label, no `AnimatedPositioned`/`AnimatedDefaultTextStyle` (contrast
  `ino_float_label.dart`, pending INO-141). Same three colour roles as RN.

Both mobile ports also accept a `readOnly`/`readonly` prop, matching web's forward to the internal
`<ino-label readonly>` (§2). It carries no distinct colour on either platform: the docked label is
already `onSurfaceMuted` at rest here (unlike `<InoLabel>`'s onSurface -> onSurfaceMuted readonly
step), so the prop exists purely to keep the mobile API surface 1:1 with web's `readonly` input
rather than silently dropping it.

Both mobile ports render their own label `Text` rather than delegating to `InoLabel`/`ino_label.dart`
— the same declared divergence `<ino-float-label>`'s SPEC.md §6 documents for the same reason (no
shared label component exists on those platforms yet).

---

## 8. `check-theme-parity.mjs` — one line appended (DoD row 11)

Alphabetically inserted as `iftalabel`, between `focus-trap` and `input`, declaring both mobile ports
and the three colour roles each one reads, with the RN/Flutter divergence from web's own stylesheet
(web delegates colouring to the internal `<ino-label>` component; both mobile ports render their
label text directly and so read those roles inline) — same divergence shape `floatlabel`'s own
registry entry documents.

- `node scripts/check-theme-parity.mjs` passes with the new entry.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (one entry appended, §8) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes — 0 violations, no `::ng-deep` |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/font-size/duration | none — every value resolves through a token; the one component-scoped custom property (`--ino-ifta-label-height`) is an alias of an existing token, not a new value |
| `[data-theme]` branch in the component | none |
