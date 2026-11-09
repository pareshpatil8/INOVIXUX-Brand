import { vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoGalleriaComponent } from './ino-galleria.component';
import { InoGalleriaItemComponent } from './ino-galleria-item.component';

/** Flushes the `queueMicrotask` the focus-trap directive defers initial focus placement onto. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('InoGalleriaComponent', () => {
  let component: InoGalleriaComponent;
  let fixture: ComponentFixture<InoGalleriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoGalleriaComponent, InoGalleriaItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InoGalleriaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with activeIndex 0', () => {
    expect(component['activeIdx']).toBe(0);
  });

  it('should emit activeIndexChange when goTo is called', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
    ];
    vi.spyOn(component.activeIndexChange, 'emit');
    component['goTo'](1);
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should support controlled mode when activeIndex is set', () => {
    component.activeIndex = 2;
    fixture.detectChanges();
    expect(component['isControlled']).toBe(true);
  });

  it('should not support uncontrolled mode when activeIndex is undefined', () => {
    expect(component['isControlled']).toBe(false);
  });

  it('should play autoplay when autoplay is true', () => {
    component.autoplay = true;
    fixture.detectChanges();
    // Verify play was called during init
    expect(component['playing']).toBe(true);
  });

  it('should pause autoplay when reaching the end', async () => {
    component.autoplayInterval = 50;
    component.autoplay = true;
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
    ];

    component['play']();
    component['internalActiveIndex'] = 1;

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(component['playing']).toBe(false);
  });

  it('should toggle fullscreen mode', () => {
    expect(component['fullscreenActive']).toBe(false);
    component['openFullscreen']();
    expect(component['fullscreenActive']).toBe(true);
    component['closeFullscreen']();
    expect(component['fullscreenActive']).toBe(false);
  });

  it('should close fullscreen on Escape key', () => {
    component['openFullscreen']();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    vi.spyOn(event, 'preventDefault');
    component['onFullscreenKeydown'](event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component['fullscreenActive']).toBe(false);
  });

  it('should navigate to next item', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    vi.spyOn(component.activeIndexChange, 'emit');

    component['next']();
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should navigate to previous item', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    component['internalActiveIndex'] = 2;

    vi.spyOn(component.activeIndexChange, 'emit');
    component['prev']();
    expect(component.activeIndexChange.emit).toHaveBeenCalledWith(1);
  });

  it('should clamp index to valid range', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
    ];

    const clamped = component['clampIndex'](5);
    expect(clamped).toBe(1);

    const clampedNegative = component['clampIndex'](-1);
    expect(clampedNegative).toBe(0);
  });

  it('should provide correct range label', () => {
    component['items'] = [
      { src: 'test1.jpg', alt: 'test1' } as any,
      { src: 'test2.jpg', alt: 'test2' } as any,
      { src: 'test3.jpg', alt: 'test3' } as any,
    ];
    component['internalActiveIndex'] = 1;

    expect(component['rangeLabel']).toBe('Image 2 of 3');
  });

  it('should respect prefers-reduced-motion', () => {
    // jsdom has no matchMedia implementation at all, so there is nothing to vi.spyOn — assign
    // a stub outright rather than spying on a non-existent property.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as any);

    component['play']();
    expect(component['playing']).toBe(false);
  });

  describe('disabled (INO-926)', () => {
    beforeEach(() => {
      component['items'] = [
        { src: 'test1.jpg', alt: 'test1' } as any,
        { src: 'test2.jpg', alt: 'test2' } as any,
        { src: 'test3.jpg', alt: 'test3' } as any,
      ];
      component['internalActiveIndex'] = 1;
      component.disabled = true;
    });

    it('blocks goTo', () => {
      vi.spyOn(component.activeIndexChange, 'emit');
      component['goTo'](2);
      expect(component.activeIndexChange.emit).not.toHaveBeenCalled();
      expect(component['activeIdx']).toBe(1);
    });

    it('blocks next/prev (routed through goTo)', () => {
      vi.spyOn(component.activeIndexChange, 'emit');
      component['next']();
      component['prev']();
      expect(component.activeIndexChange.emit).not.toHaveBeenCalled();
    });

    it('blocks keyboard navigation', () => {
      vi.spyOn(component.activeIndexChange, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      component['onKeydown'](event);
      expect(component.activeIndexChange.emit).not.toHaveBeenCalled();
    });

    it('is reflected on the host as data-disabled and aria-disabled', () => {
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('data-disabled')).toBe('true');
      expect(host.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('fullscreen focus management (INO-926)', () => {
    @Component({
      standalone: true,
      imports: [InoGalleriaComponent, InoGalleriaItemComponent],
      template: `
        <button type="button" id="before">before</button>
        <ino-galleria ariaLabel="Gallery">
          <ino-galleria-item src="a.jpg" alt="a"></ino-galleria-item>
          <ino-galleria-item src="b.jpg" alt="b"></ino-galleria-item>
        </ino-galleria>
      `,
    })
    class HostComponent {}

    let hostFixture: ComponentFixture<HostComponent>;

    beforeEach(() => {
      hostFixture = TestBed.createComponent(HostComponent);
      document.body.appendChild(hostFixture.nativeElement);
      hostFixture.detectChanges();
    });

    afterEach(() => {
      hostFixture.destroy();
    });

    it('moves focus into the dialog (close button) on open, and traps Tab inside it', async () => {
      const root = hostFixture.nativeElement as HTMLElement;
      const trigger = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-btn')!;
      trigger.focus();

      trigger.click();
      hostFixture.detectChanges();
      await flush();

      const closeBtn = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-close')!;
      expect(document.activeElement).toBe(closeBtn);

      // Tab forward onto the last focusable element in the dialog (next), then off the end.
      const nextBtn = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-next')!;
      nextBtn.focus();
      expect(document.activeElement).toBe(nextBtn);

      // Simulate "Tab off the last focusable" by focusing the trailing sentinel directly, the
      // same event the browser's native tab order would deliver.
      const sentinels = root.querySelectorAll<HTMLElement>('[data-ino-focus-trap-sentinel]');
      const trailing = sentinels[sentinels.length - 1];
      trailing.focus();
      expect(document.activeElement).toBe(closeBtn);
    });

    it('restores focus to the trigger button when closed via the close button', async () => {
      const root = hostFixture.nativeElement as HTMLElement;
      const trigger = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-btn')!;
      trigger.focus();
      trigger.click();
      hostFixture.detectChanges();
      await flush();

      const closeBtn = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-close')!;
      closeBtn.click();
      hostFixture.detectChanges();
      await flush();

      expect(document.activeElement).toBe(trigger);
    });

    it('closes and restores focus on Escape', async () => {
      const root = hostFixture.nativeElement as HTMLElement;
      const trigger = root.querySelector<HTMLButtonElement>('.ino-galleria__fullscreen-btn')!;
      trigger.focus();
      trigger.click();
      hostFixture.detectChanges();
      await flush();

      const dialog = root.querySelector<HTMLElement>('.ino-galleria__fullscreen')!;
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      hostFixture.detectChanges();
      await flush();

      expect(root.querySelector('.ino-galleria__fullscreen')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
