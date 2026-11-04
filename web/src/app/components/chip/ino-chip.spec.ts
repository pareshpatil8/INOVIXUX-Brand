import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoChipComponent } from './ino-chip.component';

@Component({
  standalone: true,
  imports: [InoChipComponent],
  template: `
    <ino-chip
      [label]="label"
      [interactive]="interactive"
      [removable]="removable"
      [pressable]="pressable"
      [pressed]="pressed"
      [disabled]="disabled"
      [readonly]="readonly"
      (chipClick)="onChipClick()"
      (pressedChange)="onPressedChange($event)"
      (remove)="onRemove()"
    ></ino-chip>
  `,
})
class HostComponent {
  label = 'Angular';
  interactive = false;
  removable = false;
  pressable = false;
  pressed = false;
  disabled = false;
  readonly = false;
  clickCount = 0;
  lastPressed: boolean | null = null;
  removeCount = 0;

  onChipClick(): void {
    this.clickCount++;
  }

  onPressedChange(value: boolean): void {
    this.lastPressed = value;
  }

  onRemove(): void {
    this.removeCount++;
  }
}

describe('InoChipComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function query<T extends Element>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector);
  }

  it('renders a non-interactive span for a static, non-removable chip (no buttons)', () => {
    fixture.detectChanges();

    expect(query('span.ino-chip')).toBeTruthy();
    expect(query('button')).toBeNull();
    expect(query('.ino-chip__label')?.textContent?.trim()).toBe('Angular');
  });

  it('renders a real button and emits chipClick when interactive', () => {
    host.interactive = true;
    fixture.detectChanges();

    const btn = query<HTMLButtonElement>('button.ino-chip');
    expect(btn).toBeTruthy();

    btn!.click();
    fixture.detectChanges();

    expect(host.clickCount).toBe(1);
  });

  it('does not emit chipClick for a static chip even if clicked', () => {
    fixture.detectChanges();

    (query('span.ino-chip') as HTMLElement).click();
    fixture.detectChanges();

    expect(host.clickCount).toBe(0);
  });

  it('toggles pressed and emits pressedChange when interactive + pressable', () => {
    host.interactive = true;
    host.pressable = true;
    fixture.detectChanges();

    const btn = query<HTMLButtonElement>('button');
    expect(btn!.getAttribute('aria-pressed')).toBe('false');

    btn!.click();
    fixture.detectChanges();

    expect(host.lastPressed).toBe(true);
  });

  it('wraps removable content in a role="group" with no nested buttons (button-in-group contract)', () => {
    host.interactive = true;
    host.removable = true;
    fixture.detectChanges();

    const group = query<HTMLElement>('[role="group"]');
    expect(group).toBeTruthy();
    expect(group!.getAttribute('aria-label')).toBe('Angular');

    const buttons = group!.querySelectorAll('button');
    expect(buttons.length).toBe(2); // main + remove, siblings
    // No button contains another button.
    buttons.forEach((btn) => expect(btn.querySelector('button')).toBeNull());
  });

  it('sets an accessible remove-button label and emits remove after the exit transition ends', () => {
    host.removable = true;
    fixture.detectChanges();

    const removeBtn = query<HTMLButtonElement>('.ino-chip-remove');
    expect(removeBtn!.getAttribute('aria-label')).toBe('Remove Angular');

    removeBtn!.click();
    fixture.detectChanges();

    // remove() has not fired yet — the chip is mid-transition.
    expect(host.removeCount).toBe(0);
    expect(removeBtn!.disabled).toBe(true);

    query<HTMLElement>('.ino-chip-group')!.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();

    expect(host.removeCount).toBe(1);
  });

  it('does not remove when disabled', () => {
    host.removable = true;
    host.disabled = true;
    fixture.detectChanges();

    const removeBtn = query<HTMLButtonElement>('.ino-chip-remove');
    expect(removeBtn!.disabled).toBe(true);

    removeBtn!.click();
    fixture.detectChanges();

    expect(host.removeCount).toBe(0);
  });

  it('removes on Delete/Backspace when the main chip is focused and removable', () => {
    host.removable = true;
    fixture.detectChanges();

    const group = query<HTMLElement>('.ino-chip-group')!;
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    fixture.detectChanges();
    group.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();

    expect(host.removeCount).toBe(1);
  });
});
