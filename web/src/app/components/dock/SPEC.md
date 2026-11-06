# `<ino-dock>` — component spec

**Issue:** INO-481 (INO-31 B5, doc 26 §5 row "ino-dock")
**Parity benchmark:** PrimeNG 22.1.1 `Dock` — a macOS-style magnifying icon strip. PrimeNG is a
benchmark, **not a runtime dependency** (same stance as every other SPEC in this library); this
component takes neither PrimeNG nor any other icon-dock library.
**Spec seed (doc 26 §5):** bottom/side position; magnify-on-hover (off under
`prefers-reduced-motion`). States (+ §2 standard set): active-item, hover-magnify. Sizing: icon
sm/md/lg. Labels: item labels/tooltips. A11y: menubar semantics, Arrow keys. Web-only (no RN/
Flutter port needed).
**Siblings:** `<ino-speeddial>` (INO-493) for the fixed-geometry-chrome idiom (sm/md/lg as px
diameters, never viewport-fixed by the component itself, tooltip-style visible label shown on
hover/focus); `<ino-megamenu>` (INO-495) for the APG menubar roving-tabindex pattern
(`role="menubar"`/`"menuitem"`/`"none"`, orientation-aware arrow key pairs).

This file records the decisions the §2 contract requires to be written down rather than silently
made.

---

## 1. Anatomy

```
ino-dock (host)
└── nav.ino-dock__frame        aria-label (ariaLabel) — the bordered/elevated pill surface
    └── ul.ino-dock__bar       role="menubar", aria-orientation, roving-tabindex keydown handler
        └── li.ino-dock__item  role="none", one per item — *position: relative* anchor for the label
            ├── button.ino-dock__btn   role="menuitem", aria-label from item.label
            │   └── span.ino-dock__icon   glyph, aria-hidden
            └── span.ino-dock__label  tooltip-style visible label, hover/focus-within only, aria-hidden
```

The host is `display: inline-block` and never positions itself against the viewport — the exact
idiom `<ino-speeddial>` uses. A docs demo wraps it in a plain container; a real app shell fixes
it to a screen edge with its own CSS. This keeps the component usable inside cards, page flow and
fixed shells alike without a `fixed`/`anchor` input axis the doc 26 row never asked for.

## 2. Position: `bottom` | `side` — a layout axis, not a viewport anchor

`position: 'bottom' | 'side'` (default `'bottom'`). It controls two things only:

1. **Flex direction** of `.ino-dock__bar` — row for `bottom`, column for `side`.
2. **Label placement** of `.ino-dock__label` — above the icon for `bottom` (reads naturally under
   a bottom-edge dock), to the inline-end of the icon for `side`.

The doc 26 row's `side` value does not distinguish left from right — the component does not
either. **Default visual assumption: a `side` dock is anchored to a physical left edge**, so the
label flows to the inline-end (right in LTR) of the icon, away from the edge — the same
left-anchored assumption `<ino-speeddial>`'s left/right linear label flip uses as its default
case. A consumer anchoring a `side` dock to the *right* edge instead gets a label that reads
toward the edge rather than away from it; that is a cosmetic mirroring concern for the consumer's
own positioning CSS, not a second component input — see §9.

## 3. Sizing: `sm` | `md` | `lg` — fixed px geometry, not `InoControlSize`

`size: 'sm' | 'md' | 'lg'` (default `'md'`), deliberately **not** the shared `InoControlSize`
(`'sm' | 'default' | 'lg'`) union every form control uses. Two reasons:

1. **The doc 26 row names the rungs `sm/md/lg`**, not `sm/default/lg` — using the shared type
   would have silently renamed the contract's own axis.
2. **A dock is floating chrome, not a form row** — exactly `<ino-speeddial>`'s FAB reasoning
   (SPEC.md §5 there). If the button/icon sizes were token-driven (`--ino-control-height-*` /
   `--ino-control-icon-size-*`), the dense register the docs portal renders in would shrink the
   `sm` rung from 36px to 28px, which is wrong for a dock: density describes form-row rhythm, not
   a floating icon strip's own geometry.

Button diameters are fixed px matching the fluid control-height scale's own numbers (36/44/52,
`sm`/`md`/`lg`) and icon font sizes match the fluid `--ino-control-icon-size-*` scale's numbers
(16/20/24) — same values, just density-immune literals instead of token lookups, the identical
idiom `ino-speeddial.component.scss`'s header comment documents for its FAB/action diameters.

