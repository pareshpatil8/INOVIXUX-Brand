import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoToggleButtonComponent } from './ino-toggle-button.component';

@Component({
  standalone: true,
  imports: [InoToggleButtonComponent],
  template: `
    <ino-toggle-button
      onLabel="Bold on"
      offLabel="Bold off"
      [pressed]="pressed"
      [disabled]="disabled"
      [readonly]="readonly"
      [loading]="loading"
      [error]="error"
      (pressedChange)="onPressedChange($event)"
    ></ino-toggle-button>
  `,
})
class HostComponent {
  pressed = false;
  disabled = false;
  readonly = false;
  loading = false;
  error = '';
  lastEmitted: boolean | null = null;

  onPressedChange(value: boolean): void {
    this.lastEmitted = value;
  }
}

describe('InoToggleButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('renders offLabel and aria-pressed="false" by default', () => {
    fixture.detectChanges();

    const btn = button();
    expect(btn.textContent?.trim()).toBe('Bold off');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles to onLabel and aria-pressed="true" on click, emitting pressedChange', () => {
    fixture.detectChanges();

    button().click();
    fixture.detectChanges();

    const btn = button();
    expect(btn.textContent?.trim()).toBe('Bold on');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(host.lastEmitted).toBe(true);
  });

  it('toggles back to offLabel and aria-pressed="false" on a second click', () => {
    fixture.detectChanges();

    const btn = button();
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();

    expect(btn.textContent?.trim()).toBe('Bold off');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(host.lastEmitted).toBe(false);
  });

  it('renders pressed=true (onLabel, aria-pressed="true") when set before the initial render', () => {
    host.pressed = true;
    fixture.detectChanges();

    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().textContent?.trim()).toBe('Bold on');
  });

  it('does not toggle or emit when disabled', () => {
    host.disabled = true;
    fixture.detectChanges();

    const btn = button();
    expect(btn.disabled).toBe(true);
    btn.click();
    fixture.detectChanges();

    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(host.lastEmitted).toBeNull();
  });

  it('does not toggle or emit when readonly, but stays focusable', () => {
    host.readonly = true;
    fixture.detectChanges();

    const btn = button();
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-readonly')).toBe('true');

    btn.click();
    fixture.detectChanges();

    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(host.lastEmitted).toBeNull();
  });

  it('disables the control and sets aria-busy while loading', () => {
    host.loading = true;
    fixture.detectChanges();

    const btn = button();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ino-toggle-button__spinner')).toBeTruthy();
  });

  it('sets aria-invalid and aria-describedby and renders the error message when error is set', () => {
    host.error = 'Something went wrong';
    fixture.detectChanges();

    const btn = button();
    expect(btn.getAttribute('aria-invalid')).toBe('true');
    const describedby = btn.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();

    const errorEl = fixture.nativeElement.querySelector(`#${describedby}`);
    expect(errorEl.textContent?.trim()).toBe('Something went wrong');
    expect(errorEl.getAttribute('role')).toBe('alert');
  });
});
