import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoDividerComponent } from './ino-divider.component';

@Component({
  standalone: true,
  imports: [InoDividerComponent],
  template: `
    <ino-divider [orientation]="orientation" [thickness]="thickness" [label]="label"></ino-divider>
  `,
})
class HostComponent {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  thickness: 'hairline' | 'thick' = 'hairline';
  label = '';
}

describe('InoDividerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function divider(): HTMLElement {
    return fixture.nativeElement.querySelector('ino-divider');
  }

  it('renders role="separator" with no aria-orientation by default (horizontal)', () => {
    fixture.detectChanges();

    const el = divider();
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBeNull();
    expect(el.getAttribute('data-orientation')).toBe('horizontal');
    expect(el.getAttribute('data-thickness')).toBe('hairline');
  });

  it('sets aria-orientation="vertical" and data-orientation when orientation is vertical', () => {
    host.orientation = 'vertical';
    fixture.detectChanges();

    const el = divider();
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
    expect(el.getAttribute('data-orientation')).toBe('vertical');
  });

  it('reflects thickness as a data attribute', () => {
    host.thickness = 'thick';
    fixture.detectChanges();

    expect(divider().getAttribute('data-thickness')).toBe('thick');
  });

  it('renders a centered label in the horizontal orientation', () => {
    host.label = 'OR';
    fixture.detectChanges();

    const el = divider();
    expect(el.classList.contains('ino-divider--labelled')).toBe(true);
    const label = el.querySelector('.ino-divider__label');
    expect(label?.textContent?.trim()).toBe('OR');
    expect(el.querySelectorAll('.ino-divider__line').length).toBe(2);
  });

  it('ignores the label when orientation is vertical', () => {
    host.label = 'OR';
    host.orientation = 'vertical';
    fixture.detectChanges();

    const el = divider();
    expect(el.querySelector('.ino-divider__label')).toBeNull();
    expect(el.querySelectorAll('.ino-divider__line').length).toBe(1);
  });

  it('renders a single unlabelled line by default', () => {
    fixture.detectChanges();

    const el = divider();
    expect(el.querySelectorAll('.ino-divider__line').length).toBe(1);
    expect(el.querySelector('.ino-divider__label')).toBeNull();
  });
});
