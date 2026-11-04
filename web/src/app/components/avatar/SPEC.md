# `<ino-avatar>` / `<ino-avatar-group>` — component spec

**Issue:** INO-458 (INO-31 Phase B4)
**Parity benchmark:** PrimeNG 22.1.1 `Avatar` + `AvatarGroup` (`specs/primeng/llms-22.1.1.txt`
line 32, route `https://primeng.dev/avatar`). PrimeNG is a benchmark, **not a runtime
dependency**; nothing here installs it.
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B4
row `ino-avatar (+group)` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
[INO-377](/INO/issues/INO-377). Program: INO-31.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Content-form priority: image > initials > icon > built-in fallback glyph

Doc 26 §5's Variants/Structure row lists three forms — "image/initials/icon" — as alternatives a
caller picks between, not a layered fallback chain by itself. The only *named* fallback
requirement is the States row's "image-error fallback": when `image` fails to load, something
sane must still render.

Resolved priority, implemented in `ino-avatar.component.ts`'s `showImage`/`showInitials` getters
and the template's `*ngIf` chain:

1. `image` — until its `(error)` event fires (`imageFailed`, reset on every `image` input change
   via `ngOnChanges`, so swapping to a new URL always gets a fresh attempt).
2. `initials` — plain caller-supplied text (e.g. `'JD'`), never derived automatically from `alt`.
   Deriving initials from a free-text name is a locale-sensitive operation (which word counts as
   "first", how many letters, right-to-left name order) that belongs to the caller's own
   data layer, not this component — the same reasoning `ino-tag` declined to invent severity
   labels from raw color.
3. Projected `[icon]` content — same `[icon]` slot idiom `ino-tag` already uses.
4. A built-in generic-person glyph (Lucide's `user` — two paths, 24px grid, 2px stroke, round
   cap/join, per `docs/brand/14-icon-system.md` §1/§4 "one glyph per concept") — so an avatar with
   none of the above (or an `image` that failed with no `initials` to fall back to) never renders
   an empty box. Detected with pure CSS (`:empty` on the icon wrapper plus a general-sibling
   selector on the fallback), not a `ContentChild` query — no JS needed to know whether the
   caller projected anything, and it's the same technique `ino-tag__icon:empty` already uses, one
   step further.

---

## 2. Size API: a dedicated 5-step scale, not the shared `InoControlSize`

Doc 26 §5 names "xs–xl" explicitly — five steps — where the Wave 0 control-size scale
(`InoControlSize`, `control-size.ts`) only has three (`sm`/`default`/`lg`). Reusing it and
bolting on two more names would fork the type from every other component that imports it; adding
`xs`/`xl` to the shared union would force every *other* consumer (buttons, inputs, selects — none
of which have a 5-step scale in their own spec row) to handle two new cases they don't need.

`InoAvatarSize` is therefore its own closed union, local to this component, resolved via its own
`inline-size`/`block-size`/`font-size` table in SCSS: `xs` 24px, `sm` 32px, `default` 40px, `lg`
48px, `xl` 64px. This is a legal, auditable choice under `check-ds-adherence.mjs`:
`inline-size`/`block-size` are not governed by the space-scale lint (only
`padding`/`margin`/`gap`/`inset` are), and an avatar's diameter is decorative-media sizing, not a
control-height decision — the same "this isn't a control" reasoning `ino-tag`'s SPEC.md §3
already used to decline `--ino-control-height`.

`font-size` *is* governed by the type-scale lint, so each tier's initials font-size reads an
existing `--ino-type-*-size` token rather than a literal: `xs` → `--ino-type-caption-size`, `sm` →
`--ino-type-label-sm-size`, `default` → `--ino-type-body-size`, `lg` → `--ino-type-h3-size`, `xl`
→ `--ino-type-body-lg-size`. No new token was added — tokens.css is frozen after Wave 0, and the
existing scale already has five values that land in a sane ascending order for this purpose.

No density (`dense`/`fluid`) split — an avatar's size is a caller-chosen content decision
(`xs` in a comment thread, `xl` in a profile header), not a row-height one; it does not read
`--ino-row-min-height` the way `ino-tag` optionally does, because nothing in doc 26 §5's row asks
for an avatar to fill a table row's height.

---

## 3. Non-interactive: states carried vs. N/A (DoD row 5)

