import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InoAutofocusDirective } from './ino-autofocus.directive';

/**
 * `<ino-autofocus>` — element form of `[inoAutofocus]`, for callers that want to wrap projected
 * content and let the directive find the first focusable descendant, rather than add the
 * behaviour to a container element they already own.
 *
 * Applied via `hostDirectives`, so there is exactly one implementation and no wrapper node: the
 * directive operates on this component's own host, and the inputs below are the directive's
 * inputs re-aliased to shorter names. The two forms cannot drift, because there is only one.
 * Same shape as `<ino-focus-trap>` / `[inoFocusTrap]` — see that component for the fuller
 * rationale for why a behaviour-only primitive ships two forms backed by one implementation.
 *
 * Renders no visual output: no box, no background, no border, no size of its own. See `SPEC.md`
 * for the per-row record of which doc 26 §2 Definition-of-Done rows apply to a behaviour-only
 * primitive and which are recorded omissions.
 */
@Component({
  selector: 'ino-autofocus',
  standalone: true,
  templateUrl: './ino-autofocus.component.html',
  styleUrl: './ino-autofocus.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: InoAutofocusDirective,
      inputs: [
        'inoAutofocus',
        'inoAutofocusTarget: target',
        'inoAutofocusPreventScroll: preventScroll',
        'inoAutofocusTrigger: trigger',
      ],
    },
  ],
})
export class InoAutofocusComponent {
  private readonly autofocus = inject(InoAutofocusDirective);

  /** Re-runs focus placement on demand. Delegates to the directive. */
  focusNow(): void {
    this.autofocus.focusNow();
  }
}
