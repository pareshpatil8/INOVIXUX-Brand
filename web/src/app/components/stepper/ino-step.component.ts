import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-step>` — one step's header metadata plus its panel content, projected as a direct child of
 * `<ino-stepper>` (T-27 / INO-31 F-1). Same container/leaf split as `<ino-tab>`/`<ino-tabs>`
 * (T-26) — see that component's SPEC.md §1 for the rationale (arbitrary panel markup, not a
 * scalar, rules out a data-driven `items` @Input).
 */
@Component({
  selector: 'ino-step',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-step-panel',
    role: 'tabpanel',
    '[id]': 'panelId',
    '[attr.aria-labelledby]': 'headerId',
    '[attr.tabindex]': '0',
    '[hidden]': '!active',
  },
})
export class InoStepComponent {
  @Input() label = '';
  /** Locks the step out of navigation entirely, distinct from the linear-mode "not reached yet"
   *  lock — e.g. a step that only applies to some accounts and should never be reachable for
   *  others, in either linear or non-linear mode. See SPEC.md §1. */
  @Input({ transform: booleanAttribute }) disabled = false;

  readonly headerId = `ino-step-header-${++idCounter}`;
  readonly panelId = `ino-step-panel-${idCounter}`;

  private _active = false;
  private _completed = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Set by the parent `<ino-stepper>` on every selection change — mirrors
   *  `InoTabComponent.active`'s setter (same file, `ino-tab.component.ts`): a plain OnPush leaf
   *  reached only through content projection needs its OWN view marked dirty, since the parent's
   *  `markForCheck()` only dirties its own ancestor path, not this sibling. */
  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    if (this._active === value) {
      return;
    }
    this._active = value;
    this.cdr.markForCheck();
  }

  /** Set by the parent once a step has been passed (via `next()` or direct selection) — drives the
   *  completed/checkmark indicator visual, independent of whether it is currently active. Same
   *  self-marking setter as `active`, for the same reason. */
  get completed(): boolean {
    return this._completed;
  }

  set completed(value: boolean) {
    if (this._completed === value) {
      return;
    }
    this._completed = value;
    this.cdr.markForCheck();
  }
}
