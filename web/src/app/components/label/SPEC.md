# `<ino-label>` — component spec

**Issue:** INO-140 (INO-31 T-19, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `Label` — `specs/primeng/llms-22.1.1.txt` line 81, route
`https://primeng.dev/label`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it. PrimeNG's own `Label` is a minimal `<label for>` wrapper with no size/variant surface
of its own — this component's scope (sizes, required indicator, for/id association) comes from the
issue text and the gap analysis, not from a wider PrimeNG API.
**Gap analysis:** `docs/brand/16-design-system-parity-vs-echeque-reference.md` §9 ("Matrix D — Label
placement and label sizes"), register item N-4.
**Depends on:** W0-3 (INO-125, form-label token set: `label-lg`/`label`/`label-sm`/`hint`/`caption`
+ `--ino-color-label*` roles) — `done`, merged as PR #1 before this issue started.
**Blocks:** T-8 (`ino-datepicker`), T-20 (`ino-iftalabel`).

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Non-interactive: 4 of 8 states carried, 4 deliberately N/A (DoD row 5)

`<ino-label>` renders a real `<label for>` and nothing else. A `<label>` is never itself in the tab
order (no `tabindex`) — clicking it natively moves focus to (checkbox/radio: toggles) the control
named by `for`, which is that control's own already-audited focus/hover/active/loading contract
(e.g. `ino-input`'s `:focus-visible` ring, `SPEC.md` in that directory). Re-deriving any of that
here would be a second, competing state machine for the same interaction. Same reasoning `ino-tag`'s
SPEC.md §1 already established for a different non-interactive leaf.

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Size-tiered type + `--ino-color-label` (§2) |
| Disabled | ✅ | `--ino-color-label-disabled` — WCAG 1.4.3 exempts disabled content, the same carve-out the role's own alias (`--ino-color-on-surface-subtle`) already carries |
| Readonly | ✅ | `--ino-color-label-muted` — `form-label-tokens.md` §4 names this role explicitly for "labels on a readonly field" |
| Invalid | ✅ | `--ino-color-label-invalid` — the field this label names failed its own validation |
| Hover | N/A — not carried | Nothing to reveal: no secondary affordance, no truncation. The pointer cursor and any hover feedback belong to the *control* being pointed at, not the label naming it |
| Active/pressed | N/A — not carried | Follows from the above — a label click activates the control, not itself; the control already owns its own `:active` state |
| Focus-visible | N/A — not carried | The host draws no `tabindex`; a `<label for>` is never the focus target — clicking/tapping it moves focus to the control, which draws its own audited ring |
| Loading/busy | N/A — not carried | A label never itself enters an async state. If the control it names is loading, that control sets its own `aria-busy` (e.g. `ino-input`'s `loading` input) — duplicating it here would be a second, potentially stale busy flag for the same field |

---

## 2. Size API: the three label tiers, not the control-size scale (DoD row 3)

`size="sm" | "default" | "lg"` maps 1:1 onto `InoControlSize` (`web/src/app/components/control-size.ts`), but reads the
**label** type role fields (`--ino-type-label-{lg,,sm}-{size,line,weight,tracking}`, tokens.css
§4b) — not the `--ino-control-*` aliases every interactive control's `size` input re-points.
`form-label-tokens.md` §2 designed the two scales to line up 1:1 for exactly this handoff: a form
control passes its own `size` straight through to the `<ino-label>` it renders next to, with no
translation table needed.

The three tiers are hand-composed from the individual weight/size/line/tracking custom properties
rather than the `--ino-type-label*` composite `font` shorthand tokens.css §4b also defines, because
the CSS `font` shorthand has no `letter-spacing` slot — the same reason `ino-tag`, `ino-hero`, and
`ino-footer` all hand-compose their eyebrow role instead of using a shorthand.

---

## 3. Required marker is decorative only (DoD row 8)

The `*` rendered by `required` is `aria-hidden="true"` — colour alone never carries meaning (WCAG
1.4.1), so it is never the only signal. Per `form-label-tokens.md` §6, the control this label names
must independently expose `aria-required="true"` and/or the word "required" in its own accessible
name; `<ino-label>` cannot set that attribute itself because it has no reference to the control's
DOM node beyond the `for` string. This mirrors the existing (pre-extraction) `ino-input`/`ino-select`
markup, which already pairs a visible `*` with the control's own `[required]` attribute — see
`web/src/app/components/input/ino-input.component.html`.

---

## 4. Retrofit onto `ino-input`/`ino-select` — done under INO-243

`ino-input` and `ino-select` used to hand-roll their own `<label for>` block inline
(`.ino-field__label` + `.ino-field__required`, on `--ino-type-body-sm-size`). That was scoped out of
this issue by DoD row 11 merge hygiene (a component issue is confined to
`web/src/app/components/<name>/**`, and both controls could be in flight on other branches) and
tracked informally in this paragraph rather than as its own issue — flagged during CTO review of
PR #25 and formalized as [INO-243](/INO/issues/INO-243). INO-243 landed the retrofit once T-8
(INO-154) and INO-142 (T-20) were clear: both controls now render `<ino-label>` instead of the
inline markup, and the dead `.ino-field__label`/`.ino-field__required` rules are removed from both
SCSS files. See `input/SPEC.md` §10 for the `ino-input` side of that change; `ino-select` predates
its own uplift issue (no `size`/`invalid`/`readonly` inputs exist there yet) so it forwards only
`required`, `disabled`, and `invalid` (derived from `error`) — `size`/`readonly` stay a gap for a
future `ino-select` uplift issue, consistent with the parity doc's existing "native `<select>`, not
yet uplifted" note.

---

## 5. RTL (DoD row 8)

Logical properties only: `gap` (already logical), no `margin-left`/`margin-right`. The `for`
attribute and content projection carry no directional assumption; `dir="rtl"` on an ancestor is
sufficient, verified in the preview.

---

## 6. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue text ("Mobile: All three tracks").

- **Capacitor** — not a separate port; the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5 ("Capacitor is not a port"). No touch-target check applies —
  the label itself is inline text (§1), not a control.
- **React Native** — `mobile/react-native/src/components/InoLabel.tsx`. Uses `type.label`/
  `type.labelSm`/`type.labelLg` (`mobile/react-native/src/theme/tokens.ts`) — the fluid-density form-label type scale W0-3
  already added and left unconsumed pending this issue — plus the colour aliases
  `form-label-tokens.md` §7 documents (`onSurface`/`onSurfaceMuted`/`onSurfaceSubtle`/
  `dangerTextSafe`; the RN palette has no dedicated `label*` colour fields, by design, since those
  are pure web-side aliases of roles the mobile ports already mirror).
- **Flutter** — `mobile/flutter/lib/widgets/ino_label.dart`. `tokens.dart` has no form-label type
  scale yet (only RN's `tokens.ts` got one in W0-3); adding one there would be a token-registry
  change outside this issue's merge-hygiene rule (row 11), the same reasoning `ino-tag`'s SPEC.md §8
  gives for not inventing a `check-theme-parity.mjs` registry. The Flutter port instead hand-composes
  the same fluid-tier values RN's `type.label`/`labelSm`/`labelLg` already carry (13.5→14.5px fluid
  per `form-label-tokens.md` §5, i.e. the values RN literally exports), with a comment pointing back
  here — the same hand-specified-literal idiom `ino_tag.dart`/`InoTag.tsx` already use for their
  eyebrow-role font. Colour aliases are `onSurface`/`onSurfaceMuted`/`onSurfaceSubtle`/
  `dangerTextSafe`, matching RN.

---

## 7. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `tag/SPEC.md` §8 and `virtual-scroller/SPEC.md` §6, re-verified for this issue: DoD
row 11 describes "one appended line in the `check-theme-parity.mjs` component registry", but no such
registry exists in the file (confirmed by reading it in full). All five label-related colour roles
and all five size-tier tokens this component consumes were already asserted by W0-3's addition to
that script (`check-theme-parity.mjs`'s "Wave 0 / INO-125 — form-label colour roles" block); this
issue introduces no new token, so nothing new needs auditing there.

- **Nothing appended.** `node scripts/check-theme-parity.mjs` passes unchanged.

---

## 8. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/font-size/duration | none — every value resolves through a token |
| `[data-theme]` branch in the component | none |
