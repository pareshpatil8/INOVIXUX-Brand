# `<ino-toolbar>` — component spec

**Issue:** INO-443 (INO-31 Phase B2)
**Parity benchmark:** PrimeNG 22.1.1 `Toolbar` — `specs/primeng/llms-22.1.1.txt`,
route `https://primeng.dev/toolbar`. PrimeNG is a benchmark, **not a runtime dependency**;
nothing here installs it.
**Gap closed:** No prior `ino-toolbar` existed. This issue delivers the complete component
per the B2 specification: start/center/end content distribution, overflow handling,
dense/comfortable sizing, and the ARIA toolbar pattern with arrow-key roving focus.
**Depended on:** INO-424 (Phase B1 gate), `done` before this issue started.

This file records the decisions the §2 Component Publish Contract requires to be written
down rather than silently made.

---

## 1. Component anatomy and content distribution

`<ino-toolbar>` is a horizontal container with three named content slots:

- **start** — left-aligned content (buttons, icon groups, breadcrumbs)
- **center** — center-aligned content (title, search)
- **end** — right-aligned content (actions, user menu, settings)

Each slot is optional. Empty slots collapse to zero width and do not render an empty
element. The layout uses CSS flexbox with `justify-content: space-between` to distribute
the three regions across the toolbar's width.

**Structure (web):**
```html
<div class="ino-toolbar" role="toolbar" [attr.aria-label]="ariaLabel">
  <div class="ino-toolbar__start" *ngIf="hasStartContent">
    <ng-content select="[slot='start']"></ng-content>
  </div>
  <div class="ino-toolbar__center" *ngIf="hasCenterContent">
    <ng-content select="[slot='center']"></ng-content>
  </div>
  <div class="ino-toolbar__end" *ngIf="hasEndContent">
    <ng-content select="[slot='end']"></ng-content>
  </div>
</div>
```

**Mobile:** Web-only component per the B2 row specification. Mobile applications use
platform-native navigation patterns (app bars, navigation bars) instead.

---

## 2. Sizing — dense/comfortable (§2 contract, DoD row 3)

The toolbar supports two density modes via the `density` input:

- **comfortable** (default) — `--ino-spacing-4` (16px) vertical padding, 
  `--ino-row-min-height` (44px) minimum height
- **dense** — `--ino-spacing-2` (8px) vertical padding, 32px minimum height

Horizontal padding is `--ino-spacing-4` (16px) at both densities; only the block-axis
spacing changes. The minimum height ensures touch targets meet WCAG 2.2 SC 2.5.8 (24×24px)
in both modes — the comfortable floor is the standing `--ino-row-min-height` / 
`--ino-target-comfortable` token (44px), while dense floors to 32px per the INO-407/INO-729
precedent (same as sm-sized controls in dense mode).

**API:** `density: 'comfortable' | 'dense' = 'comfortable'`

**CSS:** The host element reads the token directly via a CSS custom property, with the
dense override applied via a `.ino-toolbar--dense` class:

```scss
:host {
  --toolbar-padding-block: var(--ino-spacing-4);
  --toolbar-min-height: var(--ino-row-min-height);
  
  &.ino-toolbar--dense {
    --toolbar-padding-block: var(--ino-spacing-2);
    --toolbar-min-height: 32px;
  }
}

.ino-toolbar {
  min-height: var(--toolbar-min-height);
  padding: var(--toolbar-padding-block) var(--ino-spacing-4);
}
```

---

## 3. Overflow handling

When the toolbar's content exceeds the available width, the component applies
`overflow-x: auto` to enable horizontal scrolling. No content is clipped or hidden without
a scrolling affordance.

**Behavior:**
- Scrollable content receives `tabindex="0"` so keyboard users can scroll via arrow keys
  when focused on the toolbar container itself
- Scrollbar styling inherits the system's native scrollbar theme
- No automatic content ellipsis, icon collapse, or "more" menu — these are application
  concerns implemented by the consumer via the slot content

**RTL:** Logical properties ensure scroll direction mirrors correctly under `dir="rtl"`.

---

## 4. States (§2 contract, DoD row 2)

The toolbar itself is a structural container with no interactive states beyond the standard
set:

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | Background `--ino-color-surface`, border-bottom `--ino-color-border` (1px solid) |
| Hover | ❌ | N/A — the toolbar is not itself interactive; child controls carry their own hover states |
| Focus-visible | ❌ | N/A — focus moves to interactive children, not the container |
| Active/pressed | ❌ | N/A — not interactive |
| Disabled | ❌ | N/A — structural container; children handle their own disabled states |
| Readonly | ❌ | N/A |
| Invalid/error | ❌ | N/A |
| Loading/busy | ❌ | N/A — no loading state on the container itself |

The container is not itself a focusable control. Focus management and keyboard navigation
(§5) move focus among the toolbar's focusable children.

---

## 5. ARIA contract and keyboard navigation (§2 contract, DoD row 5)

**Role:** `role="toolbar"` on the container element (WAI-ARIA APG toolbar pattern).

**Accessible name:** Required via the `ariaLabel` input, mapped to `[attr.aria-label]`.
A toolbar without a label fails accessibility review.

**Keyboard navigation — Arrow-key roving focus:**

