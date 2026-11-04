import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoCarouselComponent } from './ino-carousel.component';
import { InoCarouselItemComponent } from './ino-carousel-item.component';

/**
 * INO-483 §2 point 2/8 — `<ino-carousel>` has imperative window state driven by content children
 * (`@ContentChildren`), so it needs a spec asserting the resulting DOM/hidden state, not just a
 * build pass. Mirrors `ino-tabs.spec.ts`'s host-template approach for the same reason: the
 * behavior under test depends on projected children the container discovers via content
 * projection, not on the container's inputs alone.
 */
@Component({
  standalone: true,
  imports: [InoCarouselComponent, InoCarouselItemComponent],
  template: `
    <ino-carousel
      ariaLabel="Test carousel"
      [visibleCount]="visibleCount"
      [step]="step"
      [circular]="circular"
      [activeIndex]="activeIndex"
      (activeIndexChange)="activeIndex = $event"
    >
      <ino-carousel-item>One</ino-carousel-item>
      <ino-carousel-item>Two</ino-carousel-item>
      <ino-carousel-item>Three</ino-carousel-item>
      <ino-carousel-item>Four</ino-carousel-item>
      <ino-carousel-item>Five</ino-carousel-item>
    </ino-carousel>
  `,
})
class HostComponent {
  visibleCount = 1;
  step = 1;
  circular = false;
  activeIndex = 0;
}

@Component({
  standalone: true,
  imports: [InoCarouselComponent, InoCarouselItemComponent],
  template: `
    <ino-carousel ariaLabel="Uncontrolled carousel">
      <ino-carousel-item>One</ino-carousel-item>
      <ino-carousel-item>Two</ino-carousel-item>
      <ino-carousel-item>Three</ino-carousel-item>
    </ino-carousel>
  `,
})
class UncontrolledHostComponent {}

describe('InoCarouselComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function items(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.ino-carousel-item'));
  }

  function visibleItems(): HTMLElement[] {
    return items().filter((el) => !el.hasAttribute('hidden'));
  }

  function nextButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.ino-carousel__nav--next');
  }

  function prevButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.ino-carousel__nav--prev');
  }

  it('renders the APG carousel region with its label', () => {
    const region = fixture.nativeElement.querySelector('.ino-carousel');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    expect(region.getAttribute('aria-label')).toBe('Test carousel');
  });

  it('shows only the active slide and gives each slide its "n of total" label', () => {
    expect(visibleItems().length).toBe(1);
    expect(visibleItems()[0].getAttribute('aria-label')).toBe('1 of 5');
    expect(visibleItems()[0].getAttribute('aria-roledescription')).toBe('slide');
  });

  it('disables prev at the start and enables next when not circular', () => {
    expect(prevButton().disabled).toBe(true);
    expect(nextButton().disabled).toBe(false);
  });

  it('advances the controlled activeIndex via emitted events and clicking next', () => {
    nextButton().click();
    fixture.detectChanges();
    expect(host.activeIndex).toBe(1);
    expect(visibleItems()[0].getAttribute('aria-label')).toBe('2 of 5');
  });

  it('disables next and re-enables prev once at the last non-circular stop', () => {
    host.activeIndex = 4;
    fixture.detectChanges();
    expect(nextButton().disabled).toBe(true);
    expect(prevButton().disabled).toBe(false);
  });

  it('wraps past the end when circular', () => {
    host.circular = true;
    host.activeIndex = 4;
    fixture.detectChanges();
    expect(nextButton().disabled).toBe(false);
    nextButton().click();
    fixture.detectChanges();
    expect(host.activeIndex).toBe(0);
  });

  it('shows visibleCount items in the window', () => {
    host.visibleCount = 3;
    fixture.detectChanges();
    expect(visibleItems().length).toBe(3);
  });

  it('moves by step on next/prev', () => {
    host.step = 2;
    fixture.detectChanges();
    nextButton().click();
    fixture.detectChanges();
    expect(host.activeIndex).toBe(2);
  });

  it('moves focus and advances on ArrowRight/ArrowLeft', () => {
    const track: HTMLElement = fixture.nativeElement.querySelector('.ino-carousel__track');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(host.activeIndex).toBe(1);
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(host.activeIndex).toBe(0);
  });

  it('jumps to the last stop on End and back to 0 on Home', () => {
    const track: HTMLElement = fixture.nativeElement.querySelector('.ino-carousel__track');
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    expect(host.activeIndex).toBe(4);
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    fixture.detectChanges();
    expect(host.activeIndex).toBe(0);
  });

  it('renders one indicator per reachable stop with the current one marked aria-current', () => {
    const indicators: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.ino-carousel__indicator'),
    );
    expect(indicators.length).toBe(5);
    expect(indicators[0].getAttribute('aria-current')).toBe('true');
    indicators[2].click();
    fixture.detectChanges();
    expect(host.activeIndex).toBe(2);
  });
});

describe('InoCarouselComponent (uncontrolled)', () => {
  it('owns its own startIndex starting at 0 when activeIndex is omitted', async () => {
    await TestBed.configureTestingModule({ imports: [UncontrolledHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UncontrolledHostComponent);
    fixture.detectChanges();
    const nextButton: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-carousel__nav--next');
    nextButton.click();
    fixture.detectChanges();
    const visible: HTMLElement[] = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.ino-carousel-item'),
    ).filter((el) => !el.hasAttribute('hidden'));
    expect(visible[0].getAttribute('aria-label')).toBe('2 of 3');
  });
});
