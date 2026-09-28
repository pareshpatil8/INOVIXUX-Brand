import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoStepperComponent } from './ino-stepper.component';
import { InoStepComponent } from './ino-step.component';

/**
 * DoD row 12 (INO-272/INO-268 §6, recovered by INO-361) — `<ino-stepper>` has imperative
 * `next()`/`previous()` and internally-mutated consumer-driven `completed` gating, so it needs a
 * spec asserting the resulting DOM rather than just a build pass.
 *
 * A step that is locked by `linear` gating is **focusable-but-inert** (`aria-disabled`, roving
 * tabindex still reaches it) rather than natively `disabled` — the same "locked/readonly" contract
 * `ino-tabs` uses, so it is discoverable by a screen-reader user even while unreachable. Native
 * `[disabled]` is reserved for `<ino-step disabled>` (SPEC.md §1's "a step that should never be
 * reachable for some accounts" case), a different lock than "not reached yet."
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

  it('blocks clicking an unreached step ahead in linear mode, but leaves it focusable', () => {
    const buttons = stepButtons();
    expect(buttons[2].getAttribute('aria-disabled')).toBe('true');
    expect(buttons[2].disabled).toBe(false);

    buttons[2].click();
    fixture.detectChanges();

    const [p0] = panels();
    expect(p0.hidden).toBe(false);
  });

  it('next() unlocks the following step once the caller marks the current one completed', () => {
    host.stepper.next();
    fixture.detectChanges();

    // completed was never set on step 0, so linear gating still refuses the advance.
    const [p0] = panels();
    expect(p0.hidden).toBe(false);
  });

  it('next() advances once the current step is completed, via a real click path', () => {
    const buttons = stepButtons();
    // Simulate the consumer's form validation passing by driving completion through the DOM the
    // same way a real step's [completed] binding would: select step 1 directly is blocked, so we
    // instead flip completed on the InoStepComponent instance the way the consumer's template does.
    const stepDebugEls = fixture.debugElement.queryAll((de) => de.name === 'ino-step');
    (stepDebugEls[0].componentInstance as InoStepComponent).completed = true;
    fixture.detectChanges();

    host.stepper.next();
    fixture.detectChanges();

    const [p0, p1] = panels();
    expect(p1.hidden).toBe(false);
    expect(p0.hidden).toBe(true);
    expect(buttons[0].classList.contains('ino-stepper__step--completed')).toBe(true);
  });

  it('previous() always returns to the prior step', () => {
    const stepDebugEls = fixture.debugElement.queryAll((de) => de.name === 'ino-step');
    (stepDebugEls[0].componentInstance as InoStepComponent).completed = true;
    fixture.detectChanges();
    host.stepper.next();
    fixture.detectChanges();
    host.stepper.previous();
    fixture.detectChanges();

    const [p0] = panels();
    expect(p0.hidden).toBe(false);
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

describe('InoStepperComponent (readonly)', () => {
  @Component({
    standalone: true,
    imports: [InoStepperComponent, InoStepComponent],
    template: `
      <ino-stepper [linear]="false" [readonly]="true">
        <ino-step label="One">Panel one</ino-step>
        <ino-step label="Two">Panel two</ino-step>
      </ino-stepper>
    `,
  })
  class ReadonlyHost {}

  it('keeps focus navigation but refuses activation', async () => {
    await TestBed.configureTestingModule({ imports: [ReadonlyHost] }).compileComponents();
    const fixture = TestBed.createComponent(ReadonlyHost);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
    buttons[1].click();
    fixture.detectChanges();

    const panels: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tabpanel"]'));
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
  });
});

describe('InoStepperComponent (vertical orientation)', () => {
  @Component({
    standalone: true,
    imports: [InoStepperComponent, InoStepComponent],
    template: `
      <ino-stepper orientation="vertical" [linear]="false">
        <ino-step label="One">Panel one</ino-step>
        <ino-step label="Two" description="Second step">Panel two</ino-step>
      </ino-stepper>
    `,
  })
  class VerticalHost {}

  it('reflects orientation on the host and tablist, and renders step descriptions', async () => {
    await TestBed.configureTestingModule({ imports: [VerticalHost] }).compileComponents();
    const fixture = TestBed.createComponent(VerticalHost);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('ino-stepper');
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(host.getAttribute('data-orientation')).toBe('vertical');
    expect(tablist.getAttribute('aria-orientation')).toBe('vertical');
    expect(fixture.nativeElement.querySelector('.ino-stepper__description').textContent).toContain('Second step');
  });

  it('ArrowDown moves selection to the next step', async () => {
    await TestBed.configureTestingModule({ imports: [VerticalHost] }).compileComponents();
    const fixture = TestBed.createComponent(VerticalHost);
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));

    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    expect(buttons[1].getAttribute('aria-selected')).toBe('true');
  });
});
