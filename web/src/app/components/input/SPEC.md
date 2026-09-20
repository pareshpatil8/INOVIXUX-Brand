# `<ino-input>` — component spec

**Issue:** INO-157 (INO-31 U-2, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `InputText` — `specs/primeng/llms-22.1.1.txt` line 78, route
`https://primeng.dev/inputtext`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap analysis:** `docs/brand/16-design-system-parity-vs-echeque-reference.md` §7 "InputText —
`<ino-input>`".
**Depended on:** W0-2 (INO-124, control-size scale), T-16 (INO-138, `ino-icon-field`), T-17
(INO-139, `ino-input-group`) — all `done` before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Icon slots are a wrapper, not an `@Input() icon` (DoD row 6)

The gap analysis flags two missing variants: an icon slot (left/right/dual) and a prefix/suffix
addon. Both are **rebaselined onto separate components** rather than added to `ino-input` itself:

| Gap-analysis variant | Sanctioned mechanism |
|---|---|
| Icon slot — left / right / dual | `<ino-icon-field>` (T-16, INO-138) — wraps the control, projects `[iconLeading]`/`[iconTrailing]` |
| Prefix / suffix addon | `<ino-input-group>` (T-17, INO-139) — wraps the control, projects addon content |

```html
<ino-icon-field>
  <svg iconLeading>…</svg>
  <ino-input label="Email" type="email" />
</ino-icon-field>
```

Baking an `@Input() icon` onto `ino-input` would mean re-solving icon padding/positioning inside
this component's own box, then re-solving it again inside every other Tier-1 form control
(`ino-select`, a future `ino-textarea`, …) that also wants one. `ino-icon-field` exists precisely
so that audit happens once. `ino-input` therefore ships **zero** icon-related markup, CSS, or
`@Input`s — it stays a plain, fully self-styled leaf control that any wrapper can compose around
without reaching into its internals (`ino-icon-field`'s own doc comment explains why it lays out
in a 3-column CSS Grid rather than overlapping icons inside the control's box, for exactly this
reason).

**Fluid (100% width toggle)** is also called out in the gap analysis as a variant gap, and is
**out of scope for this issue** — the rebaselined target is a separate `Fluid` layout component
(not yet built). `ino-input` keeps its existing always-100%-width behavior unchanged.

---

## 2. `readonly` is the native attribute, never `disabled` (DoD row 5)

`readonly` sets the native `<input readonly>` attribute. This is deliberately **not** modeled as
`disabled`:

| | `disabled` | `readonly` |
|---|---|---|
| Focusable | ❌ | ✅ |
| Value announced/selectable/copyable by AT | ❌ (removed from focus order) | ✅ |
| Submitted with a form | ❌ | ✅ |
| Visual treatment | 0.5 opacity, `not-allowed` cursor | full-opacity, `surface-raised` fill, `default` cursor |

Styling is done with the CSS `:read-only` pseudo-class rather than a host class, scoped off
`:disabled` (`:read-only:not(:disabled)`) because the CSS spec has `:disabled` also match
`:read-only` — without the exclusion, disabled fields would pick up the readonly fill too and the
two states would visually collapse into one.

---

## 3. `loading` reuses `:read-only` for interaction-blocking, plus a spinner (DoD row 5)

`loading` mirrors `ino-button`'s loading contract (inert spinner + `aria-busy`) rather than
inventing a new interaction-blocking mechanism: the template sets the same native `readonly`
attribute loading uses for state 6 above (`[readOnly]="readonly || loading"`), so a loading field
gets the same "focusable, value visible, not editable" behavior for free, plus a spinner absolutely
positioned at the trailing edge (`inset-inline-end`, RTL-safe) with `padding-inline-end` widened so
it never overlaps typed text. `aria-busy` is set on the host element (`ino-input`, not the native
`<input>`, which has no ARIA-valid busy state of its own) so AT announces the busy region.

---

## 4. Size API (DoD row 3)

`size="sm" | "default" | "lg"` reads three of the six Wave 0 control-size aliases —
`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size` — exactly the
subset a single-line text control needs (no icon/gap aliases, since this component ships no icon
of its own per §1). Same re-pointing pattern `ino-tag` established:
`:host([data-size='sm'|'lg'])` overrides the three aliases; `default` is the ambient tokens.css
value, so no override block is needed for it.

---

## 5. Variants built (DoD row 6)

| Named in the gap analysis / issue | Shipped | Surface |
|---|---|---|
| Basic unadorned text box | ✅ | unchanged, `variant="outline"` (default) |
| Filled state | ✅ | `variant="filled"` — Material-style filled field, see §6 |
| Icon slot (left/right/dual) | ✅ (as a wrapper) | `<ino-icon-field>`, see §1 |
| Prefix/suffix addon | ✅ (as a wrapper) | `<ino-input-group>`, see §1 |
| Fluid (100% width toggle) | ❌ deliberately deferred | separate `Fluid` component, not yet built |
| Types beyond text | ✅ (pre-existing) | `text\|email\|password\|number\|search\|tel\|url` |

---

## 6. Filled variant — token choices (DoD row 1, "zero hardcoded values")

`variant="filled"` reuses existing roles only (`tokens.css` is frozen after Wave 0): `surface-raised`
for the fill (the same role `readonly` already uses on the outline variant, reused here as the
resting fill instead), a `border-block-end` using the same `border` / `on-surface-muted` / `accent`
progression the outline variant already uses for its all-round border on default/hover/focus, and
flattened bottom corners (`border-end-start-radius: 0` / `border-end-end-radius: 0`, logical
properties so this doesn't need a `dir="rtl"` branch) to read as an underlined field rather than a
boxed one. No new token was needed.

---

## 7. Eight states (DoD row 5)

| State | Carried? | Mechanism |
|---|---|---|
| Default | ✅ | unchanged |
| Hover | ✅ | `:hover:not(:disabled):not(:read-only)` |
| Active/pressed | ✅ | `:active:not(:disabled):not(:read-only)`, `--ino-color-accent-active` |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset` (never a hand-rolled outline) |
| Disabled | ✅ | unchanged, `:disabled` |
| Readonly | ✅ new | native `readonly`, `:read-only:not(:disabled)` — see §2 |
| Invalid | ✅ (pre-existing) | `error` input, `aria-invalid`, `aria-describedby` |
| Loading/busy | ✅ new | spinner + `aria-busy` + native `readonly` — see §3 |

---

## 8. Mobile parity (DoD row 9)

`ino-input` is a Tier-1 form control that ports to all three tracks per
`docs/brand/17-phase-2-implementation-program.md` §5:

- **Capacitor** — not a real port; renders the same Angular component + CSS. Passes this
  component's own web gates (§2 rows 1–8) plus the 44px-target check, same as every other
  Capacitor-only-gate component.
- **React Native** — `mobile/react-native/src/components/InoInput.tsx`. Ports label/hint/error,
  `size`, `variant` (outline/filled), `disabled`/`readOnly`/`loading` states, using
  `mobile/react-native/src/theme/tokens.ts`'s `control` scale and palette roles. No icon-slot
  prop, matching §1 — RN composition for icon/addon wrappers is a separate future issue
  (T-16/T-17 are marked Capacitor-only in the porting rule table, so RN has no equivalent
  wrapper to compose with yet).
- **Flutter** — `mobile/flutter/lib/widgets/ino_input.dart`. Same scope as the RN port, using
  `mobile/flutter/lib/theme/tokens.dart`'s `InoControlSize` scale and `InoPalette`.

---

## 9. Merge hygiene (DoD row 11)

Touches only `web/src/app/components/input/**`, `mobile/react-native/src/components/InoInput.tsx`,
`mobile/flutter/lib/widgets/ino_input.dart`, this issue's docs page + preview, and one appended
`{ key: 'input.md', title: '<ino-input>' }` line to `docs/brand/00-INDEX.md`'s Form group table if
that file is not owned by the integrating agent. No change to `web/src/tokens.css` (frozen after
Wave 0 — every value this uplift needed already existed) and no change to
`scripts/check-theme-parity.mjs` (that script audits only tokens, not the per-component registry
described in the issue template — confirmed by reading it; every previously merged Tier-1
uplift in this repo, e.g. `ino-tag` T-12, likewise left it untouched).
