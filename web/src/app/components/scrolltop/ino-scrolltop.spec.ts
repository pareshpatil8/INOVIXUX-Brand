import { vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoScrolltopComponent } from './ino-scrolltop.component';

@Component({
  standalone: true,
  imports: [InoScrolltopComponent],
  template: `
    <div style="overflow: auto; height: 100px;">
      <ino-scrolltop
        [target]="target"
        [threshold]="threshold"
        [behavior]="behavior"
        [ariaLabel]="ariaLabel"
        [focusTarget]="focusTarget"
      ></ino-scrolltop>
    </div>
  `,
})
class HostComponent {
  target: 'window' | 'parent' = 'window';
  threshold = 400;
  behavior: 'smooth' | 'auto' = 'smooth';
  ariaLabel = 'Scroll to top';
  focusTarget: string | null = null;
}

describe('InoScrolltopComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.scrollTo(0, 0);
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.ino-scrolltop__btn');
  }

  function setReducedMotion(matches: boolean): void {
    // jsdom has no matchMedia implementation at all, so there is nothing to vi.spyOn — assign
    // a stub outright rather than spying on a non-existent property.
    window.matchMedia = vi.fn().mockReturnValue({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList);
  }

  it('is hidden (aria-hidden, tabindex -1) below the threshold', () => {
    fixture.detectChanges();

    const btn = button();
    expect(btn.getAttribute('aria-hidden')).toBe('true');
    expect(btn.getAttribute('tabindex')).toBe('-1');
    expect(btn.classList.contains('ino-scrolltop__btn--visible')).toBe(false);
  });

  it('becomes visible once window scroll passes the threshold', () => {
    fixture.detectChanges();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500);
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const btn = button();
    expect(btn.getAttribute('aria-hidden')).toBeNull();
    expect(btn.getAttribute('tabindex')).toBe('0');
    expect(btn.classList.contains('ino-scrolltop__btn--visible')).toBe(true);
  });

  it('respects a custom threshold', () => {
    host.threshold = 50;
    fixture.detectChanges();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(60);
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(button().classList.contains('ino-scrolltop__btn--visible')).toBe(true);
  });

  it('reflects ariaLabel', () => {
    host.ariaLabel = 'Back to top';
    fixture.detectChanges();

    expect(button().getAttribute('aria-label')).toBe('Back to top');
  });

  it('scrolls window smoothly by default', () => {
    fixture.detectChanges();
    const spy = vi.spyOn(window, 'scrollTo');

    button().click();

    expect(spy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
  });

  it('REGRESSION (INO-867): uses the two-argument instant form under prefers-reduced-motion, never {behavior: "auto"}', () => {
    setReducedMotion(true);
    fixture.detectChanges();
    const spy = vi.spyOn(window, 'scrollTo');

    button().click();

    expect(spy).toHaveBeenCalledWith(0, 0);
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ behavior: expect.anything() }));
  });

  it('uses the two-argument instant form when behavior="auto" is requested explicitly, motion preference aside', () => {
    setReducedMotion(false);
    host.behavior = 'auto';
    fixture.detectChanges();
    const spy = vi.spyOn(window, 'scrollTo');

    button().click();

    expect(spy).toHaveBeenCalledWith(0, 0);
  });

  it('moves focus to document.body by default after activation', () => {
    fixture.detectChanges();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    button().click();

    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to a caller-supplied focusTarget after activation', () => {
    const marker = document.createElement('button');
    marker.id = 'focus-landing';
    document.body.appendChild(marker);
    host.focusTarget = '#focus-landing';
    fixture.detectChanges();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    button().click();

    expect(document.activeElement).toBe(marker);
    marker.remove();
  });

  describe('target="parent"', () => {
    beforeEach(() => {
      host.target = 'parent';
      fixture.detectChanges();
    });

    function parentEl(): HTMLElement {
      return fixture.nativeElement.querySelector('div');
    }

    it('reads data-target="parent" on the host', () => {
      const hostEl: HTMLElement = fixture.nativeElement.querySelector('ino-scrolltop');
      expect(hostEl.getAttribute('data-target')).toBe('parent');
    });

    it('becomes visible from the parent scrollTop, independent of window.scrollY', () => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
      Object.defineProperty(parentEl(), 'scrollTop', { value: 500, configurable: true });
      parentEl().dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(button().classList.contains('ino-scrolltop__btn--visible')).toBe(true);
    });

    it('scrolls the parent element, not window, on activate', () => {
      // jsdom's HTMLElement has no scrollTo at all (unlike Window's logging stub) — stub it
      // before spying.
      (parentEl() as unknown as { scrollTo: () => void }).scrollTo = () => {};
      const parentScrollTo = vi.spyOn(parentEl(), 'scrollTo').mockImplementation(() => {});
      const windowScrollTo = vi.spyOn(window, 'scrollTo');

      button().click();

      expect(parentScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
      expect(windowScrollTo).not.toHaveBeenCalled();
    });
  });
});
