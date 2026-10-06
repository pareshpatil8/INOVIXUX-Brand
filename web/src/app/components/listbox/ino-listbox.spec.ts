import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoListboxComponent, InoListboxOption } from './ino-listbox.component';

const OPTIONS: InoListboxOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
  { label: 'Date', value: 'date' },
];

@Component({
  standalone: true,
  imports: [InoListboxComponent],
  template: `<ino-listbox
    label="Fruit"
    [options]="options"
    [value]="value"
    [multiple]="multiple"
    [filter]="filter"
    (valueChange)="onValueChange($event)"
  />`,
})
class HostComponent {
  options = OPTIONS;
  value: string | string[] = '';
  multiple = false;
  filter = false;
  emitted: Array<string | string[]> = [];
  onValueChange(value: string | string[]): void {
    this.emitted.push(value);
  }
}

describe('InoListboxComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    return rows().find((el) => el.textContent?.trim().startsWith(label))!;
  }

  it('renders role="listbox" with one role="option" row per option', () => {
    const list = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(list).toBeTruthy();
    expect(rows().length).toBe(OPTIONS.length);
  });

  it('single-selection: clicking a row replaces value and sets aria-selected', () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual(['banana']);
    expect(rowByLabel('Banana').getAttribute('aria-selected')).toBe('true');
    expect(rowByLabel('Apple').getAttribute('aria-selected')).toBe('false');
  });

  it('disabled rows do not emit on click and carry aria-disabled', () => {
    const cherry = rowByLabel('Cherry');
    expect(cherry.getAttribute('aria-disabled')).toBe('true');
    cherry.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([]);
  });

  it('roving tabindex: exactly one enabled row is tabbable, starting at the first enabled row', () => {
    const tabbable = rows().filter((el) => el.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].textContent?.trim().startsWith('Apple')).toBe(true);
    // Disabled rows never carry a tabindex at all.
    expect(rowByLabel('Cherry').hasAttribute('tabindex')).toBe(false);
  });

  it('ArrowDown moves the roving tabindex to the next enabled row and updates selection', () => {
    rowByLabel('Apple').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Banana').getAttribute('tabindex')).toBe('0');
    expect(fixture.componentInstance.emitted).toEqual(['banana']);
  });

  it('ArrowDown skips disabled rows', () => {
    // Apple (active by default) -> Banana -> Date: the disabled Cherry row is never a landing spot.
    rowByLabel('Apple').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    rowByLabel('Banana').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Date').getAttribute('tabindex')).toBe('0');
  });

  it('Home/End jump to the first/last enabled row', () => {
    const banana = rowByLabel('Banana');
    banana.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Date').getAttribute('tabindex')).toBe('0');

    rowByLabel('Date').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Apple').getAttribute('tabindex')).toBe('0');
  });

  it('typeahead jumps to the next row whose label starts with the typed character', () => {
    rowByLabel('Apple').dispatchEvent(new KeyboardEvent('keydown', { key: 'd', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Date').getAttribute('tabindex')).toBe('0');
  });
});

describe('InoListboxComponent multiple selection', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.multiple = true;
    fixture.componentInstance.value = [];
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    return rows().find((el) => el.textContent?.trim().startsWith(label))!;
  }

  it('sets aria-multiselectable on the listbox', () => {
    const list = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('click toggles membership without clearing other selected rows', () => {
    rowByLabel('Apple').click();
    fixture.detectChanges();
    rowByLabel('Banana').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([['apple'], ['apple', 'banana']]);

    rowByLabel('Apple').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted[2]).toEqual(['banana']);
  });

  it('ArrowDown moves focus only — it does not toggle selection', () => {
    rowByLabel('Apple').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([]);
    expect(rowByLabel('Banana').getAttribute('tabindex')).toBe('0');
  });

  it('Space toggles the currently active row', () => {
    rowByLabel('Banana').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([['banana']]);
  });
});

describe('InoListboxComponent filter', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.filter = true;
    fixture.detectChanges();
  });

  function filterInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.ino-field__filter');
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  it('narrows rows to those matching the query, case-insensitively', () => {
    filterInput().value = 'an';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(rows().map((r) => r.textContent?.trim())).toEqual(['Banana']);
  });

  it('shows the filtered-empty state and message when nothing matches', () => {
    filterInput().value = 'zzz';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('.ino-listbox');
    expect(host.classList.contains('ino-listbox--filtered-empty')).toBe(true);
    expect(fixture.nativeElement.querySelector('.ino-field__empty').textContent).toContain('No options match your filter.');
  });

  it('Escape on the filter box clears the query and restores the full list', () => {
    filterInput().value = 'an';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(rows().length).toBe(1);

    filterInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(filterInput().value).toBe('');
    expect(rows().length).toBe(OPTIONS.length);
  });
});
