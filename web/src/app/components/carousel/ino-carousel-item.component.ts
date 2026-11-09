import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-carousel-item>` — one slide, content-projected as a direct child of `<ino-carousel>`
 * (INO-483 / INO-31 B5). Deliberately dumb: owns no selection logic, matching the container/leaf
 * split `ino-tab-panel` and `InoMeterItem` already establish — see SPEC.md §1. The parent sets
 * `visible`/`position`/`total` on every window change; this component only renders its content
 * and the `role="group"` + slide label the APG carousel pattern requires (SPEC.md §5).
 */
@Component({
  selector: 'ino-carousel-item',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        display: block;
        flex: 0 0 auto;
      }
      /* Without this, the [hidden] host binding is a no-op the same way ino-tab-panel's comment
         describes: an author-origin "display: block" beats the UA stylesheet's
         "[hidden] { display: none }". */
      :host([hidden]) {
        display: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-carousel-item',
    role: 'group',
    'aria-roledescription': 'slide',
    '[attr.id]': 'itemId',
    '[attr.aria-label]': 'slideLabel',
    '[hidden]': '!visible',
  },
})
export class InoCarouselItemComponent {
  /** Optional caller-supplied name, prefixed onto the generated "n of total" label — e.g.
   *  `label="Q3 revenue chart"` reads as "Q3 revenue chart, 2 of 5". */
  @Input() label = '';

  readonly itemId = `ino-carousel-item-${++idCounter}`;

  private _visible = false;
  private _position = 0;
  private _total = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Set by the parent `<ino-carousel>` on every window change — not an `@Input()`, for the same
   *  reason `ino-tab-panel.active` isn't: the container, not the caller, is the single owner of
   *  which slides are currently visible. A plain OnPush leaf reached only through content
   *  projection needs its own `markForCheck()` since a parent-side one doesn't reach it. */
  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    if (this._visible === value) {
      return;
    }
    this._visible = value;
    this.cdr.markForCheck();
  }

  get position(): number {
    return this._position;
  }

  set position(value: number) {
    if (this._position === value) {
      return;
    }
    this._position = value;
    this.cdr.markForCheck();
  }

  get total(): number {
    return this._total;
  }

  set total(value: number) {
    if (this._total === value) {
      return;
    }
    this._total = value;
    this.cdr.markForCheck();
  }

  protected get slideLabel(): string {
    const base = `${this.position + 1} of ${this.total}`;
    return this.label ? `${this.label}, ${base}` : base;
  }
}
