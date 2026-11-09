import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoInputColorComponent } from './ino-inputcolor.component';

/** `hexInputInvalid`/`hintId`/`errorId` are `protected` — same external-cast convention
 *  `ino-colorpicker.spec.ts` uses for its own protected `hexInputInvalid`. */
function internal(
  component: InoInputColorComponent,
): { hexInputInvalid: boolean; hintId: string; errorId: string } {
  return component as unknown as { hexInputInvalid: boolean; hintId: string; errorId: string };
}

function swatch(fixture: ComponentFixture<InoInputColorComponent>): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-inputcolor__swatch')!;
}

function hexInput(fixture: ComponentFixture<InoInputColorComponent>): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-inputcolor__hex-input')!;
}

function presetButtons(fixture: ComponentFixture<InoInputColorComponent>): HTMLButtonElement[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ino-inputcolor__preset'));
}

describe('InoInputColorComponent', () => {
  let fixture: ComponentFixture<InoInputColorComponent>;
  let component: InoInputColorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoInputColorComponent] });
    fixture = TestBed.createComponent(InoInputColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the native swatch falling back to black when value is null', () => {
    expect(swatch(fixture).value).toBe('#000000');
    expect(hexInput(fixture).value).toBe('');
  });

  it('syncs the swatch and hex field from an externally-set value', () => {
    fixture.componentRef.setInput('value', '#7c5cfc');
    fixture.detectChanges();

    expect(swatch(fixture).value).toBe('#7c5cfc');
    expect(hexInput(fixture).value).toBe('#7c5cfc');
  });

  it('expands a 3-digit hex on commit from the native swatch', () => {
    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    const input = swatch(fixture);
    input.value = '#abcabc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.value).toBe('#abcabc');
    expect(emitted).toEqual(['#abcabc']);
    expect(hexInput(fixture).value).toBe('#abcabc');
  });

  it('commits a valid typed hex on blur and sets aria-invalid false', () => {
    const field = hexInput(fixture);
    field.value = '#0f0';
    field.dispatchEvent(new Event('input'));
    component.onHexBlur();
    fixture.detectChanges();

    expect(component.value).toBe('#00ff00');
    expect(swatch(fixture).value).toBe('#00ff00');
    expect(field.getAttribute('aria-invalid')).toBeNull();
  });

  it('sets invalid-hex and does not commit when the typed text does not parse', () => {
    fixture.componentRef.setInput('value', '#111111');
    fixture.detectChanges();

    const field = hexInput(fixture);
    field.value = 'not-a-color';
    field.dispatchEvent(new Event('input'));
    component.onHexBlur();
    fixture.detectChanges();

    expect(component.value).toBe('#111111');
    expect(internal(component).hexInputInvalid).toBe(true);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).classList.contains('ino-inputcolor--invalid-hex')).toBe(true);
  });

  it('clearing the hex field on blur does not flag invalid-hex or commit', () => {
    fixture.componentRef.setInput('value', '#111111');
    fixture.detectChanges();

    const field = hexInput(fixture);
    field.value = '';
    field.dispatchEvent(new Event('input'));
    component.onHexBlur();
    fixture.detectChanges();

    expect(component.value).toBe('#111111');
    expect(internal(component).hexInputInvalid).toBe(false);
  });

  it('renders one preset button per entry and commits a valid hex preset on click', () => {
    fixture.componentRef.setInput('presets', ['#ff0000', '#00ff00', 'not-a-color']);
    fixture.detectChanges();

    const buttons = presetButtons(fixture);
    expect(buttons.length).toBe(3);

    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    buttons[1].click();
    expect(component.value).toBe('#00ff00');
    expect(emitted).toEqual(['#00ff00']);
  });

  it('ignores a non-hex preset click without emitting or throwing', () => {
    fixture.componentRef.setInput('presets', ['not-a-color']);
    fixture.componentRef.setInput('value', '#222222');
    fixture.detectChanges();

    const emitted: (string | null)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    presetButtons(fixture)[0].click();
    expect(component.value).toBe('#222222');
    expect(emitted).toEqual([]);
  });

  it('renders no preset group when presets is empty', () => {
    expect(presetButtons(fixture).length).toBe(0);
  });

  it('blocks the native picker via preventDefault when readonly, but keeps the field focusable', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    const input = swatch(fixture);
    const event = new MouseEvent('click', { cancelable: true });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(input.disabled).toBe(false);
  });

  it('disables both the swatch and the hex field when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(swatch(fixture).disabled).toBe(true);
    expect(hexInput(fixture).disabled).toBe(true);
  });

  it('ignores a swatch input event while disabled or readonly', () => {
    fixture.componentRef.setInput('value', '#333333');
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    const input = swatch(fixture);
    input.value = '#999999';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBe('#333333');
  });

  it('wires the accessible name and description on the swatch', () => {
    fixture.componentRef.setInput('label', 'Brand colour');
    fixture.componentRef.setInput('value', '#7c5cfc');
    fixture.componentRef.setInput('hint', 'Pick the primary brand colour');
    fixture.detectChanges();

    const input = swatch(fixture);
    expect(input.getAttribute('aria-label')).toBe('Brand colour, #7c5cfc');
    expect(input.getAttribute('aria-describedby')).toBe(internal(component).hintId);
  });

  it('prefers the error description over the hint on both controls', () => {
    fixture.componentRef.setInput('hint', 'A hint');
    fixture.componentRef.setInput('error', 'Required');
    fixture.detectChanges();

    expect(swatch(fixture).getAttribute('aria-describedby')).toBe(internal(component).errorId);
    expect(hexInput(fixture).getAttribute('aria-describedby')).toBe(internal(component).errorId);
  });
});
