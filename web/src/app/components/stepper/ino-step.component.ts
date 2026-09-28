import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-step>` — one step's header metadata plus its panel content, projected as a direct child of
 * `<ino-stepper>` (T-27 / INO-31 F-1, recovered to full DS parity by INO-361). Same container/leaf
 * split as `<ino-tab-panel>`/`<ino-tabs>` (T-26) — see that component's SPEC.md §1 for the
 * rationale (arbitrary panel markup, not a scalar, rules out a data-driven `items` @Input).
 */
@Component({
  selector: 'ino-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="active">
      <div *ngIf="loading" class="ino-step__busy" aria-hidden="true">
        <span class="ino-step__spinner"></span>
      </div>
      <ng-content></ng-content>
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
      @media (prefers-reduced-motion: no-preference) {
        :host(:not([hidden])) {
          animation: ino-step-enter var(--ino-motion-duration-base) var(--ino-motion-easing-decelerate);
        }
      }
      @keyframes ino-step-enter {
        from {
          opacity: 0;
          transform: translateY(var(--ino-space-1));
        }
      }
      .ino-step__busy {
        display: flex;
        justify-content: center;
        padding: var(--ino-space-5);
      }
      .ino-step__spinner {
        display: inline-block;
        inline-size: var(--ino-control-icon-size-default);
        block-size: var(--ino-control-icon-size-default);
        border: 2px solid var(--ino-color-on-surface-muted);
        border-inline-start-color: transparent;
        border-radius: 50%;
      }
      @media (prefers-reduced-motion: no-preference) {
        .ino-step__spinner {
          animation: ino-step-spin var(--ino-motion-duration-slow) linear infinite;
        }
      }
      @keyframes ino-step-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-step-panel',
    role: 'tabpanel',
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'headerId',
    '[attr.aria-busy]': 'loading || null',
    '[attr.tabindex]': '0',
    '[hidden]': '!active',
  },
})
export class InoStepComponent {
  @Input() label = '';
  /** Optional secondary line under the label in the step header (e.g. "Business details"). */
  @Input() description = '';
  /** Locks the step out of navigation entirely, distinct from the linear-mode "not reached yet"
   *  lock — e.g. a step that only applies to some accounts and should never be reachable for
   *  others, in either linear or non-linear mode. See SPEC.md §1. */
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Drives both the checkmark indicator and, in `linear` mode, whether later steps unlock. Set by
   *  the consumer once the step's own validation passes — the stepper itself never validates
   *  anything, it only reads this flag (SPEC.md §4/§7). */
  @Input({ transform: booleanAttribute }) completed = false;

  readonly headerId = `ino-step-header-${++idCounter}`;
  readonly panelId = `ino-step-panel-${idCounter}`;

  private _active = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Set by the parent `<ino-stepper>` on every selection change — mirrors
   *  `InoTabPanelComponent.active`'s setter: a plain OnPush leaf reached only through content
   *  projection needs its OWN view marked dirty, since the parent's `markForCheck()` only dirties
   *  its own ancestor path, not this sibling. */
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
}
