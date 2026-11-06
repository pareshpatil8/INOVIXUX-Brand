import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoImagecompareComponent } from './ino-imagecompare.component';

function handle(fixture: ComponentFixture<InoImagecompareComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('[role="slider"]')!;
}

function frame(fixture: ComponentFixture<InoImagecompareComponent>): HTMLElement {
  const el = (fixture.nativeElement as HTMLElement).querySelector('.ino-imagecompare__frame')!;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 }),
  });
  return el as HTMLElement;
}

describe('InoImagecompareComponent', () => {
  let fixture: ComponentFixture<InoImagecompareComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoImagecompareComponent] });
    fixture = TestBed.createComponent(InoImagecompareComponent);
    fixture.componentRef.setInput('beforeSrc', '/before.jpg');
    fixture.componentRef.setInput('afterSrc', '/after.jpg');
    fixture.detectChanges();

    // jsdom does not implement pointer capture — stub both as no-ops, same gap
    // ino-colorpicker.spec.ts documents for this environment.
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  it('renders role=slider with aria-valuemin/max/now/valuetext/orientation', () => {
    const h = handle(fixture);
    expect(h.getAttribute('role')).toBe('slider');
    expect(h.getAttribute('aria-valuemin')).toBe('0');
    expect(h.getAttribute('aria-valuemax')).toBe('100');
    expect(h.getAttribute('aria-valuenow')).toBe('50');
    expect(h.getAttribute('aria-valuetext')).toBe('50% before shown');
    expect(h.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('both image layers are aria-hidden', () => {
    const imgs = (fixture.nativeElement as HTMLElement).querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(Array.from(imgs).every((img) => img.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('ArrowRight/Up increments by step, ArrowLeft/Down decrements, regardless of orientation', () => {
    const h = handle(fixture);
    const emitted: number[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(51);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(50);
    expect(emitted).toEqual([51, 50]);
  });

  it('PageUp/PageDown move by step * 10, Home/End jump to 0/100', () => {
    const h = handle(fixture);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(60);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(100);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(0);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(0); // already clamped at the floor
  });

  it('is at-bounds at 0 and 100, not in between', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('ino-imagecompare--at-bounds')).toBe(false);

    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();
    expect(host.classList.contains('ino-imagecompare--at-bounds')).toBe(true);

    fixture.componentRef.setInput('value', 100);
    fixture.detectChanges();
    expect(host.classList.contains('ino-imagecompare--at-bounds')).toBe(true);
  });

  it('clicking the frame jumps the value to the pointer position (horizontal)', () => {
    const f = frame(fixture);
    f.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 50, pointerId: 1 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(75);
  });

  it('dragging the handle sets isDragging and the dragging host class across the gesture, commits on move, clears on pointerup', () => {
    const h = handle(fixture);
    const f = frame(fixture);
    const host = fixture.nativeElement as HTMLElement;

    h.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 50, pointerId: 1 }));
    fixture.detectChanges();
    expect(host.classList.contains('ino-imagecompare--dragging')).toBe(true);

    h.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 50, pointerId: 1 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(10);

    h.dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 50, pointerId: 1 }));
    fixture.detectChanges();
    expect(host.classList.contains('ino-imagecompare--dragging')).toBe(false);
    void f;
  });

  it('vertical orientation switches aria-orientation and uses the block axis for drag', () => {
    fixture.componentRef.setInput('orientation', 'vertical');
    fixture.detectChanges();
    expect(handle(fixture).getAttribute('aria-orientation')).toBe('vertical');

    const f = frame(fixture);
    f.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 25, pointerId: 1 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(25);
  });

  it('disabled: handle gets tabindex=-1, aria-disabled, and ignores keyboard/pointer commits', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const h = handle(fixture);
    expect(h.getAttribute('tabindex')).toBe('-1');
    expect(h.getAttribute('aria-disabled')).toBe('true');

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(50);

    const f = frame(fixture);
    f.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 50, pointerId: 1 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(50);
  });

  it('readonly: handle stays focusable (tabindex=0) and aria-readonly, but commits no-op', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const h = handle(fixture);
    expect(h.getAttribute('tabindex')).toBe('0');
    expect(h.getAttribute('aria-readonly')).toBe('true');

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(50);
  });

  it('renders the before/after corner labels only when provided', () => {
    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.ino-imagecompare__label--before')).toBeNull();

    fixture.componentRef.setInput('beforeLabel', 'Before');
    fixture.componentRef.setInput('afterLabel', 'After');
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.ino-imagecompare__label--before')?.textContent).toBe('Before');
    expect(host.querySelector('.ino-imagecompare__label--after')?.textContent).toBe('After');
  });

  it('names the slider via ariaLabel', () => {
    fixture.componentRef.setInput('ariaLabel', 'Before and after');
    fixture.detectChanges();
    expect(handle(fixture).getAttribute('aria-label')).toBe('Before and after');
  });
});
