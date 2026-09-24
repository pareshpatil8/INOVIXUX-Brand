# `overlay/` — shared overlay primitives — INO-271 refactor spec

Not a component directory — there is no `<ino-overlay>` element. This holds code shared by the
overlay family: `<ino-confirm-popup>` (INO-148), `<ino-popover>` (INO-150), `[inoTooltip]`
(INO-149), and — for the event contract in §2 only, since it owns no placement code —
`<ino-modal>` (INO-83). Each of those components' own `SPEC.md` still owns everything specific to
that component; this file only covers what's genuinely shared.

---

## 1. `overlay-position.ts` — one module, one `InoOverlayPosition`

Raised by CTO merge-hygiene review of PR #38 (INO-268 §5): `confirm-popup` originally owned the
only copy, documented as "private" with a doc comment anticipating a second consumer; `popover`
then forked it (renamed `popup`→`panel`) because DoD row 11 scoped that PR to
`web/src/app/components/popover/**` and promoting a shared module would have widened that diff;
`tooltip` reached across the component boundary and imported `confirm-popup`'s "private" type
directly. Three dispositions of one 114-line file, two structurally-identical-but-distinct
`InoOverlayPosition` unions that would silently diverge the day someone added a fifth position
(e.g. `top-start`) to only one of them.

INO-271 promotes the module here, unchanged signature, and deletes both prior copies. All three
placement consumers (`confirm-popup`, `popover`, `[inoTooltip]`) import
`computeOverlayPlacement`/`InoOverlayPosition`/`InoOverlaySize`/`InoOverlayPlacement` from this one
file. No component-private copy remains, and no component imports another component's internal
module.

**Positioning is physical on purpose** — same reasoning previously duplicated in
`confirm-popup/SPEC.md` §2 and `popover/SPEC.md` §3, now stated once here and cited by both:
`computeOverlayPlacement` takes its anchor rectangle from `Element.getBoundingClientRect()`, which
always reports coordinates in physical viewport space, already correctly reflecting a mirrored
`dir="rtl"` layout. Writing that physical coordinate into a *logical* CSS property
(`inset-inline-start`) would let the browser re-mirror an already-mirrored value under RTL and
misplace the overlay on the wrong side of its anchor. `top`/`left` for a JS-computed,
`getBoundingClientRect()`-derived position is the standard, RTL-correct technique (Floating UI,
Popper use the same approach) — the DoD "logical properties only" rule targets static, declarative
CSS, not coordinates computed from a physical measurement API.

**Scope of the algorithm**: one opposite-side flip when the preferred side doesn't fit, then a
viewport clamp. Not flip/shift/auto-placement middleware in the Floating UI/Popper sense (no
cross-axis start/end variants, no 12-way grid) — every anchored case in this design system today is
a trigger near a viewport edge, which the single flip + clamp already covers. A fuller
placement-strategy engine is scope for whatever future consumer actually needs it.

---

## 2. Overlay lifecycle event contract

Before INO-271, three components each answered "when do lifecycle outputs fire?" differently, by
accident rather than design:

- `<ino-popover>` emitted `shown`/`hidden` only from its own imperative methods (`show()`/`close()`
  via `toggle()`); an external caller driving `[(open)]` by mutating the bound flag directly, without
  ever calling `toggle()`, produced no `shown`/`hidden` at all.
- `<ino-confirm-popup>` had no `shown`/`hidden` outputs at all — only `openChange`.
- `<ino-modal>` had `closed` (imperative `requestClose()` only — Escape/backdrop/programmatic calls
  of it) but no `opened` counterpart, and the same input-driven gap as `popover`.
- `[inoTooltip]` had neither; it is driven entirely internally (hover/focus/timers), so it had no
  gap in practice, but no explicit contract either.

