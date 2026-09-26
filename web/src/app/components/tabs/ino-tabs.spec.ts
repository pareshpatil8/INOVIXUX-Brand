import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoTabsComponent } from './ino-tabs.component';
import { InoTabComponent } from './ino-tab.component';

/**
 * DoD row 12 (INO-272/INO-268 §6) — `<ino-tabs>` has imperative selection state driven by content
 * children (`@ContentChildren`), so it needs a spec asserting the resulting DOM, not just a build
 * pass. Drives selection through a real host template (not `setInput` on the container alone)
 * because the behavior under test — which `<ino-tab>` panel is `[hidden]` — depends on the
 * projected children the container discovers via content projection.
 */
@Component({
  standalone: true,
  imports: [InoTabsComponent, InoTabComponent],
  template: `
    <ino-tabs [activeIndex]="activeIndex">
      <ino-tab label="One">Panel one</ino-tab>
      <ino-tab label="Two" [disabled]="true">Panel two</ino-tab>
      <ino-tab label="Three">Panel three</ino-tab>
    </ino-tabs>
  `,
})
class HostComponent {
  activeIndex = 0;
}

describe('InoTabsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function tabButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  }

  function panels(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="tabpanel"]'));
  }

  it('shows only the active panel and marks its tab aria-selected', () => {
    const buttons = tabButtons();
    const [p0, p1, p2] = panels();

    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(p0.hidden).toBe(false);
    expect(p1.hidden).toBe(true);
    expect(p2.hidden).toBe(true);
  });

  it('clicking a tab switches the active panel', () => {
    const buttons = tabButtons();
    buttons[2].click();
    fixture.detectChanges();

    const [p0, , p2] = panels();
    expect(buttons[2].getAttribute('aria-selected')).toBe('true');
    expect(p0.hidden).toBe(true);
    expect(p2.hidden).toBe(false);
  });

  it('never activates a disabled tab', () => {
    const buttons = tabButtons();
    buttons[1].click();
    fixture.detectChanges();

    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowRight moves selection to the next enabled tab, skipping disabled ones', () => {
    const buttons = tabButtons();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(buttons[2].getAttribute('aria-selected')).toBe('true');
  });

  it('only the active tab is in the tab order (roving tabindex)', () => {
    const buttons = tabButtons();
    expect(buttons[0].getAttribute('tabindex')).toBe('0');
    expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    expect(buttons[2].getAttribute('tabindex')).toBe('-1');
  });
});
