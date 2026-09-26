# `<ino-tabs>` — Tabs

> Parity benchmark: PrimeNG 22.1.1 `Tabs` (`specs/primeng/llms-22.1.1.txt`, line 116).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Tier 1, Panel group (INO-135 / INO-31 T-26).
> Preview: [`previews/tabs.html`](previews/tabs.html).
> Decisions record: `web/src/app/components/tabs/SPEC.md`.

A WAI-ARIA APG tablist with **automatic activation**: selection follows arrow-key focus, Enter/Space
still work, and Delete closes a closable tab. Two components, always used together — `<ino-tabs>`
owns the strip, keyboard model and selection; each projected `<ino-tab-panel>` owns one tab's label,
flags and content.

```html
<ino-tabs>
  <ino-tab-panel id="overview" label="Overview">…</ino-tab-panel>
  <ino-tab-panel id="risks" label="Risks" invalid>…</ino-tab-panel>
  <ino-tab-panel id="audit" label="Audit trail" disabled>…</ino-tab-panel>
</ino-tabs>
```

The tablist is **derived from the projected panels** rather than authored separately — PrimeNG's
`Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel` five-part composition is collapsed to two on purpose,
so a caller cannot produce a tab strip whose `aria-controls` graph doesn't match its panels. Ids are
generated (`{id}-tab` / `{id}-panel`), never hand-wired. Reasoning: `SPEC.md` §4.

---

## API — `InoTabsComponent` (`<ino-tabs>`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `activeId` | `string \| undefined` | `undefined` | **Bind it → controlled**; omit it → uncontrolled (the component picks the first enabled panel and owns selection). Two-way bindable as `[(activeId)]` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | The shared `InoControlSize` union; drives height / padding / font-size / gap / icon-size off the Wave 0 control-size scale |
| `scrollable` | `boolean` | `false` | Horizontal scroll + ‹/› buttons, shown only when the strip actually overflows. Default mode wraps instead, so tabs are never silently lost |
| `readonly` | `boolean` | `false` | Focusable but inert: arrows still move focus, activation and close are refused, the ✕ is not rendered |

| Output | Payload | Fires when |
|---|---|---|
| `activeIdChange` | `string` (panel id) | A tab is activated — by click, arrow key, Home/End or Enter/Space. Emitted in **both** modes |
| `tabClose` | `string` (panel id) | The ✕ is clicked or Delete/Backspace is pressed on a closable tab |

`tabClose` is a **request**: the component never removes a panel it did not create. Drop the panel
from your own list on the event; the next content-children tick re-picks an active tab if the closed
one was selected.

## API — `InoTabPanelComponent` (`<ino-tab-panel>`)

| Input | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | auto (`ino-tab-N`) | The identity used by `activeId`, `tabClose`, and the generated `aria-controls`/`aria-labelledby` pair |
| `label` | `string` | `''` | The tab's visible text and accessible name |
| `disabled` | `boolean` | `false` | Skipped by arrow keys and by the uncontrolled initial pick; cannot be activated |
| `closable` | `boolean` | `false` | Renders the ✕ affordance and enables the Delete key |
| `invalid` | `boolean` | `false` | Danger-coloured label **plus** a dot, so validity is never colour-only; sets `aria-invalid` |
| `loading` | `boolean` | `false` | Spinner in the tab, `aria-busy` on tab and panel, centred spinner in the panel body |

Content is projected: everything inside `<ino-tab-panel>` is the panel body, rendered only while the
panel is active.

---

## Usage

**Uncontrolled** — no state needed; the first enabled panel is selected.

```html
<ino-tabs size="sm">
  <ino-tab-panel id="summary" label="Summary">…</ino-tab-panel>
  <ino-tab-panel id="detail" label="Detail">…</ino-tab-panel>
</ino-tabs>
```

**Controlled** — the parent owns selection (deep links, restoring a saved tab, a wizard step).

```html
<ino-tabs [(activeId)]="step">
  <ino-tab-panel id="applicant" label="Applicant" [invalid]="form.applicant.invalid">…</ino-tab-panel>
  <ino-tab-panel id="screening" label="Screening" [loading]="screening.pending()">…</ino-tab-panel>
</ino-tabs>
```

**Scrollable + closable** — a dynamic document-tab strip.

```html
<ino-tabs scrollable [(activeId)]="openDocId" (tabClose)="closeDoc($event)">
  @for (doc of openDocs(); track doc.id) {
    <ino-tab-panel [id]="doc.id" [label]="doc.title" closable>…</ino-tab-panel>
  }
</ino-tabs>
```

**Readonly** — an audit view that shows which step was selected without letting the viewer change it.

```html
<ino-tabs readonly [activeId]="record.stepAtSubmission">…</ino-tabs>
```

---

## States

All eight DoD states are real here — this is a control, not a label.

| State | Treatment |
|---|---|
| Default | `--ino-color-on-surface-muted` label, transparent underline |
| Hover | Label promotes to `--ino-color-on-surface`; suppressed while `readonly` or disabled |
| Active/pressed | `--ino-color-accent-active` (the W0 pressed-fill role) |
| Focus-visible | `--ino-focus-ring`, drawn **inside** the tab so a scrollable strip cannot clip it |
| Disabled | Native `[disabled]` + `--ino-color-on-surface-subtle`; skipped by every movement key |
| Readonly | Focus model intact, activation and close refused, `aria-disabled` on non-active tabs |
| Invalid | `--ino-color-danger-text-safe` label + dot + `aria-invalid`; the underline turns danger-coloured when the invalid tab is also selected |
| Loading | Spinner + `aria-busy` on the tab and the panel; the label never leaves the DOM |

