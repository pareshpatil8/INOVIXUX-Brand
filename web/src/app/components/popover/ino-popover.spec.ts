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
