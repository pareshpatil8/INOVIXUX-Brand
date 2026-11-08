import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InoAnimateOnScrollDirective } from './ino-animateonscroll.directive';

/**
 * `<ino-animateonscroll>` — element form of `[inoAnimateOnScroll]`, for callers that want to
 * wrap a block of projected content rather than add the behaviour to an element they already
 * own. The enter/leave classes are applied to this component's own host, so the projected
 * content animates as one block.
 *
 * Applied via `hostDirectives`, so there is exactly one implementation and no wrapper node: the
 * directive operates on this component's host, and the inputs below are the directive's inputs
 * re-aliased to shorter names. The two forms cannot drift, because there is only one. Same shape
 * as `<ino-autofocus>` / `[inoAutofocus]` — see that component for the fuller rationale for why
 * a behaviour-only primitive ships two forms backed by one implementation.
 *
 * Renders no visual output of its own: no box, no background, no border. Whatever appears (or
 * animates) is the projected content plus the caller's enter/leave classes. See `SPEC.md` for
 * the per-row record of which doc 26 §2 Definition-of-Done rows apply to a behaviour-only
 * primitive and which are recorded omissions.
 */
@Component({
  selector: 'ino-animateonscroll',
  standalone: true,
  templateUrl: './ino-animateonscroll.component.html',
  styleUrl: './ino-animateonscroll.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: InoAnimateOnScrollDirective,
      inputs: [
        'inoAnimateOnScroll: enabled',
        'inoAnimateOnScrollEnterClass: enterClass',
        'inoAnimateOnScrollLeaveClass: leaveClass',
        'inoAnimateOnScrollThreshold: threshold',
        'inoAnimateOnScrollRootMargin: rootMargin',
        'inoAnimateOnScrollOnce: once',
      ],
      outputs: [
        'inoAnimateOnScrollEnter: enter',
        'inoAnimateOnScrollLeave: leave',
      ],
    },
  ],
})
export class InoAnimateonscrollComponent {}
