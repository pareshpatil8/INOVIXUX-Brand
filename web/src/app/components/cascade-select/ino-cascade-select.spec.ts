import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoCascadeSelectComponent, InoCascadeSelectOption } from './ino-cascade-select.component';

function cloneOptions(): InoCascadeSelectOption[] {
  return [
    {
      label: 'Asia',
      value: 'asia',
      children: [
        {
          label: 'India',
          value: 'india',
          children: [
            { label: 'Maharashtra', value: 'maharashtra' },
            { label: 'Karnataka', value: 'karnataka', disabled: true },
          ],
        },
      ],
    },
    { label: 'Europe', value: 'europe', children: [{ label: 'France', value: 'france' }] },
    { label: 'Antarctica', value: 'antarctica' },
  ];
}

@Component({
  standalone: true,
  imports: [InoCascadeSelectComponent],
  template: `<ino-cascade-select
    label="Destination"
    [options]="options"
    [value]="value"
    (valueChange)="onValueChange($event)"
  />`,
})
class HostComponent {
  options = cloneOptions();
  value = '';
  emitted: string[] = [];
  onValueChange(value: string): void {
    this.emitted.push(value);
  }
}

describe('InoCascadeSelectComponent', () => {
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
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function rowByLabel(label: string): HTMLElement {
    return rows().find((el) => el.querySelector('.ino-field__option-label')?.textContent?.trim() === label)!;
  }

  function breadcrumbItems(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.ino-field__breadcrumb-item'));
  }

  it('renders a closed combobox with the panel hidden until opened', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('opening shows only root-level rows', () => {
    openPanel();
    expect(rows().length).toBe(3);
    expect(rowByLabel('Asia')).toBeTruthy();
    expect(rowByLabel('India')).toBeFalsy();
  });

  it('clicking a parent row drills in and shows a breadcrumb, not a selection', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([]);
    expect(rowByLabel('India')).toBeTruthy();
    expect(breadcrumbItems().map((el) => el.textContent?.trim())).toEqual(['Asia']);
  });

  it('clicking a leaf row sets value and closes the panel', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    rowByLabel('India').click();
    fixture.detectChanges();
    rowByLabel('Maharashtra').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual(['maharashtra']);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('disabled rows do not emit on click and carry aria-disabled', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    rowByLabel('India').click();
    fixture.detectChanges();
    const karnataka = rowByLabel('Karnataka');
    expect(karnataka.getAttribute('aria-disabled')).toBe('true');
    karnataka.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.emitted).toEqual([]);
  });

  it('hovering a disabled row does not move the active descendant onto it', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    rowByLabel('India').click();
    fixture.detectChanges();
    const maharashtra = rowByLabel('Maharashtra');
    maharashtra.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-activedescendant')).toBe(maharashtra.id);
    const karnataka = rowByLabel('Karnataka');
    karnataka.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-activedescendant')).toBe(maharashtra.id);
  });

  it('breadcrumb controls are excluded from the tab order', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    const back = fixture.nativeElement.querySelector('.ino-field__breadcrumb-back') as HTMLButtonElement;
    expect(back.tabIndex).toBe(-1);
    for (const item of breadcrumbItems() as HTMLButtonElement[]) {
      expect(item.tabIndex).toBe(-1);
    }
  });

  it('clicking the back button returns to the parent level', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.ino-field__breadcrumb-back') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(rowByLabel('Asia')).toBeTruthy();
    expect(rowByLabel('India')).toBeFalsy();
  });

  it('reopening always starts back at the root level', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    trigger().click(); // close
    fixture.detectChanges();
    openPanel();
    expect(rowByLabel('Asia')).toBeTruthy();
    expect(rowByLabel('India')).toBeFalsy();
  });

  it('ArrowRight drills into the active row when it has children', () => {
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('India')).toBeTruthy();
  });

  it('ArrowLeft goes back one level', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(rowByLabel('Asia')).toBeTruthy();
    expect(rowByLabel('India')).toBeFalsy();
  });

  it('Escape closes the panel fully rather than stepping back a level', () => {
    openPanel();
    rowByLabel('Asia').click();
    fixture.detectChanges();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('a leaf-only root row has no caret and no aria-haspopup', () => {
    openPanel();
    const antarctica = rowByLabel('Antarctica');
    expect(antarctica.querySelector('.ino-field__option-caret')).toBeNull();
    expect(antarctica.getAttribute('aria-haspopup')).toBeNull();
  });
});

describe('InoCascadeSelectComponent with a pre-selected leaf', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'maharashtra';
    fixture.detectChanges();
  });

  it('the trigger shows the full breadcrumb label for the selected leaf', () => {
    const trigger = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Asia / India / Maharashtra');
  });
});

describe('InoCascadeSelectComponent empty level', () => {
  @Component({
    standalone: true,
    imports: [InoCascadeSelectComponent],
    template: `<ino-cascade-select label="Destination" [options]="[]" />`,
  })
  class EmptyHostComponent {}

  let fixture: ComponentFixture<EmptyHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(EmptyHostComponent);
    fixture.detectChanges();
  });

  it('shows the empty message when there are no options', () => {
    (fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ino-field__empty').textContent).toContain('No options found.');
  });
});
