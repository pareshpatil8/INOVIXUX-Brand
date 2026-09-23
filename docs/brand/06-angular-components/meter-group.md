# `<ino-meter-group>` — MeterGroup

> Parity benchmark: PrimeNG 22.1.1 `MeterGroup` (`specs/primeng/llms-22.1.1.txt`, line 87).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Register item: half of **M-14** (the other half is `ino-metric-panel`).
> Preview: [`previews/meter-group.html`](previews/meter-group.html).
> Decisions record: `web/src/app/components/meter-group/SPEC.md`.

A track divided into weighted segments plus a legend — built for the composite-score case named in
the issue: several weighted contributions (e.g. a KYB risk score assembled from sub-checks) rendered
as one bar instead of N separate indicators. Presentational and non-interactive.

---

## Colour roles

| `color` | Token | Use it for |
|---|---|---|
| `accent` | `--ino-color-accent` | Primary/first contribution |
| `accent-secondary` | `--ino-color-accent-secondary` | Second contribution |
| `success` | `--ino-color-success` | A positive/clearing factor |
| `warning` | `--ino-color-warning` | A caution-tier factor |
| `danger` | `--ino-color-danger` | A high-severity factor |
| `info` | `--ino-color-info` | A neutral/informational factor |

An item without an explicit `color` cycles through this table's order by index — a caller supplying
only `label`/`value` pairs still gets a distinct, theme-correct colour per segment. `ino-tag`'s RAG
`--ino-color-risk-*` tokens are deliberately not part of this set: they aren't ported to either
mobile palette, and this component's typical case (several weighted factors, not three risk tiers)
needs more colours than that set provides. Full reasoning: `SPEC.md` §2.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoMeterItem[]` | `[]` | `{ label: string; value: number; color?: InoMeterColor }` |
| `min` | `number` | `0` | Range floor |
| `max` | `number` | `100` | Range ceiling — segments are clamped/clipped if the total exceeds it |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Segments grow along the inline (horizontal) or block (vertical) axis |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Track thickness from the Wave 0 control-icon-size scale — see [Size API](#size-api) |
| `label` | `string` | `''` | Accessible group name; falls back to a generated "label value, label value, …" summary |
| `showLegend` | `boolean` | `true` | `false` keeps the legend accessible (screen-reader-only) but visually hidden |
| `legendTemplate` | `TemplateRef<{ $implicit: InoMeterSegment[] }>` | `null` | Overrides the generated legend entirely — see [Custom legend](#custom-legend) |
| `disabled` | `boolean` | `false` | `aria-disabled` + dimmed opacity |
| `invalid` | `boolean` | `false` | Danger-coloured track boundary + accessible-name suffix |
| `loading` | `boolean` | `false` | `aria-busy`; segments fade out, track shimmers |

### Size API

Reads `--ino-control-icon-size-{sm,default,lg}` for the track's cross-axis thickness — deliberately
**not** `--ino-control-height` (sized for interactive controls, far thicker than a benchmark meter
bar should be). Full reasoning: `SPEC.md` §3.

### Custom legend

```html
<ino-meter-group [items]="riskFactors" [legendTemplate]="legend" />
<ng-template #legend let-segments>
  <ul class="my-custom-legend">
    <li *ngFor="let seg of segments">{{ seg.label }}: {{ seg.value }}%</li>
  </ul>
</ng-template>
```

`segments` is the resolved `InoMeterItem[]` with `color` (resolved, even when the item didn't specify
one) and `percent` (the rendered on-track percentage) added.

---

## Variants

| Named in the issue | Shipped | Surface |
|---|---|---|
| Horizontal / vertical | ✅ | `orientation` input |
| Labelled segments | ✅ | `InoMeterItem.label`, rendered in the legend |
| Custom legend | ✅ | `legendTemplate` input |

---

## Motion

Segment `inline-size`/`block-size` transition on value change uses `--ino-motion-duration-base` +
`--ino-motion-easing-standard`. The loading shimmer sweeps with
`--ino-motion-duration-slow` linear infinite. Both collapse to no animation under
`prefers-reduced-motion: reduce` (the shimmer falls back to a static muted fill).

---

## Accessibility contract

**Role / ARIA** — `role="group"` with `aria-label`, not `role="meter"`: this component renders
several weighted values in one track, and a single scalar `aria-valuenow` cannot represent that
without misrepresenting which segment it describes. The visual track is `aria-hidden`; the legend (or
the generated `aria-label` summary, when the legend is hidden) is the accessible surface. `aria-busy`
reflects `loading`; `aria-disabled` reflects `disabled`.

**Legend** — always in the DOM. `showLegend="false"` visually hides it behind the same sr-only clip
`ino-tag__label--sr-only` uses, so per-segment label/value text always reaches assistive tech.

**Keyboard** — none. The component is never in the tab order; it has nothing to activate.

**Contrast** — all six fill tokens are AA-verified non-text colours, audited across all three themes
by `node scripts/check-theme-parity.mjs`. Target-size criteria (SC 2.5.8) do not apply — never
focusable/clickable.

**RTL** — logical properties only (`inline-size`/`block-size`); no `left`/`right`/`top`/`bottom`
anywhere in the stylesheet. Segments mirror automatically under an `[dir="rtl"]` ancestor.

---

## Deliberate omissions

Recorded here rather than silently dropped (`SPEC.md` §4 has the full reasoning):

- **Per-item icon.** Not named in the issue's scope line; `legendTemplate` already gives a full
  escape hatch for callers who need icons in their legend.
- **`--ino-control-height` as the size driver.** See [Size API](#size-api) above.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoMeterGroup.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_meter_group.dart`.

Both mobile ports render every colour role web does (`accent`, `accentSecondary`, `success`,
`warning`, `danger`, `info`, plus `surfaceSunken`/`onSurface`/`onSurfaceMuted`). One declared
divergence: web's loading-state shimmer reads `--ino-color-border-soft` for its animated gradient;
neither mobile port renders that texture (both show an empty track while busy instead), avoiding a
new animation-gradient dependency for a single transient state — `aria-busy`/`Semantics(busy: true)`
still fires identically on every platform. Full reasoning: `SPEC.md` §7.
