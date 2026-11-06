import { Directive } from '@angular/core';

/**
 * `[inoDropHandle]` — marker directive naming a child of `[inoDraggable]` as the sole drag
 * initiation point (SPEC.md §4.3). No inputs: the directive's presence is itself the signal.
 * `InoDraggableDirective` auto-restricts to `.closest('[inoDropHandle]')` on `dragstart` when it
 * finds at least one such descendant and the caller hasn't set `inoDraggableHandle` explicitly —
 * see that directive's `resolveHandleSelector()`.
 */
@Directive({
  selector: '[inoDropHandle]',
  standalone: true,
  host: {
    class: 'ino-drop-handle',
  },
})
export class InoDropHandleDirective {}