## 4. Magnify-on-hover — pure CSS, fully off under reduced motion

Magnify is a CSS-only `transform: scale(1.22)` on `:hover`/`:focus-visible`, no JS pointer
tracking:

- **Why CSS, not JS mouse-position math**: the full macOS effect also scales *neighboring* icons
  with distance-based falloff as the pointer moves across the strip. That needs a
  `mousemove` listener computing a per-item scale every frame — a physics simulation, not a
  doc-26 row's "magnify-on-hover" line item. Scoped to "the hovered item itself scales up," CSS
  `:hover` is both correct and zero-JS. Neighbor falloff is cut; see §9.
- **`@media (prefers-reduced-motion: reduce)`** resets the transform to `none !important` on the
  same selector that applies the scale, rather than only setting `transition: none`. A
  transition-only cut would still let the icon *snap* to 1.22× instantly on hover under reduced
  motion — a jarring size change, not actual motion, but still an unrequested visual jump. The
  effect needs to be **off**, not merely **instant**. This is the same idiom
  `ino-modal.component.scss` uses (`transform: none !important` under the reduce query) rather
  than the transition-only pattern most of this library's hover states use — a motion-reduced
  user gets a dock that behaves exactly like a disabled-magnify dock, not a same-end-state,
  faster one.
- **`magnify` @Input** (default `true`) is a non-motion-related kill switch — e.g. a docs-page
  "disable decorative effects" toggle — and composes with, rather than substitutes for, the
  reduced-motion query: whichever gate fires, the transform never applies.
- **Disabled items never magnify** (`ino-dock__btn--magnify` class is conditional on
  `!item.disabled` in the template) — an inert control should not visually invite a hover
  interaction it won't honor.

## 5. A11y: menubar semantics + orientation-aware Arrow keys

Same APG Menubar pattern `<ino-megamenu>` implements, reused at the dock's smaller scope (no
submenus/panels — every item is a leaf):

- `ul.ino-dock__bar` is `role="menubar"` with `aria-orientation` following `position`
  (`horizontal` for `bottom`, `vertical` for `side`) — `li` wrappers are `role="none"` (the
  button, not the `li`, is the menu item), each `button` is `role="menuitem"`.
