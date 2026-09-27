# `<ino-icon-field>` — IconField

> Parity benchmark: PrimeNG 22.1.1 `IconField` (`specs/primeng/llms-22.1.1.txt`, line 67).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-16, the sanctioned icon-slot
> mechanism `ino-input.component.ts`'s own doc comment names).
> Decisions record: `web/src/app/components/icon-field/SPEC.md`.

Wraps a single form control and positions a leading or trailing icon inside its bounds. This is
the sanctioned mechanism for icon slots in this design system — Tier-1 form controls (`ino-input`,
etc.) deliberately do not carry their own `@Input() icon`; wrap them with this component instead.

```html
<ino-icon-field iconPosition="start">
  <input type="text" placeholder="Search" />
  <svg ino-icon>…</svg>
</ino-icon-field>
```

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `iconPosition` | `'start' \| 'end'` | `'start'` | Leading vs. trailing icon |
| `disabled` | `boolean` | `false` | Dims the icon in step with the wrapped control's own `disabled` |

Content projection: default slot for the control, `[ino-icon]` for the icon.

### Size API — deliberate omission

**No `size` @Input.** The offset reads a single fixed rung (`--ino-control-icon-size-default`),
not `sm`/`lg`. A second, independently-settable size here could drift out of sync with whatever
size the wrapped control itself is set to. See [SPEC.md §3](../../../web/src/app/components/icon-field/SPEC.md).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Icon rendered at rest |
| Disabled | `disabled` input | Icon dims to `opacity: 0.5` |
| Hover / Active / Focus-visible / Invalid / Loading / Readonly | N/A | These belong to the wrapped control; the icon carries no state of its own |

---

## Motion

None — this component only sets a static inline style on mount and on `iconPosition` change.

---

## Accessibility contract

**Role / ARIA** — none on the host; the icon is wrapped in `aria-hidden="true"` (decorative). If
the icon is meaningful, the caller's control/label must carry the equivalent text.

**Keyboard** — none; the icon is `pointer-events: none` and can never intercept a click or become a
tab stop.

**Contrast** — N/A, decorative graphic (SC 1.4.11 exempts it).

**Target size** — N/A; the wrapped control's own target size is unaffected (padding only reserves
space, it does not shrink the control's hit area).

**RTL** — logical properties only (`inset-inline-start`/`inset-inline-end`, `padding-inline-*`);
`iconPosition="start"` correctly renders on the right under `dir="rtl"`.

### Padding hand-off, no `::ng-deep`

Styling a projected native control from this component's stylesheet would need `::ng-deep`, which
is not sanctioned in this design system (governance N-11). Instead, the same `Renderer2` +
`querySelector` technique `<ino-float-label>` established is reused: the control's own
`padding-inline-{start,end}` is set directly to `var(--ino-icon-field-offset)`, a CSS custom
property declared on `:host` so the value stays in sync with no numeric duplication.

---

## Deliberate omissions

- **`size` @Input** — see [Size API](#size-api-—-deliberate-omission) above.

## Mobile parity

**Web-only for now** — no React Native or Flutter port exists for this component as of this issue.
