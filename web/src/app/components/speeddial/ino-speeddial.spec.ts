import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InoSpeedDialComponent } from './ino-speeddial.component';
import { InoSpeedDialItem } from './ino-speeddial.types';

describe('InoSpeedDialComponent', () => {
  let component: InoSpeedDialComponent;
  let fixture: ComponentFixture<InoSpeedDialComponent>;

  const items: InoSpeedDialItem[] = [
    { label: 'Add', icon: '+' },
    { label: 'Edit', icon: '✏' },
    { label: 'Locked', icon: '🔒', disabled: true },
    { label: 'Delete', icon: '🗑' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoSpeedDialComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InoSpeedDialComponent);
    component = fixture.componentInstance;
    component.items = items;
    fixture.detectChanges();
  });

  it('should create, closed by default', () => {
    expect(component).toBeTruthy();
    expect(component.open).toBe(false);
  });

  it('FAB carries menu-button semantics', () => {
    const fab: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-speeddial__fab');
    expect(fab.getAttribute('aria-haspopup')).toBe('menu');
    expect(fab.getAttribute('aria-expanded')).toBe('false');
    expect(fab.getAttribute('aria-controls')).toBe(component.menuId);
  });

  it('click toggles open and emits openChange', () => {
    const emitted: boolean[] = [];
    component.openChange.subscribe((v: boolean) => emitted.push(v));

    const fab: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-speeddial__fab');
    fab.click();
    fixture.detectChanges();
    expect(component.open).toBe(true);
    expect(fab.getAttribute('aria-expanded')).toBe('true');

    fab.click();
    fixture.detectChanges();
    expect(component.open).toBe(false);
    expect(emitted).toEqual([true, false]);
  });

  it('menu is permanently mounted and aria-hidden while closed', () => {
    const menu: HTMLElement = fixture.nativeElement.querySelector('.ino-speeddial__menu');
    expect(menu).toBeTruthy();
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(menu.getAttribute('role')).toBe('menu');

    component.show();
    fixture.detectChanges();
    expect(menu.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders one menuitem per action with labels as accessible names', () => {
    component.show();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.ino-speeddial__action-btn');
    expect(buttons.length).toBe(4);
    expect(buttons[0].getAttribute('role')).toBe('menuitem');
    expect(buttons[0].getAttribute('aria-label')).toBe('Add');
  });

  it('disabled action is aria-disabled, unfocusable, and not activatable', () => {
    component.show();
    fixture.detectChanges();
    const locked: HTMLButtonElement =
      fixture.nativeElement.querySelectorAll('.ino-speeddial__action-btn')[2];
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.getAttribute('tabindex')).toBeNull();

    const clicks: unknown[] = [];
    component.itemClick.subscribe((e: unknown) => clicks.push(e));
    locked.click();
    expect(clicks.length).toBe(0);
    expect(component.open).toBe(true);
  });

  it('activating an action runs command, emits itemClick, and closes', () => {
    const command = vi.fn();
    component.items = [{ label: 'Run', icon: '▶', command }];
    component.show();
    fixture.detectChanges();

    const clicks: unknown[] = [];
    component.itemClick.subscribe((e: unknown) => clicks.push(e));
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-speeddial__action-btn');
    btn.click();

    expect(command).toHaveBeenCalledTimes(1);
    expect(clicks.length).toBe(1);
    expect(component.open).toBe(false);
  });

  it('Escape on the menu closes and returns focus to the FAB', () => {
    component.show();
    fixture.detectChanges();
    const menu: HTMLElement = fixture.nativeElement.querySelector('.ino-speeddial__menu');
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.open).toBe(false);
    const fab: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-speeddial__fab');
    expect(document.activeElement).toBe(fab);
  });

  it('ArrowDown on the FAB opens and focuses the first navigable action', async () => {
    const fab: HTMLButtonElement = fixture.nativeElement.querySelector('.ino-speeddial__fab');
    fab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(component.open).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 0));
    const first: HTMLButtonElement =
      fixture.nativeElement.querySelectorAll('.ino-speeddial__action-btn')[0];
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('tabindex')).toBe('0');
  });

  it('arrow navigation wraps and skips the disabled action', async () => {
    component.show();
    fixture.detectChanges();
    const menu: HTMLElement = fixture.nativeElement.querySelector('.ino-speeddial__menu');
    const buttons = fixture.nativeElement.querySelectorAll('.ino-speeddial__action-btn');

    // Focus first (Add), then ArrowDown twice: Edit, then Delete (Locked skipped).
    component.onFabKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(buttons[1]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(buttons[3]);

    // Wraps back to the first.
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('circle layout computes arc transforms while open', () => {
    component.type = 'circle';
    component.radius = 80;
    expect(component.actionTransform(0)).toContain('scale(0.4)');
    component.show();
    // First action sits straight up: dx 0, dy -radius.
    expect(component.actionTransform(0)).toBe('translate(-50%, -50%) translate(0px, -80px)');
  });

  it('mask renders only when open and closes on click', () => {
    component.mask = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ino-speeddial__mask')).toBeNull();

    component.show();
    fixture.detectChanges();
    const maskEl: HTMLElement = fixture.nativeElement.querySelector('.ino-speeddial__mask');
    expect(maskEl).toBeTruthy();
    maskEl.click();
    fixture.detectChanges();
    expect(component.open).toBe(false);
  });

  it('disabled FAB does not open', () => {
    component.disabled = true;
    fixture.detectChanges();
    component.onFabClick();
    expect(component.open).toBe(false);
  });
});