**The rule**: a lifecycle output pair (`shown`/`hidden` for the two anchored popups,
`opened`/`closed` for the modal, matching each component's pre-existing naming rather than forcing
a rename) fires exactly once per real open/closed **state transition**, regardless of what caused
it — an imperative method call, an `[(open)]`-bound input mutation, Escape, backdrop or
outside-pointer dismissal, or any future path. "Regardless of path" is the operative clause: the
outputs describe the component's own state, not which API surface was used to change it.

**How it's implemented, uniformly**: each component funnels every path that can change `open`
through one private `setOpen(next: boolean)` method, guarded by a private `isOpenState` flag that
is distinct from the public `open` input:

```ts
private isOpenState = false;

private setOpen(next: boolean): void {
  this.open = next;
  if (this.isOpenState === next) return;   // already in this state — no redundant transition
  this.isOpenState = next;
  this.openChange.emit(next);
  if (next) { this.shown.emit(); this.activate(); }
  else      { this.hidden.emit(); this.deactivate(); }
  this.cdr.markForCheck();
}

ngOnChanges(changes: SimpleChanges): void {
  if (changes['open']) this.setOpen(this.open);
}
```

The `isOpenState` guard (not a comparison against `this.open`) is load-bearing: Angular writes the
new value onto the `@Input` property *before* calling `ngOnChanges`, so by the time `setOpen` runs
from that path, `this.open` already equals `next` — comparing against it would always look like "no
change." A two-way `[(open)]` binding also echoes the value back through `openChange` synchronously,
which schedules a follow-up `ngOnChanges` pass with an unchanged value; without a separate
transition-tracking flag that pass would double-emit `shown`/`hidden`, reintroducing the exact
duplicate-`shown` bug INO-150 fixed by moving the emit to `show()`'s single state-transition site.
`isOpenState` makes that fix general instead of ad hoc: every path collapses onto one emission per
real transition.

`<ino-confirm-popup>` gained `shown`/`hidden` outputs it didn't previously have, and `<ino-modal>`
gained `opened` — both are additive API, not breaking changes. `[inoTooltip]` gained `shown`/`hidden`
outputs on the directive for the same conformance, emitted from its existing single-path
`show()`/`hide()` methods (the directive has no `[(open)]`-equivalent bindable input, so there was
no double-emission risk to guard against there — `isOpenState`-style tracking was unnecessary).

---

## 3. Window listeners stay in each component — not promoted here

The issue that raised this refactor speculated that `confirm-popup` and `popover` registering
`resize`/`scroll` (`capture: true`) listeners without `zone.runOutsideAngular` was forcing a
full-application change-detection tick on every scroll while an overlay is open, and proposed
moving that pattern into a shared module.

That diagnosis doesn't hold in this codebase: `web/angular.json` has no zone.js polyfill entry and
`app.config.ts` has no `provideZonelessChangeDetection`/legacy zone provider either — this app
boots without zone.js (see `modal/ino-modal.component.ts`'s own doc comment, "this app runs
zoneless"). With no zone.js patching `addEventListener`, there is no automatic change-detection tick
to trigger in the first place; `NgZone.runOutsideAngular` is a no-op wrapper in this configuration,
so wrapping the `resize`/`scroll` listeners in it would change nothing measurable. The other
`zone.runOutsideAngular` calls already in these components (the deferred `pointerdown` listener,
`[inoTooltip]`'s show/hide timers) are similarly inert today; they're left as-is because removing
them is a separate, unrelated cleanup this issue doesn't need to do.

The part of DoD item 3 that *is* real — OnPush needs `markForCheck()` after `reposition()` writes
`top`/`left`/`effectivePosition` — was already fixed in `confirm-popup` and `popover` by the INO-150
/ INO-270 behavioral fixes this issue was sequenced behind; both `reposition()` methods call
`this.cdr.markForCheck()` at the end today.

Given the above, `resize`/`scroll` listener registration stays a two-line pattern local to each
component rather than moving here: promoting a stateful `addEventListener`/`removeEventListener`
pair into a shared, presumably-injectable primitive would add DI surface without removing any real
duplication or fixing a real bug.
