import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoKeyfilterComponent } from './ino-keyfilter.component';
import { InoKeyfilterDirective } from './ino-keyfilter.directive';
import { InoKeyfilterPreset } from './keyfilter-presets';

/**
 * A filtering-only directive never writes an accepted character into the DOM itself — it relies
 * on the browser's native "insert the typed key" default action, which jsdom does not simulate
 * for `keydown` (unlike `<ino-inputmask>`, which hijacks every keystroke and writes `input.value`
 * itself, so its tests *can* assert on `.value`). The correct, faithful assertion here is
 * `event.defaultPrevented`: `false` means the directive let the browser's native action proceed,
 * `true` means it blocked the keystroke — exactly the contract `[inoKeyfilter]` promises.
 */
@Component({
  standalone: true,
  imports: [InoKeyfilterDirective],
  template: `<input [inoKeyfilter]="preset()" [pattern]="pattern()" [validateOnPaste]="validateOnPaste()" (inoKeyfilterReject)="onReject($event)" />`,
})
class HostComponent {
  readonly preset = signal<InoKeyfilterPreset>('int');
  readonly pattern = signal<string | RegExp>('');
  readonly validateOnPaste = signal(true);
  readonly rejected: string[] = [];
  onReject(value: string): void {
    this.rejected.push(value);
  }
}

describe('InoKeyfilterDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    // selectionStart/End are only meaningful once the field has focus — matches real usage (a
    // user can't type or paste into an unfocused field) and avoids jsdom's null selectionStart on
    // an untouched input being misread as "caret at the end".
    fixture.nativeElement.querySelector('input').focus();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function key(k: string, init: Partial<KeyboardEventInit> = {}): boolean {
    const event = new KeyboardEvent('keydown', { key: k, cancelable: true, bubbles: true, ...init });
    input().dispatchEvent(event);
    return event.defaultPrevented;
  }

  function paste(text: string): ClipboardEvent {
    const event = new Event('paste', { cancelable: true, bubbles: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    input().dispatchEvent(event);
    return event;
  }

  describe('preset: int', () => {
    beforeEach(() => {
      fixture.componentInstance.preset.set('int');
      fixture.detectChanges();
    });

    it('allows digits', () => {
      expect(key('7')).toBe(false);
    });

    it('rejects letters', () => {
      expect(key('a')).toBe(true);
      expect(fixture.componentInstance.rejected).toEqual(['a']);
    });

    it('allows a leading minus at the start of an empty field', () => {
      expect(key('-')).toBe(false);
    });

    it('rejects a second minus', () => {
      input().value = '-5';
      input().setSelectionRange(2, 2);
      expect(key('-')).toBe(true);
    });

    it('rejects a minus that is not at the start', () => {
      input().value = '5';
      input().setSelectionRange(1, 1);
      expect(key('-')).toBe(true);
    });
  });

  describe('preset: num', () => {
    beforeEach(() => {
      fixture.componentInstance.preset.set('num');
      fixture.detectChanges();
    });

    it('allows one decimal point', () => {
      input().value = '3';
      input().setSelectionRange(1, 1);
      expect(key('.')).toBe(false);
    });

    it('rejects a second decimal point', () => {
      input().value = '3.1';
      input().setSelectionRange(3, 3);
      expect(key('.')).toBe(true);
    });

    it('allows a leading minus', () => {
      expect(key('-')).toBe(false);
    });
  });

  describe('preset: alpha', () => {
    beforeEach(() => {
      fixture.componentInstance.preset.set('alpha');
      fixture.detectChanges();
    });

    it('allows letters', () => {
      expect(key('Q')).toBe(false);
    });

    it('rejects digits', () => {
      expect(key('3')).toBe(true);
    });
  });

  describe('preset: alphanum', () => {
    beforeEach(() => {
      fixture.componentInstance.preset.set('alphanum');
      fixture.detectChanges();
    });

    it('allows letters and digits', () => {
      expect(key('Q')).toBe(false);
      expect(key('3')).toBe(false);
    });

    it('rejects symbols', () => {
      expect(key('@')).toBe(true);
    });
  });

  describe('preset: regex', () => {
    beforeEach(() => {
      fixture.componentInstance.preset.set('regex');
      fixture.componentInstance.pattern.set('[a-f0-9]');
      fixture.detectChanges();
    });

    it('allows a character matching the custom pattern', () => {
      expect(key('a')).toBe(false);
    });

    it('rejects a character outside the custom pattern', () => {
      expect(key('g')).toBe(true);
    });
  });

  describe('keys the directive never touches', () => {
    beforeEach(() => fixture.componentInstance.preset.set('int'));

    it('never blocks IME composition (isComposing via legacy keyCode 229)', () => {
      expect(key('a', { keyCode: 229 } as KeyboardEventInit)).toBe(false);
      expect(fixture.componentInstance.rejected).toEqual([]);
    });

    it('never blocks a Ctrl/Cmd/Alt combo', () => {
      expect(key('a', { ctrlKey: true })).toBe(false);
      expect(key('a', { metaKey: true })).toBe(false);
      expect(key('a', { altKey: true })).toBe(false);
    });

    it('never blocks non-printable navigation/editing keys', () => {
      for (const k of ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']) {
        expect(key(k)).toBe(false);
      }
    });
  });

  describe('paste', () => {
    beforeEach(() => fixture.componentInstance.preset.set('int'));

    it('lets an already-valid paste proceed natively (no preventDefault, no reject)', () => {
      const event = paste('12345');
      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.rejected).toEqual([]);
    });

    it('strips disallowed characters and inserts the rest when validateOnPaste is true', () => {
      input().value = '';
      input().setSelectionRange(0, 0);
      const event = paste('1a2b3');
      expect(event.defaultPrevented).toBe(true);
      expect(input().value).toBe('123');
      expect(fixture.componentInstance.rejected).toEqual(['1a2b3']);
    });

    it('rejects the whole paste and inserts nothing when validateOnPaste is false', () => {
      fixture.componentInstance.validateOnPaste.set(false);
      fixture.detectChanges();
      input().value = '';
      const before = input().value;
      const event = paste('1a2b3');
      expect(event.defaultPrevented).toBe(true);
      expect(input().value).toBe(before);
    });

    it('inserts the filtered survivors at the caret, between the existing text on either side', () => {
      // 'c' and 'd' are disallowed (int preset) so this takes the manual-insert path rather than
      // the "already valid, let native paste proceed" early return, which is what actually
      // exercises caret placement.
      input().value = 'ab';
      input().setSelectionRange(1, 1);
      paste('c9d');
      expect(input().value).toBe('a9b');
    });
  });
});

describe('InoKeyfilterComponent', () => {
  @Component({
    standalone: true,
    imports: [InoKeyfilterComponent],
    template: `<ino-keyfilter preset="int"><input id="field" /></ino-keyfilter>`,
  })
  class WrapperHost {}

  it('filters through the element form without adding a wrapper node', () => {
    TestBed.configureTestingModule({ imports: [WrapperHost] });
    const fixture = TestBed.createComponent(WrapperHost);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('ino-keyfilter')!;
    const field = host.querySelector<HTMLInputElement>('#field')!;
    // hostDirectives means the directive operates on <ino-keyfilter> itself — the input is its
    // direct (projected) child, with no intermediate div.
    expect(host.firstElementChild).toBe(field);

    field.focus();
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true });
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
