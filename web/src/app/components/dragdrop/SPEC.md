# Drag-Drop — INO-31 B5 / INO-491 component spec

Parity benchmark: PrimeNG 22.1.1 `pDraggable` + `pDroppable` directives (no single DragDrop
component; two separate capabilities that compose). PrimeNG is a benchmark, **not a runtime
dependency** — nothing in this directory imports it.

Spec seed: doc 26 §5 row "ino-dragdrop" — directives: draggable/droppable; drag handle;
drop-zone highlight; states: dragging, over-target, dropped-flash; a11y note: "keyboard
alternative required (pick-up/move/drop) + `aria-live` announcements — a11y-hard row; spec
first"; mobile disposition "Web-only." This file, `docs/brand/06-angular-components/dragdrop.md`,
and the keyboard flow and `aria-live` region setup described in this spec are the deliverables
that row requires. No mobile ports.

---

## 1. What this component is

A **drag-and-drop interaction system** made of two composable directives (`[inoDraggable]` and
`[inoDroppable]`) that wire together mouse, touch, and keyboard interactions on a pair of
source and target elements. The directives render no visible affordance of their own — styling
and visual feedback (drag handles, drop zones, animations) are the caller's responsibility.

The keyboard interaction is the primary accessibility challenge and scope of this spec: a
fully-sighted mouse user can intuitively drag; a keyboard-only user needs an equally discoverable
and fast alternative. **The core contract is: keyboard operation is **not** a fallback, it is
full-parity alternative with mouse/touch, reachable in one key chord, and does not require the
caller to implement a secondary "keyboard mode."**

---

## 2. Definition-of-Done disposition (doc 26 §2, all eight points)

| # | Row | Disposition |
|---|---|---|
| 1 | Variants/Structure | **Satisfied, per the spec seed's own row.** Variants ship as: `[inoDraggable]` directive (source), `[inoDroppable]` directive (target), `[inoDropHandle]` child directive (named drag handle), `[inoDropZone]` visual feedback container (drop zone highlight). These four shipped as feature combinations, not as independent axis choices — the §3 contract documents their composition. |
| 2 | States | **Satisfied, all standard + three extras.** Default (idle); hover (user moves pointer over drop zone); focus-visible (keyboard focus on draggable or drop zone); active (user is actively holding mouse button); disabled (element not available for interaction); readonly (element not dragga/droppable); invalid/error (validation failed, e.g. max items in drop zone exceeded); loading (data transfer in progress); empty (drop zone with no items yet) — all demonstrated; plus **three spec-seed extras**: dragging (element is being held/carried), over-target (pointer or keyboard focus is over a valid drop zone), dropped-flash (brief high-contrast state after successful drop, feedback). |
| 3 | Sizing (sm/md/lg + dense/fluid) | **Deliberate omission, recorded per row 6.** Drag-drop directives have no intrinsic size — the draggable and droppable elements own their sizing. Size inputs to the directives would be a typed input that changes nothing observable. |
| 4 | Labels | **Deliberate omission.** No label, help text or error text of the directives' own — whatever is dragged or dropped keeps its own labeling. The keyboard interaction does ship a describedby mechanism (§3.2 below). |
| 5 | a11y | **Satisfied — this row is the entire component.** Full contract in §3 below: keyboard pick-up/move/drop flow (no mouse fallback required), `aria-live` region for drop success/failure feedback, ARIA attributes on the directives themselves, role semantics determined by the wrapped element. This is the "a11y-hard row; spec first" row of the board call — contract below is binding. |
| 6 | Notes | **Satisfied by this document.** Sizing/labels omissions recorded here rather than dropped silently, per this row's own requirement. PrimeNG mapping: two separate directives (`pDraggable`, `pDroppable`) composed to one (`inoDraggable` + `inoDroppable`). Web-only disposition: no mobile ports. Deliberate omission: drag-reorder *within* a list is OUT of scope; reorder via keyboard is a separate `ino-orderlist` component (B3, INO-XXX). This spec covers cross-zone drags (source → target), not in-zone reorder. |
| 7 | Mobile | **Deliberately omitted.** The spec seed explicitly names "Web-only" — mobile does not ship a keyboard alternative to drag-drop in this wave; mobile touch interactions are product-scope decisions left to each surface. |
| 8 | QA sign-off | Tracked on the gate subtask of INO-491, assigned to QALead per doc 26 §2.1 — not closed by this directory's builder. |

