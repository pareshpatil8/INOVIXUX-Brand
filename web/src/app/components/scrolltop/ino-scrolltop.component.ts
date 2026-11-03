import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';

export type InoScrolltopTarget = 'window' | 'parent';
export type InoScrolltopBehavior = 'smooth' | 'auto';

/**
 * `<ino-scrolltop>` — a "back to top" button, WAI "back to top" pattern. Doc 26 §5 row:
 * `target="window"`/`"parent"`, threshold-gated visibility, one size, web-only.
 *
 * Rebuilt under INO-867 after the original INO-464 build (commit `fe9e972`) was found to not
 * exist anywhere in the repo or its remotes — the "done" disposition and the INO-465 QA pass
 * were both recorded against code that was never actually committed to the shared branch. See
 * SPEC.md §4 for the audit note and the INO-867 QA finding this rebuild bakes in from the start.
 *
 * `activate()` always uses the two-argument `scrollTo(x, y)` form for an instant jump, never the
 * options-object `{ behavior: 'auto' }` form — the CSSOM View spec defines `'auto'` as "use the
 * scrolling box's computed `scroll-behavior`", not "instant", so on `window` it silently inherits
 * `web/src/styles.scss`'s global `html { scroll-behavior: smooth }` and animates anyway. The
 * two-argument form is immune to that CSS property by spec. `prefers-reduced-motion: reduce`
 * forces the instant path regardless of the `behavior` input (SPEC.md §2).
 *
 * Contract: web/src/app/components/scrolltop/SPEC.md.
 */
@Component({
  selector: 'ino-scrolltop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-scrolltop.component.html',
  styleUrl: './ino-scrolltop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-scrolltop',
    '[attr.data-target]': 'target',
  },
})
export class InoScrolltopComponent implements OnInit, OnDestroy {
  @Input() target: InoScrolltopTarget = 'window';
  @Input() threshold = 400;
  @Input() behavior: InoScrolltopBehavior = 'smooth';
  @Input() ariaLabel = 'Scroll to top';
  /** CSS selector for the element to focus after activation. Falls back to `<body>`. */
  @Input() focusTarget: string | null = null;

  visible = false;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scrollParent: HTMLElement | null = null;
  private readonly onScroll = (): void => this.checkVisibility();

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.scrollParent =
      this.target === 'parent'
        ? (this.elementRef.nativeElement.parentElement as HTMLElement | null)
        : null;

    this.zone.runOutsideAngular(() => {
      this.scrollEventTarget().addEventListener('scroll', this.onScroll, { passive: true });
    });
    this.checkVisibility();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.scrollEventTarget().removeEventListener('scroll', this.onScroll);
  }

  /** Scroll the configured target to its origin, honouring `prefers-reduced-motion`. */
  activate(): void {
    if (this.isBrowser) {
      const instant = this.behavior === 'auto' || this.prefersReducedMotion();
      if (this.target === 'parent' && this.scrollParent) {
        if (instant) {
          this.scrollParent.scrollTo(0, 0);
        } else {
          this.scrollParent.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      } else if (instant) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    }
    this.moveFocusAfterActivate();
  }

  private moveFocusAfterActivate(): void {
    if (!this.isBrowser) return;
    const explicit = this.focusTarget ? document.querySelector<HTMLElement>(this.focusTarget) : null;
    (explicit ?? document.body).focus();
  }

  private checkVisibility(): void {
    const offset =
      this.target === 'parent' && this.scrollParent ? this.scrollParent.scrollTop : window.scrollY;
    const next = offset > this.threshold;
    if (next !== this.visible) {
      this.visible = next;
      this.cdr.markForCheck();
    }
  }

  private scrollEventTarget(): EventTarget {
    return this.target === 'parent' && this.scrollParent ? this.scrollParent : window;
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
