import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-tab-panel>` — one tab's label metadata plus its panel content, projected as a direct child
 * of `<ino-tabs>` (T-26 / INO-31 F-1, recovered to full DS parity by INO-361). Renamed from the
 * original `<ino-tab>` to carry the richer per-panel state (`closable`, `invalid`, `loading`) a
 * multi-step/document-tab UI needs — the parent's `@ContentChildren` query reads these to render
 * the tablist and toggles this component's own `active` field to show/hide the panel and drive
 * roving tabindex. See `ino-tabs.component.ts` and SPEC.md §1.
 *
 * Deliberately dumb: this component owns no selection logic of its own, matching the container/
 * leaf split `ino-meter-group`'s `InoMeterItem` establishes for data-driven composites, just as an
 * actual child component (with real projected content) instead of a plain interface, since a tab
 * panel's body is markup, not a scalar value.
 */
@Component({
  selector: 'ino-tab-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="active">
      <div *ngIf="loading" class="ino-tab-panel__busy" aria-hidden="true">
        <span class="ino-tab-panel__spinner"></span>
      </div>
      <ng-content></ng-content>
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
    '[attr.id]': 'panelId',
    '[attr.aria-labelledby]': 'tabButtonId',
    '[attr.aria-busy]': 'loading || null',
    '[attr.tabindex]': '0',
    '[hidden]': '!active',
  },
})
export class InoTabPanelComponent {
  @Input() label = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) closable = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) loading = false;

  readonly tabButtonId = `ino-tab-${++idCounter}`;
  readonly panelId = `ino-tab-panel-${idCounter}`;

  private _active = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  /** Set by the parent `<ino-tabs>` container on every selection change — not an `@Input()`,
   *  since the parent (not the caller) is the single owner of "which tab is active." A plain
   *  OnPush component only re-renders its own `[hidden]` host binding when ITS OWN view is marked
   *  dirty — a parent-side `markForCheck()` marks the parent's ancestor path, not this sibling
   *  leaf reached only through content projection, so the setter marks this view directly. */
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
