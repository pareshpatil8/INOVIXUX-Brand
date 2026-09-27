import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-tab>` — one tab's label metadata plus its panel content, projected as a direct child of
 * `<ino-tabs>` (T-26 / INO-31 F-1). The parent's `@ContentChildren` query reads `label`/`disabled`
 * to render the tablist and toggles this component's own `active`/`tabIndex` fields to show/hide
 * the panel and drive roving tabindex — see `ino-tabs.component.ts` and SPEC.md §1.
 *
 * Deliberately dumb: this component owns no selection logic of its own, matching the container/
 * leaf split `ino-meter-group`'s `InoMeterItem` establishes for data-driven composites, just as an
 * actual child component (with real projected content) instead of a plain interface, since a tab
 * panel's body is markup, not a scalar value.
 */
@Component({
  selector: 'ino-tab',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-tab-panel',
    role: 'tabpanel',
    '[id]': 'panelId',
    '[attr.aria-labelledby]': 'tabId',
    '[attr.tabindex]': '0',
    '[hidden]': '!active',
  },
})
export class InoTabComponent {
  @Input() label = '';
  @Input({ transform: booleanAttribute }) disabled = false;

  readonly tabId = `ino-tab-${++idCounter}`;
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
