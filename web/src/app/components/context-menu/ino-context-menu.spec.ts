import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InoContextMenuComponent } from './ino-context-menu.component';
import { InoContextMenuItem } from './ino-context-menu.types';

describe('InoContextMenuComponent', () => {
  let component: InoContextMenuComponent;
  let fixture: ComponentFixture<InoContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoContextMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InoContextMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default ariaLabel', () => {
    expect(component.ariaLabel).toBe('Context menu');
  });

  it('should start hidden', () => {
    expect(component.visible).toBe(false);
  });

  it('should render items when visible', () => {
    const items: InoContextMenuItem[] = [
      { label: 'Item 1', command: () => {} },
      { label: 'Item 2', command: () => {} },
    ];

    component.items = items;
    component.visible = true;
    fixture.detectChanges();

    const menuItems = fixture.nativeElement.querySelectorAll('.ino-context-menu__item');
    expect(menuItems.length).toBe(2);
  });

  it('should render separator items', () => {
    const items: InoContextMenuItem[] = [
      { label: 'Item 1' },
      { separator: true },
      { label: 'Item 2' },
    ];

    component.items = items;
    component.visible = true;
    fixture.detectChanges();

    const separators = fixture.nativeElement.querySelectorAll('.ino-context-menu__separator');
    expect(separators.length).toBe(1);
  });

  it('should mark disabled items with aria-disabled', () => {
    const items: InoContextMenuItem[] = [{ label: 'Disabled item', disabled: true }];

    component.items = items;
    component.visible = true;
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.ino-context-menu__item');
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('should emit itemClick when non-disabled item is activated', () => {
    const items: InoContextMenuItem[] = [{ label: 'Item 1' }];
    component.items = items;
    component.visible = true;

    vi.spyOn(component.itemClick, 'emit');

    component.onItemActivate(new Event('click'), items[0], 0);

    expect(component.itemClick.emit).toHaveBeenCalledWith({
      originalEvent: expect.any(Event),
      item: items[0],
    });
  });

  it('should call item command when activated', () => {
    const commandSpy = vi.fn();
    const items: InoContextMenuItem[] = [{ label: 'Item 1', command: commandSpy }];

    component.items = items;
    component.visible = true;

    component.onItemActivate(new Event('click'), items[0], 0);

    expect(commandSpy).toHaveBeenCalledWith({
      originalEvent: expect.any(Event),
      item: items[0],
    });
  });

  it('should hide menu after item activation (if no children)', () => {
    const items: InoContextMenuItem[] = [{ label: 'Item 1' }];
    component.items = items;
    component.visible = true;

    vi.spyOn(component, 'hide');

    component.onItemActivate(new Event('click'), items[0], 0);

    expect(component.hide).toHaveBeenCalled();
  });

  it('should open submenu instead of activating if item has children', () => {
    const items: InoContextMenuItem[] = [
      {
        label: 'Parent',
        children: [{ label: 'Child' }],
      },
    ];
    component.items = items;
    component.visible = true;

    vi.spyOn(component, 'hide');

    component.onItemActivate(new Event('click'), items[0], 0);

    // Should not hide menu, should open submenu instead
    expect(component.hide).not.toHaveBeenCalled();
    expect(component.openSubmenu).toBe(items[0]);
  });

  it('should render chevron for items with children', () => {
    const items: InoContextMenuItem[] = [
      {
        label: 'Parent',
        children: [{ label: 'Child' }],
      },
    ];

    component.items = items;
    component.visible = true;
    fixture.detectChanges();

    const chevron = fixture.nativeElement.querySelector('.ino-context-menu__chevron');
    expect(chevron).toBeTruthy();
  });

  it('should return focus to invoking element on hide', () => {
    const mockElement = document.createElement('button');
    vi.spyOn(mockElement, 'focus');

    component.returnFocusElement = mockElement;
    component.hide();

    expect(mockElement.focus).toHaveBeenCalled();
  });
});
