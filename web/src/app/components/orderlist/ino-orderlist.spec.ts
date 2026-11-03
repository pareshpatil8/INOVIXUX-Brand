import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoOrderListComponent, InoOrderListOption } from './ino-orderlist.component';

const OPTIONS: InoOrderListOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
  { label: 'Date', value: 'date' },
];

@Component({
  standalone: true,
  imports: [InoOrderListComponent],
  template: `<ino-orderlist
    label="Fruit"
    [options]="options"
    [value]="value"
    (valueChange)="value = $event"
    (optionsChange)="options = $event"
  />`,
})
class HostComponent {
  options = OPTIONS.map((o) => ({ ...o }));
  value: string[] = [];
}

describe('InoOrderListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    return rows().find((el) => el.textContent?.trim().startsWith(label))!;
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.includes(text),
    ) as HTMLButtonElement;
  }

  it('renders role="listbox" with one role="option" row per option', () => {
    const list = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(list).toBeTruthy();
    expect(rows().length).toBe(OPTIONS.length);
  });

  it('clicking a row toggles selection without affecting order', () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    expect(host.value).toEqual(['banana']);
    expect(rowByLabel('Banana').getAttribute('aria-selected')).toBe('true');
    expect(host.options.map((o) => o.value)).toEqual(['apple', 'banana', 'cherry', 'date']);
  });

  it('a disabled row cannot be selected', () => {
    rowByLabel('Cherry').click();
    fixture.detectChanges();
    expect(host.value).toEqual([]);
  });

  it('Move Down moves the selected row down one position and emits optionsChange', () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    button('Down').click();
    fixture.detectChanges();
    expect(host.options.map((o) => o.value)).toEqual(['apple', 'cherry', 'banana', 'date']);
  });

  it('Move to Top moves the selected row to the front', () => {
    rowByLabel('Date').click();
    fixture.detectChanges();
    button('Top').click();
    fixture.detectChanges();
    expect(host.options.map((o) => o.value)).toEqual(['date', 'apple', 'banana', 'cherry']);
  });

  it('Move to Bottom moves the selected row to the end', () => {
    rowByLabel('Apple').click();
    fixture.detectChanges();
    button('Bottom').click();
    fixture.detectChanges();
    expect(host.options.map((o) => o.value)).toEqual(['banana', 'cherry', 'date', 'apple']);
  });

  it('move buttons are disabled when nothing is selected', () => {
    expect(button('Up').disabled).toBe(true);
    expect(button('Down').disabled).toBe(true);
  });

  it('Alt+ArrowUp on a selected row moves it up, mirroring the button', () => {
    rowByLabel('Date').click();
    fixture.detectChanges();
    rowByLabel('Date').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));
    fixture.detectChanges();
    expect(host.options.map((o) => o.value)).toEqual(['apple', 'banana', 'date', 'cherry']);
  });

  it('applies and then clears the moved-flash class after a move', async () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    button('Down').click();
    fixture.detectChanges();
    expect(rowByLabel('Banana').classList).toContain('ino-orderlist__option--moved-flash');
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    fixture.detectChanges();
    expect(rowByLabel('Banana').classList).not.toContain('ino-orderlist__option--moved-flash');
  });
});
