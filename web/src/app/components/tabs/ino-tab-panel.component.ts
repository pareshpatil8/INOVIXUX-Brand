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
 * `<ino-tab-panel>` — one tab + its content, projected as a child of `<ino-tabs>`. Declared as a
 * real content-projected component (the Angular Material / PrimeNG `TabPanel` shape) rather than
 * a `tabs: InoTabItem[]` data `@Input`, because tab content is arbitrary rich markup — a data
 * array can describe a label and a few flags, but not an arbitrary template.
 *
 * `<ino-tabs>` reads this list via `@ContentChildren` and drives the tablist buttons from it;
 * this component itself only owns its own panel semantics (`role="tabpanel"`, visibility, the
 * `invalid`/`loading` flags a multi-step form needs per-step) — it does not know about its
 * siblings or which one is active beyond the `active` flag the parent sets on it directly.
 */
@Component({
  selector: 'ino-tab-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="active()">
      <div *ngIf="loading" class="ino-tab-panel__busy" aria-hidden="true">
        <span class="ino-tab-panel__spinner"></span>
      </div>
      <ng-content />
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* Without this, the [hidden] host binding is a no-op: an author-origin "display: block"
         beats the UA stylesheet's "[hidden] { display: none }", so an inactive panel would keep
         its box (and, once the *ngIf is removed from the template, its content). */
      :host([hidden]) {
        display: none;
      }
      /* Enter motion (DoD row 7). Exit is deliberately instant: the outgoing panel is unmounted
         the moment the parent flips "active", and animating a node out would mean keeping stale
         content on screen while the new tab's content is already being read out. */
      @media (prefers-reduced-motion: no-preference) {
        :host(:not([hidden])) {
          animation: ino-tab-panel-enter var(--ino-motion-duration-base)
            var(--ino-motion-easing-decelerate);
        }
      }
      @keyframes ino-tab-panel-enter {
        from {
          opacity: 0;
          transform: translateY(var(--ino-space-1));
        }
      }
      .ino-tab-panel__busy {
        display: flex;
        justify-content: center;
        padding: var(--ino-space-5);
      }
      .ino-tab-panel__spinner {
        display: inline-block;
        inline-size: var(--ino-control-icon-size-default);
        block-size: var(--ino-control-icon-size-default);
        border: 2px solid var(--ino-color-on-surface-muted);
        border-inline-start-color: transparent;
        border-radius: 50%;
      }
      @media (prefers-reduced-motion: no-preference) {
        .ino-tab-panel__spinner {
          animation: ino-tab-panel-spin var(--ino-motion-duration-slow) linear infinite;
        }
      }
      @keyframes ino-tab-panel-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-tab-panel',
    role: 'tabpanel',
    tabindex: '0',
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'tabButtonId',
    '[attr.aria-busy]': 'loading || null',
    '[hidden]': '!active()',
  },
})
export class InoTabPanelComponent {
  @Input() id = `ino-tab-${++idCounter}`;
  @Input() label = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) closable = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;

  /** Set by the parent `<ino-tabs>` after reading this panel out of its `@ContentChildren` list —
   *  never bound from a consumer template, since the consumer's template is what produced this
   *  content child in the first place and has no direct handle on which one is active. */
  protected readonly active = signal(false);

  get panelId(): string {
    return `${this.id}-panel`;
  }

  get tabButtonId(): string {
    return `${this.id}-tab`;
  }

  /** @internal — called by `InoTabsComponent`, not part of the public API. */
  setActive(value: boolean): void {
    this.active.set(value);
  }
}
