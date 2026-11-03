import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoPickListComponent, InoPickListOption } from './ino-picklist.component';

const SOURCE: InoPickListOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
];

const TARGET: InoPickListOption[] = [{ label: 'Date', value: 'date' }];

@Component({
  standalone: true,
  imports: [InoPickListComponent],
  template: `<ino-picklist
    sourceLabel="Available"
    targetLabel="Selected"
    [source]="source"
    [target]="target"
    [sourceSelection]="sourceSelection"
    [targetSelection]="targetSelection"
    (sourceChange)="source = $event"
    (targetChange)="target = $event"
    (sourceSelectionChange)="sourceSelection = $event"
    (targetSelectionChange)="targetSelection = $event"
  />`,
})
class HostComponent {
  source = SOURCE.map((o) => ({ ...o }));
  target = TARGET.map((o) => ({ ...o }));
  sourceSelection: string[] = [];
  targetSelection: string[] = [];
}

describe('InoPickListComponent', () => {
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

  it('renders two role="listbox" panes with the right row counts', () => {
    const lists = fixture.nativeElement.querySelectorAll('[role="listbox"]');
    expect(lists.length).toBe(2);
    expect(rows().length).toBe(SOURCE.length + TARGET.length);
  });

  it('clicking a source row toggles sourceSelection, not targetSelection', () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    expect(host.sourceSelection).toEqual(['banana']);
    expect(host.targetSelection).toEqual([]);
  });

  it('"To Selected →" moves the checked source row into target and clears its selection', () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    button('To Selected').click();
    fixture.detectChanges();
    expect(host.source.map((o) => o.value)).toEqual(['apple', 'cherry']);
    expect(host.target.map((o) => o.value)).toEqual(['date', 'banana']);
    expect(host.sourceSelection).toEqual([]);
  });

  it('a disabled source row is excluded from "All →"', () => {
    button('All →').click();
    fixture.detectChanges();
    expect(host.source.map((o) => o.value)).toEqual(['cherry']);
    expect(host.target.map((o) => o.value)).toEqual(['date', 'apple', 'banana']);
  });

  it('"← To Available" moves the checked target row back to source', () => {
    rowByLabel('Date').click();
    fixture.detectChanges();
    button('← To Available').click();
    fixture.detectChanges();
    expect(host.target.map((o) => o.value)).toEqual([]);
    expect(host.source.map((o) => o.value)).toEqual(['apple', 'banana', 'cherry', 'date']);
  });

  it('Alt+ArrowRight on a focused (unselected) source row moves just that row', () => {
    rowByLabel('Apple').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }));
    fixture.detectChanges();
    expect(host.source.map((o) => o.value)).toEqual(['banana', 'cherry']);
    expect(host.target.map((o) => o.value)).toEqual(['date', 'apple']);
  });

  it('flashes the arrival pane after a transfer, then clears it', async () => {
    rowByLabel('Banana').click();
    fixture.detectChanges();
    button('To Selected').click();
    fixture.detectChanges();
    expect(rowByLabel('Banana').classList).toContain('ino-picklist__option--moved-flash');
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    fixture.detectChanges();
    expect(rowByLabel('Banana').classList).not.toContain('ino-picklist__option--moved-flash');
  });
});