**Selected** (`aria-selected` + a 2px `--ino-color-accent` underline) is a separate axis from
`:active` — see `SPEC.md` §1.

---

## Size and density

`size` maps to the Wave 0 control-size aliases — `--ino-control-height`,
`--ino-control-padding-inline-roomy` (the roomy rung, like `ino-button`), `--ino-control-font-size`,
`--ino-control-gap`, `--ino-control-icon-size`. Nothing is invented locally.

Density works with no component-level branch: `[data-density="dense"]` redefines those same aliases,
so the strip drops from the 44px comfortable rung to the 32px dense one automatically.
`--ino-row-min-height` is **deliberately not read** — a tab strip is not row-based, so there is no
enclosing row whose floor it could fall below, and a second height source would just be drift
(`SPEC.md` §3).

---

## Motion

| Moving thing | Duration | Easing |
|---|---|---|
| Tab label colour / background | `--ino-motion-duration-fast` | `--ino-motion-easing-standard` |
| Active underline | `--ino-motion-duration-base` | `--ino-motion-easing-standard` |
| Panel enter (fade + `--ino-space-1` rise) | `--ino-motion-duration-base` | `--ino-motion-easing-decelerate` |
| Spinners | `--ino-motion-duration-slow` | `linear` |

Panel *exit* is instant on purpose: the outgoing panel unmounts immediately, and animating it out
would leave stale content painted while the new tab is already being announced.

`prefers-reduced-motion: reduce` is handled in two places — the stylesheet (transitions off,
animations declared only under `no-preference`) **and** in TypeScript, because the ‹/› buttons'
smooth scroll is a script-driven animation that no CSS branch can reach; under reduce it becomes an
instant jump.

---

## Accessibility contract

**Roles / ARIA**

| Element | Contract |
|---|---|
| Track | `role="tablist"`, `aria-orientation="horizontal"` |
| Tab | `role="tab"`, `aria-controls`, `aria-selected`, roving `tabindex`, plus `aria-busy` / `aria-invalid` / `aria-disabled` as applicable |
| Panel | `role="tabpanel"`, `aria-labelledby`, `aria-busy`, `hidden` when inactive, `tabindex="0"` |
| Scroll buttons | `<button aria-label="Scroll tabs backward / forward">`, deliberately in the tab order — the only pointer-free way to reach an off-screen tab without arrow keys |

**Keyboard**

| Key | Action |
|---|---|
| `Tab` | Into the strip (landing on the selected tab), then out to the panel — roving tabindex means one stop, not N |
| `ArrowRight` / `ArrowLeft` | Move focus **and** selection to the next/previous enabled tab, wrapping. Reversed under RTL |
| `Home` / `End` | First / last enabled tab |
| `Enter` / `Space` | Activate the focused tab |
| `Delete` / `Backspace` | Close the focused tab if `closable` |

**The ✕ is not a nested control.** A button inside the tab `<button>` would be invalid HTML and
unreachable by keyboard, so the ✕ is a presentational `aria-hidden` span for pointer users, the
Delete key is the keyboard path, and a visually-hidden `", closable — press Delete to close"` suffix
puts the affordance into the tab's accessible name.

**Contrast** — every colour is a semantic role audited across dark / light / high-contrast by
`node scripts/check-theme-parity.mjs`. The selected tab carries a 2px `--ino-color-accent` underline
in addition to a text-colour change, so the essential boundary clears 3:1 without leaning on the 1px
hairline, and the invalid state pairs colour with a dot (SC 1.4.1).

**Target size (SC 2.5.8)** — tabs and scroll buttons are a full `--ino-control-height` (44px
comfortable, 32px dense). The ✕ hit box is floored with `max(var(--ino-control-icon-size),
var(--ino-target-min))`, because the icon size alone (20px fluid / 16px dense) is under 24px.

**RTL** — the stylesheet is logical-property-only. Three things needed explicit handling because
logical CSS cannot reach them: the arrow-key direction, the sign of `scrollBy()` (whose `left` option
is physical), and the ‹/› glyphs themselves, mirrored with `:host(:dir(rtl)) { transform: scaleX(-1) }`.

---

## Deliberate omissions

Recorded rather than silently dropped (full reasoning in `SPEC.md` §4):

- **Separate `TabList` / `TabPanels` elements.** Collapsed into `<ino-tabs>`; splitting them would
  make a mismatched tab/panel set representable.
- **Vertical orientation.** Out of scope for the Panel-group strip; it is a different keyboard map
  and a different indicator edge, addable later as an `orientation` input.
- **Manual activation mode.** Automatic activation is implemented (APG-preferred here) and
  Enter/Space still work, so the manual muscle memory is not punished.

---

## Mobile parity

All three tracks ship.

- **Capacitor** — not a separate port; the same Angular component and SCSS render in the WebView
  (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoTabs.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_tabs.dart`.

Both ports are the **strip only** and **controlled only**: the parent owns the active id and renders
the content with the platform's own idiom (an `IndexedStack`, a `switch`, a navigator) rather than a
re-implementation of Angular content projection. The keyboard map, focus ring and hover state are
dropped — the same states `InoButton` drops on mobile, for the same reason. No new mobile theme
tokens were added; both ports read only roles that already exist. Full scope table: `SPEC.md` §9.
