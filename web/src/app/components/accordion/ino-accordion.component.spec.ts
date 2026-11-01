import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InoAccordionComponent } from './ino-accordion.component';
import { InoAccordionTabComponent } from './ino-accordion-tab.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [InoAccordionComponent, InoAccordionTabComponent],
  template: `
    <ino-accordion [multiple]="multiple" [size]="size" [iconPosition]="iconPosition">
      <ino-accordion-tab header="Tab 1" [expanded]="true">Content 1</ino-accordion-tab>
      <ino-accordion-tab header="Tab 2">Content 2</ino-accordion-tab>
      <ino-accordion-tab header="Tab 3" [disabled]="true">Content 3</ino-accordion-tab>
    </ino-accordion>
  `,
})
class TestHostComponent {
  multiple = false;
  size: 'compact' | 'comfortable' = 'comfortable';
  iconPosition: 'start' | 'end' = 'start';
}

describe('InoAccordionComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render three accordion tabs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('ino-accordion-tab');
    expect(tabs.length).toBe(3);
  });

  it('should apply compact size class when size is compact', () => {
    component.size = 'compact';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const accordion = compiled.querySelector('ino-accordion');
    expect(accordion?.classList.contains('ino-accordion--compact')).toBe(true);
  });

  it('should close other tabs in single-expand mode', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.ino-accordion-tab__header') as NodeListOf<HTMLButtonElement>;

    // Initially tab 1 is expanded
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');

    // Click tab 2
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Tab 1 should now be collapsed, tab 2 expanded
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('should allow multiple tabs open in multiple-expand mode', async () => {
    component.multiple = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.ino-accordion-tab__header') as NodeListOf<HTMLButtonElement>;

    // Initially tab 1 is expanded
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');

    // Click tab 2
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Both tabs should be expanded
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('should not toggle disabled tab', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.ino-accordion-tab__header') as NodeListOf<HTMLButtonElement>;

    // Tab 3 is disabled and collapsed
    expect(buttons[2].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[2].disabled).toBe(true);

    // Try to click it
    buttons[2].click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Should still be collapsed
    expect(buttons[2].getAttribute('aria-expanded')).toBe('false');
  });

  it('should have proper ARIA attributes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.ino-accordion-tab__header') as NodeListOf<HTMLButtonElement>;
    const panels = compiled.querySelectorAll('.ino-accordion-tab__body');

    buttons.forEach((button, index) => {
      const panel = panels[index];
      expect(button.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel.getAttribute('role')).toBe('region');
    });
  });
});
