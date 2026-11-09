# `<ino-avatar>` / `<ino-avatar-group>` — Avatar

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B4 row
> `ino-avatar (+group)` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-458](/INO/issues/INO-458).
> Parity benchmark: PrimeNG 22.1.1 `Avatar` + `AvatarGroup`
> (`specs/primeng/llms-22.1.1.txt` line 32) — PrimeNG is a benchmark, **not a runtime
> dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/avatar/SPEC.md` (covers both components).

A circular or square media placeholder for a person or entity — an image, initials, or icon, with
a built-in fallback chain so it never renders empty. `<ino-avatar-group>` composes a cluster of
them with overlap and an optional "+N" surplus count. Both port to React Native and Flutter.

---

## API — `<ino-avatar>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `image` | `string` | `''` | Image URL; takes priority until it fails to load — see [States](#states) |
| `initials` | `string` | `''` | Explicit initials text, e.g. `'JD'` — never derived automatically from `alt` |
| `alt` | `string` | `''` | Accessible name for the `image` form; fallback name for `initials`/icon forms — see [Accessibility contract](#accessibility-contract) |
| `ariaLabel` | `string` | `''` | Explicit accessible-name override for the `initials`/icon forms |
| `shape` | `'circle' \| 'square'` | `'circle'` | See [Variants / Structure](#variants--structure) |
| `size` | `'xs' \| 'sm' \| 'default' \| 'lg' \| 'xl'` | `'default'` | See [Sizing](#sizing) |
| `decorative` | `boolean` | `false` | `aria-hidden`, no accessible name in any form — see [Accessibility contract](#accessibility-contract) |

No outputs. One content-projection slot: `[icon]` — projected content renders in the icon form;
unprojected, a built-in generic-person glyph fills the gap (see [Variants / Structure](#variants--structure)).

## API — `<ino-avatar-group>`

| Input | Type | Default | Notes |
|---|---|---|---|
| `avatars` | `{ image?, initials?, alt? }[]` | `[]` | Data-driven — see [Variants / Structure](#variants--structure) |
| `max` | `number \| null` | `null` | Caps rendered avatars; the rest collapse into one trailing surplus avatar |
| `shape` | `'circle' \| 'square'` | `'circle'` | Applied to every avatar in the group |
| `size` | `'xs' \| 'sm' \| 'default' \| 'lg' \| 'xl'` | `'default'` | Applied to every avatar in the group |
| `ariaLabel` | `string` | `''` | Overrides the auto-generated `"N avatars"` group label |

No outputs, no content projection — `avatars` is the only way to populate the group. Full
reasoning: `SPEC.md` §5.

---

## Variants / Structure

Three content forms (doc 26 §5 row: "image/initials/icon"), resolved in priority order so
supplying more than one input still yields one sane result:

1. **`image`** — an `<img>`, until it fails to load.
2. **`initials`** — short caller-supplied text, uppercased, centered.
3. **`[icon]`** — projected SVG content (same `[icon]` slot idiom as `ino-tag`).
4. **Built-in fallback glyph** — Lucide's `user` glyph, shown automatically when nothing above
   applies (e.g. no `image`, no `initials`, nothing projected into `[icon]`) so the component
   never renders an empty box.

Two shapes (doc 26 §5 row: "shapes"): `circle` (default, `border-radius: 50%`) and `square`
(`border-radius: var(--ino-radius-md)`).

**`<ino-avatar-group>`** (doc 26 §5 row: "group overlap + surplus count") renders its own
`<ino-avatar>` instances from the `avatars` data array — it does not accept projected
`<ino-avatar>` content, because the overlap/ring styling below needs to reach each avatar's host
element from the group's own stylesheet, which content projection from a different component's
template would block without an unsanctioned `::ng-deep`. Full reasoning: `SPEC.md` §5.

Each avatar beyond the first overlaps the one before it (`margin-inline-start`, negative, scaled
to roughly a quarter of the current `size` tier's diameter) and carries a `border` ring in the
ambient surface color so overlapping circles read as distinct items. When `avatars.length`
exceeds `max`, the remainder collapse into one trailing `<ino-avatar initials="+N">` rather than a
separate badge element — same visual language, one fewer component to invent.

---

## Sizing

Five steps (doc 26 §5 row: "xs–xl") — `xs` 24px, `sm` 32px, `default` 40px, `lg` 48px, `xl` 64px,
each with a matched initials/fallback-icon font-size drawn from the existing type scale. This is
a dedicated scale, not the shared Wave 0 `InoControlSize` (`sm`/`default`/`lg`) — an avatar's size
is a content-density decision (a comment-thread row vs. a profile header), not a control-height
one, and the spec row explicitly names five steps where the shared scale only has three. No
density (`dense`/`fluid`) split. Full reasoning: `SPEC.md` §2.

`<ino-avatar-group>`'s `size` input applies the same five-step scale to every avatar it renders,
plus a matching overlap amount per tier.

---

## Labels

`alt` and `ariaLabel` are the label surface (doc 26 §5 row: "`alt`/`aria-label`") — see
[Accessibility contract](#accessibility-contract) for exactly how each content form resolves its
accessible name. There is no visible text label outside the `initials` content form itself; no
required-marker/help-text/error-text axis applies (not a form control).

---

## States

Doc 26 §5's own state row is "image-error fallback", layered on top of the §2 standard set. Only
`default` applies from that standard set — see `SPEC.md` §3 for the full carried/N-A breakdown
(`hover`/`active`/`focus-visible`/`disabled`/`readonly`/`invalid`/`loading`/`empty` are all N/A:
this is presentational media, never in the tab order, with no control or async-fetch lifecycle of
its own).

**Image-error fallback.** When `image` fails to load (the native `<img>` `error` event), the
component falls back to `initials`, then the icon form, per the priority order in
[Variants / Structure](#variants--structure) — never a broken-image glyph. The failure flag resets
whenever `image` itself changes, so retrying with a new URL always gets a fresh attempt.

---

## Accessibility contract

**Decorative vs. informative** (doc 26 §5 a11y row, named explicitly):

- **`decorative="true"`** — `aria-hidden="true"` on the host regardless of content form; no
  accessible name anywhere. For an avatar beside text that already announces the same
  information.
- **`image` form, not decorative** — the native `<img alt>` carries the accessible name; no
  `role`/`aria-label` added to the host (would be a redundant duplicate node).
- **`initials`/icon form, not decorative** — the host gets `role="img"` + `aria-label`, resolved
  `ariaLabel` → `alt` → a generic `'Avatar'` fallback, so the host is never silently unlabeled.
  The visible initials text / icon itself is always `aria-hidden`, so nothing double-announces.

**`<ino-avatar-group>`** — `role="group"` with an `aria-label` auto-generated as `"N avatars"`
(or a caller override). Per-item avatars are individually `decorative` unless that item supplied
its own `alt` — a group of named people still announces each name on request; an unnamed
decorative cluster relies on the group's one-line count instead of N redundant "Avatar"
announcements. The trailing surplus avatar is never decorative — it gets `aria-label="N more"`,
since that's new information the count summary doesn't carry.

**Contrast** — initials/fallback-icon/separator-ring colors (`--ino-color-on-surface` /
`--ino-color-on-surface-muted` / `--ino-color-surface-raised` on `--ino-color-surface-sunken`)
are existing roles audited in every theme by `node scripts/check-theme-parity.mjs`.

**Target size** — SC 2.5.8 does not apply; never in the tab order.

**RTL** — logical properties only (`inline-size`/`block-size`, `margin-inline-start`, non-directional
`border`); no `left`/`right`/`top`/`bottom`/`width`/`height` anywhere in either stylesheet.

---

## Deliberate omissions

**No automatic initials derivation from `alt`/a name string.** Extracting "JD" from "Jane Doe" is
a locale-sensitive operation (word order, which word counts as "first") that belongs to the
caller's data layer. Full reasoning: `SPEC.md` §1.

**No `icon` form on `<ino-avatar-group>` items.** `InoAvatarGroupItem` is
`{ image?, initials?, alt? }` only — a plain data array has no slot for arbitrary projected markup
per row without `ng-template` context-binding machinery, and the spec row's "group" use case is
people/entity clusters, not an icon-mix. Full reasoning: `SPEC.md` §5.

**No `loading` state.** A caller loading a user record renders `ino-skeleton` (`shape="circle"`,
already documented as the avatar-placeholder shape) until data arrives, then mounts
`<ino-avatar>` — two components in sequence rather than a `loading` flag on this one. Full
reasoning: `SPEC.md` §3.

---

## Mobile parity

**Port both** (doc 26 §5 row) — React Native and Flutter, both widgets.

- **Capacitor**: not a separate port — the same Angular component/CSS render inside the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native**: `mobile/react-native/src/components/InoAvatar.tsx` + `InoAvatarGroup.tsx`.
  Same content-form priority, same five-step size scale (mobile is always fluid — no density
  split to reconcile), same decorative/informative accessibility contract via
  `accessibilityElementsHidden`/`accessibilityLabel`.
- **Flutter**: `mobile/flutter/lib/widgets/ino_avatar.dart` (both widgets, one file — the same
  "ticket-scoped file" organization `ino_dataview.dart` uses), via `Semantics(label:, excludeSemantics:)`.

Full reasoning: `SPEC.md` §7.
