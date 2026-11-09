import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';

/**
 * `[inoAnimateOnScroll]` — applies caller-supplied CSS classes to its host when the host enters
 * or leaves the viewport during scrolling, via `IntersectionObserver`. The directive paints
 * nothing of its own: the *entire* visual contract lives in the caller's enter/leave classes,
 * which is what lets the two a11y guarantees below hold unconditionally.
 *
 * Parity benchmark is PrimeNG 22.1.1 `pAnimateOnScroll` ("AnimateOnScroll is used to apply
 * animations to elements when entering or leaving the viewport during scrolling",
 * `specs/primeng/llms-22.1.1.txt`). PrimeNG is a benchmark, not a dependency — nothing here
 * imports it.
 *
 * ## Guarantee 1 — content is never hidden pre-animation (doc 26 §5: CLS / SR)
 *
 * PrimeNG's directive hides its host (`opacity: 0`) until the first intersection, which costs a
 * screen-reader user the content entirely whenever the observer never fires (SSR, reader mode,
 * find-in-page, an element that starts above the fold of a restored scroll position) and makes
 * the first paint a layout-shift hazard. This directive **never sets a style or hides anything**:
 * before the first intersection the host is in its natural, fully-visible CSS state. The enter
 * class should therefore be a CSS *keyframe animation* whose `from` pose carries the hidden /
 * offset state — a keyframe hides the element only for the animation's own duration, never
 * before it, and never for users the observer doesn't reach. Callers must not pre-hide the host
 * with a static `opacity: 0` — that reintroduces exactly the failure this directive exists to
 * avoid, and the docs page demos show the keyframe pattern to copy.
 *
 * ## Guarantee 2 — `prefers-reduced-motion: reduce` disables the directive
 *
 * The media preference is read live at every observer callback, not once at init, so flipping
 * the OS setting mid-session takes effect on the next scroll. Under reduced motion no class is
 * ever applied — combined with guarantee 1 (the natural state is visible), a reduced-motion
 * user simply sees the content, static, exactly where it would have animated to.
 *
 * ## Enter / leave lifecycle
 *
 * - **Enter** (host intersects at ≥ `threshold`): leave classes are removed, enter classes are
 *   applied, `inoAnimateOnScrollEnter` emits. With `once`, the observer disconnects here and the
 *   enter classes stay — the "animate on first reveal" mode.
 * - **Leave** (host stops intersecting, only *after* it has entered at least once): enter
 *   classes are removed, leave classes are applied, `inoAnimateOnScrollLeave` emits. The
 *   has-entered gate matters: without it, every host below the fold would run its "leave"
 *   animation on page load, before the user has ever seen it.
 *
 * Re-adding a class restarts its CSS animation because the class is genuinely removed on the
 * opposite transition — `repeat` mode (the default, `once` absent) replays the enter animation
 * on every re-entry.
 *
 * ## Environments without `IntersectionObserver`
 *
 * SSR and jsdom have no `IntersectionObserver`; the directive is a silent no-op there and the
 * host stays visible (guarantee 1 again). No polyfill is loaded and none is required — the
 * behaviour degrades to "no animation", never to "no content".
 */
@Directive({
  selector: '[inoAnimateOnScroll]',
  standalone: true,
})
export class InoAnimateOnScrollDirective implements OnInit, OnChanges, OnDestroy {
  /** Selector and on/off switch in one: the bare attribute defaults `true`. Set `false` to
   *  suppress a single instance of a shared template without restructuring it — same shape as
   *  `[inoAutofocus]`'s own selector input. */
  @Input({ transform: booleanAttribute }) inoAnimateOnScroll = true;

  /** Space-separated CSS class(es) applied when the host enters the viewport. Author these as
   *  keyframe animations whose `from` pose holds the hidden/offset state — never pre-hide the
   *  host statically (class doc, guarantee 1). */
  @Input() inoAnimateOnScrollEnterClass = '';

  /** Space-separated CSS class(es) applied when the host leaves the viewport, after it has
   *  entered at least once. Optional — omit it and the enter classes are simply removed on
   *  leave, re-arming the enter animation for the next entry. */
  @Input() inoAnimateOnScrollLeaveClass = '';

