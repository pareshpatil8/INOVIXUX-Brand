# `<ino-nav>` — Navigation

> Parity benchmark: PrimeNG 22.1.1 `Menubar` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `Menubar` uplift row tracked as **INO-164** (INO-31 U-9, Navigation
> group). Full decision record: `../../../web/src/app/components/nav/SPEC.md`.
> Preview: [`previews/ino-nav.html`](previews/ino-nav.html).

Top-level site/app navigation shell, uplifted from a flat link bar to a `role="menubar"` with
one level of submenu, full keyboard operability, and a mobile hamburger panel. The logo is
projected via `<ng-content select="[logo]">` so the nav shell never depends on which mark is
mounted; the dark/light/high-contrast toggle is owned directly by the component (it injects
`ThemeService` itself) since nav is the one place that control belongs on every page.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `links` | `InoNavLink[]` | `[]` | Top-level menubar items, in source order |
| `ctaLabel` | `string` | `'Request access'` | Label for the primary call-to-action button |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale (INO-124) — see below |

| Output | Type | Fires when |
|---|---|---|
| `ctaClick` | `void` | The CTA button is activated |

```ts
export interface InoNavLink {
  label: string;
  href: string;
  /** Renders aria-disabled, drops routerLink, and no-ops click/keyboard activation. */
  disabled?: boolean;
  /** One level of nested submenu (PrimeNG Menubar parity). Deeper nesting is unsupported —
   *  a grandchild's own `children` are never rendered. See SPEC.md §3. */
  children?: InoNavLink[];
}
```

`href` is an in-app route path rendered via `routerLink`, not an arbitrary external URL.

### Size API (INO-124 adoption)

`size` re-points the `--ino-control-{font-size,padding-inline-roomy,gap,height}` aliases on the
host. **Desktop menubar items and submenu links deliberately do not consume
`--ino-control-height`** — a menubar link is inline text in a horizontal bar, not a button-shaped
control; wiring the full 44px control-height box in would make every link read as a pill button.
`font-size`, `padding-inline-roomy` and `gap` are still wired through, so `size` has a real effect
on the desktop bar. The **mobile panel's rows are the opposite case**: they DO consume
`--ino-control-height`, which resolves to `--ino-row-min-height` (32px) under
`[data-density="dense"]` and to `--ino-target-comfortable` (44px) in fluid/base, per
`control-size-scale.md` §3 — free, no `[data-density]` branch written in this component. Full
reasoning: `SPEC.md` §4.

---

## Structure

- Top-level items without `children` render as `<a role="menuitem">`.
- Top-level items with `children` render as `<button role="menuitem" aria-haspopup="true"
  [attr.aria-expanded]>`, and open a `role="menu"` submenu of `role="menuitem"` links.
- Below 960px (the same layout-collapse breakpoint `ino-footer`/`ino-feature-grid` already use)
  the horizontal menubar hides behind a hamburger button that opens a focus-trapped panel listing
  the same items, with one-level disclosure groups for items that have `children`.

---

## Keyboard map (WAI-ARIA APG menubar pattern, roving tabindex)

| Key | Context | Effect |
|---|---|---|
| `ArrowRight` / `ArrowLeft` | Top-level item focused | Moves to the next/previous top-level item, wraps |
| `ArrowDown` | Top-level item with `children` focused | Opens its submenu, focuses the first entry |
| `ArrowUp` / `ArrowDown` | Inside an open submenu | Moves between submenu items, wraps |
| `ArrowLeft` / `ArrowRight` | Inside an open submenu | Closes the submenu, moves to the previous/next top-level item |
| `Escape` | A submenu is open | Closes it, returns focus to its parent top-level item |
| `Home` / `End` | Menubar or open submenu | Jumps to the first/last item in whichever list has focus |
| `Enter` / `Space` | Top-level item with `children` focused | Toggles its submenu |

Only one top-level item is `tabindex="0"` at a time; the rest are `tabindex="-1"` (roving
tabindex). The same pattern repeats one level down inside an open submenu.

**Hover** opens a submenu as a progressive enhancement over the exact same `openIndex` state the
keyboard drives — there is one field behind both, so a hover-opened submenu that receives keyboard
focus is never closed out from under the user by a stray `mouseleave`.

**Outside interaction** (click outside the nav, or focus leaving it entirely) closes any open
submenu.

