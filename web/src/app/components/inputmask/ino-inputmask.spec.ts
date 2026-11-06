import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoInputMaskComponent } from './ino-inputmask.component';

/**
 * Drives typing through real `keydown` events on the native `<input>` (not `setInput` on the
 * component alone) because the behavior under test — slot-array caret management — only exists
 * inside `onKeydown`/`onPaste`; asserting the DOM's `value` after dispatching real key events is
 * the only way to catch a caret-placement regression.
 */
@Component({
  standalone: true,
  imports: [InoInputMaskComponent],
  template: `<ino-inputmask [mask]="mask" [preset]="preset" [error]="error" (maskComplete)="onComplete($event)" />`,
})
class HostComponent {
  mask = 'AAAA0******';
  preset: '' = '';
  error = '';
  completed: string[] = [];
  onComplete(value: string): void {
    this.completed.push(value);
  }
}

describe('InoInputMaskComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    // selectionStart/End are only meaningful once the field has focus — matches real usage (a
    // user can't type into an unfocused field either) and avoids jsdom's null selectionStart on
    // an untouched input being misread as "caret at the end".
    (fixture.nativeElement.querySelector('input') as HTMLInputElement).focus();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function type(chars: string): void {
    for (const ch of chars) {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: ch, cancelable: true, bubbles: true }));
      fixture.detectChanges();
    }
  }

  function backspace(times = 1): void {
    for (let i = 0; i < times; i++) {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true, bubbles: true }));
      fixture.detectChanges();
    }
  }

  it('renders the full skeleton with placeholder chars before any input', () => {
    expect(input().value).toBe('____0______');
  });

  it('auto-uppercases letter slots and auto-inserts the literal 0 while typing', () => {
    type('hdfc');
    // 4 letters filled, caret skips the literal '0' automatically.
    expect(input().value).toBe('HDFC0______');
  });

  it('skips literal separators when typing across them', () => {
    // Only 10 keystrokes: 4 letters + 6 alnum — the literal '0' at slot 4 is never typed, the
    // caret auto-advances past it (see the "auto-inserts the literal" test above).
    type('hdfc001234');
    expect(input().value).toBe('HDFC0001234');
  });

  it('ignores a keystroke that does not match the current slot type', () => {
    type('h'); // letter slot — ok
    type('9'); // still a letter slot — rejected, no change
    expect(input().value).toBe('H___0______');
  });

  it('backspace clears the previous editable slot, skipping over literals', () => {
    type('hdfc001234');
    backspace(); // clears the last alnum slot
    expect(input().value).toBe('HDFC000123_');
    backspace(5); // walks back through the remaining alnum slots, over the literal '0', and stops
    expect(input().value).toBe('HDFC0______');
    expect(input().value.length).toBe(11);
  });

  it('reports incomplete once partially filled, and clears once emptied again', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('.ino-inputmask') ?? fixture.nativeElement;
    type('hd');
    expect(el.classList.contains('ino-inputmask--incomplete')).toBe(true);
    backspace(2);
    expect(el.classList.contains('ino-inputmask--incomplete')).toBe(false);
  });

  it('emits maskComplete once on the filling keystroke, and again on re-completion after a clear', () => {
    // maskComplete/valueChange carry the compact raw value — literals excluded — so the literal
    // '0' at slot 4 doesn't appear here even though it's always shown in the displayed value.
    type('hdfc001234');
    expect(fixture.componentInstance.completed).toEqual(['HDFC001234']);
    // An overflow keystroke past the end of the mask is a no-op — must not re-fire.
    type('9');
    expect(fixture.componentInstance.completed.length).toBe(1);
    // Clearing a slot flips back to incomplete; refilling it is a fresh incomplete→complete
    // transition and legitimately fires again (matches `ino-input-otp`'s `complete` semantics).
    backspace();
    type('4');
    expect(fixture.componentInstance.completed).toEqual(['HDFC001234', 'HDFC001234']);
  });

  it('handles paste across the whole pattern in one shot', () => {
    const el = input();
    // jsdom has no `ClipboardEvent` constructor — a plain `Event` with `clipboardData` bolted on
    // is all the component reads (`event.clipboardData?.getData('text')`).
    const pasteEvent = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => 'hdfc0001234' },
    });
    el.dispatchEvent(pasteEvent);
    fixture.detectChanges();
    expect(el.value).toBe('HDFC0001234');
  });

  it('exposes a format description for aria-describedby (mask announced via description)', () => {
    const description = fixture.nativeElement.querySelector('.ino-field__format-description');
    expect(description.textContent).toContain('4 letters');
    expect(description.textContent).toContain('6 letters or digits');
  });
});

describe('InoInputMaskComponent presets', () => {
  @Component({
    standalone: true,
    imports: [InoInputMaskComponent],
    template: `<ino-inputmask preset="pan" />`,
  })
  class PanHostComponent {}

  it('resolves the PAN preset mask', async () => {
    await TestBed.configureTestingModule({ imports: [PanHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PanHostComponent);
    fixture.detectChanges();
    const el: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(el.value).toBe('__________');
    expect(el.value.length).toBe(10);
  });
});
