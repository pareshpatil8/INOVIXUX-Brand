import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { InoAnimateonscrollComponent } from '../../../../components/animateonscroll/ino-animateonscroll.component';
import { InoAnimateOnScrollDirective } from '../../../../components/animateonscroll/ino-animateonscroll.directive';

/**
 * Hand-authored §2 Component Publish Contract demo for `[inoAnimateOnScroll]` /
 * `<ino-animateonscroll>` (INO-501). Mounted via `CUSTOM_DEMOS` (`../custom-demos.ts`), the same
 * mechanism the other behaviour-only directives use and for the identical reason: the generic
 * `*ngComponentOutlet` renderer mounts components with `@Input`s only and cannot project content,
 * and a scroll-reveal directive has nothing to demonstrate without scrollable content to attach
 * to. Each section is its own scrollable viewport, so the observer has a real boundary to cross
 * without asking the visitor to scroll the whole docs page.
 *
 * Three live sections — one per axis of the doc 26 §5 seed row ("enter/leave animation classes;
 * threshold; once vs repeat") — plus a static reduced-motion note with a live preference readout.
 * Every section prints its event counters through `.demo-live` readouts, which doubles as the
 * SPEC.md §3.4 demonstration: events fire iff classes were applied, so under reduced motion the
 * counters hold still together with the visuals.
 */
@Component({
  selector: 'app-animateonscroll-demo',
  standalone: true,
  imports: [InoAnimateonscrollComponent, InoAnimateOnScrollDirective],
  templateUrl: './animateonscroll-demo.component.html',
  styleUrl: './demo-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimateonscrollDemoComponent {
  /** Two-forms section: enter/leave counters for the directive-form card… */
  protected readonly directiveEnters = signal(0);
  protected readonly directiveLeaves = signal(0);

  /** …and enter counter for the element-form card wrapping projected content. */
  protected readonly elementEnters = signal(0);

  /** Once-vs-repeat section: the once card's counter can only ever reach 1 — the observer
   *  disconnects on the first enter — while the repeat card keeps counting. */
  protected readonly onceEnters = signal(0);
  protected readonly repeatEnters = signal(0);

  /** Threshold section: a sliver (0.15) card fires as soon as it peeks in; the 0.9 card waits
   *  until it is almost fully visible inside the same scroll viewport. */
  protected readonly sliverEnters = signal(0);
  protected readonly fullEnters = signal(0);

  /** Live readout for the reduced-motion note. Read once for display only — the directive itself
   *  re-reads the preference at every observer callback, which is the actual guarantee. */
  protected readonly reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
