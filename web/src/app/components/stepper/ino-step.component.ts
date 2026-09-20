import {
  ChangeDetectionStrategy,
  Component,
  Input,
  booleanAttribute,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-step>` — one step header + its content panel, projected as a child of `<ino-stepper>`.
 * Same content-projection shape as `ino-tabs` / `ino-tab-panel` (see that component's doc
 * comment for the "data array can't describe arbitrary markup" reasoning) — a step's content is
 * an arbitrary form fragment, not something a `steps: InoStepItem[]` data `@Input` could carry.
 *
 * `completed` is the input the parent reads to gate forward navigation in `linear` mode
 * (SPEC.md §4/§7) — the consumer flips it once the step's own validation passes, which is the
 * "validation gating between steps" the issue calls out explicitly. It is never set by
 * `<ino-stepper>` itself: only the form that owns the step's fields knows when it is valid.
 */
@Component({
  selector: 'ino-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="active()">
      <div *ngIf="loading" class="ino-step__busy" aria-hidden="true">
        <span class="ino-step__spinner"></span>
      </div>
      <ng-content />
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* Without this, the [hidden] host binding is a no-op — same UA-stylesheet-specificity note
         as ino-tab-panel. */
      :host([hidden]) {
        display: none;
      }
      /* Enter motion (DoD row 7). Exit is instant, same rule and same reason as ino-tab-panel:
         the outgoing panel unmounts the moment the parent flips "active". */
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
    class: 'ino-step',
    role: 'tabpanel',
    tabindex: '0',
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'tabButtonId',
    '[attr.aria-busy]': 'loading || null',
    '[hidden]': '!active()',
  },
})
export class InoStepComponent {
  @Input() id = `ino-step-${++idCounter}`;
  @Input() label = '';
  /** Optional secondary line under the label in the step header (e.g. "Business details"). */
  @Input() description = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Drives both the checkmark indicator and, in `linear` mode, whether later steps unlock. */
  @Input({ transform: booleanAttribute }) completed = false;

  /** Set by the parent `<ino-stepper>` after reading this step out of its `@ContentChildren`
   *  list — never bound from a consumer template, same rule as `InoTabPanelComponent.active`. */
  protected readonly active = signal(false);

  get panelId(): string {
    return `${this.id}-panel`;
  }

  get tabButtonId(): string {
    return `${this.id}-tab`;
  }

  /** @internal — called by `InoStepperComponent`, not part of the public API. */
  setActive(value: boolean): void {
    this.active.set(value);
  }
}
