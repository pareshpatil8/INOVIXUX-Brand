# `<ino-datepicker>` — component spec

**Issue:** [INO-154](/INO/issues/INO-154) (INO-31 T-8, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `DatePicker` — `specs/primeng/llms-22.1.1.txt` line 52, route
`https://primeng.dev/datepicker`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Gap register:** closes the `DatePicker` row (`❌`) in
`docs/brand/16-design-system-parity-vs-echeque-reference.md` §153, one of the four heaviest Tier-1
components alongside Table, MultiSelect and Select-rewrite.
**Depends on:** W0-2 (INO-124, control-size token scale) and T-19 (INO-140, `ino-label`) — both
merged before this branch started.

**Status: work in progress, spans multiple sessions.** This file is updated as each slice lands —
see §9 for the current build ledger. Do not read an unstarted row in §9 as a silent omission under
DoD row 6; it is tracked, not dropped.

---

## 1. Mobile (DoD row 9)

**Decision: ship all three tracks — Capacitor, React Native, Flutter — per the issue's explicit
"All three tracks" instruction, overriding the desktop-idiom default `ino-paginator/SPEC.md` §2
records for controls where a native alternative is strictly better.** A date field has no native-app
substitute the way a page-link row does (infinite scroll): every mobile form still needs to collect
a calendar date, so this is a genuine port, not a skin change. Native equivalents to keep parity
with while porting:

| Track | Native primitive underneath | Notes |
|---|---|---|
| React Native | Custom grid (no first-class native date grid in RN core) built on the same day-matrix algorithm as web | `@react-native-community/datetimepicker` is a *native OS sheet*, not a themeable grid — using it would forfeit token-driven theming, so this port reimplements the grid, matching the `ino-*` mobile pattern already used for `ino-select`/`ino-modal`. |
| Flutter | `CalendarDatePicker`/`showDatePicker` supply the interaction model reference; visuals are fully re-skinned against `theme/tokens.dart`, same as every other `ino-*` Flutter port | |
| Capacitor | Wraps the web component (Capacitor apps render the Angular web tree) | No separate native code; theming and behavior come for free from the web implementation |

## 2. Variants (DoD row 6) — build ledger

| Variant | Status | Notes |
|---|---|---|
| Single date selection | ✅ shipped (this slice) | Month grid, keyboard grid nav, min/max/disabled dates |
| Inline mode | ✅ shipped (this slice) | `mode="inline"` renders the grid directly, no popover/trigger |
| Overlay mode (popover anchored to a text trigger) | ⏳ not yet | Needs a positioning strategy consistent with `ino-modal`'s `FocusTrap` reuse — next slice |
| Range selection | ⏳ not yet | Needs a second "anchor" date in component state + a distinct range-highlight visual role |
| Multiple selection | ⏳ not yet | Needs a `Date[]` value shape distinct from range's `[Date, Date]` tuple |
| Month/year picker (fast navigation) | ⏳ not yet | A second grid mode (`view: 'date' \| 'month' \| 'year'`) toggled from the header |
| Time picker | ⏳ not yet | Separate hour/minute (/second) spinner row, shown when `showTime` is set |
| Locale story (India/APAC) | ✅ shipped (this slice) | Weekday/month names and week-start-day resolved via `Intl.DateTimeFormat`/`Intl.Locale.weekInfo` from a `locale` `@Input` (defaults to `'en-IN'`); no hardcoded English strings |

Each `⏳` row gets its own commit/session and flips to `✅` here as it lands. When the last row
flips, `docs/brand/16-…-parity-vs-echeque-reference.md` §153 gets its own follow-up edit.

## 3. Eight states (DoD row 5)

| State | Plan |
|---|---|
| Default | `.ino-datepicker__day` base rule |
| Hover | `:hover:not(:disabled)` on day buttons |
| Active/pressed | `:active:not(:disabled)`, same pressed-accent-fill idiom as `ino-paginator` |
| Focus-visible | `--ino-focus-ring`/`--ino-focus-ring-offset` on the roving-tabindex day cell — never a hand-rolled outline |
| Disabled | `disabled` `@Input` on the whole control → every day button gets native `disabled` + `[data-disabled]` host attr |
| Readonly | `readonly` `@Input` → `[data-readonly]` host attr; days stay focusable/visible (so the current selection is still perceivable) but selection is a no-op, matching the `ino-paginator` readonly-vs-disabled distinction |
| Invalid | `invalid` `@Input` → `[data-invalid]` host attr + danger-text-safe border, for when this sits inside a form with a required/range constraint |
| Loading/busy | `loading` `@Input` → `[data-loading]` + `[attr.aria-busy]` on host; used when a consumer is async-validating a picked date server-side |

Per-day-cell state beyond the eight above: `data-today`, `data-selected`, `data-outside-month`,
`data-disabled-date` (a specific date disabled via `minDate`/`maxDate`/`disabledDates`, independent
of the whole-control `disabled` state).

## 4. Size API (DoD row 3)

Reads all six Wave 0 control-size aliases via `InoControlSize` (`sm | default | lg`), same import as
`ino-paginator`/`ino-select`. Size scales the day-cell tap target and the header nav buttons; the
grid itself does not reflow at different sizes, only individual control heights change.

## 5. Density (DoD row 4)

`--ino-row-min-height` sets the day-cell minimum block-size floor so the grid behaves under
`[data-density="dense"]` the same way `ino-paginator`'s row-like bar does — 44px fluid-default
fallback outside a density ancestor.

## 6. Motion (DoD row 7)

Month-to-month transitions use `--ino-motion-duration-base` / `--ino-motion-easing-standard`
(a horizontal slide, matching the "next/prev" directionality) inside an
`@media (prefers-reduced-motion: no-preference)` block, same idiom `ino-modal.component.scss` uses —
outside that query, or under `reduce`, the month swap is instant with no transform.

## 7. Accessibility (DoD row 8)

**Grid pattern.** The day grid uses the WAI-ARIA `grid` pattern: `role="grid"` on the day table,
`role="row"` per week, `role="gridcell"` per day `<button>`, `aria-selected` on the selected cell(s).
Roving `tabindex` (`0` on the focused/selected day, `-1` elsewhere) keeps one tab stop for the whole
grid, matching the ARIA APG date-picker grid example.

### Keyboard map

| Key | Action |
|---|---|
| `←` / `→` | Move focus one day back/forward (crosses month boundaries, triggering a month change) |
| `↑` / `↓` | Move focus one week back/forward |
| `Home` / `End` | Jump to the first/last day of the focused week |
| `PageUp` / `PageDown` | Previous/next month; `Shift+PageUp/PageDown` — previous/next year (reserved for the month/year-picker slice) |
| `Enter` / `Space` | Select the focused day |
| `Escape` | (overlay mode, next slice) close the popover, return focus to the trigger |

Contrast/targets follow the same control-size-scale guarantee `ino-paginator/SPEC.md` §5 records:
never below the 24px SC 2.5.8 floor, 44px comfortable at fluid `default`.

## 8. RTL

Grid layout uses CSS Grid with no explicit column-direction override, so day order mirrors under
`dir="rtl"` automatically (`grid-auto-flow` is row-major and direction-agnostic). Header nav
prev/next chevrons follow the same `:host-context([dir='rtl']) ... svg { transform: scaleX(-1); }`
exception `ino-paginator/SPEC.md` §6 records for the same reason (semantic back/forward reverses
under RTL; logical properties can't express glyph chirality). All spacing/sizing uses logical
properties only.

## 9. Build ledger (updated per session)

| Date | Session | What landed |
|---|---|---|
| 2026-09-22 | This slice | Directory scaffold, this SPEC.md, single-date grid with keyboard nav, inline mode, min/max/disabled dates, locale-aware names, size API, states, tokens-only styling, RTL chevron flip |

**Next action (whoever picks this up next):** overlay/popover mode reusing `FocusTrap`, then range
selection, then multiple selection, then month/year fast-nav view, then time picker, then the three
mobile ports, then the docs artifact (`docs/brand/06-angular-components/datepicker.md` + preview
HTML), then the `check-theme-parity.mjs` registry line (see `ino-paginator/SPEC.md` §7 — no registry
currently exists; do not invent one solo, file a Wave 0 amendment if still needed once this ships).
