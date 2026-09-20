import { ChangeDetectionStrategy, Component, Input, booleanAttribute, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export type InoProgressBarMode = 'determinate' | 'indeterminate';

/**
 * `<ino-progress-bar>` — linear process-status indicator (INO-132 / INO-31 T-15, Tier 1 Misc
 * group). Parity benchmark: PrimeNG 22.1.1 `ProgressBar` (`specs/primeng/llms-22.1.1.txt` line 97,
 * route `https://primeng.dev/progressbar`) — a benchmark, not a runtime dependency.
 *
 * Two modes, matching the benchmark:
 *   - `determinate`   — `value` (0-100, clamped) drives the fill width; rendered as text inside
 *                        the track when `showValue` is true.
 *   - `indeterminate` — an animated sweep for unknown-duration work; no numeric value is exposed
 *                        (`showValue` is ignored) and `aria-busy` communicates the ongoing state
 *                        instead, per the WAI-ARIA progressbar pattern.
 *
 * Presentational and non-interactive, same as `ino-tag` — see SPEC.md §1 for why
 * hover/active/focus-visible/readonly are deliberately not part of this component's state set.
 */
@Component({
  selector: 'ino-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-progress-bar.component.html',
  styleUrl: './ino-progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-progress-bar',
    role: 'progressbar',
    '[attr.aria-valuemin]': "mode === 'determinate' ? 0 : null",
    '[attr.aria-valuemax]': "mode === 'determinate' ? 100 : null",
    '[attr.aria-valuenow]': "mode === 'determinate' ? clampedValue : null",
    '[attr.aria-valuetext]': "mode === 'determinate' ? valueText : null",
    '[attr.aria-busy]': "mode === 'indeterminate' || null",
    '[attr.aria-invalid]': 'invalid || null',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    '[class.ino-progress-bar--disabled]': 'disabled',
    '[class.ino-progress-bar--invalid]': 'invalid',
  },
})
export class InoProgressBarComponent {
  @Input() mode: InoProgressBarMode = 'determinate';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: numberAttribute }) value = 0;
  @Input({ transform: booleanAttribute }) showValue = true;
  @Input() unit = '%';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;

  protected get clampedValue(): number {
    return Math.min(100, Math.max(0, this.value));
  }

  protected get valueText(): string {
    return `${this.clampedValue}${this.unit}`;
  }
}
