import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';

/** Same reach-into-projected-DOM selector `ino-icon-field` uses — real DOM, so `querySelector`
 *  crosses the content-projection boundary even though a CSS selector in this component's own
 *  stylesheet cannot (governance N-11, see `ino-icon-field`'s SPEC.md §2). */
const CONTROL_SELECTOR = 'input, textarea, .ino-field__control';

/**
 * `<ino-input-group>` — groups a control with one or more prefix/suffix addons (text, icon, or a
 * button) into a single visually-joined field (T-17 / INO-31 F-1). Parity benchmark: PrimeNG
 * `InputGroup` (`specs/primeng/llms-22.1.1.txt` line 73, "Text, icon, buttons and other content can
 * be grouped next to an input") — a benchmark, not a runtime dependency.
 *
 * Named dependency: `ino-input.component.ts`'s class doc names this component as the sanctioned
 * prefix/suffix-addon mechanism (audit finding F-1).
 *
 * Content projection, three slots (same `[attr]`-selector idiom `ino-card`/`ino-tag` already use):
 * - `[ino-addon-start]` — zero or more prefix addons (e.g. `$`, an icon, a button)
 * - default slot — the wrapped control
 * - `[ino-addon-end]` — zero or more suffix addons
 *
 * Unlike `<ino-icon-field>` (which reserves inline padding on the control it wraps), this component
 * does not resize the control at all: addons are laid out as flex siblings that visually join to
 * the control's edges (shared border, flattened adjoining corners), so no `Renderer2`/`::ng-deep`
 * hand-off is needed — every element styled here is either `:host`-owned or a direct child slot
 * this component's own template renders. See SPEC.md §2.
 */
@Component({
  selector: 'ino-input-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-input-group.component.html',
  styleUrl: './ino-input-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-input-group',
    '[attr.data-size]': 'size',
    '[class.ino-input-group--disabled]': 'disabled',
  },
})
export class InoInputGroupComponent implements AfterContentInit, OnDestroy {
  /** Unlike `ino-icon-field` (SPEC.md §3, deliberately omitted), this component owns the whole
   *  visual box — border, background, height — since the wrapped control's own border/background
   *  are cleared (see `ngAfterContentInit` below). There is nothing left for a second, independent
   *  size to drift against, so the size API is safe to ship here. */
  @Input() size: InoControlSize = 'default';
  /** Dims the group's own addon chrome in step with the wrapped control's `disabled` state —
   *  mirrors `ino-icon-field`'s same-named input; this component cannot disable the control
   *  itself, that remains the caller's responsibility on the projected control. */
  @Input({ transform: booleanAttribute }) disabled = false;

  private control: HTMLElement | null = null;
  private readonly appliedStyles: Array<[string, string]> = [
    ['border', 'none'],
    ['background', 'transparent'],
    ['border-radius', '0'],
  ];

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  /** Hands the shared border/fill/radius to the host, the same Renderer2-on-the-projected-node
   *  technique `ino-float-label`/`ino-icon-field` use instead of `::ng-deep` (governance N-11):
   *  the control's own border/background/radius are cleared so the host's single outer box
   *  (SCSS) reads as one visually-joined field instead of two stacked boxes. */
  ngAfterContentInit(): void {
    this.control = this.elementRef.nativeElement.querySelector<HTMLElement>(CONTROL_SELECTOR);
    if (!this.control) {
      return;
    }
    for (const [prop, value] of this.appliedStyles) {
      this.renderer.setStyle(this.control, prop, value);
    }
  }

  ngOnDestroy(): void {
    if (!this.control) {
      return;
    }
    for (const [prop] of this.appliedStyles) {
      this.renderer.removeStyle(this.control, prop);
    }
  }
}