- **One roving tab stop.** `ArrowLeft`/`ArrowRight` move and wrap when `position="bottom"`;
  `ArrowUp`/`ArrowDown` move and wrap when `position="side"` — the inactive pair does nothing
  (same split `<ino-megamenu>`'s `orientation` input drives). `Home`/`End` jump to the first/last
  *navigable* item.
- **Disabled items are fully skipped** — never a roving-tabindex stop, never counted when
  computing wrap targets (`navigableItems()` filters them out before any arrow-key math, the same
  precedent `<ino-speeddial>`'s action list and `<ino-context-menu>` use), and carry the real
  `disabled` attribute (not just `aria-disabled`) so a pointer click can't activate one either.
- **`aria-current="true"`** marks the item matching `activeId` ("active-item", §6) — a dock item
  is "the current view/app," not a traversable page, so the bare boolean form is used rather than
  `aria-current="page"` (which `<ino-megamenu>` uses for literal navigation links).
- Every button is icon-only → `aria-label` from `item.label` carries the accessible name; the
  visible hover/focus label (§7) is `aria-hidden` so it never double-announces.
- Click and `Enter`/`Space` activation come from the native `<button>` element — no custom
  keydown handling needed for activation, only for the roving arrows.

## 6. States (§2 standard set + §5: active-item, hover-magnify)

| State | Treatment |
|---|---|
| default | Flat icon on a bordered, elevated pill surface (`--ino-shadow-lg`) |
| hover | Sunken-surface background fill on the item |
| hover-magnify | §4 — `transform: scale(1.22)` on the hovered item only, off under reduced motion |
| focus-visible | `--ino-focus-ring`; **also** triggers magnify (keyboard users get the same affordance mouse users do — magnify is not pointer-exclusive) |
| active (pressed) | Flat `--ino-color-accent-active` fill, matching `<ino-speeddial>`'s FAB `:active` |
| active-item (`activeId` match) | Persistent `--ino-gradient-accent` fill + `--ino-color-on-accent`, `aria-current="true"` — the same checked/selected pairing `<ino-toggle-button>`/`<ino-editor>`'s pressed toolbar button use |
| disabled | Real `disabled` attribute, `aria-disabled="true"`, 50% opacity, muted color, never magnifies, skipped by keyboard roving |

Loading and invalid are deliberately not in this component's state set — a dock has no async
data source and no validity concept; recorded as a deliberate omission on the docs page (§9).

## 7. Labels and tooltips

Every item carries one accessible name (`item.label`) and one visible, hover/focus-triggered
label (`item.tooltip ?? item.label`) — the same split `<ino-speeddial>`'s `action-label` uses,
reused verbatim rather than inventing a second pattern: `.ino-dock__label` is `aria-hidden` (the
button's own `aria-label` already carries the name to assistive tech), shown via
`:hover`/`:focus-within` on the `li`, positioned above the icon (`bottom`) or to the inline-end
(`side`, §2). **Why not `<ino-tooltip>`/`[inoTooltip]`**: that directive's own show/hide timing
(hover-or-focus, dismissible, hoverable, persistent per its WCAG 1.4.13 contract) is tuned for
advisory hints on arbitrary hosts, not for a label that is expected to appear instantly in lockstep
with the magnify transform on every item in a tightly-packed strip — composing two independent
timing systems for one visual effect was judged not worth the coupling. **Truncation**: labels are
`white-space: nowrap` (matching the speeddial action-label precedent) — a dock label is expected to
be a short app/view name; long labels are a content guideline, not a component constraint (no
`max-inline-size`/ellipsis is imposed). **RTL**: all label offsets use logical properties
(`inset-inline-start`), so the `bottom`-position label re-centers identically and the `side`-
position label's inline-end placement mirrors correctly under `dir="rtl"` (spot-checked on the
docs page).

## 8. Value/activation contract

Plain `@Output() itemClick: { originalEvent, item }`, matching `<ino-speeddial>`'s event shape
exactly — no `ControlValueAccessor` (a dock is a navigation/launcher strip, not a form control; the
repo-wide forms convention this exempts does not even apply here). `item.command`, when present,
runs before the `itemClick` emission — same ordering `<ino-speeddial>`'s `onItemActivate` uses.
`activeId` is one-way (`@Input` only, no `activeIdChange`): the dock does not manage "current
view" state itself — the consumer's own router/view state is the source of truth, and the dock
just reflects it, the same read-only relationship `<ino-megamenu>`'s `activeHref` has to the host
app's router.

## 9. Out of scope (deliberate omissions — rendered on the docs page)

- **Mobile ports** — the §5 row is explicitly Web-only; no RN/Flutter disposition.
- **Neighbor magnify falloff** — the full macOS effect scales nearby icons by pointer distance;
  needs per-frame `mousemove` math, out of proportion for "magnify-on-hover" (§4).
- **Viewport auto-fixing / an edge/anchor input** — the host never positions itself; the consumer
  anchors it, same as `<ino-speeddial>` (§1).
- **A `side: 'left' | 'right'` sub-axis** — doc 26's row is a binary `bottom | side`; the `side`
  default assumes a left anchor (§2). A right-anchored mirror is a consumer CSS concern today.
- **Drag-to-reorder items** — not in the §5 row; `items` order is caller-controlled.
- **Auto-hide / reveal-on-proximity** — a dock that only appears near a screen edge is a shell-
  level behavior, not this component's.
- **Badges/notification dots** — not in the §5 row; `data` on `InoDockItem` lets a consumer stash
  arbitrary state for its own badge rendering on top if it wants one.
- **`<ino-tooltip>` composition** — §7 explains why the label is a bespoke element instead.

## 10. Verification plan (§2 contract, point 8 evidence)

- Unit spec (`ino-dock.spec.ts`): menubar/menuitem/none roles, orientation-aware arrow roving
  (horizontal for `bottom`, vertical for `side`) with wrap, disabled-item skip in keyboard
  navigation, `activeId` → `aria-current` + active class, click activation (`command` +
  `itemClick`, both skipped when disabled), `size` → `data-size` host attribute, the
  `magnify`-input → `.ino-dock__btn--magnify` marker class (the reduced-motion override itself is
  CSS-only and out of jsdom's reach — verified on the docs page instead).
- Docs-page QA (QALead, the point-8 gate): 3 themes × `bottom`/`side` × sm/md/lg screenshots,
  keyboard-only walkthrough (Tab → one stop on the bar → arrows rove and wrap → disabled item
  never receives focus → Enter/Space activates), magnify visually confirmed on hover and on
  keyboard focus, magnify visually confirmed **absent** under a simulated
  `prefers-reduced-motion: reduce`, RTL spot-check on the `side` label placement.
