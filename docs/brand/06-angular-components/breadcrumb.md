# `<ino-breadcrumb>` — Breadcrumb

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-breadcrumb` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-429](/INO/issues/INO-429).
> Parity benchmark: PrimeNG 22.1.1 `Breadcrumb` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/breadcrumb/SPEC.md`.

A page-hierarchy trail (`nav` landmark + ordered list) with optional per-crumb icons,
collapsed-middle `…` overflow for long trails, and Angular Router integration. Implements the
WAI-ARIA APG breadcrumb pattern: `nav[aria-label="breadcrumb"]` wrapping an `ol`/`li` list, with
`aria-current="page"` on the current entry.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoBreadcrumbItem[]` | `[]` | The trail, in order from root to current page. The last entry is always rendered as the current page regardless of whether it carries `href` |
| `ariaLabel` | `string` | `'breadcrumb'` | Accessible name for the `nav` landmark; exposed only for localization — the default already satisfies the spec row's `aria-label="breadcrumb"` |
| `ellipsisLabel` | `string` | `'Show hidden breadcrumb items'` | Accessible name for the collapsed-middle overflow trigger and its popover |
| `maxVisible` | `number` | `0` | `0` disables collapsing. Above `0`, once `items.length` exceeds both `maxVisible` and a hard floor of 3, the trail collapses to first item + ellipsis + last two items |
| `readonly` | `boolean` | `false` | Renders every non-current crumb as inert text; the current-page item is unaffected (already non-interactive) |
| `loading` | `boolean` | `false` | Renders a skeleton trail instead of `items`; host `nav` carries `aria-busy="true"` |

| Output | Payload | Fires |
|---|---|---|
| `itemClick` | `InoBreadcrumbItem` | When a navigable crumb (visible or hidden-behind-the-ellipsis) is activated |

### `InoBreadcrumbItem` interface

```typescript
export interface InoBreadcrumbItem {
  label: string;        // Visible text (required)
  href?: string;        // In-app route path, bound via [routerLink] — omit for a non-navigable ancestor
  icon?: string;         // Optional glyph rendered before the label, aria-hidden
  disabled?: boolean;   // Renders as inert text with aria-disabled; never navigates
}
```

### Size API

"Sizing: one size" per the spec row — there is no `sm`/`default`/`lg` axis or `[data-size]` host
attribute. Reads the unsuffixed `--ino-control-height` / `-gap` / `-font-size` / `-icon-size`
aliases directly, which already resolve to the dense/fluid-correct value per tokens.css §12, so
density composes without this component needing a sizing input at all.

### Router integration

`InoBreadcrumbItem.href` is an in-app route path rendered via `[routerLink]` — the same contract
`ino-nav`'s `InoNavLink.href` documents, not an arbitrary external URL. A crumb with no `href`
(a non-navigable ancestor) renders as plain text.

### Collapsed-middle overflow

Once `maxVisible > 0` and `items.length` exceeds both `maxVisible` and 3, the trail collapses to
"first item + `…` + last two items." The hidden items render inside a reused `<ino-popover>`,
opened from the ellipsis button via `toggle($event)`; selecting a hidden item navigates and closes
the popover. The shape is fixed (not independently configurable per-side) — see `SPEC.md` §3.

---

## States

**Default** — Non-current crumb links render `color: var(--ino-color-on-surface-muted)`, no
underline. The current-page crumb (always the last item) renders
`color: var(--ino-color-on-surface)` with `font-weight: 600` and is never a link.

**Hover** — Non-current crumb links receive `color: var(--ino-color-accent)` with an underline.
The ellipsis trigger receives the same accent color plus a `--ino-color-surface-sunken` background
fill.

**Focus-visible** — Crumb links, the ellipsis trigger, and hidden-item links inside the popover all
receive `outline: var(--ino-focus-ring)` with `outline-offset: var(--ino-focus-ring-offset)`.

**Active (pressed)** — Non-current crumb links receive `color: var(--ino-color-accent-active)` on
pointer-down.

**Current-page** — The spec row's additional state beyond the §2 standard set. The last item in
`items` is always rendered as inert text with `aria-current="page"`, regardless of whether it
carries an `href` — see `SPEC.md` §2.

**Disabled (per-item)** — A crumb with `InoBreadcrumbItem.disabled: true` renders as inert text
(`color: var(--ino-color-on-surface-muted)`, `opacity: 0.6`, `cursor: not-allowed`) with
`aria-disabled="true"`, whether visible or inside the collapsed-middle popover.

**Readonly (whole trail)** — `[readonly]="true"` renders every non-current crumb as plain,
unfocusable text instead of a link, for a print/report-style display-only trail. The current-page
item is unaffected — it was never interactive. No `aria-readonly` and no `aria-disabled` are
emitted for this case: see `SPEC.md` §5 for why a readonly-caused inert crumb gets no extra ARIA
attribute, unlike a per-item `disabled` crumb.

**Loading** — `[loading]="true"` swaps the real trail for three decorative skeleton bars; the host
`nav` carries `aria-busy="true"` for the announcement, and the skeleton list itself is
`aria-hidden="true"`.

**Empty** — When `items` is empty and `loading` is `false`, the component renders nothing (no
`nav` landmark at all) rather than an empty, pointless landmark.

---

## Accessibility contract

**Role / ARIA** — `nav[aria-label="breadcrumb"]` (or the localized `ariaLabel` override) wraps an
`ol`/`li` list — the WAI-ARIA APG breadcrumb pattern. The current-page `li` carries
`aria-current="page"` on its inner text, never a link. A per-item-disabled crumb carries
`aria-disabled="true"`; a crumb that is merely non-navigable for another reason (`readonly`, or no
`href` at all) renders as plain text with no extra attribute — see `SPEC.md` §5.

**Keyboard** — Tab moves between navigable crumb links and the ellipsis trigger (every inert
crumb — disabled, readonly, or link-less — is plain text and never receives focus); Enter/Space
activate a focused link or the ellipsis trigger. Inside the opened popover, `<ino-popover>`'s own
`[inoFocusTrap]` confines keyboard focus and Escape closes it, returning focus to the ellipsis
trigger.

**Separators are not in the accessible tree** — the `/` between crumbs is CSS generated content
(`::before`), not a DOM node, so the list's accessible children are only the real crumbs (and the
ellipsis trigger when collapsed) — see `SPEC.md` §4.

**Contrast** — Crumb link, current-page, and ellipsis colors resolve through tokens audited across
all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`margin-inline-end` on the separator). No `left`/`right` in the
stylesheet; the separator's position flips correctly under `dir="rtl"`.

**State announcements** — Current page (`aria-current="page"`), per-item disabled crumbs
(`aria-disabled="true"`), loading (`aria-busy="true"` on the `nav` landmark).

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `Breadcrumb`'s `model` (`MenuItem[]`) and `home` (a pinned
leading item) map onto this component's `items` array; a "home" crumb is simply `items[0]` here
rather than a separate input, since nothing about a leading crumb needs different handling from
any other ancestor crumb.

**No invalid/error state.** The §2 standard state set includes invalid/error, but a breadcrumb has
no bound value to validate — it is a navigation landmark, not a form control. Not implemented; see
`SPEC.md` §7.

**No `aria-readonly`, and no `aria-disabled` either.** `readonly` changes rendering (inert text
instead of links) but emits no ARIA attribute at all for the crumbs it affects — `nav` and
`ol`/`li` have no role that supports `aria-readonly`, and a plain, unfocusable `<span>` was never
going to be announced as a control, so there is nothing for `aria-disabled` to withdraw. See
`SPEC.md` §5.

---

## Mobile parity

Both ports ship (per the row's "Port both (header nav)" disposition), reinterpreting two things
that have no direct mobile equivalent:

- **React Native** — `mobile/react-native/src/components/InoBreadcrumb.tsx`. A horizontal row of
  `Pressable`/`Text` crumbs; `accessibilityRole="button"` per navigable crumb, the current crumb a
  plain `Text` with no role. No popover for the collapsed-middle overflow — the hidden items
  expand inline in place of the ellipsis on press.
- **Flutter** — `mobile/flutter/lib/widgets/ino_breadcrumb.dart`. A `Row` of `GestureDetector`-
  wrapped `Text` crumbs; `Semantics(button: true)` per navigable crumb, the current crumb plain
  `Text`. Same inline-expand overflow treatment as the RN port.

Both ports support icons, per-item `disabled`, the current-page item, and collapsed-middle
overflow. Neither takes an Angular-Router-style `href` — both take a plain `onItemPress(item)`
callback instead, matching `InoSelectButton`'s ports. `readonly` and `loading` are web-only for
this B2 issue (see [Deliberate omissions](#deliberate-omissions) and `SPEC.md` §10).
