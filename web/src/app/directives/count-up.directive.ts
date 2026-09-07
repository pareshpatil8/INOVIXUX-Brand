import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

/**
 * `[inoCountUp]` — animated numeral count-up for `<ino-metric-panel>` headline values.
 *
 * Ports the vanilla rAF count-up from `foundation-v5-verified-line.html` (bottom of file),
 * same duration token (`--ino-motion-duration-countup`, 900ms) and locale formatting
 * (`toLocaleString('en-IN')`), wrapped as a directive per the Angular theme contract
 * (`docs/brand/02-design-tokens/angular-theme-contract.md` §3) instead of a page-load script.
 *
 * Adds one thing the HTML prototype didn't need: an ease-out curve approximating the token's
 * `--ino-motion-easing-decelerate` (`cubic-bezier(0, 0, 0, 1)`) so the motion matches the design
 * spec exactly, not just the duration. `1 - (1-p)^3` is a standard easeOutCubic approximation of
 * that curve — close enough visually that pulling in a bezier-interpolation dependency isn't
 * justified for a single directive.
 *
 * Respects `prefers-reduced-motion: reduce` per the contract — jumps straight to `target`,
 * no animation, no rAF loop started at all.
 */
@Directive({
  selector: '[inoCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges {
  /** Value to count up to. Locale-formatted with `en-IN` grouping, matching the v5 prototype. */
  @Input('inoCountUp') target = 0;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly durationMs = 900; // mirrors --ino-motion-duration-countup — keep in sync if the token changes
  private frame: number | null = null;

  ngOnChanges(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }

    const target = Math.max(0, Math.floor(this.target));
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.render(target);
      return;
    }

    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / this.durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3); // approximates cubic-bezier(0, 0, 0, 1)
      this.render(Math.floor(eased * target));
      if (p < 1) {
        this.frame = requestAnimationFrame(step);
      } else {
        this.frame = null;
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number): void {
    this.el.nativeElement.textContent = value.toLocaleString('en-IN');
  }
}
