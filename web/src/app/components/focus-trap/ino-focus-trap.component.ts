import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InoFocusTrapDirective } from './ino-focus-trap.directive';

/**
 * `<ino-focus-trap>` — element form of `[inoFocusTrap]`, for callers that want to wrap projected
 * content rather than add behavior to a container they already render.
 *
 * Applied via `hostDirectives`, so there is exactly one implementation and no wrapper element:
 * the trap operates on this component's own host node, and the inputs below are the directive's
 * inputs re-aliased to shorter names. The two forms cannot drift, because there is only one.
 *
 * Prefer the directive when you already own the container element — `<ino-modal>` puts it
 * straight on its `.ino-modal__panel`, keeping the `role="dialog"` element and its content
 * adjacent rather than separated by an extra node.
 *
 * Renders no visual output: no box, no background, no border, no size of its own. See `SPEC.md`
 * for the per-row record of which INO-31 Definition-of-Done rows apply to a behavior-only
 * primitive and which are recorded omissions.
 */
@Component({
  selector: 'ino-focus-trap',
  standalone: true,
  templateUrl: './ino-focus-trap.component.html',
  styleUrl: './ino-focus-trap.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: InoFocusTrapDirective,
      inputs: [
        'inoFocusTrapDisabled: disabled',
        'inoFocusTrapAutoFocus: autoFocus',
        'inoFocusTrapInitialFocus: initialFocus',
        'inoFocusTrapRestoreFocus: restoreFocus',
      ],
    },
  ],
})
export class InoFocusTrapComponent {
  private readonly trap = inject(InoFocusTrapDirective);

  /** Re-reads tabbable content after a deep DOM change. Delegates to the directive. */
  refresh(): void {
    this.trap.refresh();
  }
}
