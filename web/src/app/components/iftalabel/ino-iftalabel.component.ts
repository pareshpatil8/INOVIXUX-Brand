import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  Renderer2,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

const DOCKABLE_SELECTOR = 'input, textarea, select';

/**
 * `<ino-ifta-label>` — the in-field top-aligned label wrapper (INO-142 / INO-31 T-20), completing
 * the three-component label-placement family alongside `<ino-label>` (T-19, the base leaf) and
 * `<ino-float-label>` (T-18, the focus/fill-driven floating wrapper).
 *
 * Unlike `<ino-float-label>`, this wrapper has no rest/floated toggle: the PrimeNG benchmark
 * (`specs/primeng/llms-22.1.1.txt` line 68, `https://primeng.dev/iftalabel`) ships `IftaLabel` as a
 * single permanently-docked style — the label always sits small at the field's top edge, never
 * overlapping the control like a placeholder. That means this component needs none of
 * `<ino-float-label>`'s `focus`/`blur`/`input` listeners or `floated` state (see that component's
 * SPEC.md §1 for why those exist there) — the only DOM work needed is reserving the docked label's
 * space on the projected control, done once in `ngAfterContentInit` via `Renderer2` (not a
 * `::ng-deep` selector reaching across the `<ng-content>` projection boundary — same reasoning
 * `<ino-float-label>`'s SPEC.md §1 documents, not repeated here since it never became a piercing
 * problem in the first place: no CSS on this component ever needs to react to the control's own
 * pseudo-classes).
 *
 * ```html
 * <ino-ifta-label for="username" label="Username">
 *   <input id="username" />
 * </ino-ifta-label>
 * ```
 */
@Component({
  selector: 'ino-ifta-label',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-iftalabel.component.html',
  styleUrl: './ino-iftalabel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-ifta-label',
    '[attr.data-size]': 'size',
    '[class.ino-ifta-label--disabled]': 'disabled',
  },
})
export class InoIftaLabelComponent implements AfterContentInit {
  /** The `id` of the projected native control — forwarded to the internal `<ino-label for>`, the
   *  same contract `<ino-label>`/`<ino-float-label>` already have. */
  @Input('for') htmlFor = '';
  @Input() label = '';
  /** Drives the docked label's size tier and the reserved top-padding math — must match the height
   *  the caller gives the wrapped control (`InoControlSize`, `control-size.ts`). */
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) readonly = false;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterContentInit(): void {
    const control = this.elementRef.nativeElement.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(DOCKABLE_SELECTOR);
    if (!control) {
      return;
    }

    // Permanently reserve the docked label's space — there is no rest state to reserve it lazily
    // for (SPEC.md §1). Same Renderer2-on-the-one-held-node technique `<ino-float-label>` uses for
    // its own "in"/"on" variants, applied unconditionally here since IftaLabel has only one layout.
    this.renderer.setStyle(control, 'padding-block-start', 'var(--ino-space-5)');
    this.renderer.setStyle(
      control,
      'min-block-size',
      'calc(var(--ino-ifta-label-height) + var(--ino-space-3))',
    );
  }
}
