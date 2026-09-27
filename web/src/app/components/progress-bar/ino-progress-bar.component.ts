import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

export type InoProgressBarMode = 'determinate' | 'indeterminate';

/**
 * `<ino-progress-bar>` — linear process-status indicator, the horizontal-track counterpart to
 * `<ino-progress-spinner>` (T-15 / INO-31 F-1). Parity benchmark: PrimeNG `ProgressBar`
 * (`specs/primeng/llms-22.1.1.txt` line 97, "ProgressBar is a process status indicator") — a
 * benchmark, not a runtime dependency.
 *
 * Track/thickness precedent copied 1:1 from `<ino-meter-group>` (INO-144 / T-13): reuses the Wave 0
 * `--ino-control-icon-size-*` alias for cross-axis thickness rather than inventing a new local size
 * value (tokens.css is frozen after Wave 0). Presentational and non-interactive — no `tabindex`,
 * matching `ino-progress-spinner`/`ino-meter-group`'s precedent; see SPEC.md §1.
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
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    '[class.ino-progress-bar--disabled]': 'disabled',
    '[class.ino-progress-bar--invalid]': 'invalid',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.aria-busy]': "mode === 'indeterminate' || null",
    '[attr.aria-valuemin]': "mode === 'determinate' ? 0 : null",
    '[attr.aria-valuemax]': "mode === 'determinate' ? 100 : null",
    '[attr.aria-valuenow]': "mode === 'determinate' ? clampedValue : null",
    '[attr.aria-label]': 'accessibleLabel',
  },
})
export class InoProgressBarComponent implements OnInit, OnChanges {
  @Input() size: InoControlSize = 'default';
  @Input() mode: InoProgressBarMode = 'determinate';
  @Input({ transform: numberAttribute }) value = 0;
  /** Renders the numeric percentage inside the track (determinate only) — PrimeNG's `showValue`.
   *  See SPEC.md §2 for why this stays text-only rather than a second announcement channel. */
  @Input({ transform: booleanAttribute }) showValue = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** Recolors the fill to the danger role — e.g. an upload that failed mid-transfer but the bar
   *  should stay visible at its last-known value. Not form-field validity; see SPEC.md §1. */
  @Input({ transform: booleanAttribute }) invalid = false;
  /** Overrides the accessible name. Defaults to "Loading" (indeterminate) or "N% complete"
   *  (determinate) — same live-region contract as `ino-progress-spinner`, SPEC.md §2. */
  @Input() label = '';

  protected srAnnouncement = '';
  private lastAnnouncedQuartile: number | null = null;

  get clampedValue(): number {
    return Math.min(100, Math.max(0, this.value));
  }

  protected get accessibleLabel(): string {
    if (this.label) {
      return this.label;
    }
    return this.mode === 'determinate' ? `${this.clampedValue}% complete` : 'Loading';
  }

  ngOnInit(): void {
    this.updateAnnouncement();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] || changes['value'] || changes['label'] || changes['invalid']) {
      this.updateAnnouncement();
    }
  }

  /** Live-region text (DoD row 8). Indeterminate announces once on entry; determinate only
   *  re-announces on a 25% quartile crossing — same throttle `ino-progress-spinner` uses so a fast
   *  determinate run doesn't spam a screen reader on every `value` tick. */
  private updateAnnouncement(): void {
    const suffix = this.invalid ? ' (error)' : '';
    if (this.mode === 'indeterminate') {
      this.lastAnnouncedQuartile = null;
      this.srAnnouncement = `${this.accessibleLabel}${suffix}`;
      return;
    }
    const quartile = Math.floor(this.clampedValue / 25);
    if (quartile !== this.lastAnnouncedQuartile) {
      this.lastAnnouncedQuartile = quartile;
      this.srAnnouncement = `${this.accessibleLabel}${suffix}`;
    }
  }
}