---

## 3. Accessibility contract (the binding spec for this "a11y-hard row")

### 3.1 Keyboard interaction — full parity with mouse, not a fallback

**Scenario:** A user is on a form or dashboard with a list of items to choose from (left side)
and a target zone to place selected items into (right side). Mouse users drag from list to zone.
Keyboard users must reach the same outcome **without using mouse, with equivalent discoverability
and speed**. This contract guarantees that.

**Parity principle:** Keyboard interaction is not "you can press a key to move focus; then click
the mouse," it is "you can hold one key and use arrow keys and Enter to drag, move, and drop,
without ever touching the mouse." No mnemonic key is required (no "press D to start drag mode");
one discoverable chord activates it.

#### Keyboard flow, in prose (the reference)

1. **Focus entry:** User Tab or Shift+Tab to a `[inoDraggable]` element (source item).
2. **Activation:** User presses **Space** (or Enter, both acceptable) on the focused element.
   - State changes to "carrying" (CSS pseudo: `[aria-grabbed="true"]`).
   - Visual feedback: a class `ino-dragging-active` is applied to the element; the caller styles
     this (e.g. high-contrast border, dotted outline, background color change).
   - **`aria-live` region fires:** "Item [name] picked up, use arrow keys to navigate to drop
     zone, then press Enter to drop" (see §3.3 for exact wording).
3. **Movement (carrying state):** User presses **Arrow keys** (Up, Down, Left, Right) or **Tab** to
   navigate focus to a `[inoDroppable]` element (target zone).
   - Focus moves through the DOM using native focus flow (Tab) or programmatic focus skipping
     (arrow keys move focus to the next droppable, not the next focusable element).
   - Each droppable element visited fires a separate `aria-live` polite announcement: "Drop zone
     [name] available, has [count] items" or "Drop zone [name] full, cannot accept more" if the
     zone has reached its limit.
   - Visual feedback: `[inoDroppable]` that has focus or that could accept the item displays
     `ino-drop-zone-active` class; the caller styles this (e.g. green highlight for valid,
     red for full/invalid).
