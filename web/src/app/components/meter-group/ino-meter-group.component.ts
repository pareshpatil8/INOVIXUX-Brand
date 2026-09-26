import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TemplateRef,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

/** Closed set of fill roles a segment can take. All six resolve in every one of the three web
 *  themes and are the same roles `ino-tag`'s mobile port already reads — `risk-*` is deliberately
 *  excluded (tag's divergence note: neither mobile palette carries it), so a `<ino-meter-group>`
 *  segment set never needs a platform-specific remap the way `ino-tag`'s severity union does. */
export type InoMeterColor = 'accent' | 'accent-secondary' | 'success' | 'warning' | 'danger' | 'info';

export type InoMeterOrientation = 'horizontal' | 'vertical';

export interface InoMeterItem {
  label: string;
  value: number;
  color?: InoMeterColor;
}

/** Rendered segment — an `InoMeterItem` plus the resolved color and the on-track percentage
 *  (clamped to whatever range capacity is left after the segments before it). */
export interface InoMeterSegment extends InoMeterItem {
  color: InoMeterColor;
  percent: number;
  index: number;
}

const DEFAULT_COLOR_ORDER: readonly InoMeterColor[] = [
  'accent',
  'accent-secondary',
  'success',
  'warning',
  'danger',
  'info',
];

/**
 * `<ino-meter-group>` — a track divided into weighted segments plus a legend, built for the
 * composite-score use case named in the issue: several weighted contributions (e.g. a KYB risk
 * score assembled from sub-checks) rendered as one bar rather than N separate indicators.
 * Parity benchmark: PrimeNG `MeterGroup` (`specs/primeng/llms-22.1.1.txt`, "MeterGroup displays
 * scalar measurements within a known range") — a benchmark, not a runtime dependency.
 *
 * Presentational and non-interactive, matching `ino-tag`/`ino-progress-spinner`'s precedent: no
 * `tabindex`, no click handling. See SPEC.md §1 for the full 8-state carried/N-A breakdown.
 *
 * Colors are a closed 6-member union (`InoMeterColor`) resolved entirely in this component's SCSS
 * (`--ino-color-{accent,accent-secondary,success,warning,danger,info}`) — never a raw `color`
 * `@Input`, same reasoning `ino-tag.severity` documents. An item without an explicit `color` cycles
 * through `DEFAULT_COLOR_ORDER` by index, so a caller supplying only `label`/`value` still gets a
 * distinct, theme-correct color per segment.
 */
@Component({
  selector: 'ino-meter-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-meter-group.component.html',
  styleUrl: './ino-meter-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-meter-group',
    role: 'group',
    '[attr.aria-label]': 'accessibleLabel',
    '[attr.data-orientation]': 'orientation',
    '[attr.data-size]': 'size',
    '[class.ino-meter-group--disabled]': 'disabled',
    '[class.ino-meter-group--invalid]': 'invalid',
    '[class.ino-meter-group--loading]': 'loading',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoMeterGroupComponent {
  @Input() items: InoMeterItem[] = [];
  @Input({ transform: numberAttribute }) min = 0;
  @Input({ transform: numberAttribute }) max = 100;
  @Input() orientation: InoMeterOrientation = 'horizontal';
  @Input() size: InoControlSize = 'default';
  /** Accessible group name. Falls back to a generated summary of every segment (§2 of SPEC.md) so
   *  the widget always has a meaningful name even when a caller forgets to set one. */
  @Input() label = '';
  /** Renders the generated legend (dot + label + value per segment). When `false` the legend stays
   *  in the DOM as a screen-reader-only list — same "visually hidden, still announced" idiom
   *  `ino-tag`'s `dot` form uses — so turning the visible legend off never removes the accessible
   *  per-segment text. */
  @Input({ transform: booleanAttribute }) showLegend = true;
  /** Custom-legend override (DoD row 6, "custom legend"). Receives the resolved `segments` array as
   *  the template's `$implicit` context. When set, this replaces the generated legend entirely —
   *  the caller owns its markup and its accessibility. */
  @Input() legendTemplate: TemplateRef<{ $implicit: InoMeterSegment[] }> | null = null;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** Recolors the track boundary to the danger role — e.g. a composite score whose inputs are
   *  stale or partially failed to compute. Not form-field validity; see SPEC.md §1. */
  @Input({ transform: booleanAttribute }) invalid = false;
  /** Swaps the track for an indeterminate shimmer while the underlying score recomputes. */
  @Input({ transform: booleanAttribute }) loading = false;

  protected readonly legendContext = (segments: InoMeterSegment[]) => ({ $implicit: segments });

  get segments(): InoMeterSegment[] {
    const range = Math.max(this.max - this.min, 0.0001);
    let used = 0;
    return this.items.map((item, index) => {
      const value = Math.max(item.value, 0);
      const available = Math.max(range - used, 0);
      const rendered = Math.min(value, available);
      used += rendered;
      return {
        ...item,
        color: item.color ?? DEFAULT_COLOR_ORDER[index % DEFAULT_COLOR_ORDER.length],
        percent: (rendered / range) * 100,
        index,
      };
    });
  }

  get accessibleLabel(): string {
    if (this.label) {
      return this.label;
    }
    if (!this.items.length) {
      return 'Meter group';
    }
    const summary = this.items.map((item) => `${item.label} ${item.value}`).join(', ');
    return this.invalid ? `${summary} (data may be inaccurate)` : summary;
  }
}
