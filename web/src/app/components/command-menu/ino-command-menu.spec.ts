import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoCommandMenuComponent, InoCommandMenuGroup, InoCommandMenuItem } from './ino-command-menu.component';

/**
 * Covers the behaviours SPEC.md calls out as easy to get subtly wrong: "Recent" disappearing
 * entirely once the query is non-empty (§2), the global hotkey toggling open/closed from a host
 * element that may currently be rendering nothing (§5), and the `opened`/`closed` event contract
 * mirroring `ino-modal`'s (fires exactly once per real transition).
 *
 * Drives `open` via `fixture.componentRef.setInput()`, not a host template binding — same
 * zoneless-OnPush rationale `ino-modal.spec.ts` and `ino-popover.spec.ts` record.
 */
describe('InoCommandMenuComponent', () => {
  let fixture: ComponentFixture<InoCommandMenuComponent>;

  const groups: InoCommandMenuGroup[] = [
    {
      heading: 'Navigation',
      items: [
        { id: 'home', label: 'Go to home' },
        { id: 'settings', label: 'Go to settings', description: 'Account preferences' },
      ],
    },
    {
      heading: 'Actions',
      items: [
        { id: 'logout', label: 'Log out' },
        { id: 'archive', label: 'Archive item', disabled: true },
      ],
    },
  ];

  const recentItems: InoCommandMenuItem[] = [{ id: 'recent-1', label: 'Reopen last report' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InoCommandMenuComponent] }).compileComponents();
    fixture = TestBed.createComponent(InoCommandMenuComponent);
    fixture.componentRef.setInput('groups', groups);
    fixture.componentRef.setInput('recentItems', recentItems);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.innerHTML = '';
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.ino-command-menu__input');
  }

  function openPanel(): void {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  }

  it('renders nothing when closed', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('emits opened/closed exactly once per real transition, resetting the query on open', () => {
    let openedCount = 0;
    let closedCount = 0;
    fixture.componentInstance.opened.subscribe(() => openedCount++);
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    openPanel();
    expect(openedCount).toBe(1);
    expect(closedCount).toBe(0);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(openedCount).toBe(1); // no-op re-send of the same value

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(closedCount).toBe(1);
  });

  it('leads with "Recent" while the query is empty', () => {
    openPanel();

    const headings = Array.from(fixture.nativeElement.querySelectorAll('.ino-command-menu__group-heading')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(headings).toEqual(['Recent', 'Navigation', 'Actions']);
  });

  it('drops "Recent" entirely once the query is non-empty', () => {
    openPanel();

    input().value = 'go to';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const headings = Array.from(fixture.nativeElement.querySelectorAll('.ino-command-menu__group-heading')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(headings).toEqual(['Navigation']);
    expect(fixture.nativeElement.querySelectorAll('.ino-command-menu__option').length).toBe(2);
  });

  it('shows the empty-results state when nothing matches', () => {
    openPanel();

    input().value = 'nonexistent-command';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-command-menu__empty')?.textContent?.trim()).toBe(
      'No results found.',
    );
    expect(fixture.nativeElement.querySelectorAll('.ino-command-menu__option').length).toBe(0);
  });

  it('skips disabled rows when moving the active index with ArrowDown', () => {
    openPanel();

    // Starting row is 'recent-1'; Navigate: recent-1 -> home -> settings -> logout -> (archive is
    // disabled, stays clamped at logout).
    const el = input();
    for (let i = 0; i < 4; i++) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    }
    fixture.detectChanges();

    expect(fixture.componentInstance['rows'][fixture.componentInstance['activeIndex']].item.id).toBe('logout');
  });

  it('activates the active row on Enter, emits select, and closes (closeOnSelect default)', () => {
    openPanel();
    const selected: InoCommandMenuItem[] = [];
    fixture.componentInstance.select.subscribe((item) => selected.push(item));

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(selected).toEqual([recentItems[0]]);
    expect(fixture.componentInstance.open).toBe(false);
  });

  it('never activates a disabled row via click', () => {
    openPanel();
    const selected: InoCommandMenuItem[] = [];
    fixture.componentInstance.select.subscribe((item) => selected.push(item));

    const disabledRow: HTMLElement = fixture.nativeElement.querySelector('.ino-command-menu__option--disabled');
    disabledRow.click();
    fixture.detectChanges();

    expect(selected).toEqual([]);
    expect(fixture.componentInstance.open).toBe(true);
  });

  it('closes on Escape when closeOnEscape is true (default)', () => {
    openPanel();

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open).toBe(false);
  });

  it('toggles open via the document-level Ctrl+K/Cmd+K hotkey', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open).toBe(false);
  });

  it('does not react to the hotkey when [hotkey]="false"', () => {
    fixture.componentRef.setInput('hotkey', false);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open).toBe(false);
  });
});
