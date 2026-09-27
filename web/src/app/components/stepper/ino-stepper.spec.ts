import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoStepperComponent } from './ino-stepper.component';
import { InoStepComponent } from './ino-step.component';

/**
 * DoD row 12 (INO-272/INO-268 §6) — `<ino-stepper>` has imperative `next()`/`previous()` and
 * internally-mutated linear-mode unlock state (`furthestIndex`), so it needs a spec asserting the
 * resulting DOM rather than just a build pass.
 */
@Component({
  standalone: true,
  imports: [InoStepperComponent, InoStepComponent],
  template: `
    <ino-stepper #stepper [activeIndex]="0">
      <ino-step label="One">Panel one</ino-step>
      <ino-step label="Two">Panel two</ino-step>
      <ino-step label="Three">Panel three</ino-step>
    </ino-stepper>
  `,
})
class HostComponent {
  @ViewChild('stepper') stepper!: InoStepperComponent;
}

describe('InoStepperComponent (linear mode, default)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function stepButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  }

  function panels(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="tabpanel"]'));
  }

  it('starts on step 0 with only that panel visible', () => {
    const [p0, p1, p2] = panels();
    expect(p0.hidden).toBe(false);
    expect(p1.hidden).toBe(true);
    expect(p2.hidden).toBe(true);
  });

  it('blocks clicking an unreached step ahead in linear mode', () => {
    const buttons = stepButtons();
    expect(buttons[2].disabled).toBe(true);

    buttons[2].click();
    fixture.detectChanges();

    const [p0] = panels();
    expect(p0.hidden).toBe(false);
  });

  it('next() unlocks the following step and marks the previous one completed', () => {
    host.stepper.next();
    fixture.detectChanges();

    const buttons = stepButtons();
    const [p0, p1] = panels();
    expect(p1.hidden).toBe(false);
    expect(p0.hidden).toBe(true);
    expect(buttons[0].classList.contains('ino-stepper__step--completed')).toBe(true);
    expect(buttons[2].disabled).toBe(true); // still unreached
  });

  it('previous() returns to prior step without losing the unlocked frontier', () => {
    host.stepper.next();
    fixture.detectChanges();
    host.stepper.previous();
    fixture.detectChanges();

    const buttons = stepButtons();
    const [p0] = panels();
    expect(p0.hidden).toBe(false);
    // step 1 was reached once, so it stays clickable even after going back to step 0.
    expect(buttons[1].disabled).toBe(false);
  });
});

describe('InoStepperComponent (non-linear)', () => {
  @Component({
    standalone: true,
    imports: [InoStepperComponent, InoStepComponent],
    template: `
      <ino-stepper [linear]="false">
        <ino-step label="One">Panel one</ino-step>
        <ino-step label="Two">Panel two</ino-step>
        <ino-step label="Three">Panel three</ino-step>
      </ino-stepper>
    `,
  })
  class NonLinearHost {}

  it('allows jumping directly to any non-disabled step', async () => {
    await TestBed.configureTestingModule({ imports: [NonLinearHost] }).compileComponents();
    const fixture = TestBed.createComponent(NonLinearHost);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
    buttons[2].click();
    fixture.detectChanges();

    const panels: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tabpanel"]'));
    expect(panels[2].hidden).toBe(false);
  });
});