Presentational, matching the PrimeNG `Avatar` benchmark (no `onClick`) and the same precedent
`ino-tag`/`ino-meter-group` already recorded:

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Whichever content form resolves (§1) |
| Image-error fallback | ✅ | Doc 26 §5's own named state — §1's priority chain |
| Disabled | N/A | Nothing to disable — not a control, no interaction to suppress |
| Loading/busy | N/A | No async data-fetch lifecycle of its own; a caller loading a user record renders `ino-skeleton` (`shape="circle"`) until it has data, then mounts `<ino-avatar>` — a two-component sequence, not a `loading` flag on this one (`ino-skeleton`'s own doc already names avatar placeholders as a supported `shape="circle"` use) |
| Invalid | N/A | Not a form control — nothing to validate |
| Hover / active / focus-visible | N/A | The host is never in the tab order (no `tabindex`); nothing to reveal on hover, nothing to press |
| Readonly | N/A | Never accepts input, so the distinction doesn't apply — same reasoning `ino-tag`'s SPEC.md §1 |

---

## 4. ARIA contract — decorative vs. informative (DoD row 8)

Doc 26 §5's a11y row asks for "decorative vs informative rules documented" explicitly. The rule:

- **`decorative=true`** — `aria-hidden="true"` on the host, full stop, regardless of which
  content form is showing. For an avatar sitting beside text that already announces the same
  information (e.g. a table row whose name column is read right next to it), so the avatar
  doesn't double-announce.
- **`decorative=false` (default) + `image` form** — the native `<img alt>` carries the accessible
  name (`alt` input, empty string renders `alt=""` only when `decorative` is also true — handled
  by the same ternary). No `role`/`aria-label` is added to the host; a redundant `role="img"`
  around a real `<img>` is a duplicate node in the accessibility tree, not an improvement.
- **`decorative=false` + `initials`/icon form** — these forms have no native semantics of their
  own (a `<span>` of text, or an SVG), so the host supplies `role="img"` + `aria-label`, resolved
  from `ariaLabel` (explicit override) → `alt` (reused) → a generic `'Avatar'` fallback. The
  generic fallback is a deliberate choice over leaving the host unlabeled: an unlabeled `role="img"`
  node is worse than a generic one (silently invisible to AT vs. announced-but-vague), and a
  caller that cares supplies `ariaLabel` (e.g. `"Jane Doe"`) to replace it.
- The visible initials text and the fallback/projected icon are themselves `aria-hidden="true"` in
  every case (own `<span>`/wrapper), so the host's single `aria-label` is the only thing a screen
  reader announces — never a double announcement of "Avatar, J D".

**`<ino-avatar-group>`'s own contract** — `role="group"` with an `aria-label` that defaults to an
auto-generated count summary (`"5 avatars"`), or a caller override. Per-item avatars inside the
group are individually `decorative` **unless the caller supplied that item's `alt`** — so a group
of named people still announces each name on request, while an unnamed decorative cluster (the
common "N team members" summary chip) relies on the group's own one-line count instead of forcing
five redundant "Avatar" announcements. The trailing surplus avatar (`"+N"`) is never decorative —
it gets its own `ariaLabel` (`"N more"`) since it's new information the count summary alone
doesn't carry (how many are hidden, not just how many exist).

**Contrast** — initials text (`--ino-color-on-surface` on `--ino-color-surface-sunken`) and the
fallback-icon/separator-ring colors (`--ino-color-on-surface-muted`, `--ino-color-surface-raised`)
are existing roles already audited in every theme by `node scripts/check-theme-parity.mjs`.

**Target size** — SC 2.5.8 does not apply; the host is never in the tab order (§3).

---

## 5. `<ino-avatar-group>` — data-driven, not content-projected (DoD row 6)

The group takes `avatars: InoAvatarGroupItem[]` and renders its own `<ino-avatar>` instances
internally — it does **not** accept projected `<ino-avatar>` content. Reasoning: the overlap
(`margin-inline-start`, negative) and separator ring (`border`) need to style each avatar's host
element from the *group's own stylesheet*. Angular's emulated view encapsulation only applies a
component's compiled style attribute to elements its **own template** creates; content projected
in from a *different* component's template keeps that caller's scope, so a CSS selector in
`ino-avatar-group.component.scss` could not reach it without `::ng-deep` — and no escape hatch is
sanctioned (doc 16 §4.3 Layer 4 / N-11, re-confirmed in `ino-input-group`'s own class doc).
Rendering the avatars from the group's own template (as `*ngFor` over `avatars`) sidesteps the
whole problem: these are host elements the group's template creates directly, so plain CSS
reaches them. Same data-driven shape `ino-meter-group` already uses for its segment list.

**Surplus count** — `max` caps how many of `avatars` render; the rest collapse into one trailing
`<ino-avatar initials="+N">` rather than a separate non-avatar badge element, reusing the same
visual language (same size/shape/ring) instead of inventing a second component for one number.

**Deliberate omission:** a group item has no `icon` form — `InoAvatarGroupItem` is
`{ image?, initials?, alt? }` only. A data array has no slot for arbitrary projected markup per
row without `ng-template`/context-binding machinery (`ino-listbox`'s `optionTemplate` is the
precedent for that complexity), and doc 26 §5's row names "group overlap + surplus count" for
people/entity clusters (image/initials), not an icon-mix use case. Add it on a real consumer need.

---

## 6. RTL (DoD row 8)

Logical properties only: `inline-size`/`block-size`, `margin-inline-start`, `border` (not
side-specific). No `left`/`right`/`top`/`bottom`/`width`/`height` anywhere in either stylesheet.

---

## 7. Mobile parity (DoD row 9)

**Port both**, per the issue row.

- **Capacitor**: not a separate port — the same Angular component and CSS render inside the
  Capacitor WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoAvatar.tsx` +
  `InoAvatarGroup.tsx`. Mobile is always fluid (no density split — matches §2's "no density
  split" decision on web, so there is no divergence to reconcile).
- **Flutter**: `mobile/flutter/lib/widgets/ino_avatar.dart` (both widgets in one file — same
  "stacked" organization `ino_dataview.dart` uses for a single ticket's worth of widgets, and the
  two are too small individually to warrant separate files).

---

## 8. `check-theme-parity.mjs` / `check-ds-adherence.mjs` — not modified

No new color/space/radius/duration token was added — every value this component needs
(`--ino-color-surface-sunken`, `--ino-color-on-surface`, `--ino-color-on-surface-muted`,
`--ino-color-surface-raised`, the existing `--ino-type-*-size` tokens, `--ino-space-2/3/4`)
already exists and is already audited across all three web themes and both mobile ports. Nothing
appended to either script's registry/field list.

---

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes — zero violations on `avatar/` or `avatar-group/` |
| `node scripts/check-spec-citations.mjs` | ✅ passes — every citation in this file resolves |
| `node scripts/check-docs-completeness.mjs` | ✅ passes once `docs/brand/06-angular-components/avatar.md` + custom demos land (see avatar.md) |
| Hardcoded colour/space/radius/duration | none — every value resolves through a token |
| `[data-theme]` branch in either component | none |
