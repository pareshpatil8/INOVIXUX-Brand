# `<ino-datepicker>` — component spec

**Issue:** INO-154 (INO-31 T-8, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `DatePicker` — `specs/primeng/llms-22.1.1.txt` line 52, route
`https://primeng.dev/datepicker`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Resolves DoD rows:** 1–11 (full component DoD, `docs/brand/17-phase-2-implementation-program.md`
plan rev 9 §2), 4-day estimate per that doc line 142.
**Depends on:** W0-2 (`tokens.css` frozen scale — dark/light/high-contrast + density), T-19
(`ino-label`'s size-tiered label pattern, reused for the trigger field label) — both `done` before
this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. `value`'s shape depends on `selectionMode`

There is one `@Input() value: Date | Date[] | null`, not three separately-typed inputs, so a
caller can bind `[selectionMode]` and `[value]` independently without a template-level type
mismatch. The contract:

- `single` → `Date | null`
- `range` → `Date[]` of length 0 (nothing picked), 1 (start picked, still awaiting the end) or 2
  (`[start, end]`, both inclusive)
- `multiple` → `Date[]`, unordered as clicked but re-sorted ascending on every emit, so a consumer
  rendering the array never has to sort it themselves

Switching `selectionMode` at runtime does not attempt to convert the previous `value` — the
consumer owns clearing it, the same way switching `ino-input`'s `type` doesn't attempt to coerce
an existing string value.

## 2. No `ControlValueAccessor`

Follows the existing `@Input() value` / `@Output() valueChange` banana-in-a-box convention every
other Tier-1 form component in this repo already uses (see `ino-input`'s class doc comment) rather
than implementing `ControlValueAccessor`. No Reactive/Template-driven Forms module is wired up
anywhere in this repo yet — adding CVA support to one component ahead of that decision would be a
one-off API shape nothing else matches.

## 3. Overlay reuses `ino-modal`'s dialog contract, anchored instead of centered

Overlay mode (`inline=false`, the default) is `role="dialog"` `aria-modal="true"` with a scrim and
`InoFocusTrapDirective` — the same hand-rolled WAI-ARIA dialog pattern `<ino-modal>` already
established (backdrop click / Escape / focus-trap), reusing the directive `ino-modal` itself
predates rather than a third hand-rolled Tab-containment implementation. The one difference: the
panel is anchored under the trigger field (`position: absolute`, `inset-block-start: calc(100% +
gap)`) instead of centered in the viewport, because a date picker is a field-attached control, not
a page-level interruption. `inline=true` renders the calendar grid directly with no
popup/backdrop/focus-trap at all — the grid's own buttons carry the component's full keyboard
contract regardless of display mode.

## 4. Time picker stops at hour/minute — no seconds

The issue's scope is "a time picker," not full `HH:mm:ss` precision. Every consumer scenario named
in the gap analysis (scheduling a meeting, picking a delivery slot) operates at minute
granularity; a seconds spinner would be dead UI. Carried explicitly as a **deliberate omission**
(DoD row 6) rather than silently dropped — see `datepicker.md`'s omissions section. `hourFormat`
(`'12' | '24'`) is carried because 12-hour AM/PM is the common India/APAC convention this repo's
`en-IN` locale default targets, and PrimeNG's own `DatePicker` carries the same input.

## 5. Keyboard grid navigation — day grid only, not month/year

The WAI-ARIA APG "Date Picker Dialog" pattern's roving-tabindex grid (arrow keys, Home/End,
PageUp/PageDown ±1 month, Shift+PageUp/PageDown ±1 year, Enter/Space to select) is implemented on
the **day grid** (`onGridKeydown`, `focusedDate` roving tabindex) because that pattern is written
against a day grid specifically — APG's own example never extends it to a month/year picker.
Month and year drill-view cells are plain `<button>`s reachable by ordinary Tab order with native
Enter/Space activation; a second roving-tabindex implementation for 12 buttons would duplicate the
mechanism for no keyboard-efficiency gain a 12-cell grid actually needs (Tab already reaches any
of them in at most 11 hops). Escape closes the overlay from any view (`onKeydown` on the overlay
container, not per-grid), matching APG's dialog-level Escape contract rather than being
re-implemented per view.

## 6. Locale — `Intl` over a hardcoded array, Monday-first default

Month and weekday names come from `Intl.DateTimeFormat(locale, …)`, never a hardcoded English
array — a non-English `locale` binding must not silently render English month names. First day of
week reads `Intl.Locale(locale).weekInfo.firstDay` where supported (Chromium/Node 20+); the
`weekInfo` accessor is not yet in TypeScript's DOM lib types, so it's read through a narrow
`unknown` cast rather than widening the whole file's typing. Falls back to Monday (`1`) — not
Sunday — everywhere else, because Monday-start is both the ISO-8601 default and the common
India/APAC convention this repo's `en-IN` default targets (per the issue's locale requirement).

## 7. Range/selected fills are solid roles, not `color-mix()` tints

`check-ds-adherence.mjs`'s `no-raw-color` rule bans `color-mix()` outright, even wrapping a
`var()` — so an "in-range" translucent accent tint (the idiom PrimeNG's own range picker uses) is
off the table. In-range cells use `--ino-color-surface-sunken` (a flat, already-audited neutral
fill) + `--ino-color-accent-text-safe` for the date number; selected/range-endpoint cells use a
solid `--ino-color-accent` fill, the same accent/on-accent pairing `ino-paginator`'s active-page
pill already established. No new contrast pair needed auditing.

## 8. `anyComponentStyle` budget — shared `.ino-datepicker__btn` base + local token aliases

The calendar grid, header, time picker and trigger field together exceed Angular's 8kB
`anyComponentStyle` error budget if every button-like part (nav arrows, drill-up heading,
gridcells, time spinners, am/pm, confirm) repeats its own reset/hover/focus-ring/transition rules.
Two techniques bring it in under budget without dropping any DoD-required state:

1. **`.ino-datepicker__btn`** — one base class (reset, `border-radius`, background transition,
   hover fill, `--ino-focus-ring` outline, disabled cursor) that every button-like template
   element also carries; element-specific classes hold only what differs (sizing, color, font,
   extra hover/active treatment).
2. **Local `--_x` custom-property aliases**, declared once on `:host(.ino-datepicker)`, for the
   handful of tokens.css roles this file references many times over (`--_muted`, `--_sunk`,
   `--_accent`, …). This is pure indirection, not a new value — each alias still resolves through
   its named tokens.css role one hop later, so DoD row 1 ("every declaration resolves through a
   semantic role") still holds; `check-ds-adherence.mjs` passes clean.

A handful of purely-mechanical, non-token rules (the backdrop scrim's `position:fixed;inset:0`,
the trigger's `overflow:hidden` ellipsis, the inline-panel's `box-shadow:none`) are set via an
inline `style` attribute in the template instead of a CSS class, since they carry no
color/space/radius/duration/font-size to route through a token and exist purely to stay inside the
component-style budget — `check-ds-adherence.mjs` still passes because none of those literals are
a colour, an off-scale numeric, a primitive token or a style-piercing selector.

## 9. Mobile parity (per plan rev 9 §5)

- **Capacitor** — not a separate port. The same Angular component/CSS renders in the Capacitor
  WebView; satisfied automatically once DoD rows 1–8 pass plus the 44px touch-target check, which
  `--ino-control-height-default` / `--ino-target-comfortable` already cover.
- **React Native** (`mobile/react-native/src/components/InoDatepicker.tsx`) and **Flutter**
  (`mobile/flutter/lib/widgets/ino_datepicker.dart`) are real ports, scoped to **single-selection
  only**: a touch (+ external-keyboard arrow-key, RN) calendar grid, `size`/`InoControlSize`,
  `disabled`/`loading`, and `minDate`/`maxDate`. Deliberately **not** ported to either native
  track:
  - **Range and multiple selection.** Both native surfaces target a phone-first single-date
    picking flow (per `docs/brand/13-mobile-app-patterns.md`'s mobile screen inventory); a
    two-tap range picker's affordances (mid-pick highlight, pending-start state) are a
    meaningfully bigger native UI problem than the web overlay's click-twice model, and no mobile
    screen in the inventory currently calls for it.
  - **Month/year drill-up views.** Web's drill-up header has no RN/Flutter equivalent pattern in
    this repo yet (no other ported component owns a comparable "tap the heading to zoom out"
    interaction); both native ports instead expose plain prev/next month navigation, which covers
    the actual touch interaction a phone calendar needs.
  - **The time picker.** No native spinner/AM-PM UI has been designed for either platform; adding
    one here would be inventing a second, unaudited control mid-port.
  
  This keeps both native ports at roughly the ~40% cost the porting rule targets: the day-grid
  math (`buildWeeks`/`addMonths`, mirrored 1:1 from the web component's `weeks`/`addMonths`) is
  the expensive part and is fully ported; the three omitted surfaces above are the parts of the
  web component's scope that don't yet have a native design precedent to port *to*.
- Hover and `:focus-visible` are dropped on both native ports (no pointer/keyboard-focus
  distinction on touch hardware) — the same rule `InoButton`'s RN/Flutter doc comments already
  state; pressed/selected/disabled carry over.
- **Flutter month-navigation announcement (INO-302).** `_navigate` migrated from the deprecated
  `SemanticsService.announce` to `SemanticsService.sendAnnouncement(View.of(context), ...)` —
  required because `announce` assumes a single implicit view and is incompatible with multiple
  windows. Checked against the Flutter SDK source (`semantics_service.dart`): both methods build
  the identical `AnnounceSemanticsEvent` and default to `Assertiveness.polite`; `sendAnnouncement`
  only adds the explicit `FlutterView` parameter. No change to announcement politeness/liveness —
  the screen reader still hears "‹Month› ‹Year›" the same way on month change.

## 10. Registry finding

`scripts/check-theme-parity.mjs` has no per-component registry — confirmed by reading the script
(it is a pure token-contract audit: dark/light/high-contrast + RN/Flutter value agreement). Nothing
to append for this component; DoD row 11's "do not add a per-component line" instruction is
satisfied by leaving that script untouched.

---

## Files touched

- `web/src/app/components/datepicker/ino-datepicker.component.ts`
- `web/src/app/components/datepicker/ino-datepicker.component.html`
- `web/src/app/components/datepicker/ino-datepicker.component.scss`
- `web/src/app/components/datepicker/SPEC.md` (this file)
- `mobile/react-native/src/components/InoDatepicker.tsx`
- `mobile/flutter/lib/widgets/ino_datepicker.dart`
- `docs/brand/06-angular-components/datepicker.md`
- `docs/brand/06-angular-components/previews/datepicker.html`
