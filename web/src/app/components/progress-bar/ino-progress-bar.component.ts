import { ChangeDetectionStrategy, Component, Input, booleanAttribute, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export type InoProgressBarMode = 'determinate' | 'indeterminate';

/**
 * `<ino-progress-bar>` — INO-132 (INO-31 T-15, Tier 1 / Misc group).
 *
 * Parity benchmark: PrimeNG 22.1.1 `ProgressBar` (`specs/primeng/llms-22.1.1.txt` line 97,
 * `https://primeng.dev/progressbar`) — a process status indicator. PrimeNG is a benchmark, **not
 * a runtime dependency**; nothing here installs it. Determinate/indeterminate map directly;
 * `showValue` maps to PrimeNG's `showValue`; `size` replaces free-text height with the closed
 * Wave 0 control-size scale, same adoption recipe every sized component already uses. Contract:
 * SPEC.md, full write-up: `docs/brand/06-angular-components/progress-bar.md`.
 *
 * A pure status indicator, not an input control: it never receives focus or emits an event — the
 * caller drives `value`/`mode` from whatever process it is reporting on.
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
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    role: 'progressbar',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': "mode === 'determinate' ? value : null",
    '[attr.aria-valuetext]': "mode === 'determinate' ? value + '%' : null",
    '[attr.aria-busy]': "mode === 'indeterminate' ? 'true' : null",
    '[attr.aria-label]': 'label || null',
  },
})
export class InoProgressBarComponent {
  @Input() mode: InoProgressBarMode = 'determinate';

  private _value = 0;
  /** 0–100. Clamped on assignment; only meaningful in `mode="determinate"` (SPEC.md §5). */
  @Input({ transform: numberAttribute })
  set value(v: number) {
    this._value = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
  }
  get value(): number {
    return this._value;
  }

  @Input() size: InoControlSize = 'default';

  /** Renders the numeric percentage as visible text. Ignored in `mode="indeterminate"` (no
   * meaningful percentage to show, per SPEC.md §6). */
  @Input({ transform: booleanAttribute }) showValue = false;

  /** Optional accessible name (`aria-label`) for the progressbar when no visible label exists in
   * the surrounding context (e.g. a preceding `<label>`/heading already names it). */
  @Input() label = '';
}
