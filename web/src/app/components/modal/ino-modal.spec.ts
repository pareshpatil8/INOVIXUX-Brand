import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoModalComponent } from './ino-modal.component';

/**
 * INO-271 event-contract regression: `<ino-modal>` gained an `opened` output (previously only
 * `closed` existed) and both now fire on every real open/closed transition, including the
 * input-driven path — the only path this component has, since it exposes no imperative
 * `show()`/`open()` method. See `../overlay/SPEC.md` §2.
 *
 * Drives `open` via `fixture.componentRef.setInput()` directly, not a host template `[open]="flag"`
 * binding — see the same note in `popover/ino-popover.spec.ts` for why a plain host-field mutation
 * doesn't reliably propagate to an OnPush child in this zoneless app.
 */
describe('InoModalComponent (input-driven lifecycle events)', () => {
  let fixture: ComponentFixture<InoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InoModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(InoModalComponent);
    fixture.componentRef.setInput('heading', 'H');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('emits opened when [open] flips true and closed when it flips back false', () => {
    let openedCount = 0;
    let closedCount = 0;
    fixture.componentInstance.opened.subscribe(() => openedCount++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(openedCount).toBe(1);
    expect(closedCount).toBe(0);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(openedCount).toBe(1);
    expect(closedCount).toBe(1);
  });

  it('does not double-emit closed when requestClose() runs on an already-closed modal', () => {
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    fixture.componentInstance.requestClose();
    fixture.detectChanges();

    expect(closedCount).toBe(0);
  });
});
