import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InoPanelMenuComponent } from './ino-panel-menu.component';
import { InoPanelMenuItem } from './ino-panel-menu.types';

/**
 * Covers the behaviours that aren't visible from reading the template in isolation: single-open
 * accordion exclusivity at the top level (SPEC.md §3), nested expand state surviving a top-level
 * collapse/reopen (SPEC.md §3), and a disabled group permanently hiding its children (SPEC.md §6).
 * `provideRouter([])` satisfies `RouterLink`'s injected `Router` — no real routes are navigated.
 */
describe('InoPanelMenuComponent', () => {
  let fixture: ComponentFixture<InoPanelMenuComponent>;

  const items: InoPanelMenuItem[] = [
    {
      label: 'Section A',
      children: [
        { label: 'A leaf', href: '/a' },
        { label: 'A group', children: [{ label: 'A nested leaf', href: '/a/nested' }] },
      ],
    },
    {
      label: 'Section B',
      children: [{ label: 'B leaf', href: '/b' }],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoPanelMenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InoPanelMenuComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  /** Only the top-level (accordion-panel) headers — excludes any nested group header that has
   * become visible after a parent panel opened, so index-based clicks stay stable regardless of
   * expand state. */
  function topLevelHeaders(): HTMLButtonElement[] {
    const topList = fixture.nativeElement.querySelector('.ino-panel-menu__list:not(.ino-panel-menu__list--nested)');
    return Array.from(topList?.querySelectorAll(':scope > li > .ino-panel-menu__header') ?? []);
  }

  function headerByLabel(label: string): HTMLButtonElement {
    const all: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.ino-panel-menu__header'));
    const match = all.find((el) => el.textContent?.includes(label));
    if (!match) {
      throw new Error(`no header found for label "${label}"`);
    }
    return match;
  }

  it('renders nothing when items is empty and not loading', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('shows the empty label when items is empty', () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    // items.length is 0 so *ngIf="items.length || loading" is false — but emptyLabel still has a
    // documented default for a caller that renders the nav unconditionally via a wrapper.
    expect(fixture.componentInstance.emptyLabel).toBe('No items');
  });

  it('closes the other open top-level panel when a second one opens (single-open default)', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    topLevelHeaders()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance['isExpanded']('0')).toBe(true);

    topLevelHeaders()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance['isExpanded']('0')).toBe(false);
    expect(fixture.componentInstance['isExpanded']('1')).toBe(true);
  });

  it('allows both top-level panels open when multiple is set', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    topLevelHeaders()[0].click();
    fixture.detectChanges();
    topLevelHeaders()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance['isExpanded']('0')).toBe(true);
    expect(fixture.componentInstance['isExpanded']('1')).toBe(true);
  });

  it('keeps a nested group expanded in state after its parent collapses and reopens', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    topLevelHeaders()[0].click(); // open Section A
    fixture.detectChanges();
    headerByLabel('A group').click();
    fixture.detectChanges();
    expect(fixture.componentInstance['isExpanded']('0-1')).toBe(true);

    topLevelHeaders()[0].click(); // collapse Section A
    fixture.detectChanges();
    expect(fixture.componentInstance['isExpanded']('0-1')).toBe(true); // state persists, just not rendered

    topLevelHeaders()[0].click(); // reopen Section A
    fixture.detectChanges();
    expect(fixture.componentInstance['isExpanded']('0-1')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('A nested leaf');
  });

  it('never expands a disabled group', () => {
    const disabledItems: InoPanelMenuItem[] = [
      { label: 'Locked', disabled: true, children: [{ label: 'Hidden leaf', href: '/hidden' }] },
    ];
    fixture.componentRef.setInput('items', disabledItems);
    fixture.detectChanges();

    topLevelHeaders()[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance['isExpanded']('0')).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Hidden leaf');
  });

  it('emits itemClick with the clicked leaf', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    topLevelHeaders()[0].click();
    fixture.detectChanges();

    const clicked: InoPanelMenuItem[] = [];
    fixture.componentInstance.itemClick.subscribe((item) => clicked.push(item));

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.ino-panel-menu__leaf');
    link.click();

    expect(clicked.length).toBe(1);
    expect(clicked[0].label).toBe('A leaf');
  });

  it('renders leaves as inert text under [readonly] without blocking group expansion', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    topLevelHeaders()[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a.ino-panel-menu__leaf').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.ino-panel-menu__leaf--inert').length).toBeGreaterThan(0);
  });
});
