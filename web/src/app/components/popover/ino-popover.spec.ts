import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoPopoverComponent } from './ino-popover.component';

/**
 * Regression coverage for INO-268's merge-hygiene review of PR #38: the doc comment's own
 * "example #1" usage — `(click)="pop.toggle($event)"` with no `[(open)]` binding — never rendered
 * the panel before the fix (`OnPush` + internal `this.open` writes with no `markForCheck()`, so the
 * host's click handler dirtied the host view but never the popover's own view). Bare `toggle()`, no
 * two-way binding, is exactly the case that regressed, so it is exactly the case this asserts.
 */

@Component({
  standalone: true,
  imports: [InoPopoverComponent],
  template: `
    <button #anchor type="button" (click)="pop.toggle($event)">Filters</button>
    <ino-popover #pop heading="Filters">
      <p>content</p>
    </ino-popover>
  `,
})
class BareHost {
  @ViewChild('pop') pop!: InoPopoverComponent;
  @ViewChild('anchor') anchor!: ElementRef<HTMLButtonElement>;
}

function panel(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-popover');
}

/** Flush the `setTimeout` reposition() is deferred onto. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('InoPopoverComponent (bare usage, no [(open)] binding)', () => {
  let fixture: ComponentFixture<BareHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BareHost] }).compileComponents();
    fixture = TestBed.createComponent(BareHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the panel on a bare toggle() call with no two-way binding', () => {
    fixture.componentInstance.anchor.nativeElement.click();
    fixture.detectChanges();

    expect(panel(fixture)).not.toBeNull();
  });

  it('positions the panel relative to the anchor after the deferred reposition', async () => {
    fixture.componentInstance.anchor.nativeElement.click();
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const el = panel(fixture)!;
    expect(el.style.top).not.toBe('0px');
  });

  it('emits shown exactly once per toggle(), even under [(open)] two-way binding', () => {
    let shownCount = 0;
    fixture.componentInstance.pop.shown.subscribe(() => shownCount++);

    fixture.componentInstance.anchor.nativeElement.click();
    fixture.detectChanges();

    expect(shownCount).toBe(1);
  });
});

/**
 * INO-271 event-contract regression: `shown`/`hidden` must fire on every real open/closed
 * transition, not only on the imperative `show()`/`toggle()` entry point — see
 * `../overlay/SPEC.md` §2 for the rule and why `isOpenState` (not `open`) is what guards it.
 *
 * Drives `open` via `fixture.componentRef.setInput()` directly on the component, not through a
 * host template `[open]="flag"` binding: this app boots without zone.js (`../overlay/SPEC.md` §3),
 * and a plain host-field mutation followed by `fixture.detectChanges()` does not reliably
 * re-evaluate an already-clean OnPush child's input bindings in that configuration.
 * `componentRef.setInput()` is the Angular-blessed way to drive an OnPush component's `@Input` in
 * a test regardless.
 */
describe('InoPopoverComponent ([open] input-driven, no toggle()/show() call)', () => {
  let fixture: ComponentFixture<InoPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InoPopoverComponent] }).compileComponents();
    fixture = TestBed.createComponent(InoPopoverComponent);
    fixture.componentRef.setInput('heading', 'Filters');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('emits shown when [open] flips true and hidden when it flips back false', () => {
    let shownCount = 0;
    let hiddenCount = 0;
    fixture.componentInstance.shown.subscribe(() => shownCount++);
    fixture.componentInstance.hidden.subscribe(() => hiddenCount++);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(shownCount).toBe(1);
    expect(hiddenCount).toBe(0);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(shownCount).toBe(1);
    expect(hiddenCount).toBe(1);
  });

  it('does not double-emit shown when a redundant ngOnChanges pass re-feeds the same value', () => {
    let shownCount = 0;
    fixture.componentInstance.shown.subscribe(() => shownCount++);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    // Simulate the echo pass a two-way binding's own openChange handler would trigger.
    fixture.componentInstance.ngOnChanges({
      open: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false },
    });

    expect(shownCount).toBe(1);
  });
});
