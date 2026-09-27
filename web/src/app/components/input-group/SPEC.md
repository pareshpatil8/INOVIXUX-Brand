# `<ino-input-group>` — component spec

**Issue:** [INO-318](/INO/issues/INO-318) (INO-31 F-1, T-17, Tier 1)
**Parity benchmark:** PrimeNG 22.1.1 `InputGroup` — `specs/primeng/llms-22.1.1.txt` line 73, route
`https://primeng.dev/inputgroup`: "Text, icon, buttons and other content can be grouped next to an
input." PrimeNG is a benchmark, **not a runtime dependency**.
**Named dependency:** `ino-input.component.ts`'s class doc names this component as the sanctioned
prefix/suffix-addon mechanism (audit finding F-1).

---

## 1. Non-interactive shell: 3 of 8 states carried, 5 N/A (DoD row 5)

| State | Carried? | Reason |
|---|---|---|
| Default | ✅ | Border/background shell always visible |
| Disabled | ✅ | `disabled` @Input dims the group's own addon chrome; caller still sets `disabled` on the projected control itself |
| Focus-visible | ✅ | `:host:has(:focus-visible)` recolors the shared border to the accent role when the projected control (or an addon button) is focused — see §2 |
| Active/pressed, Hover, Invalid, Loading/busy, Readonly | N/A — not carried | These are the wrapped control's own states; the group shell has no independent notion of them, matching PrimeNG's own InputGroup (a layout primitive, not a form-state owner) |

## 2. Border/background hand-off without `::ng-deep` (DoD row 1 / repo governance N-11)

Same governance constraint `ino-icon-field`'s SPEC.md §2 documents: styling a projected native
control from this component's own stylesheet needs `::ng-deep`, which is not sanctioned here (doc
16 §4.3, N-11). Unlike `ino-icon-field` (a single padding hand-off), this component needs the
control's own border/background/radius *cleared* so the group reads as one visually-joined field —
`ngAfterContentInit` uses the same `Renderer2` + `querySelector` technique to set `border: none`,
`background: transparent`, `border-radius: 0` directly on the one native node the projected control
renders, reversed in `ngOnDestroy`.

`:host:has(:focus-visible)` (§1) is why the control's own focus ring must still work despite its
border being cleared: `:has()` lets the host react to a *descendant's* focus state without needing
to reach into that descendant's stylesheet at all — no Renderer2 needed for this part, since
`:focus-visible` is the browser's own pseudo-class on the real DOM node, not something scoped by
Angular's emulated encapsulation.

| Concern | Token |
|---|---|
| Shell background | `--ino-color-surface-sunken` |
| Shell border | `--ino-color-border` (default) / `--ino-color-accent` (focus-within) |
| Shell radius | `--ino-radius-md` |
| Addon divider | `--ino-color-border`, 1px |
| Addon text colour | `--ino-color-on-surface-muted` |
| Addon gap/padding | `--ino-space-2` / `--ino-space-3` |
| Border transition | `--ino-motion-duration-fast` / `--ino-motion-easing-standard` |
| Disabled dimming | `opacity: 0.5` — same literal every sibling's disabled state uses |

No `[data-theme]` branch in the component.

## 3. Size API (DoD row 3)

`size="sm" | "default" | "lg"` re-points the same three Wave 0 aliases (`--ino-control-height`,
`--ino-control-padding-inline`, `--ino-control-font-size`) `ino-input`'s own `:host([data-size])`
blocks use. Shippable here (unlike `ino-icon-field`'s deliberate omission, SPEC.md §3 there)
because this component owns the entire visual box outright once the control's own border/background
are cleared — there is no second, independently-sized box left to drift out of sync.

## 4. Density (DoD row 4)

`min-block-size: var(--ino-row-min-height, var(--ino-control-height, var(--ino-target-comfortable)))`
— same fallback chain `ino-input.component.scss` uses, so a dense/fluid ancestor's row floor is
honored without a separate branch.

## 5. Variants built (DoD row 6)

| Named in the PrimeNG benchmark | Shipped | Surface |
|---|---|---|
| Text/icon/button addons | ✅ | `[ino-addon-start]` / `[ino-addon-end]` content-projection slots — any content (text, icon, `<ino-button>`) |
| Multiple addons per side | ✅ | Both slots accept any number of projected elements; each renders as a flex child inside the shared addon wrapper |
| Size | ✅ | `size` @Input (§3) |

No deliberate omissions.

## 6. Motion (DoD row 7)

Border-colour transition on focus-within uses `--ino-motion-duration-fast` /
`--ino-motion-easing-standard`, zeroed under `prefers-reduced-motion: reduce`.

## 7. Accessibility contract (DoD row 8)

**Role.** None on the host — a plain visual grouping shell, no ARIA semantics of its own. The
projected control keeps its own native role/label association untouched; this component never
touches the control's `id`, `aria-*`, or label wiring, only its border/background/padding.

**Keyboard.** None owned by this component — focus moves through the projected control and any
addon buttons in natural DOM order, same as if the group's border/background never existed.

**Contrast.** `--ino-color-border` (default shell) and `--ino-color-accent` (focus) are both
already-audited non-text roles (SC 1.4.11, 3:1 floor) per `check-theme-parity.mjs`'s existing
checks for those roles on sibling field components.

**Target size.** Addon buttons/icons must independently satisfy SC 2.5.8 if interactive — this
group only supplies padding/divider chrome around whatever the caller projects, it does not
enforce a minimum hit area on projected content.

**RTL.** Logical properties only (`border-inline-end`/`border-inline-start`, `padding-inline`) —
"start"/"end" addon slots correctly swap sides under `dir="rtl"`.

## 8. Mobile parity (DoD row 9)

**Web-only for now.** No React Native or Flutter port exists for this component as of this issue.
Recorded in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` as `web-only` on both platforms
with this reason.

## 9. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (registry entry added, §8) |
| `node scripts/check-spec-citations.mjs` | ✅ passes |
| `ng build` (`web/`) | ✅ passes |
| Hardcoded colour/space/radius/duration/font-size | none |
