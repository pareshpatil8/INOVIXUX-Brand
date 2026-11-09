import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoKnobComponent } from './ino-knob.component';

function handle(fixture: ComponentFixture<InoKnobComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-knob__handle')!;
}

function dial(fixture: ComponentFixture<InoKnobComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-knob__dial')!;
}

function pressKey(fixture: ComponentFixture<InoKnobComponent>, key: string): void {
  handle(fixture).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

describe('InoKnobComponent', () => {
  let fixture: ComponentFixture<InoKnobComponent>;
  let component: InoKnobComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoKnobComponent] });
    fixture = TestBed.createComponent(InoKnobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // jsdom does not implement pointer capture — stub both as no-ops so the drag tests below can
    // dispatch real PointerEvents without throwing (same gap as ino-colorpicker.spec.ts).
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
  });

  it('exposes the APG slider contract on the focusable handle', () => {
    // setInput, not direct assignment — the component is OnPush, so a bare property write after
    // the first render never marks the view dirty and detectChanges() would be a no-op.
    fixture.componentRef.setInput('label', 'Volume');
    fixture.componentRef.setInput('min', 0);
    fixture.componentRef.setInput('max', 100);
    fixture.componentRef.setInput('value', 30);
    fixture.detectChanges();

    const h = handle(fixture);
    expect(h.getAttribute('role')).toBe('slider');
    expect(h.getAttribute('tabindex')).toBe('0');
    expect(h.getAttribute('aria-label')).toBe('Volume');
    expect(h.getAttribute('aria-valuemin')).toBe('0');
    expect(h.getAttribute('aria-valuemax')).toBe('100');
    expect(h.getAttribute('aria-valuenow')).toBe('30');
    expect(h.getAttribute('aria-valuetext')).toBe('30');
  });

  it('formats aria-valuetext and the centre label through valueTemplate', () => {
    fixture.componentRef.setInput('value', 75);
    fixture.componentRef.setInput('valueTemplate', '{value}%');
    fixture.detectChanges();

    expect(handle(fixture).getAttribute('aria-valuetext')).toBe('75%');
    const text = (fixture.nativeElement as HTMLElement).querySelector('.ino-knob__text')!;
    expect(text.textContent!.trim()).toBe('75%');
  });

  it('steps with arrows, jumps by step*10 with PageUp/PageDown, and hits bounds with Home/End', () => {
    component.min = 0;
    component.max = 100;
    component.step = 5;
    component.value = 50;
    fixture.detectChanges();

    pressKey(fixture, 'ArrowRight');
    expect(component.value).toBe(55);
    pressKey(fixture, 'ArrowUp');
    expect(component.value).toBe(60);
    pressKey(fixture, 'ArrowLeft');
    expect(component.value).toBe(55);
    pressKey(fixture, 'ArrowDown');
    expect(component.value).toBe(50);
    pressKey(fixture, 'PageUp');
    expect(component.value).toBe(100); // 50 + 5*10, clamped exactly at max
    pressKey(fixture, 'Home');
    expect(component.value).toBe(0);
    pressKey(fixture, 'End');
    expect(component.value).toBe(100);
    pressKey(fixture, 'PageDown');
    expect(component.value).toBe(50);
  });

  it('clamps keyboard steps at the bounds and sets the at-bounds host classes', () => {
    component.min = 0;
    component.max = 10;
    component.value = 10;
    fixture.detectChanges();

    pressKey(fixture, 'ArrowRight');
    expect(component.value).toBe(10);
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-knob--at-max')).toBe(true);

    pressKey(fixture, 'Home');
    expect(component.value).toBe(0);
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-knob--at-min')).toBe(true);
  });

  it('ignores keyboard and pointer input when disabled or readonly', () => {
    component.value = 50;
    component.disabled = true;
    fixture.detectChanges();

    pressKey(fixture, 'ArrowRight');
    expect(component.value).toBe(50);

    component.disabled = false;
    component.readonly = true;
    fixture.detectChanges();

    pressKey(fixture, 'End');
    expect(component.value).toBe(50);

    dial(fixture).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
    fixture.detectChanges();
    expect(component.value).toBe(50);
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-knob--dragging')).toBe(false);
  });

  it('maps a pointer-down on the dial to a value by angle and sets the dragging class', () => {
    component.min = 0;
    component.max = 100;
    component.step = 1;
    component.value = 0;
    fixture.detectChanges();

    const d = dial(fixture);
    // jsdom reports a zero rect; stub an 80×80 dial at origin so centre = (40, 40).
    d.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 80, height: 80, right: 80, bottom: 80, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    // Pointer straight up from centre (40, 0) = top of the dial = 50% of the 270° sweep.
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 40, clientY: 0 }));
    fixture.detectChanges();

    expect(component.value).toBe(50);
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-knob--dragging')).toBe(true);

    d.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-knob--dragging')).toBe(false);
  });

  it('snaps pointer angles inside the bottom gap to the nearer bound', () => {
    component.min = 0;
    component.max = 100;
    component.value = 50;
    fixture.detectChanges();

    const d = dial(fixture);
    d.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 80, height: 80, right: 80, bottom: 80, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    // Straight down from centre (40, 80): the middle of the 90° gap splits toward... the test
    // pins the documented rule: just past the sweep end (gap's max side) snaps to max.
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 80 }));
    fixture.detectChanges();
    expect(component.value).toBe(100);
    d.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Gap's min side (down-left of centre, just before the sweep start) snaps to min.
    d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 30, clientY: 80 }));
    fixture.detectChanges();
    expect(component.value).toBe(0);
  });

  it('emits valueChange once per committed change and never re-emits an unchanged value', () => {
    component.min = 0;
    component.max = 10;
    component.value = 10;
    fixture.detectChanges();

    const emitted: number[] = [];
    component.valueChange.subscribe((v: number) => emitted.push(v));

    pressKey(fixture, 'ArrowRight'); // already at max — no emit
    pressKey(fixture, 'ArrowLeft'); // 9
    pressKey(fixture, 'Home'); // 0
    expect(emitted).toEqual([9, 0]);
  });
});
