import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoTreeSelectComponent, InoTreeSelectNode } from './ino-treeselect.component';

function cloneNodes(): InoTreeSelectNode[] {
  return [
    {
      label: 'Fruit',
      value: 'fruit',
      children: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana', disabled: true },
      ],
    },
    {
      label: 'Vegetable',
      value: 'vegetable',
      children: [{ label: 'Carrot', value: 'carrot' }],
    },
    { label: 'Mineral', value: 'mineral', hasChildren: true },
  ];
}

@Component({
  standalone: true,
  imports: [InoTreeSelectComponent],
  template: `<ino-treeselect
    label="Category"
    [nodes]="nodes"
    [value]="value"
    [selectionMode]="selectionMode"
    (valueChange)="onValueChange($event)"
    (loadChildren)="onLoadChildren($event)"
  />`,
})
class HostComponent {
  nodes = cloneNodes();
  value: string | string[] = '';
  selectionMode: 'single' | 'multiple' | 'checkbox' = 'single';
  emitted: Array<string | string[]> = [];
  loadChildrenCalls: InoTreeSelectNode[] = [];
  onValueChange(value: string | string[]): void {
    this.emitted.push(value);
  }
  onLoadChildren(node: InoTreeSelectNode): void {
    this.loadChildrenCalls.push(node);
  }
}

describe('InoTreeSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[role="combobox"]');
  }

  function openPanel(): void {
    trigger().click();
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    return rows()
      .find((el) => el.querySelector('.ino-field__tree-label')?.textContent?.trim() === label)!;
  }

  function toggleButtonFor(label: string): HTMLButtonElement {
    return rowByLabel(label).querySelector('.ino-field__tree-toggle')!;
  }

  function filterInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.ino-field__filter');
  }

  /** Sets the row as the active `aria-activedescendant` target (hover does this in the real UI)
   *  so a keydown dispatched on the filter input — the real focus holder, combobox-style — acts
   *  on it, mirroring how `ino-select`'s own tests drive its `aria-activedescendant` model. */
  function makeActive(label: string): void {
    rowByLabel(label).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
  }

  it('renders a closed combobox with role="tree" hidden until opened', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[role="tree"]')).toBeNull();
  });

  it('opening shows only root-level rows (children collapsed by default)', () => {
    openPanel();
    expect(rows().length).toBe(3);
    expect(rowByLabel('Fruit')).toBeTruthy();
    expect(rowByLabel('Apple')).toBeFalsy();
  });

  it('clicking a branch toggle expands it and reveals its children', () => {
    openPanel();
    toggleButtonFor('Fruit').click();
    fixture.detectChanges();
    expect(rows().length).toBe(5);
    expect(rowByLabel('Apple')).toBeTruthy();
    expect(rowByLabel('Banana')).toBeTruthy();
  });

  it('expanding a lazy node with no loaded children emits loadChildren', () => {
    openPanel();
    toggleButtonFor('Mineral').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadChildrenCalls.map((n) => n.value)).toEqual(['mineral']);
  });

  it('single-selection: clicking a leaf row sets value and closes the panel', () => {
    openPanel();
    toggleButtonFor('Fruit').click();
    fixture.detectChanges();
    rowByLabel('Apple').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual(['apple']);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('disabled rows do not emit on click and carry aria-disabled', () => {
    openPanel();
    toggleButtonFor('Fruit').click();
    fixture.detectChanges();
    const banana = rowByLabel('Banana');
    expect(banana.getAttribute('aria-disabled')).toBe('true');
    banana.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([]);
  });

  it('ArrowRight on a collapsed branch expands it without moving the active row off it', () => {
    openPanel();
    makeActive('Fruit');
    filterInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Apple')).toBeTruthy();
  });

  it('ArrowLeft on an expanded branch collapses it', () => {
    openPanel();
    toggleButtonFor('Fruit').click();
    fixture.detectChanges();
    makeActive('Fruit');
    filterInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Apple')).toBeFalsy();
  });
});

describe('InoTreeSelectComponent multiple selection', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.selectionMode = 'multiple';
    fixture.componentInstance.value = [];
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[role="combobox"]');
  }

  function rowByLabel(label: string): HTMLElement {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]')).find(
      (el: any) => el.querySelector('.ino-field__tree-label')?.textContent?.trim() === label,
    ) as HTMLElement;
  }

  it('toggles membership without cascading to children and keeps the panel open', () => {
    trigger().click();
    fixture.detectChanges();
    rowByLabel('Vegetable').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([['vegetable']]);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });
});

describe('InoTreeSelectComponent checkbox selection (tri-state)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.selectionMode = 'checkbox';
    fixture.componentInstance.value = [];
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[role="combobox"]');
  }

  function expand(label: string): void {
    const row = rowByLabel(label);
    (row.querySelector('.ino-field__tree-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function rowByLabel(label: string): HTMLElement {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]')).find(
      (el: any) => el.querySelector('.ino-field__tree-label')?.textContent?.trim() === label,
    ) as HTMLElement;
  }

  it('checking a branch cascades to all loaded children and marks the branch fully checked', () => {
    trigger().click();
    fixture.detectChanges();
    expand('Vegetable');
    rowByLabel('Vegetable').click();
    fixture.detectChanges();
    expect([...(fixture.componentInstance.emitted.at(-1) as string[])].sort()).toEqual(['carrot', 'vegetable']);
    expect(rowByLabel('Vegetable').getAttribute('aria-checked')).toBe('true');
  });

  it('checking one of two children marks the parent partial ("mixed"), not fully checked', () => {
    trigger().click();
    fixture.detectChanges();
    expand('Fruit');
    rowByLabel('Apple').click();
    fixture.detectChanges();
    expect(rowByLabel('Fruit').getAttribute('aria-checked')).toBe('mixed');
  });

  it('unchecking the last checked child clears the parent back to unchecked', () => {
    trigger().click();
    fixture.detectChanges();
    expand('Vegetable');
    rowByLabel('Vegetable').click();
    fixture.detectChanges();
    rowByLabel('Carrot').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted.at(-1)).toEqual([]);
    expect(rowByLabel('Vegetable').getAttribute('aria-checked')).toBe('false');
  });
});

describe('InoTreeSelectComponent filter', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[role="combobox"]');
  }

  function filterInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.ino-field__filter');
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]'));
  }

  it('narrows to matching labels and auto-expands their ancestors', () => {
    trigger().click();
    fixture.detectChanges();
    filterInput().value = 'carrot';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const labels = rows().map((r) => r.querySelector('.ino-field__tree-label')?.textContent?.trim());
    expect(labels).toEqual(['Vegetable', 'Carrot']);
  });

  it('shows the empty message when nothing matches', () => {
    trigger().click();
    fixture.detectChanges();
    filterInput().value = 'zzz';
    filterInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ino-field__empty').textContent).toContain('No matches.');
  });
});
