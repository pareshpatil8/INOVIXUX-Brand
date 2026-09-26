# `<ino-input-group>` — InputGroup

> Parity benchmark: PrimeNG 22.1.1 `InputGroup` (`specs/primeng/llms-22.1.1.txt`, line 73).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/24-primeng-component-audit-ino-31.md` F-1 (T-17, the sanctioned
> prefix/suffix-addon mechanism `ino-input.component.ts`'s own doc comment names).
> Decisions record: `web/src/app/components/input-group/SPEC.md`.

Groups a control with one or more prefix/suffix addons (text, icon, or a button) into a single
visually-joined field.

```html
<ino-input-group>
  <span ino-addon-start>$</span>
  <input type="text" />
  <button ino-addon-end type="button">Go</button>
</ino-input-group>
```

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Shell height / padding-inline / font-size — see [Size API](#size-api) |
| `disabled` | `boolean` | `false` | Dims the group's own addon chrome; caller still sets `disabled` on the projected control |

Content projection: `[ino-addon-start]` / default slot (control) / `[ino-addon-end]`.

### Size API

`size` re-points the same three Wave 0 aliases (`--ino-control-height`,
`--ino-control-padding-inline`, `--ino-control-font-size`) `ino-input`'s own size blocks use.
Shippable here — unlike `ino-icon-field`'s deliberate omission — because this component owns the
entire visual box outright once the wrapped control's own border/background are cleared (see
below); there is no second, independently-sized box to drift out of sync.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Border/background shell always visible |
| Disabled | `disabled` input | Dims the group's own addon chrome |
| Focus-visible | wrapped control (or an addon button) focused | `:host:has(:focus-visible)` recolors the shared border to `--ino-color-accent` |
| Active/pressed / Hover / Invalid / Loading / Readonly | N/A | Owned by the wrapped control, not the group shell |

---

## Motion

Border-colour transition on focus-within uses `--ino-motion-duration-fast` /
`--ino-motion-easing-standard`, zeroed under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — none on the host; the projected control keeps its own native role/label
association untouched. This component never touches the control's `id`, `aria-*`, or label wiring —
only its border/background/padding.

**Keyboard** — none owned by this component; focus moves through the control and any addon buttons
in natural DOM order.

**Contrast** — `--ino-color-border` (default) and `--ino-color-accent` (focus) are both
already-audited non-text roles (SC 1.4.11, 3:1 floor).

**Target size** — addon buttons/icons must independently satisfy SC 2.5.8 if interactive; this
group only supplies padding/divider chrome.

**RTL** — logical properties only (`border-inline-end`/`border-inline-start`, `padding-inline`);
start/end addon slots correctly swap sides under `dir="rtl"`.

### Border/background hand-off, no `::ng-deep`

Same governance constraint `ino-icon-field` documents (N-11): `Renderer2` + `querySelector` clears
the projected control's own `border`/`background`/`border-radius` so the group reads as one
visually-joined field instead of two stacked boxes, reversed on destroy.

---

## Deliberate omissions

None.

## Mobile parity

**Web-only for now** — no React Native or Flutter port exists for this component as of this issue.
