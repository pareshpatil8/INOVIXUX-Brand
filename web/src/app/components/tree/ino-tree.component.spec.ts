import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoTreeComponent, InoTreeNode } from './ino-tree.component';

const NODES: InoTreeNode[] = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Frontend', value: 'frontend' },
      { label: 'Backend', value: 'backend', disabled: true },
    ],
  },
  { label: 'Design', value: 'design' },
];

@Component({
  standalone: true,
  imports: [InoTreeComponent],
  template: `<ino-tree
    label="Org chart"
    [nodes]="nodes"
    [value]="value"
    [selectionMode]="selectionMode"
    [multiple]="multiple"
    [filter]="filter"
    (valueChange)="onValueChange($event)"
    (loadChildren)="onLoadChildren($event)"
  />`,
})
class HostComponent {
  nodes = NODES;
  value: string | string[] = '';
  selectionMode: 'basic' | 'checkbox' = 'basic';
  multiple = false;
  filter = false;
  emitted: Array<string | string[]> = [];
  loadChildrenCalls: InoTreeNode[] = [];

  onValueChange(value: string | string[]): void {
    this.emitted.push(value);
    this.value = value;
  }

  onLoadChildren(node: InoTreeNode): void {
    this.loadChildrenCalls.push(node);
  }
}

describe('InoTreeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    // Matches on `.ino-field__tree-label` specifically, not the row's full `textContent` — a
    // branch row's toggle button contributes a leading chevron glyph ("▸") that a plain
    // `startsWith` match would otherwise have to account for.
    return rows().find((el) => el.querySelector('.ino-field__tree-label')?.textContent?.trim() === label)!;
  }

  it('renders role="tree" with one role="treeitem" per top-level (collapsed) node', () => {
    const tree = fixture.nativeElement.querySelector('[role="tree"]');
    expect(tree).toBeTruthy();
    expect(rows().length).toBe(NODES.length);
  });

  it('expanding a branch reveals its children with aria-level + aria-expanded', () => {
    const toggle = rowByLabel('Engineering').querySelector<HTMLButtonElement>('.ino-field__tree-toggle')!;
    toggle.click();
    fixture.detectChanges();

    const engineering = rowByLabel('Engineering');
    expect(engineering.getAttribute('aria-expanded')).toBe('true');
    expect(engineering.getAttribute('aria-level')).toBe('1');

    const frontend = rowByLabel('Frontend');
    expect(frontend).toBeTruthy();
    expect(frontend.getAttribute('aria-level')).toBe('2');
  });

  it('basic single-selection: clicking a row replaces value and sets aria-selected', () => {
    rowByLabel('Design').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted).toEqual(['design']);
    expect(rowByLabel('Design').getAttribute('aria-selected')).toBe('true');
  });

  it('basic multiple-selection: toggles membership without replacing other selections', () => {
    fixture.componentInstance.multiple = true;
    fixture.componentInstance.value = [];
    fixture.detectChanges();

    rowByLabel('Design').click();
    fixture.detectChanges();
    rowByLabel('Engineering').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toEqual(['design', 'engineering']);
  });

  it('a disabled node ignores click activation', () => {
    const toggle = rowByLabel('Engineering').querySelector<HTMLButtonElement>('.ino-field__tree-toggle')!;
    toggle.click();
    fixture.detectChanges();

    rowByLabel('Backend').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted).toEqual([]);
  });

  it('checkbox mode: checking a parent cascades to loaded children and sets aria-checked', () => {
    fixture.componentInstance.selectionMode = 'checkbox';
    fixture.componentInstance.value = [];
    fixture.detectChanges();

    const toggle = rowByLabel('Engineering').querySelector<HTMLButtonElement>('.ino-field__tree-toggle')!;
    toggle.click();
    fixture.detectChanges();

    rowByLabel('Engineering').click();
    fixture.detectChanges();

    // Backend is disabled, so the cascade still includes it (cascade ignores per-node `disabled`,
    // same as `ino-treeselect`'s own checkbox cascade) — the component only skips disabled nodes
    // for *interactive* activation, not for the recursive subtree write.
    expect(fixture.componentInstance.value).toEqual(
      expect.arrayContaining(['engineering', 'frontend', 'backend']),
    );
    expect(rowByLabel('Engineering').getAttribute('aria-checked')).toBe('true');
  });

  it('checkbox mode: a partially-checked ancestor renders aria-checked="mixed"', () => {
    fixture.componentInstance.selectionMode = 'checkbox';
    fixture.componentInstance.value = ['frontend'];
    fixture.detectChanges();

    const toggle = rowByLabel('Engineering').querySelector<HTMLButtonElement>('.ino-field__tree-toggle')!;
    toggle.click();
    fixture.detectChanges();

    expect(rowByLabel('Engineering').getAttribute('aria-checked')).toBe('mixed');
  });

  it('filter narrows to matching branches and auto-expands them', () => {
    fixture.componentInstance.filter = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.ino-field__filter') as HTMLInputElement;
    input.value = 'frontend';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rowByLabel('Frontend')).toBeTruthy();
    expect(rows().some((r) => r.textContent?.includes('Design'))).toBe(false);
  });

  it('filter with zero matches renders the empty state', () => {
    fixture.componentInstance.filter = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.ino-field__filter') as HTMLInputElement;
    input.value = 'zz-no-match';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-field__empty')?.textContent).toContain('No matches.');
  });

  it('expanding a lazy node with hasChildren and no loaded children emits loadChildren', () => {
    fixture.componentInstance.nodes = [{ label: 'Archive', value: 'archive', hasChildren: true }];
    fixture.detectChanges();

    const toggle = rowByLabel('Archive').querySelector<HTMLButtonElement>('.ino-field__tree-toggle')!;
    toggle.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.loadChildrenCalls.map((n) => n.value)).toEqual(['archive']);
  });

  it('ArrowDown moves the roving tabindex to the next enabled row', () => {
    rowByLabel('Engineering').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(rowByLabel('Design').getAttribute('tabindex')).toBe('0');
    expect(rowByLabel('Engineering').getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight expands a collapsed branch with children', () => {
    const engineering = rowByLabel('Engineering');
    engineering.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(rowByLabel('Engineering').getAttribute('aria-expanded')).toBe('true');
    expect(rowByLabel('Frontend')).toBeTruthy();
  });

  it('ArrowLeft on an expanded branch collapses it', () => {
    const engineering = rowByLabel('Engineering');
    engineering.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    rowByLabel('Engineering').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();

    expect(rowByLabel('Engineering').getAttribute('aria-expanded')).toBe('false');
    expect(rows().some((r) => r.textContent?.includes('Frontend'))).toBe(false);
  });
});
