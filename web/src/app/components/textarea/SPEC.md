# `<ino-textarea>` — component spec

**Issue:** INO-147 (INO-31 T-7, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `Textarea` — `specs/primeng/llms-22.1.1.txt` line 119, route
`https://primeng.dev/textarea`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap analysis:** `docs/brand/16-design-system-parity-vs-echeque-reference.md` line 176 (Textarea,
listed as a Tier-1 KYB-critical gap, previously unbuilt).
**Depended on:** W0-2 (INO-124, control-size scale), W0-3 (form-label tokens, consumed via
`<ino-label>`) — both `done` before this issue started.
**Sibling contract:** `<ino-input>` (`web/src/app/components/input/SPEC.md`, INO-157) — this
component reuses its label/hint/error/size/variant/disabled/readonly/loading contract wherever
a multi-line control doesn't need to diverge from it. Divergences are called out below.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Auto-resize is computed from `scrollHeight` in JS, not CSS-only (DoD scope: "auto-resize")

A pure-CSS auto-growing textarea (the `grid` + mirrored-`::after` trick) requires duplicating the
control's full font/padding/border box onto a sibling pseudo-element, which would need to track
every `size`/`variant` token change twice. Instead `ino-textarea.component.ts`'s private `resize()`
reads `scrollHeight` off the real control after each `input` event (and once on `ngAfterViewInit`,
for initial content), and:

1. Resets `element.style.height = 'auto'` first, so `scrollHeight` reflects the content's *natural*
   height rather than the previously-set one — otherwise deleting a line would never shrink the box
   back down (a well-known bug in naive `scrollHeight`-only implementations).
2. Clamps the result between `minRows` and `maxRows`, converted to pixels via the control's own
   `getComputedStyle(...).lineHeight` rather than a hardcoded pixel-per-row constant, so the bound
   tracks `size`/font changes at runtime instead of drifting from them.
3. Sets `overflow-y` to `auto` only once content exceeds `maxRows`, so the control shows its own
   scrollbar past the cap instead of growing unbounded.

The `style.height`/`overflowY` writes are the one part of this component that isn't a token lookup
— DoD row 1 ("zero hardcoded values") is about *design* values (colour/space/radius/duration/
shadow/font-size), not runtime-computed layout math; the same class of exception `ino-focus-trap`
and `ino-modal` already make for JS-computed inline styles. No colour, spacing, radius, duration, or
font-size is hardcoded anywhere in this component.

**Fixed-rows mode** (`autoResize="false"`, the default) skips all of the above: the control is a
plain `<textarea rows="n">`, user-resizable via the browser's native drag handle (`resize:
vertical`), exactly like an unenhanced `<textarea>`. `autoResize="true"` switches the CSS to
`resize: none` (§6) so the user's manual drag handle doesn't fight the JS-driven height on the next
keystroke.

---

## 2. Character counter (DoD scope: "character counter")

`maxLength` sets the native `maxlength` attribute (browser-enforced input clipping) and doubles as
the counter's denominator; `showCount` is a separate boolean so a caller can set a `maxLength` for
enforcement alone without opting into the visible counter (or vice versa is a no-op — the counter
never renders without `maxLength`, since "12/null" isn't meaningful). The counter is wired into
`aria-describedby` alongside hint/error (`describedBy` getter) so assistive tech announces the
remaining-length context on focus, not just as a visual `n/m` string; `aria-live="polite"` on the
counter announces updates as the user types without interrupting mid-keystroke like `assertive`
would. Colour switches to `--ino-color-danger` once `value.length >= maxLength` — the same role
the error/invalid state already uses, so a caller doesn't need to also set `error` just to flag
"at the limit."

---

## 3. Size API — two aliases, not three (DoD row 3)

`ino-input` re-points three control-size aliases (`--ino-control-height` included, since a
single-line control's box height *is* the control-height rung). `ino-textarea` re-points only
`--ino-control-padding-inline` and `--ino-control-font-size`: a multi-line control's height comes
from `rows` (fixed mode) or the JS auto-resize clamp (§1), never from `--ino-control-height` — that
alias would be actively wrong here (it's a single-line control's box height, and PrimeNG's own
Textarea equivalent has no height rung), so it's deliberately left unread rather than force-fit.
Density (DoD row 4) still applies via the same `--ino-row-min-height` fallback idiom `ino-input`
uses, as a *floor*, not the mode that decides the box's resting height.

---

## 4. Variants built (DoD row 6)

| Named in the issue | Shipped | Surface |
|---|---|---|
| Auto-resize | ✅ | `autoResize="true"`, see §1 |
| Fixed rows | ✅ (default) | `autoResize="false"` (default), native `rows` |
| Character counter | ✅ | `maxLength` + `showCount`, see §2 |
| Filled variant | ✅ | `variant="filled"` — same Material-style filled-field treatment as `ino-input`'s, see §5 |
| Standard state set | ✅ | see §7 |

---

## 5. Filled variant — token choices (DoD row 1, "zero hardcoded values")

Identical token progression to `ino-input`'s filled variant (`surface-raised` fill,
`border-block-end` using the `border`/`on-surface-muted`/`accent` progression, flattened bottom
corners via logical properties) — no new decision needed, no new token required (`tokens.css` is
frozen after Wave 0).

---

## 6. Auto-resize disables the native resize handle

`:host(.ino-textarea--auto-resize) .ino-field__control { resize: none; }` — when JS owns the
height, a user-dragged resize would be silently overwritten on the next keystroke, which reads as
broken rather than intentional. Fixed-rows mode (the default) keeps `resize: vertical`, matching an
unenhanced `<textarea>`'s native affordance and PrimeNG's own default.

---

## 7. Eight states (DoD row 5)

Same mechanism as `ino-input` end-to-end (`:hover:not(:disabled):not(:read-only)`,
`:active:not(:disabled):not(:read-only)`, `:focus-visible` via `--ino-focus-ring`, `:disabled`,
`:read-only:not(:disabled)`, `error` input, `loading` input) — see `web/src/app/components/input/SPEC.md` §2/§3/§7 for
the full readonly-vs-disabled and loading rationale, which applies unchanged here. The one visual
divergence: `ino-input`'s loading spinner is vertically centered (single-line box, one center
line); `ino-textarea`'s spinner is anchored `top`/`inset-inline-end` (multi-line box has no single
center line to center against) and sized/positioned identically otherwise.

---

## 8. Mobile parity (DoD row 9)

`ino-textarea` is a Tier-1 form control that ports to all three tracks per
`docs/brand/17-phase-2-implementation-program.md` §5:

- **Capacitor** — not a real port; renders the same Angular component + CSS. Passes this
  component's own web gates plus the 44px-target check, same as every other Capacitor-only-gate
  component.
- **React Native** — `mobile/react-native/src/components/InoTextarea.tsx`. Ports label/hint/error,
  `size`, `variant` (outline/filled), `disabled`/`readOnly`/`loading` states, fixed `numberOfLines`
  sizing (RN's `TextInput` has no `scrollHeight`-based auto-resize primitive without an extra
  native module — `onContentSizeChange` is used instead, RN's own built-in equivalent, to approximate
  `autoResize`), and the character counter.
- **Flutter** — `mobile/flutter/lib/widgets/ino_textarea.dart`. Same scope as the RN port; Flutter's
  `TextField` grows to fit content natively when `maxLines: null` is set, so `autoResize` maps
  directly onto that instead of needing a scroll-height measurement workaround.

---

## 9. Merge hygiene (DoD row 11)

Touches only `web/src/app/components/textarea/**`, `mobile/react-native/src/components/InoTextarea.tsx`,
`mobile/flutter/lib/widgets/ino_textarea.dart`, this issue's docs page + preview, and one appended
`{ name: 'textarea', ... }` entry to `scripts/check-theme-parity.mjs`'s component registry. No
change to `web/src/tokens.css` (frozen after Wave 0 — every value this component needed already
existed) and no change to any other component's files, including the `/docs/design-system` showcase
page (`docs-design-system.component.ts`) — that page is INO-83's own scoped "core interactive
component set" demo and, per its doc comment, deliberately does not enumerate every Tier-1
component (e.g. it has no `ino-tag`/`ino-skeleton`/`ino-progress-spinner` either); the canonical
per-component doc is `docs/brand/06-angular-components/textarea.md` + its preview instead.
