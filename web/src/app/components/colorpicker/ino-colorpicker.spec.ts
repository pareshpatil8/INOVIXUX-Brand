import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoColorPickerComponent } from './ino-colorpicker.component';

function sbPanel(fixture: ComponentFixture<InoColorPickerComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-colorpicker__sb-panel')!;
}

function hueBar(fixture: ComponentFixture<InoColorPickerComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-colorpicker__hue-bar')!;
}

function hexField(fixture: ComponentFixture<InoColorPickerComponent>): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-colorpicker__hex-input')!;
}

describe('InoColorPickerComponent', () => {
  let fixture: ComponentFixture<InoColorPickerComponent>;
  let component: InoColorPickerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoColorPickerComponent] });
    fixture = TestBed.createComponent(InoColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // jsdom does not implement pointer capture — stub both as no-ops so the drag tests below can
    // dispatch real PointerEvents without throwing on a method the component calls but jsdom
    // doesn't provide, same gap any pointer-capture-based drag component would hit here.
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  it('renders with a null value and no fill on the trigger swatch', () => {
    expect(component.value).toBeNull();
    const swatch = (fixture.nativeElement as HTMLElement).querySelector('.ino-colorpicker__swatch') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('');
  });

  it('commits a typed hex value on blur and emits valueChange', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    const input = hexField(fixture);
    input.value = '#7C5CFC';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.value).toBe('#7c5cfcff');
    expect(emitted).toEqual(['#7c5cfcff']);
  });

  it('sets hexInputInvalid for an unparseable hex and does not commit', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    const input = hexField(fixture);
    input.value = 'not-a-color';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect((component as unknown as { hexInputInvalid: boolean }).hexInputInvalid).toBe(true);
    expect(component.value).toBeNull();
    expect(emitted.length).toBe(0);
  });

  it('does not emit valueChange on SB-panel pointermove (drag), only on pointerup (commit)', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));
    const panel = sbPanel(fixture);
    Object.defineProperty(panel, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }),
    });

    panel.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 50, pointerId: 1 }));
    panel.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 20, pointerId: 1 }));
    panel.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 10, pointerId: 1 }));
    fixture.detectChanges();
    expect(emitted.length).toBe(0);
    expect(component['isDragging']).toBe(true);

    panel.dispatchEvent(new PointerEvent('pointerup', { clientX: 180, clientY: 10, pointerId: 1 }));
    fixture.detectChanges();
    expect(emitted.length).toBe(1);
    expect(component['isDragging']).toBe(false);
  });

  it('hue bar keyboard ArrowRight/End adjust and commit immediately', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));
    const bar = hueBar(fixture);

    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(emitted.length).toBe(1);

    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    fixture.detectChanges();
    expect(emitted.length).toBe(2);
    expect(component['hsba'].h).toBe(360);
  });

  it('selectPreset with a hex preset re-derives the HSB model and emits the preset hex', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    component.selectPreset('#3D92BD');
    fixture.detectChanges();

    expect(emitted[0]).toBe('#3d92bdff');
  });

  it('selectPreset with a non-hex preset still selects/emits it verbatim', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    component.selectPreset('var(--ino-color-accent)');
    fixture.detectChanges();

    expect(emitted[0]).toBe('var(--ino-color-accent)');
    expect(component.value).toBe('var(--ino-color-accent)');
  });

  it('toggleOpen opens and closes the popover panel, no-op when inline', () => {
    expect(component['panelOpen']).toBe(false);
    component.toggleOpen();
    fixture.detectChanges();
    expect(component['panelOpen']).toBe(true);
    component.toggleOpen();
    fixture.detectChanges();
    expect(component['panelOpen']).toBe(false);

    component.inline = true;
    component.toggleOpen();
    expect(component['panelOpen']).toBe(false);
  });

  it('round-trips a #rgb-shorthand value into the full HSB/hex model on ngOnChanges', () => {
    fixture.componentRef.setInput('value', '#abc');
    fixture.detectChanges();
    expect(component['hsba'].a).toBe(100);
    expect(component.value).toBe('#abc');
  });

  it('disabled suppresses pointer/keyboard interaction on the hue bar', () => {
    component.disabled = true;
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));
    const bar = hueBar(fixture);
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(emitted.length).toBe(0);
  });
});
