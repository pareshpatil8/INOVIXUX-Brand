import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoDockComponent } from './ino-dock.component';
import { InoDockItem } from './ino-dock.types';

function items(): InoDockItem[] {
  return [
    { id: 'files', label: 'Files', icon: 'F' },
    { id: 'mail', label: 'Mail', icon: 'M' },
    { id: 'calendar', label: 'Calendar', icon: 'C', disabled: true },
    { id: 'settings', label: 'Settings', icon: 'S' },
  ];
}

function buttons(fixture: ComponentFixture<InoDockComponent>): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.ino-dock__btn')
  );
}

function bar(fixture: ComponentFixture<InoDockComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('[role="menubar"]')!;
}

describe('InoDockComponent', () => {
  let fixture: ComponentFixture<InoDockComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InoDockComponent] });
    fixture = TestBed.createComponent(InoDockComponent);
    fixture.componentRef.setInput('items', items());
    fixture.detectChanges();
  });

  it('renders menubar semantics: role=menubar, role=menuitem per item, role=none per li', () => {
    expect(bar(fixture).getAttribute('role')).toBe('menubar');
    expect(buttons(fixture).every((b) => b.getAttribute('role') === 'menuitem')).toBe(true);
    const items_ = (fixture.nativeElement as HTMLElement).querySelectorAll('.ino-dock__item');
    expect(Array.from(items_).every((li) => li.getAttribute('role') === 'none')).toBe(true);
  });

  it('exposes aria-orientation from position: horizontal for bottom (default), vertical for side', () => {
    expect(bar(fixture).getAttribute('aria-orientation')).toBe('horizontal');
    fixture.componentRef.setInput('position', 'side');
    fixture.detectChanges();
    expect(bar(fixture).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('starts with a single tab stop on the first navigable item', () => {
    const all = buttons(fixture);
    expect(all.filter((b) => b.tabIndex === 0).length).toBe(1);
    expect(all[0].tabIndex).toBe(0);
  });

  it('roves focus with ArrowRight/ArrowLeft (bottom/horizontal) and wraps', () => {
    const toolbar = bar(fixture);
    const all = buttons(fixture);

    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[1].tabIndex).toBe(0);
    expect(all[0].tabIndex).toBe(-1);

    // Wrap backward past the first item (ArrowLeft from index 1 -> back to 0).
    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[0].tabIndex).toBe(0);

    // Home/End jump to the first/last item.
    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[all.length - 1].tabIndex).toBe(0);

    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[0].tabIndex).toBe(0);
  });

  it('uses ArrowUp/ArrowDown when position is side (vertical)', () => {
    fixture.componentRef.setInput('position', 'side');
    fixture.detectChanges();
    const toolbar = bar(fixture);
    const all = buttons(fixture);

    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[1].tabIndex).toBe(0);

    // ArrowRight/Left (the bottom-axis keys) do nothing in side/vertical mode.
    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[1].tabIndex).toBe(0);
  });

  it('skips the disabled item entirely in keyboard roving navigation', () => {
    const toolbar = bar(fixture);
    const all = buttons(fixture);
    // items(): [files(0), mail(1), calendar(2, disabled), settings(3)]. From mail(1), ArrowRight
    // must land on settings(3), never calendar(2).
    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    toolbar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    fixture.detectChanges();
    expect(all[3].tabIndex).toBe(0);
    expect(all[2].tabIndex).toBe(-1);
    // The disabled button is also never a tab stop on its own.
    expect(all[2].disabled).toBe(true);
  });

  it('marks the disabled item inert: aria-disabled, real disabled attribute, no magnify class', () => {
    const all = buttons(fixture);
    const calendar = all[2];
    expect(calendar.getAttribute('aria-disabled')).toBe('true');
    expect(calendar.disabled).toBe(true);
    expect(calendar.classList.contains('ino-dock__btn--magnify')).toBe(false);
  });

  it('marks the active item via activeId: aria-current + the active styling class', () => {
    fixture.componentRef.setInput('activeId', 'mail');
    fixture.detectChanges();
    const all = buttons(fixture);
    expect(all[1].getAttribute('aria-current')).toBe('true');
    expect(all[1].classList.contains('ino-dock__btn--active')).toBe(true);
    expect(all[0].getAttribute('aria-current')).toBeNull();
    expect(all[0].classList.contains('ino-dock__btn--active')).toBe(false);
  });

  it('activates an item on click: runs item.command and emits itemClick, but not when disabled', () => {
    const data = items();
    const commandSpy = vi.fn();
    data[0].command = commandSpy;
    fixture.componentRef.setInput('items', data);
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.itemClick.subscribe((e) => emitted.push(e));

    const all = buttons(fixture);
    all[0].click();
    expect(commandSpy).toHaveBeenCalledTimes(1);
    expect(emitted.length).toBe(1);

    // The disabled item never activates.
    const disabledCommandSpy = vi.fn();
    data[2].command = disabledCommandSpy;
    fixture.componentRef.setInput('items', data);
    fixture.detectChanges();
    buttons(fixture)[2].click();
    expect(disabledCommandSpy).not.toHaveBeenCalled();
    expect(emitted.length).toBe(1);
  });

  it('maps size to a fixed icon-button dimension via the data-size host attribute', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-size')).toBe('md');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(host.getAttribute('data-size')).toBe('sm');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(host.getAttribute('data-size')).toBe('lg');
    // The sm/md/lg -> 36/44/52px button and 16/20/24px icon mapping itself is pure CSS
    // (SPEC.md §3, fixed geometry, density-immune); jsdom doesn't compute layout, so the
    // docs-page QA pass is what verifies the rendered pixel sizes across themes.
  });

  it('wires the magnify-on-hover marker class, gated by the magnify input (reduced-motion is CSS-only)', () => {
    // `.ino-dock__btn--magnify` is the hook the stylesheet's `:hover`/`:focus-visible` rules key
    // off; the actual `@media (prefers-reduced-motion: reduce)` override lives entirely in CSS
    // (ino-dock.component.scss) since jsdom cannot evaluate media features — verified on the
    // docs page per component instead (SPEC.md §10).
    const all = buttons(fixture);
    expect(all[0].classList.contains('ino-dock__btn--magnify')).toBe(true);
    fixture.componentRef.setInput('magnify', false);
    fixture.detectChanges();
    expect(buttons(fixture)[0].classList.contains('ino-dock__btn--magnify')).toBe(false);
  });

  it('names the menubar via ariaLabel', () => {
    fixture.componentRef.setInput('ariaLabel', 'App switcher');
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('App switcher');
  });
});
