import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  booleanAttribute,
  inject,
} from '@angular/core';

/**
 * `[inoAutofocus]` — moves keyboard focus to an element once, on activation, the way the native
 * `autofocus` attribute does for a document's initial load. It exists because `autofocus` itself
 * is unreliable for Angular's actual failure mode: content inserted by change detection well
 * after the browser's own "initial page load" moment (an `*ngIf` panel, a route component, a tab
 * switching in) never gets native autofocus at all, since the attribute only fires once, at
 * parse time, for a document the browser is still constructing.
 *
 * Parity benchmark is PrimeNG's `pAutoFocus` ("AutoFocus manages focus on focusable element on
 * load", `specs/primeng/llms-22.1.1.txt`). PrimeNG is a benchmark, not a dependency — nothing
 * here imports it.
 *
 * ## What gets focused
 *
 * Three targets, tried in order: `inoAutofocusTarget` (a selector resolved within the host) if
 * given; the host element itself, if the host is natively or explicitly focusable; the first
 * focusable descendant of the host, otherwise. The third case is what makes this directive work
 * both ways `[inoFocusTrap]` needs two forms for — attach it directly to the one input you want
 * focused, or to a wrapping container and let it find the first field inside.
 *
 * ## Interplay with `[inoFocusTrap]` — read this before combining them
 *
 * If the host sits inside an ancestor `[inoFocusTrap]` / `<ino-focus-trap>` (found via
 * `closest()`), this directive is a **no-op**, unconditionally — it does not check whether that
 * trap is currently `disabled`. A focus trap already owns initial-focus placement for its own
 * container (`inoFocusTrapAutoFocus` + `inoFocusTrapInitialFocus`), and both primitives defer
 * their first focus move to the same `queueMicrotask` tick; running both would make the outcome a
 * race, not a contract. **Target the trap's own `initialFocus` input instead of stacking this
 * directive inside a trap** — it resolves the identical "selector within the container" lookup
 * this directive would otherwise duplicate, and it already re-runs on every trap re-activation.
 *
 * ## Interplay with route changes — read this before using it on a routed page
 *
 * Angular's `Router` does not move focus on navigation; that gap is exactly what WCAG 2.2 SC
 * 2.4.3 (Focus Order) requires an app to close for a non-document-reloading SPA transition, since
 * a user agent gets nothing automatic the way a full page load provides. `ngOnInit` alone is not
 * enough to close it: the router **reuses** a component instance across a navigation that
 * re-resolves the same route definition (e.g. a detail page keyed by a path parameter, or a tab
 * within a persistent shell), so `ngOnInit` runs exactly once no matter how many times the user
 * navigates through it. Bind `inoAutofocusTrigger` to a value that changes on every navigation
 * the consumer cares about (a router `NavigationEnd` id, the resolved url, a route param) and this
 * directive re-runs focus placement on every change after the first — the same mechanism a full
 * page load gives a document for free. Call `focusNow()` directly when a trigger input would be
 * awkward to model (e.g. focus placement driven by an async HTTP response rather than a change in
 * bound state).
 */
@Directive({
  selector: '[inoAutofocus]',
  standalone: true,
})
export class InoAutofocusDirective implements OnInit, OnChanges {
  /** Selector and on/off switch in one: the bare attribute defaults `true`. Set `false` rather
   *  than removing the directive to suppress a single instance without restructuring the template
   *  (e.g. a shared row template used both for "new" and "edit", where only "new" should focus). */
  @Input({ transform: booleanAttribute }) inoAutofocus = true;

  /** CSS selector resolved within the host. Falls back to the host itself if omitted, then to the
   *  host's first focusable descendant — see the class doc for why that covers both forms
   *  `[inoFocusTrap]` needs two components for. */
  @Input() inoAutofocusTarget = '';

  /** Forwarded to the native `focus({ preventScroll })` option, for a target already inside the
   *  viewport where the browser's default scroll-into-view would otherwise jump the page. */
  @Input({ transform: booleanAttribute }) inoAutofocusPreventScroll = false;

  /** Changing this value after the first activation re-runs focus placement — the route-change
   *  mechanism described in the class doc. Unused on the very first activation, which `ngOnInit`
   *  already owns; see `ngOnChanges`. */
  @Input() inoAutofocusTrigger: unknown = undefined;

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  private initialized = false;

  ngOnInit(): void {
    this.run();
    this.initialized = true;
  }

  ngOnChanges(): void {
    // ngOnChanges fires before ngOnInit for bound inputs; let ngOnInit own the first activation
    // so a trigger value present from the start doesn't cause a redundant double-focus. Same
    // guard `[inoFocusTrap]` uses for its own ngOnChanges, for the identical reason.
    if (this.initialized) {
      this.run();
    }
  }

  /** Re-runs focus placement on demand. Equivalent to changing `inoAutofocusTrigger`, for callers
   *  where modelling the re-run as a bound input would be awkward (an async response callback
   *  rather than a value change Angular's change detection observes on its own). */
  focusNow(): void {
    this.run();
  }

  private run(): void {
    if (!this.inoAutofocus || typeof document === 'undefined') {
      return;
    }
    if (this.host.closest('[inoFocusTrap], ino-focus-trap')) {
      return;
    }

    // The host's own content may not be laid out yet on the tick this fires — same deferral
    // `[inoFocusTrap]` uses before its own initial focus, for the same reason (projected content,
    // an *ngIf branch, a route component's template, none of it guaranteed painted yet).
    queueMicrotask(() => {
      if (!this.inoAutofocus) {
        return;
      }
      const target = this.resolveTarget();
      target?.focus({ preventScroll: this.inoAutofocusPreventScroll });
    });
  }

  private resolveTarget(): HTMLElement | null {
    if (this.inoAutofocusTarget) {
      const explicit = this.host.querySelector<HTMLElement>(this.inoAutofocusTarget);
      return explicit && isFocusable(explicit) ? explicit : null;
    }
    if (isFocusable(this.host)) {
      return this.host;
    }
    const descendant = this.host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    return descendant && isFocusable(descendant) ? descendant : null;
  }
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Deliberately shallow — unlike `[inoFocusTrap]`'s `tabbables()`, this never needs tab *order*,
 *  only "is this one element a legitimate focus target", so there is no ordering logic to
 *  duplicate from it. Visibility is not walked here either: a native `autofocus` attribute does
 *  not check visibility before focusing, and a hidden target throwing focus into the void on an
 *  app bug is a louder, more debuggable failure than this directive silently guessing instead. */
function isFocusable(el: HTMLElement): boolean {
  return !el.hasAttribute('disabled') && el.tabIndex >= 0;
}
