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

export type InoProgressSpinnerMode = 'indeterminate' | 'determinate';

/** Fixed SVG user-space geometry (INO-133). Not exposed as an `@Input` — the rendered diameter is
 *  entirely a CSS concern (`--ino-control-height-{sm,default,lg}`, DoD row 3), so the viewBox can
 *  stay a constant and every size/density variant scales the same vector proportionally. */
const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;

/**
 * `<ino-progress-spinner>` — the standalone loading affordance extracted from the inline spinner
 * `ino-button`/`ino-tag` already draw for their own `loading` state (issue: "our only loading
 * affordance today is `aria-busy` on button"). Same ring-drawing technique, promoted to its own
 * sized, determinate-capable component per the PrimeNG `ProgressSpinner` benchmark
 * (`specs/primeng/llms-22.1.1.txt`, determinate + indeterminate modes).
 *
 * Non-interactive and unfocusable by design — see SPEC.md §1 for which of the 8 states this
 * carries and why hover/active/focus-visible/readonly are deliberately N/A.
 *
 * `size` reads the Wave 0 control-height scale (`--ino-control-height-{sm,default,lg}`) rather
 * than the icon-size scale: an icon-scale spinner (max 24px) reads as an inline glyph, but this
 * component is meant to stand alone on a page/panel, and the control-height rungs (36/44/52px at
 * default density) already give a page-appropriate range without inventing a new local scale
 * (DoD row 3 forbids that).
 */
@Component({
  selector: 'ino-progress-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-progress-spinner.component.html',
  styleUrl: './ino-progress-spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-progress-spinner',
    role: 'progressbar',
    '[attr.data-size]': 'size',
    '[attr.data-mode]': 'mode',
    '[class.ino-progress-spinner--disabled]': 'disabled',
    '[class.ino-progress-spinner--invalid]': 'invalid',
    '[attr.aria-disabled]': 'disabled || null',
    '[attr.aria-busy]': "mode === 'indeterminate' || null",
    '[attr.aria-valuemin]': "mode === 'determinate' ? 0 : null",
    '[attr.aria-valuemax]': "mode === 'determinate' ? 100 : null",
    '[attr.aria-valuenow]': "mode === 'determinate' ? clampedValue : null",
    '[attr.aria-label]': 'accessibleLabel',
  },
})
export class InoProgressSpinnerComponent implements OnInit, OnChanges {
  @Input() size: InoControlSize = 'default';
  @Input() mode: InoProgressSpinnerMode = 'indeterminate';
  @Input({ transform: numberAttribute }) value = 0;
  /** SVG stroke width in the component's fixed 0–100 viewBox (unitless — scales with `size`),
   *  not a `tokens.css` role: DoD row 1's token list is colour/space/radius/duration/shadow/
   *  font-size, and stroke width belongs to none of those, same as `ino-tag`'s hardcoded 2px ring
   *  border. Default of 8 reads as a comfortably visible ring at every size rung. */
  @Input({ transform: numberAttribute }) strokeWidth = 8;
  @Input({ transform: booleanAttribute }) disabled = false;
  /** Recolors the ring to the danger role — e.g. a long-running operation that has entered a
   *  retryable-error state but is still spinning. Not form-field validity; see SPEC.md §1. */
  @Input({ transform: booleanAttribute }) invalid = false;
  /** Overrides the accessible name. Defaults to "Loading" (indeterminate) or "N% complete"
   *  (determinate) — see SPEC.md §2 for the live-region announcement contract. */
  @Input() label = '';

  protected readonly viewBox = `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`;
  protected readonly center = CENTER;
  protected srAnnouncement = '';

  private lastAnnouncedQuartile: number | null = null;

  get clampedValue(): number {
    return Math.min(100, Math.max(0, this.value));
  }

  protected get radius(): number {
    return CENTER - this.strokeWidth / 2;
  }

  protected get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  protected get dashOffset(): number {
    if (this.mode !== 'determinate') {
      return 0;
    }
    return this.circumference * (1 - this.clampedValue / 100);
  }

  /** Partial ring for the indeterminate spin — ~75% of the circumference visible, matching the
   *  `border-inline-start-color: transparent` ring `ino-tag`/`ino-button` already draw with CSS
   *  borders, translated to an SVG dasharray since a determinate-capable ring needs stroke
   *  geometry either way. */
  protected get indeterminateDashArray(): string {
    const visible = this.circumference * 0.75;
    return `${visible} ${this.circumference}`;
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

  /** Live-region text (DoD row 8, "accessible live-region announcement"). Indeterminate announces
   *  once on entry; determinate only re-announces when it crosses a 25% quartile, so a fast
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
