import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InoMenuComponent, InoMenuItem, InoMenuSection } from './ino-menu.component';

/**
 * `provideRouter([])` satisfies `RouterLink`'s injected `Router` (no real routes navigated here),
 * the same setup `ino-breadcrumb.spec.ts` uses.
 */
@Component({
  standalone: true,
  imports: [InoMenuComponent],
  template: `
    <ino-menu
      [items]="items"
      [sections]="sections"
      [mode]="mode"
      [(open)]="open"
      [anchor]="anchor"
    ></ino-menu>
  `,
})
class HostComponent {
  items: InoMenuItem[] = [];
  sections: InoMenuSection[] | null = null;
  mode: 'static' | 'popup' = 'static';
  open = false;
  anchor: HTMLElement | null = null;
}

function keydown(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('InoMenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  function menuEl(): HTMLElement {
    return fixture.nativeElement.querySelector('ino-menu');
  }

  function itemEls(): HTMLElement[] {
    return Array.from(menuEl().querySelectorAll('[role="menuitem"]'));
  }

  it('renders role="menu" with role="menuitem" children in static mode', () => {
    host.items = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
    fixture.detectChanges();

    expect(menuEl().getAttribute('role')).toBe('menu');
    const items = itemEls();
    expect(items.length).toBe(3);
    expect(items.map((el) => el.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
  });

  it('renders role="group"/role="separator" for sections', () => {
    host.sections = [
      { label: 'First', items: [{ label: 'A' }, { label: 'B' }] },
      { label: 'Second', items: [{ label: 'C' }] },
    ];
    fixture.detectChanges();

    const groups = menuEl().querySelectorAll('[role="group"]');
    expect(groups.length).toBe(2);
    expect(groups[0].getAttribute('aria-label')).toBe('First');
    expect(groups[1].getAttribute('aria-label')).toBe('Second');

    const separators = menuEl().querySelectorAll('[role="separator"]');
    expect(separators.length).toBe(1);
  });

  it('skips disabled items when navigating with ArrowDown', () => {
    host.items = [
      { label: 'One' },
      { label: 'Disabled', disabled: true },
      { label: 'Three' },
    ];
    fixture.detectChanges();

    const items = itemEls();
    keydown(items[0], 'ArrowDown');
    fixture.detectChanges();

    expect(fixture.componentInstance['items'][2]).toEqual({ label: 'Three' });
    // The next render should mark "Three" (index 2) as tabindex 0, skipping "Disabled".
    const refreshed = itemEls();
    expect(refreshed[1].getAttribute('tabindex')).toBeNull();
    expect(refreshed[2].getAttribute('tabindex')).toBe('0');
    expect(refreshed[0].getAttribute('tabindex')).toBe('-1');
  });

  it('opens a nested submenu on ArrowRight and moves focus into it', () => {
    host.items = [
      {
        label: 'Parent',
        children: [{ label: 'Child A' }, { label: 'Child B' }],
      },
    ];
    fixture.detectChanges();

    const parent = itemEls()[0];
    keydown(parent, 'ArrowRight');
    fixture.detectChanges();

    const submenu = menuEl().querySelector('.ino-menu__submenu');
    expect(submenu).not.toBeNull();
    expect(submenu?.getAttribute('role')).toBe('menu');

    const childItems = Array.from(submenu!.querySelectorAll('[role="menuitem"]'));
    expect(childItems.map((el) => el.textContent?.trim())).toEqual(['Child A', 'Child B']);
    expect(childItems[0].getAttribute('tabindex')).toBe('0');
  });

  it('opens a nested submenu on Enter as well', () => {
    host.items = [
      {
        label: 'Parent',
        children: [{ label: 'Child A' }],
      },
    ];
    fixture.detectChanges();

    const parent = itemEls()[0];
    keydown(parent, 'Enter');
    fixture.detectChanges();

    expect(menuEl().querySelector('.ino-menu__submenu')).not.toBeNull();
  });

  it('closes the submenu on ArrowLeft and returns focus to the parent item', () => {
    host.items = [
      {
        label: 'Parent',
        children: [{ label: 'Child A' }],
      },
    ];
    fixture.detectChanges();

    const parent = itemEls()[0];
    keydown(parent, 'ArrowRight');
    fixture.detectChanges();

    const submenu = menuEl().querySelector('.ino-menu__submenu')!;
    const child = submenu.querySelector('[role="menuitem"]')!;
    keydown(child, 'ArrowLeft');
    fixture.detectChanges();

    expect(menuEl().querySelector('.ino-menu__submenu')).toBeNull();
    const parentAfter = itemEls()[0];
    expect(parentAfter.getAttribute('tabindex')).toBe('0');
  });

  it('jumps to the matching item on typeahead', () => {
    host.items = [{ label: 'Apple' }, { label: 'Banana' }, { label: 'Cherry' }];
    fixture.detectChanges();

    const items = itemEls();
    keydown(items[0], 'c');
    fixture.detectChanges();

    const refreshed = itemEls();
    expect(refreshed[2].getAttribute('tabindex')).toBe('0');
  });

  it('starts closed in popup mode; show()/toggle() open it', () => {
    host.mode = 'popup';
    host.items = [{ label: 'One' }];
    fixture.detectChanges();

    expect(menuEl().querySelector('[role="menu"]')).toBeNull();

    const menuComponent = fixture.debugElement.children[0].componentInstance as InoMenuComponent;
    menuComponent.show();
    fixture.detectChanges();

    expect(menuEl().querySelector('[role="menu"]')).not.toBeNull();

    menuComponent.toggle();
    fixture.detectChanges();
    expect(menuEl().querySelector('[role="menu"]')).toBeNull();

    menuComponent.toggle();
    fixture.detectChanges();
    expect(menuEl().querySelector('[role="menu"]')).not.toBeNull();
  });

  it('closes the popup and emits openChange(false) on Escape', () => {
    host.mode = 'popup';
    host.items = [{ label: 'One' }];
    fixture.detectChanges();

    const menuComponent = fixture.debugElement.children[0].componentInstance as InoMenuComponent;
    menuComponent.show();
    fixture.detectChanges();

    expect(host.open).toBe(true);

    const panel = menuEl().querySelector('[role="menu"]')!;
    const item = panel.querySelector('[role="menuitem"]')!;
    keydown(item, 'Escape');
    fixture.detectChanges();

    expect(host.open).toBe(false);
    expect(menuEl().querySelector('[role="menu"]')).toBeNull();
  });

  it('renders the "No items" placeholder when items and sections are both empty', () => {
    host.items = [];
    host.sections = null;
    fixture.detectChanges();

    const placeholder = menuEl().querySelector('[role="menuitem"][aria-disabled="true"]');
    expect(placeholder?.textContent?.trim()).toBe('No items');
  });

  it('renders the "No items" placeholder when sections is an empty array (precedence over items)', () => {
    host.items = [{ label: 'Ignored' }];
    host.sections = [];
    fixture.detectChanges();

    const placeholder = menuEl().querySelector('[role="menuitem"][aria-disabled="true"]');
    expect(placeholder?.textContent?.trim()).toBe('No items');
  });
});
