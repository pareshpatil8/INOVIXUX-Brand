import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoPanelComponent } from './ino-panel.component';

/**
 * Covers the disclosure contract (collapsible vs plain header, the readonly/disabled toggle
 * lock, aria-expanded/aria-controls wiring) and the landmark label (SPEC.md §2) — the parts that
 * aren't visible from reading the template in isolation.
 */
describe('InoPanelComponent', () => {
  let fixture: ComponentFixture<InoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoPanelComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InoPanelComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders a region landmark labelled by the header text', () => {
    fixture.componentRef.setInput('header', 'Billing details');
    fixture.detectChanges();

    const region: HTMLElement = fixture.nativeElement.querySelector('[role="region"]');
    const labelId = region.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`#${labelId}`)?.textContent?.trim()).toBe('Billing details');
  });

  it('renders the header as plain text, with no toggle button, when not collapsible', () => {
    fixture.componentRef.setInput('header', 'Static section');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-panel__toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ino-panel__header-text').textContent.trim()).toBe('Static section');
  });

  it('toggles collapsed and emits collapsedChange when collapsible', () => {
    fixture.componentRef.setInput('header', 'Advanced options');
    fixture.componentRef.setInput('collapsible', true);
    fixture.detectChanges();

    const emitted: boolean[] = [];
    fixture.componentInstance.collapsedChange.subscribe((v) => emitted.push(v));

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-panel__toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(emitted).toEqual([true]);
    expect(fixture.componentInstance.collapsed).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.ino-panel__body').hidden).toBe(true);
  });

  it('aria-controls on the toggle points at the body region id', () => {
    fixture.componentRef.setInput('header', 'Section');
    fixture.componentRef.setInput('collapsible', true);
    fixture.detectChanges();

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-panel__toggle');
    const body: HTMLElement = fixture.nativeElement.querySelector('.ino-panel__body');
    expect(toggle.getAttribute('aria-controls')).toBe(body.id);
  });

  it('readonly locks the toggle without emitting, disabled locks it too', () => {
    fixture.componentRef.setInput('header', 'Locked section');
    fixture.componentRef.setInput('collapsible', true);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    const emitted: boolean[] = [];
    fixture.componentInstance.collapsedChange.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onToggle();
    expect(emitted).toEqual([]);
    expect(fixture.componentInstance.collapsed).toBe(false);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    fixture.componentInstance.onToggle();
    expect(emitted).toEqual([]);
  });

  it('projects footer content into the footer slot', () => {
    fixture.detectChanges();
    const footer: HTMLElement = fixture.nativeElement.querySelector('.ino-panel__footer');
    expect(footer).toBeTruthy();
  });
});