  /** `IntersectionObserver` threshold: how much of the host must be visible before "enter"
   *  fires (0–1). The 0.1 default fires as soon as a meaningful sliver is on screen, so the
   *  animation is underway by the time the element is fully revealed. */
  @Input({ transform: numberAttribute }) inoAnimateOnScrollThreshold = 0.1;

  /** `IntersectionObserver` rootMargin, verbatim. Negative insets delay "enter" until the host
   *  is well inside the viewport; positive ones start the animation before it arrives. */
  @Input() inoAnimateOnScrollRootMargin = '0px';

  /** `true` = animate on the first enter only, then disconnect: the enter classes stay applied
   *  and no leave transition ever runs. `false` (default) = repeat on every enter/leave cycle.
   *  This is the spec seed's "once vs repeat" axis. */
  @Input({ transform: booleanAttribute }) inoAnimateOnScrollOnce = false;

  /** Emits each time the enter classes are applied (not under reduced motion — no class, no
   *  event: the pair always agree, so callers can't desync visual and programmatic reactions). */
  @Output() inoAnimateOnScrollEnter = new EventEmitter<void>();

  /** Emits each time the leave classes are applied. Same reduced-motion rule as enter. */
  @Output() inoAnimateOnScrollLeave = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  private observer: IntersectionObserver | null = null;

  private initialized = false;

  /** Gates the leave transition — see the class doc's lifecycle section for why a host that has
   *  never entered must not run its leave animation on page load. */
  private hasEntered = false;

  /** Live handle on the OS motion preference; `null` where `matchMedia` doesn't exist (SSR,
   *  jsdom), which reads as "no reduction requested". Queried per-callback, never cached. */
  private reducedMotion: MediaQueryList | null = null;

  ngOnInit(): void {
    this.reducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    this.connect();
    this.initialized = true;
  }

  ngOnChanges(): void {
    // ngOnChanges fires before ngOnInit for bound inputs; let ngOnInit own the first connection
    // so inputs present from the start don't connect twice — the same guard `[inoAutofocus]`
    // uses for the identical reason. After init, any input change rebuilds the observer, since
    // threshold/rootMargin are constructor options the existing observer can't adopt.
    if (this.initialized) {
      this.connect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private connect(): void {
    this.disconnect();
    if (!this.inoAnimateOnScroll || typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.observer = new IntersectionObserver((entries) => this.onIntersection(entries), {
      threshold: this.inoAnimateOnScrollThreshold,
      rootMargin: this.inoAnimateOnScrollRootMargin,
    });
    this.observer.observe(this.host);
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private onIntersection(entries: IntersectionObserverEntry[]): void {
    // Read the preference on every callback, not at init — flipping the OS setting mid-session
    // takes effect on the next scroll (class doc, guarantee 2). Classes already applied are left
    // alone: removing an enter class here could snap content the user is reading back to a
    // keyframe's hidden pose, which is a worse motion event than doing nothing.
    if (this.reducedMotion?.matches) {
      return;
    }
    for (const entry of entries) {
      if (entry.isIntersecting) {
        this.hasEntered = true;
        this.swapClasses(this.inoAnimateOnScrollLeaveClass, this.inoAnimateOnScrollEnterClass);
        this.inoAnimateOnScrollEnter.emit();
        if (this.inoAnimateOnScrollOnce) {
          this.disconnect();
        }
      } else if (this.hasEntered) {
        this.swapClasses(this.inoAnimateOnScrollEnterClass, this.inoAnimateOnScrollLeaveClass);
        this.inoAnimateOnScrollLeave.emit();
      }
    }
  }

  private swapClasses(remove: string, add: string): void {
    for (const cls of splitClasses(remove)) {
      this.host.classList.remove(cls);
    }
    for (const cls of splitClasses(add)) {
      this.host.classList.add(cls);
    }
  }
}

/** `classList.add('')` throws; tolerate the empty default and multi-space authoring. */
function splitClasses(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}
