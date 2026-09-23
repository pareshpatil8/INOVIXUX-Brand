import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

export type InoFloatLabelVariant = 'over' | 'in' | 'on';

const FLOATABLE_SELECTOR = 'input, textarea, select';

/**
 * `<ino-float-label>` — makes label placement a wrapper concern instead of a per-control prop
 * (INO-141 / INO-31 T-18). PrimeNG ships this as a component for the same reason: adding
 * `labelMode`/`labelPosition` to every Tier-1 form control would mean re-auditing that input on
 * `ino-input`, `ino-select`, and every future control, when one wrapper gets the same three
 * layouts for free. Doc 16 rev 2 logged this as a per-control variant gap on 7 components before
 * this issue corrected that.
 *
 * PrimeNG's own `pFloatLabel` projects the label as a second child and reacts to it via CSS
 * (`:focus`/`:not(:placeholder-shown)`). This component deliberately does **not** copy that:
 * doing so needs `::ng-deep` to style the projected control from this component's own stylesheet
 * (Angular's emulated encapsulation never lets a plain descendant selector reach `<ng-content>`),
 * and `::ng-deep` is explicitly not a sanctioned escape hatch here — doc 16 §4.3 "Layer 4" logs the
 * override contract as an **open, undecided** governance question (N-11), not something one
 * component issue should resolve unilaterally. See SPEC.md §1 for the full reasoning.
 *
 * Instead: this component renders the label itself (composes `<ino-label>`, same as `ino-input`
 * already does — no cross-boundary styling needed since it owns the element outright) and derives
 * "floated" the same way the React Native/Flutter ports do — a plain DOM query
 * (`querySelector`, not `@ContentChild`, since that decorator has no raw-tag-selector overload)
 * for the projected control plus native `focus`/`blur`/`input` listeners. No `ControlValueAccessor`
 * — matches this repo's existing convention (see `ino-input`'s own note on the same point).
 *
 * ```html
 * <ino-float-label for="username" label="Username" variant="over">
 *   <input id="username" />
 * </ino-float-label>
 * ```
 */
@Component({
  selector: 'ino-float-label',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-floatlabel.component.html',
  styleUrl: './ino-floatlabel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-float-label',
    '[attr.data-variant]': 'variant',
    '[attr.data-size]': 'size',
    '[class.ino-float-label--floated]': 'floated',
    '[class.ino-float-label--disabled]': 'disabled',
  },
})
export class InoFloatLabelComponent implements AfterContentInit, OnDestroy {
  /** The `id` of the projected native control — forwarded to the internal `<ino-label for>`, the
   *  same contract `<ino-label>` itself already has. */
  @Input('for') htmlFor = '';
  @Input() label = '';
  /** Variants named in the issue scope: `over` (default — label sits above the field entirely
   *  once floated), `in` (label stays inside the field, docked to the top), `on` (as `in`, plus a
   *  background cutout so the label reads as sitting on top of the field's border line). */
  @Input() variant: InoFloatLabelVariant = 'over';
  /** Drives the floated label's size tier and the rest-position math — must match the height the
   *  caller gives the wrapped control (`--ino-control-height-*`, control-size.ts). */
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  protected floated = false;

  private readonly unlisten: Array<() => void> = [];

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngAfterContentInit(): void {
    const control = this.elementRef.nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      FLOATABLE_SELECTOR,
    );
    if (!control) {
      return;
    }

    // "in"/"on" permanently reserve the docked label's space, same job web's SCSS would give the
    // control via a class rule if it could reach it — set directly on the one DOM node this
    // component already holds a reference to (Renderer2, not a style-piercing selector).
    if (this.variant === 'in' || this.variant === 'on') {
      this.renderer.setStyle(control, 'padding-block-start', 'var(--ino-space-5)');
      this.renderer.setStyle(control, 'min-block-size', 'calc(var(--ino-float-label-height) + var(--ino-space-3))');
    }

    // A native <select> always shows a value (no placeholder-less "empty" rest state) — its label
    // is unconditionally floated, same reasoning ino-floatlabel.component.scss's docs comment
    // gives for the CSS approach this replaced.
    if (control.tagName === 'SELECT') {
      this.floated = true;
      this.cdr.markForCheck();
      return;
    }

    const update = () => {
      const next = document.activeElement === control || control.value.length > 0;
      if (next !== this.floated) {
        this.floated = next;
        this.cdr.markForCheck();
      }
    };
    update();
    this.cdr.markForCheck();

    this.unlisten.push(
      this.renderer.listen(control, 'focus', update),
      this.renderer.listen(control, 'blur', update),
      this.renderer.listen(control, 'input', update),
    );
  }

  ngOnDestroy(): void {
    this.unlisten.forEach((fn) => fn());
  }
}
