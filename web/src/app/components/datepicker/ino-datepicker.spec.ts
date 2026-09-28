import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoDatePickerComponent } from './ino-datepicker.component';

/**
 * Regression coverage for INO-364: the overlay was `position:absolute` with no positioned
 * ancestor inside the component (it lived as a *sibling* of the trigger's own
 * `position:relative` wrapper, not nested inside it), so it anchored to whatever positioned
 * ancestor happened to exist on the *host page* instead of the trigger. Fix: nest the overlay
 * inside the trigger's wrapper for `appendTo="self"` (default), and add `appendTo="body"` — a
 * `position:fixed` portal, escaping `overflow:hidden`/scrolling ancestors that would otherwise
 * clip it regardless of position scheme.
 */

@Component({
  standalone: true,
  imports: [InoDatePickerComponent],
  template: `
    <div class="page-shell" style="position:relative;left:400px;top:400px">
      <div class="scroll-clip" style="overflow:hidden;height:60px">
        <ino-datepicker #dp [appendTo]="appendTo" [value]="null"></ino-datepicker>
      </div>
    </div>
  `,
})
class ConstrainedHost {
  @ViewChild('dp') dp!: InoDatePickerComponent;
  appendTo: 'self' | 'body' = 'self';
}

function overlay(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return document.querySelector('.ino-datepicker__overlay');
}

function trigger(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector('button.ino-field__control')!;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('InoDatePickerComponent overlay positioning (INO-364)', () => {
  let fixture: ComponentFixture<ConstrainedHost>;

  afterEach(() => {
    fixture.destroy();
    // Belt-and-suspenders: a portal test that fails mid-assertion must not leak a detached node
    // into the shared jsdom `document.body` and break a later test's `querySelector`.
    document.querySelectorAll('.ino-datepicker__overlay').forEach((el) => el.remove());
  });

  it('appendTo="self" (default): renders the overlay nested inside the trigger\'s own positioned wrapper, not as a sibling of it', async () => {
    fixture = TestBed.createComponent(ConstrainedHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    trigger(fixture).click();
    fixture.detectChanges();
    await flush();

    const el = overlay(fixture)!;
    expect(el).not.toBeNull();
    const wrap = el.closest('.ino-field__control-wrap');
    expect(wrap).not.toBeNull();
    // The wrapper — not some page-level ancestor — is the positioned ancestor absolute resolves against.
    expect(getComputedStyle(wrap!).position).toBe('relative');
    expect(getComputedStyle(el).position).toBe('absolute');
  });

  it('appendTo="body": reparents the overlay to document.body and switches it to position:fixed', async () => {
    fixture = TestBed.createComponent(ConstrainedHost);
    fixture.componentInstance.appendTo = 'body';
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    trigger(fixture).click();
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    const el = overlay(fixture)!;
    expect(el).not.toBeNull();
    expect(el.parentElement).toBe(document.body);
    expect(getComputedStyle(el).position).toBe('fixed');
    // Coordinates come from computeOverlayPlacement (gap alone guarantees a non-zero offset even
    // under jsdom's zero-rect layout), not the in-flow `inset-block-start`/`inset-inline-start`.
    expect(el.style.top).not.toBe('');
    expect(el.style.top).not.toBe('0px');
  });

  it('appendTo="body": removes the portaled overlay from document.body on close, leaving no detached node behind', async () => {
    fixture = TestBed.createComponent(ConstrainedHost);
    fixture.componentInstance.appendTo = 'body';
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    trigger(fixture).click();
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
    expect(overlay(fixture)).not.toBeNull();

    fixture.componentInstance.dp.requestClose();
    fixture.detectChanges();

    expect(document.body.querySelector('.ino-datepicker__overlay')).toBeNull();
  });
});
