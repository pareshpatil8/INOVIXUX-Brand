import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoConfirmPopupComponent } from './ino-confirm-popup.component';

/**
 * Regression coverage for INO-270: `<ino-confirm-popup>` never opened when driven through its own
 * documented public API — `toggle()` called from the *host's* click handler, exactly the pattern
 * in the component's own doc comment. Two independent bugs, reproduced and fixed together:
 *
 * 1. `toggle()`/`requestCancel()` mutated `open` on an `OnPush` component with no `markForCheck()`.
 *    The click listener lives in the host view, so change detection dirties the host and its
 *    ancestors, never the popup's own view — `*ngIf="open"` never re-evaluated.
 * 2. `activate()` scheduled `reposition()` on `queueMicrotask`, which drains before
 *    `ApplicationRef.tick()` — `#panel` isn't in the DOM yet, so `reposition()` took its early
 *    return and the panel stayed pinned at `top: 0; left: 0`.
 */
@Component({
  standalone: true,
  imports: [InoConfirmPopupComponent],
  template: `
    <button type="button" id="trigger" (click)="cp.toggle($event)">Trigger</button>
    <ino-confirm-popup #cp heading="H" message="M" />
  `,
})
class HostComponent {
  @ViewChild('cp') popup!: InoConfirmPopupComponent;
}

function panel(fixture: ComponentFixture<HostComponent>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.ino-confirm-popup');
}

describe('InoConfirmPopupComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('opens the panel when toggle() is called from the host template', () => {
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#trigger')!;
    trigger.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.popup.open).toBe(true);
    expect(panel(fixture)).not.toBeNull();
  });

  it('anchors the panel to a real position once the panel has been measured', async () => {
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#trigger')!;
    trigger.click();
    fixture.detectChanges();

    // Flush the setTimeout `reposition()` is deferred onto.
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    const style = panel(fixture)!.getAttribute('style') ?? '';
    expect(style).not.toBe('');
    expect(style).not.toContain('top: 0px');
  });

  it('closes the panel again on a second toggle()', async () => {
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#trigger')!;
    trigger.click();
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    trigger.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.popup.open).toBe(false);
    expect(panel(fixture)).toBeNull();
  });
});

/**
 * INO-271 event-contract regression: `shown`/`hidden` (new outputs added by that issue) must fire
 * on every real open/closed transition, including the input-driven path that never went through
 * `toggle()`/`requestCancel()` — see `../overlay/SPEC.md` §2.
 *
 * Drives `open` via `fixture.componentRef.setInput()` directly, not a host template `[open]="flag"`
 * binding — see the same note in `popover/ino-popover.spec.ts` for why a plain host-field mutation
 * doesn't reliably propagate to an OnPush child in this zoneless app.
 */
describe('InoConfirmPopupComponent ([open] input-driven, no toggle() call)', () => {
  let fixture: ComponentFixture<InoConfirmPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InoConfirmPopupComponent] }).compileComponents();
    fixture = TestBed.createComponent(InoConfirmPopupComponent);
    fixture.componentRef.setInput('heading', 'H');
    fixture.componentRef.setInput('message', 'M');
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
});