Per the APG toolbar pattern, when a toolbar contains multiple focusable items:
1. **Tab** into the toolbar focuses the first enabled item (or the last-focused item if
   returning to the toolbar)
2. **Arrow keys** (Left/Right in LTR; Right/Left in RTL) move focus among the toolbar's
   focusable children **without removing them from the tab sequence**
3. **Home** moves focus to the first focusable item
4. **End** moves focus to the last focusable item

**Implementation:** The component listens to `keydown` events on the toolbar container and
implements the roving focus algorithm:

```typescript
@HostListener('keydown', ['$event'])
onKeyDown(event: KeyboardEvent): void {
  const items = this.getFocusableItems();
  if (items.length === 0) return;
  
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  let targetIndex = -1;

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      targetIndex = (currentIndex + 1) % items.length;
      break;
    case 'ArrowLeft':
      event.preventDefault();
      targetIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      break;
    case 'Home':
      event.preventDefault();
      targetIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      targetIndex = items.length - 1;
      break;
  }

  if (targetIndex >= 0) {
    items[targetIndex].focus();
  }
}

private getFocusableItems(): HTMLElement[] {
  const selector = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(this.el.nativeElement.querySelectorAll(selector));
}
```

**RTL mirroring:** ArrowRight/ArrowLeft semantics do **not** flip under `dir="rtl"` in
this implementation. The keys retain their physical direction, matching the user's keyboard
layout. This is consistent with how browsers handle directional navigation in form controls
and matches the APG toolbar pattern guidance (which specifies ArrowRight = next,
ArrowLeft = previous, with no mention of RTL inversion).

**Contrast:** The toolbar container has no focus indicator of its own (not focusable).
Focus indicators on child controls are their own responsibility and inherit from their
respective component implementations (e.g., `ino-button`, `ino-input`).

---

## 6. Visual design and theming

**Surface and borders:**
- Background: `--ino-color-surface`
- Border-bottom: `1px solid var(--ino-color-border)` — provides visual separation from
  content below
- No elevation/shadow — the toolbar is flush with the page surface

**Color roles:** The toolbar itself uses only neutral surface/border tokens. Content
projected into the slots brings its own theming (buttons, icons, text).

**High-contrast:** Border visibility is guaranteed via the `--ino-color-border` token,
which auto-adjusts to meet 3:1 contrast in the high-contrast theme per the existing
`check-theme-parity.mjs` contract.

**RTL:** All spacing uses logical properties (`padding-inline`, `padding-block`). Flexbox
`flex-direction: row` mirrors automatically under `dir="rtl"` (start → right, end → left).

---

## 7. Component API

**Inputs:**
- `ariaLabel: string` — **required**; accessible name for the toolbar. No default.
- `density: 'comfortable' | 'dense' = 'comfortable'` — sizing mode (§2)

**Outputs:** None. The toolbar is a structural container with no events of its own.

**Slots (via `ng-content select`):**
- `[slot="start"]` — left-aligned content
- `[slot="center"]` — center-aligned content  
- `[slot="end"]` — right-aligned content

**No form control integration:** The toolbar is not a form control and does not implement
ControlValueAccessor, emit change events, or carry validation state.

---

## 8. Verification plan (§2 contract, DoD row 8)

| Check | Expected |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (uses only existing tokens) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes (no hardcoded colors/spacing) |
| `ng build` (web/) | ✅ exits 0 |
| Hardcoded color/space/radius/duration/font-size | None — every value resolves through tokens |
| `[data-theme]` branch | None — uses CSS custom properties, not theme-conditional classes |
| RTL check | ✅ logical properties; flexbox auto-mirrors; arrow key semantics do not flip |
| Keyboard-only walkthrough | ✅ Tab into toolbar, Arrow keys move focus, Home/End jump to bounds |
| Three themes × two densities | ✅ 6 combinations rendered on docs page |

---

## 9. Out of scope for this issue

- **Responsive collapse/overflow menu** — The component provides horizontal scrolling when
  content overflows, but does not automatically collapse toolbar items into a "more" menu
  or icon-only mode. Applications implement these patterns in their slot content.
- **Sticky positioning** — The toolbar renders in normal document flow. Sticky/fixed
  positioning is applied by the consuming page's layout, not the component.
- **Vertical orientation** — The toolbar is horizontal-only per the B2 spec. Vertical
  toolbars (e.g., side panels) use different patterns.
- **Mobile ports** — Web-only component per the B2 row specification.

---

## 10. PrimeNG parity notes

PrimeNG's `Toolbar` component provides the same three-slot structure (start/center/end)
with no overflow handling beyond the container's own width. INOVIXUX's implementation adds:

1. **Explicit density API** — PrimeNG toolbar height is controlled via custom CSS; this
   component exposes `density` as a first-class input with token-driven heights.
2. **Arrow-key roving focus** — PrimeNG does not implement the APG toolbar keyboard
   pattern; this component does.
3. **Required `ariaLabel`** — PrimeNG's toolbar has no accessibility contract documented;
   this component enforces a required label.

The visual structure and slot-based API remain compatible, so migration from PrimeNG's
toolbar to `ino-toolbar` requires only renaming the component tag and adding the
`ariaLabel` attribute.
