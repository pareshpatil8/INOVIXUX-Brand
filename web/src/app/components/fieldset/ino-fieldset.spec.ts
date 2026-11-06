import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoFieldsetComponent } from './ino-fieldset.component';

@Component({
  standalone: true,
  imports: [InoFieldsetComponent],
  template: `
    <ino-fieldset
      legend="Shipping address"
      [collapsible]="collapsible"
      [collapsed]="collapsed"
      [disabled]="disabled"
      [readonly]="readonly"
      [loading]="loading"
      [error]="error"
      (collapsedChange)="onCollapsedChange($event)"
    >
      <input id="street" />
    </ino-fieldset>
  `,
})
class HostComponent {
  collapsible = false;
  collapsed = false;
  disabled = false;
  readonly = false;
  loading = false;
  error = '';
  lastEmitted: boolean | null = null;

  onCollapsedChange(value: boolean): void {
    this.lastEmitted = value;
  }
}

describe('InoFieldsetComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function fieldset(): HTMLFieldSetElement {
    return fixture.nativeElement.querySelector('fieldset');
  }

  function toggle(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.ino-fieldset__toggle');
  }

  it('renders a native fieldset/legend with plain text legend when not collapsible', () => {
    fixture.detectChanges();

    expect(fieldset()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('legend').textContent?.trim()).toBe('Shipping address');
    expect(toggle()).toBeNull();
  });

  it('renders a disclosure toggle with aria-expanded/aria-controls when collapsible', () => {
    host.collapsible = true;
    fixture.detectChanges();

    const btn = toggle()!;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const controls = btn.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`#${controls}`)).toBeTruthy();
  });

  it('toggles collapsed, hides content, and emits collapsedChange on click', () => {
    host.collapsible = true;
    fixture.detectChanges();

    toggle()!.click();
    fixture.detectChanges();

    const btn = toggle()!;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.ino-fieldset__content').hidden).toBe(true);
    expect(host.lastEmitted).toBe(true);
  });

  // jsdom does not implement the HTML "fieldset disabled" descendant-cascade algorithm (verified
  // directly against jsdom: a disabled <fieldset><input></fieldset> leaves input.disabled false),
  // so only the fieldset's own attribute is assertable here; the descendant cascade itself is
  // real, spec-correct behavior in every evergreen browser and requires no code in this component.
  it('sets the native disabled attribute on the fieldset when disabled', () => {
    host.disabled = true;
    fixture.detectChanges();

    expect(fieldset().disabled).toBe(true);
  });

  it('does not toggle or emit when readonly, and sets aria-disabled on the toggle', () => {
    host.collapsible = true;
    host.readonly = true;
    fixture.detectChanges();

    const btn = toggle()!;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-disabled')).toBe('true');

    btn.click();
    fixture.detectChanges();

    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(host.lastEmitted).toBeNull();
  });

  it('sets aria-busy while loading', () => {
    host.loading = true;
    fixture.detectChanges();

    expect(fieldset().getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ino-fieldset__spinner')).toBeTruthy();
  });

  it('sets aria-invalid/aria-describedby and renders the error message when error is set', () => {
    host.error = 'Please complete this section';
    fixture.detectChanges();

    const fs = fieldset();
    expect(fs.getAttribute('aria-invalid')).toBe('true');
    const describedby = fs.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();

    const errorEl = fixture.nativeElement.querySelector(`#${describedby}`);
    expect(errorEl.textContent?.trim()).toBe('Please complete this section');
    expect(errorEl.getAttribute('role')).toBe('alert');
  });
});