**Mobile panel**: `Escape` closes it; focus is trapped inside via `[inoFocusTrap]`
(`web/src/app/components/focus-trap`, INO-130) — reused, not reimplemented — and returns to the
hamburger button on close.

---

## States

| State | Mechanism |
|---|---|
| default | Muted `on-surface-muted` label |
| hover | `on-surface` label (menubar), sunken fill (submenu/mobile rows) |
| active / pressed | Accent color (menubar text), sunken fill + accent color (submenu/mobile rows) |
| focus-visible | `--ino-focus-ring` on every interactive element — colour-only hover/active is never the sole indicator (SC 2.4.11) |
| disabled | `InoNavLink.disabled` → `aria-disabled`, 50% opacity, `pointer-events: none`, `routerLink` set to `null` |
| loading / busy | Deliberately minimal — no current call site loads nav items asynchronously; see `SPEC.md` §5 |
| readonly | N/A — a nav link either navigates or is `disabled`; there is no third state |
| invalid | N/A — a nav item is not a form control and has no value to validate |

---

## Motion

| Surface | Enter | Exit | Tokens |
|---|---|---|---|
| Submenu | fade + `translateY(-4px)` → 0 | reverse of enter | `--ino-motion-duration-fast` + `-decelerate` (enter) / `-accelerate` (exit) |
| Mobile panel | fade + `translateY(-12px)` → 0 | reverse of enter | `--ino-motion-duration-base` + `-decelerate` (enter); `--ino-motion-duration-fast` + `-accelerate` (exit) |

Both use Angular's built-in `animate.enter`/`animate.leave` bindings, the same mechanism
`ino-toast-container` already uses — no `@angular/animations` dependency. Both keyframes move on
the block axis only (`translateY`), so neither needs a mirrored variant under `dir="rtl"`.
`@media (prefers-reduced-motion: reduce)` disables every transition in the stylesheet and the
`animate.enter`/`.leave` keyframes are scoped inside their own `no-preference` block, so under
`reduce` both surfaces appear/disappear instantly.

---

## Accessibility contract

**Role / ARIA**

- Root `<nav>` carries `role="menubar"` and `aria-label="Primary"`.
- Each top-level item is `role="menuitem"`; items with children add `aria-haspopup="true"` and
  `[attr.aria-expanded]` tracking the submenu's open state.
- Each submenu is `role="menu"` with an `aria-label` mirroring its parent's label, containing
  `role="menuitem"` links (`role="none"` on the `<li>` wrapper, per the APG menu pattern).
- The mobile panel is `role="dialog"` `aria-modal="true"` `aria-label="Menu"`.
- The hamburger button carries `aria-controls`, `[attr.aria-expanded]`, and an
  `aria-label` that flips between `"Open menu"`/`"Close menu"`.

**Keyboard** — full map above.

**RTL** — every position/offset in the component uses logical properties
(`inset-inline-start/end`, `padding-inline`, `margin-inline`) — no `left`/`right`. Motion is
block-axis only, so nothing needs mirroring.

**Targets** — desktop menubar items and submenu links clear `--ino-target-min` (24px, WCAG 2.2
SC 2.5.8); the theme toggle, hamburger button, and mobile-panel close button are all
`--ino-target-comfortable` (44px), matching the theme-toggle convention the pre-existing nav
already established.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6) — full reasoning in `SPEC.md`:

- **Submenu nesting beyond one level.** `InoNavLink.children` supports exactly one tier; a
  grandchild's own `children` are never rendered. `SPEC.md` §3.
- **Loading/busy state.** No current `InoNavLink` API or call site loads items asynchronously;
  inventing the input with no caller was judged worse than omitting it. `SPEC.md` §5.
- **Readonly / invalid states.** Not meaningful for navigation — a link either navigates or is
  `disabled`, and a nav item has no value to validate. `SPEC.md` §5.
- **React Native / Flutter ports.** Web + Capacitor only for this issue — separate per-track
  issues per the INO-31 plan's merge order. `SPEC.md` §1.

## Mobile parity

Capacitor renders the exact same Angular component and CSS as web, so it is covered automatically
— there is no separate Capacitor artifact. React Native and Flutter carry no `<ino-nav>`
counterpart yet; see "Deliberate omissions" above and `SPEC.md` §1.
