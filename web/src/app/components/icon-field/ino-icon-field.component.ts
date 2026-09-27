import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type InoIconFieldPosition = 'start' | 'end';

/** Matches the raw native control this component can reach for the padding hand-off (§2 below) —
 *  a plain `<input>`/`<textarea>`, or `ino-input`/`ino-select`'s own inner `.ino-field__control`,
 *  since content projection still yields real DOM `querySelector` can reach into. */
const CONTROL_SELECTOR = 'input, textarea, .ino-field__control';

/**
 * `<ino-icon-field>` — wraps a single form control and positions a leading or trailing icon inside
 * its bounds (T-16 / INO-31 F-1). Parity benchmark: PrimeNG `IconField`
 * (`specs/primeng/llms-22.1.1.txt` line 67, "IconField wraps an input and an icon") — a benchmark,
 * not a runtime dependency.
 *
 * This is the sanctioned mechanism `ino-input`'s own doc comment names for icon slots (see
 * `ino-input.component.ts`'s class doc and SPEC.md §1): rather than every Tier-1 form control
 * baking in its own `@Input() icon` and re-auditing icon padding/positioning per component, exactly
 * one wrapper owns that concern. Composition, not inheritance — `<ino-icon-field>` never reaches
 * into its projected control's internals; it only reserves inline padding on whatever `.ino-field`
 * shell the control renders, via the `--ino-icon-field-offset` custom property (SPEC.md §2).
 *
 * Content projection, two slots (same `[attr]`-selector idiom `ino-card`/`ino-tag` already use):
 * - default slot — the wrapped control (`<ino-input>`, `<input>`, etc.)
 * - `[ino-icon]` — the icon, projected into a positioned wrapper this component owns
 */
@Component({
  selector: 'ino-icon-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-icon-field.component.html',
  styleUrl: './ino-icon-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-icon-field',
    '[attr.data-position]': 'iconPosition',
    '[class.ino-icon-field--disabled]': 'disabled',
  },
})
export class InoIconFieldComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input() iconPosition: InoIconFieldPosition = 'start';
  /** Mirrors the wrapped control's own disabled state for the icon's dimming — this component does
   *  not disable the control itself (it has no access to do so); see SPEC.md §1. */
  @Input({ transform: booleanAttribute }) disabled = false;

  private control: HTMLElement | null = null;
  private appliedPosition: InoIconFieldPosition | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterContentInit(): void {
    this.control = this.elementRef.nativeElement.querySelector<HTMLElement>(CONTROL_SELECTOR);
    this.applyOffset();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['iconPosition']) {
      this.applyOffset();
    }
  }

  ngOnDestroy(): void {
    if (this.control && this.appliedPosition) {
      this.renderer.removeStyle(this.control, this.appliedPosition === 'start' ? 'padding-inline-start' : 'padding-inline-end');
    }
  }

  /** Hands the icon's reserved inline space to the projected control's own padding, the same
   *  Renderer2-on-the-projected-node technique `ino-float-label` uses instead of `::ng-deep`
   *  (governance N-11 — see that component's doc comment). `--ino-icon-field-offset` is a CSS
   *  custom property this component declares on `:host` (SCSS); custom properties inherit, so the
   *  projected control resolves the current value itself and needs no numeric duplication here. */
  private applyOffset(): void {
    if (!this.control) {
      return;
    }
    if (this.appliedPosition && this.appliedPosition !== this.iconPosition) {
      this.renderer.removeStyle(this.control, this.appliedPosition === 'start' ? 'padding-inline-start' : 'padding-inline-end');
    }
    const prop = this.iconPosition === 'start' ? 'padding-inline-start' : 'padding-inline-end';
    this.renderer.setStyle(this.control, prop, 'var(--ino-icon-field-offset)');
    this.appliedPosition = this.iconPosition;
  }
}