4. **Drop:** User presses **Enter** (not Space, to avoid double-drop if Space was activation key)
   while focused on a droppable. If the zone accepts the item:
   - Item is moved (or copied, or custom logic runs, per the directive's callback).
   - Dragging state ends; `aria-grabbed="false"`.
   - Visual feedback: a brief `ino-dropped-flash` class is applied to both source and target for
     200ms, then removed (the caller animates this; e.g. green pulse, or scale-down then fade).
   - **`aria-live` region fires:** "Item [name] dropped in [zone name]" (§3.3).
5. **Abort:** User presses **Escape** while carrying. Item returns to source; no drop occurs.
   - State changes to idle.
   - **`aria-live` region fires:** "Drop cancelled, item returned to [original location]."

#### Keyboard flow, in diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Tab to item → [inoDraggable]                                   │
│              (item receives focus; ready state)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         Press Space
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [inoDraggable aria-grabbed="true"]                             │
│ aria-live: "Item X picked up, use arrow keys or Tab to move…"  │
│ DOM: class ino-dragging-active applied (caller styles)         │
└─────────────────────────────────────────────────────────────────┘
                    ↙                 ↘
          Arrow Up/Down           Arrow Left/Right
          Tab/Shift+Tab           (next droppable)
                ↓                         ↓
        ┌─────────────────────────────────────────┐
        │ [inoDroppable aria-dropeffect="move"]   │
        │ aria-live: "Zone Y available, [count]…" │
        │ DOM: class ino-drop-zone-active         │
        └─────────────────────────────────────────┘
                         ↓
                    Press Enter
                         ↓
    ┌────────────────────────────────────────────┐
    │ Item moved; aria-grabbed="false"           │
    │ aria-live: "Item X dropped in Zone Y"      │
    │ DOM: ino-dropped-flash class (200ms pulse) │
    │ aria-live: fade region after announcement  │
    └────────────────────────────────────────────┘
```

#### Escape at any point aborts the carry and returns focus to source.

### 3.2 ARIA attributes and roles

The directives set the following ARIA attributes on their host elements. The caller must
**not** change these; the directives own them completely.

| Host element | ARIA attribute | Values | Purpose |
|---|---|---|---|
| `[inoDraggable]` | `aria-grabbed` | `"true"` (carrying) / `"false"` (idle) | Announces to screen readers when the user has activated drag mode. |
| `[inoDraggable]` | `draggable` | `"true"` | Native HTML5 Drag and Drop API compatibility; does not interfere with keyboard flow. |
| `[inoDroppable]` | `aria-dropeffect` | `"move"` / `"copy"` / `"link"` | Set by caller via directive input; announces what will happen to the item on drop. |
| `[inoDroppable]` | `role` | preserved from caller input (e.g. `"region"`, `"main"`, `"list"`) or defaulted to `"region"` | Must not override; a droppable that is a list should stay a `<ul>` and keep `role="list"`. |
| Both directives | `aria-label` / `aria-labelledby` | Caller-provided | **Caller responsibility:** every draggable and droppable must have a label (via attribute or semantic HTML). The directive does not auto-label. |
| Both directives | `aria-describedby` (optional) | Caller-provided ID of a description element | **Caller option:** point this to a description of the drag-drop contract or instructions; auto-announced when element receives focus (Jaws, NVDA, etc. usually read this). |

### 3.3 `aria-live` region — feedback on every state change

The component ships a module-level `aria-live` region (polite politeness level, not assertive,
to avoid interrupting screen-reader speech) that the directives write to at key moments:

| Event | Announcement text (template; caller can customize) |
|---|---|
| **Drag activated** | `"[Item name] picked up. Use arrow keys to navigate to a drop zone. Press Enter to drop, Escape to cancel."` |
| **Valid drop zone focused (while carrying)** | `"Drop zone [zone name]: [count] items. Press Enter to drop here."` or variant if zone is full/disabled. |
| **Invalid drop zone focused (while carrying)** | `"Drop zone [zone name] is full and cannot accept more items. Move to another zone."` |
| **Successful drop** | `"[Item name] dropped successfully in [zone name]."` |
| **Drop rejected** | `"[Item name] cannot be dropped here. Reason: [custom reason from handler]."` |
| **Carry cancelled** | `"Drop cancelled. [Item name] returned to [original zone name]."` |

**Implementation detail:** The region persists in the DOM (created once at module init), is hidden
from sighted users (`visibility:hidden` + offset positioning, or `aria-live` on a transparent
overlay). Each directive emission clears the region (to allow rapid successive announcements) and
writes the text. A 500ms-after-announcement timer clears the region again (to reset for the next
announcement). The caller does not create or manage this region — it is set up once per app.

### 3.4 Focus management

| Scenario | Behavior |
|---|---|
| **Drag activation** | Focus remains on the source element; does not move to target. The element is now in "carrying" state with `aria-grabbed="true"`. |
| **Navigating with arrows while carrying** | Programmatic focus movement (via `element.focus()`) to the next valid droppable; does not follow normal Tab order. The caller can configure which elements are "next" (e.g., only visible droppers, or only droppables of the same type). |
| **Drop success** | Focus returns to the source element (the originally dragged item). The caller can override this (e.g., focus the dropped item in the target zone instead). |
| **Escape / cancel** | Focus returns to the source element. |
| **Mouse user** | Focus is not moved by the drag-drop system; the click/drag interaction does not change where focus sits. On drop, focus remains wherever the user has tabbed. |

### 3.5 Contrast and RTL

**Contrast:** The component itself paints no text or non-text content. The visual feedback classes
(`ino-dragging-active`, `ino-drop-zone-active`, `ino-dropped-flash`) are caller-styled; the
caller is responsible for color contrast. The `aria-live` region is hidden and has no contrast
requirement.

**RTL:** Arrow key semantics are **logical**, not physical: "left" means "toward the start of the
document" (left in LTR, right in RTL). The `aria-dropeffect` values and `aria-grabbed` state are
language-neutral. The caller's styling of drop zones must account for RTL layout.

### 3.6 Mobile / touch behavior

**Out of scope for this spec.** This component spec covers keyboard + mouse on web. Touch
interactions (long-press, swipe, pinch) are not defined here; each app surface decides touch
UX separately. The directives will not interfere with touch, and a separate mobile touch handler
can coexist.

---

## 4. API and interaction bindings

### 4.1 `[inoDraggable]` — Source element directive

| Input | Type | Default | Behavior |
|---|---|---|---|
| `inoDraggable` | `any` | `undefined` | The data payload to carry. Passed to the drop handler; typically the item being dragged. |
| `inoDraggableDisabled` | `boolean` | `false` | If `true`, the element cannot be dragged. |
| `inoDraggableHandle` | `string` (CSS selector) | `undefined` | If set, only child elements matching this selector can initiate drag. Use for drag handles. |
| `inoDraggableDragStartClass` | `string` | `"ino-dragging-active"` | Class applied to the element when drag starts. |
| `inoDraggableOnDragStart` | `(data: any) => void` | `undefined` | Callback when drag begins (mouse down or Space key). |
| `inoDraggableOnDragEnd` | `(success: boolean) => void` | `undefined` | Callback when drag ends (drop or cancel). `success` is true if drop succeeded. |

### 4.2 `[inoDroppable]` — Target element directive

| Input | Type | Default | Behavior |
|---|---|---|---|
| `inoDroppable` | `any[]` | `[]` | Array of items currently in this drop zone. Used to track count, max limit, and render the list. |
| `inoDroppableAccept` | `(data: any) => boolean` | `() => true` | Predicate: return true if this zone accepts the dragged item. E.g., `(item) => item.type === 'task'`. |
| `inoDroppableMaxItems` | `number` | `Infinity` | Max items this zone can hold. If reached, shows "full" feedback. |
| `inoDroppableDisabled` | `boolean` | `false` | If `true`, this zone rejects all drops. |
| `inoDroppableEffect` | `"move" \| "copy" \| "link"` | `"move"` | Sets `aria-dropeffect` to announce intent. |
| `inoDroppableDropZoneClass` | `string` | `"ino-drop-zone-active"` | Class applied when this zone is over a valid drop target (mouse over) or focused (keyboard nav). |
| `inoDroppableDroppedFlashClass` | `string` | `"ino-dropped-flash"` | Class applied to both source and target for 200ms after successful drop. |
| `inoDroppableOnDrop` | `(data: any, zone: any) => Promise<void> \| void` | `undefined` | Callback when drop succeeds. Await async work (API call); rejected promise triggers error feedback. |

### 4.3 `[inoDropHandle]` — Named drag handle (child directive)

Used on a child element of `[inoDraggable]` to restrict drag initiation to that element only.

```html
<div [inoDraggable]="item">
  <span [inoDropHandle]>⋮⋮ (drag me)</span>
  <span>Read-only text</span>
</div>
```

| Input | Type | Default | Behavior |
|---|---|---|---|
| `inoDropHandle` | `void` | N/A | Marker directive; no inputs. Just the presence of this directive on a child element qualifies that element as a drag initiation point. |

### 4.4 `[inoDropZone]` — Visual drop zone container

A container that automatically applies drop-zone styling classes without wiring data binding.
Useful for styling feedback without managing the drop logic directly.

| Input | Type | Default | Behavior |
|---|---|---|---|
| `inoDropZone` | `void` | N/A | Marker directive. |

---

## 5. Implementation strategy — keyboard flow internals

### 5.1 Mouse / touch baseline

The directives wire the native `dragstart`, `dragover`, `drop`, `dragend` events (HTML5 DnD API)
for mouse, and `pointerdown`, `pointermove`, `pointerup` events for touch. These are **not**
affected by keyboard flow; they coexist.

### 5.2 Keyboard state machine

The directive maintains a state machine for each `[inoDraggable]`:

```
                      Space / Enter
                             ↓
idle ←─────────────────── carrying
                          ↑      ↓ Escape
                          │      └──→ idle
                          │
                    Enter (on droppable)
                      (if accepted)
                          │
                    ← drop → (onDrop callback)
                    success/fail
                         ↓
                      idle
```

**State variables:**
- `carryingElement: HTMLElement | null` — current element being carried (keyboard only).
- `carryingData: any` — the payload from `[inoDraggable]`.
- `sourceZone: HTMLElement` — where the item came from (for focus return).

### 5.3 Keyboard event handling

| Key | Carrying? | Handler |
|---|---|---|
| **Space / Enter** | No | On focused `[inoDraggable]`: activate carry, set `aria-grabbed="true"`, fire announce. |
| **Arrow Up/Down/Left/Right** | Yes | Move focus to next `[inoDroppable]` (in nav order or custom order). |
| **Tab / Shift+Tab** | Yes | Move focus using normal tab order (do not prevent default; let browser handle it). |
| **Enter** | Yes | If focused element is `[inoDroppable]`: call `inoDroppableOnDrop`, update state, announce result, return focus to source. |
| **Escape** | Yes | Abort carry, clear state, fire announce "cancelled", return focus to source. |

### 5.4 Arrow key focus movement

When carrying (keyboard only), arrow keys move focus to the **next** `[inoDroppable]` in a
configurable order. Options:

1. **DOM order:** Next `[inoDroppable]` in document order.
2. **Visible order:** Next visible `[inoDroppable]` (filtered by `offsetParent !== null`).
3. **Spatial order:** Nearest `[inoDroppable]` in the direction of the arrow (Right = eastmost,
   Left = westmost, etc.), using bounding-box positions.
4. **Custom order:** Caller-provided function to determine "next" element.

**Default: DOM order.** Caller can override via a provider or global config.

---

## 6. Example usage

```html
<!-- Left side: source list -->
<ul>
  <li *ngFor="let item of sourceItems" [inoDraggable]="item"
      [inoDraggableHandle]="'.drag-handle'"
      (inoDraggableOnDragEnd)="onSourceDragEnd($event)">
    <span class="drag-handle">⋮⋮</span>
    {{ item.name }}
  </li>
</ul>

<!-- Right side: target zone -->
<div [inoDroppable]="targetItems"
     [inoDroppableAccept]="canAccept"
     [inoDroppableMaxItems]="5"
     (inoDroppableOnDrop)="onTargetDrop($event)">
  <div *ngIf="targetItems.length === 0" class="empty-state">
    Drop items here
  </div>
  <ul *ngIf="targetItems.length > 0">
    <li *ngFor="let item of targetItems">{{ item.name }}</li>
  </ul>
</div>

<!-- Hidden aria-live region (component-level) -->
<div aria-live="polite" aria-atomic="true" class="ino-dragdrop-announce"></div>
```

---

## 7. Verification

| Gate | Result | Evidence |
|---|---|---|
| Keyboard flow end-to-end test (Jasmine) | Must pass | Space→arrow→Enter flow on demo page, focus in correct element after each step, announcements fired. |
| `aria-live` region receives all announcements | Must pass | Spyable directive input; record announcements across activation/move/drop/cancel scenarios. |
| Mouse/touch coexistence | Must pass | Drag with mouse while keyboard carry is in progress (should not conflict). |
| RTL keyboard navigation | Must pass | In an RTL-flipped layout, arrow keys move focus to visually-adjacent zones. |
| WCAG 2.2 compliance check | Must pass | Full keyboard operability; no mouse-required paths; ARIA attributes valid; focus visible at all times. |

---

## 8. Out-of-scope / future work

- **Drag-reorder within a list** (swapping item positions in the same zone) — separate component
  `ino-orderlist` (B3, INO-XXX).
- **Touch-only drag-drop** — mobile surfaces decide their own UX; this spec does not define it.
- **Multi-select drag** (grab multiple items at once) — out of scope; each item dragged independently.
- **Accessibility audit (D12n/L10n)** — language strings are hardcoded English in this spec;
  i18n keys will be added during build if required.
