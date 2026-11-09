import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoRatingComponent } from './ino-rating.component';

function group(fixture: ComponentFixture<InoRatingComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-rating__group')!;
}

function stars(fixture: ComponentFixture<InoRatingComponent>): HTMLElement[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ino-rating__star'));
}

function pressKey(fixture: ComponentFixture<InoRatingComponent>, key: string): void {
  group(fixture).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

describe('InoRatingComponent', () => {
  let fixture: ComponentFixture<InoRatingComponent>;
  let component: InoRatingComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoRatingComponent] });
    fixture = TestBed.createComponent(InoRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exposes a radiogroup of radios sized by count, with one checked at value', () => {
    fixture.componentRef.setInput('label', 'Satisfaction');
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    expect(group(fixture).getAttribute('role')).toBe('radiogroup');
    expect(group(fixture).getAttribute('aria-label')).toBe('Satisfaction');

    const s = stars(fixture);
    expect(s.length).toBe(5);
    s.forEach((el, i) => {
      expect(el.getAttribute('role')).toBe('radio');
      expect(el.getAttribute('aria-checked')).toBe(i + 1 === 3 ? 'true' : 'false');
      expect(el.getAttribute('aria-posinset')).toBe(String(i + 1));
      expect(el.getAttribute('aria-setsize')).toBe('5');
    });
    expect(s[0].classList.contains('ino-rating__star--filled')).toBe(true);
    expect(s[2].classList.contains('ino-rating__star--filled')).toBe(true);
    expect(s[3].classList.contains('ino-rating__star--filled')).toBe(false);
  });

  it('commits a value on click and emits once', () => {
    const emitted: number[] = [];
    component.valueChange.subscribe((v: number) => emitted.push(v));

    stars(fixture)[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.value).toBe(4);
    expect(emitted).toEqual([4]);
  });

  it('clears to 0 when cancelable and the selected star is clicked again', () => {
    fixture.componentRef.setInput('cancelable', true);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    const emitted: number[] = [];
    component.valueChange.subscribe((v: number) => emitted.push(v));

    stars(fixture)[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.value).toBe(0);
    expect(emitted).toEqual([0]);
  });

  it('does not clear on re-click when cancelable is false', () => {
    fixture.componentRef.setInput('cancelable', false);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    const emitted: number[] = [];
    component.valueChange.subscribe((v: number) => emitted.push(v));

    stars(fixture)[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.value).toBe(3);
    expect(emitted).toEqual([]);
  });

  it('previews on hover without emitting valueChange, and resets on pointerleave', () => {
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();

    const emitted: number[] = [];
    component.valueChange.subscribe((v: number) => emitted.push(v));

    stars(fixture)[3].dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    fixture.detectChanges();

    const s = stars(fixture);
    expect(s[3].classList.contains('ino-rating__star--filled')).toBe(true);
    expect(component.value).toBe(1);
    expect(emitted).toEqual([]);

    group(fixture).dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    fixture.detectChanges();
    expect(stars(fixture)[3].classList.contains('ino-rating__star--filled')).toBe(false);
  });

  it('selects with Arrow keys (selection follows focus), and jumps with Home/End', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('value', 2);
    fixture.detectChanges();

    pressKey(fixture, 'ArrowRight');
    expect(component.value).toBe(3);
    pressKey(fixture, 'ArrowDown');
    expect(component.value).toBe(4);
    pressKey(fixture, 'ArrowLeft');
    expect(component.value).toBe(3);
    pressKey(fixture, 'ArrowUp');
    expect(component.value).toBe(2);
    pressKey(fixture, 'End');
    expect(component.value).toBe(5);
    pressKey(fixture, 'Home');
    expect(component.value).toBe(1);
  });

  it('clamps Arrow selection at 1 and count', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    pressKey(fixture, 'ArrowRight');
    expect(component.value).toBe(3);

    pressKey(fixture, 'Home');
    expect(component.value).toBe(1);
    pressKey(fixture, 'ArrowLeft');
    expect(component.value).toBe(1);
  });

  it('ignores click and keyboard input when disabled or readonly', () => {
    fixture.componentRef.setInput('value', 2);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    stars(fixture)[4].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    pressKey(fixture, 'End');
    fixture.detectChanges();
    expect(component.value).toBe(2);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    stars(fixture)[4].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    pressKey(fixture, 'End');
    fixture.detectChanges();
    expect(component.value).toBe(2);
  });

  it('only one star carries tabindex 0 (roving tabindex), tracking value by default', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    const tabbable = stars(fixture).filter((s) => s.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0]).toBe(stars(fixture)[2]);
  });
});
