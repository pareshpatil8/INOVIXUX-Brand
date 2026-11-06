import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoDragdropComponent, InoDragDropItem } from './ino-dragdrop.component';

const ITEMS: InoDragDropItem[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
];

@Component({
  standalone: true,
  imports: [InoDragdropComponent],
  template: `<ino-dragdrop
    sourceLabel="Available"
    targetLabel="Selected"
    [sourceItems]="sourceItems"
    [targetItems]="targetItems"
    [maxItems]="maxItems"
    [disabled]="disabled"
    (sourceItemsChange)="sourceItems = $event"
    (targetItemsChange)="targetItems = $event"
    (moved)="movedItems.push($event)"
  />`,
})
class HostComponent {
  sourceItems: InoDragDropItem[] = ITEMS.map((i) => ({ ...i }));
  targetItems: InoDragDropItem[] = [];
  maxItems = Infinity;
  disabled = false;
  movedItems: InoDragDropItem[] = [];
}

function itemByLabel(fixture: ComponentFixture<HostComponent>, label: string): HTMLElement {
  return Array.from(fixture.nativeElement.querySelectorAll('.ino-dragdrop__item')).find(
    (el) => (el as HTMLElement).textContent?.trim() === label,
  ) as HTMLElement;
}

function droppables(fixture: ComponentFixture<HostComponent>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.ino-dragdrop__list'));
}

function keydown(el: HTMLElement, code: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
}

/** Creates a fresh fixture with the given initial state already applied before the first
 *  `detectChanges()`, so every scenario (including maxItems/disabled) renders correctly on
 *  first paint instead of depending on an OnPush re-check of a later input mutation. The
 *  testing module is configured once per spec (see `beforeEach` below); this only creates
 *  another component instance against it. */
function createFixture(overrides: Partial<HostComponent> = {}): {
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
} {
  const fixture = TestBed.createComponent(HostComponent);
  Object.assign(fixture.componentInstance, overrides);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance };
}

describe('InoDragdropComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    ({ fixture, host } = createFixture());
  });

  it('renders both columns with their labels and items', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('.ino-dragdrop__heading')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(headings).toEqual(['Available', 'Selected']);
    expect(itemByLabel(fixture, 'Apple')).toBeTruthy();
    expect(itemByLabel(fixture, 'Banana')).toBeTruthy();
  });

  it('keyboard pick-up sets aria-grabbed and the carrying class', () => {
    const apple = itemByLabel(fixture, 'Apple');
    keydown(apple, 'Space');
    fixture.detectChanges();
    expect(apple.getAttribute('aria-grabbed')).toBe('true');
    expect(apple.classList).toContain('ino-dragging-active');
  });

  it('Escape while carrying cancels and returns to idle', () => {
    const apple = itemByLabel(fixture, 'Apple');
    keydown(apple, 'Space');
    fixture.detectChanges();
    keydown(apple, 'Escape');
    fixture.detectChanges();
    expect(apple.getAttribute('aria-grabbed')).toBe('false');
    expect(apple.classList).not.toContain('ino-dragging-active');
  });

  it('a disabled item cannot be picked up via keyboard', () => {
    const cherry = itemByLabel(fixture, 'Cherry');
    keydown(cherry, 'Space');
    fixture.detectChanges();
    expect(cherry.getAttribute('aria-grabbed')).toBe('false');
  });

  it('full keyboard flow (pick up, navigate, drop) moves the item to the target zone', () => {
    const apple = itemByLabel(fixture, 'Apple');
    keydown(apple, 'Space');
    fixture.detectChanges();

    // Navigate to the next droppable (source zone itself, then the target zone).
    keydown(apple, 'ArrowDown');
    fixture.detectChanges();
    keydown(apple, 'ArrowDown');
    fixture.detectChanges();

    keydown(apple, 'Enter');
    fixture.detectChanges();

    expect(host.sourceItems.map((i) => i.value)).not.toContain('apple');
    expect(host.targetItems.map((i) => i.value)).toContain('apple');
    expect(host.movedItems.map((i) => i.value)).toEqual(['apple']);
  });

  it('a full target zone cannot accept a drop and leaves the item in place', async () => {
    const scenario = await createFixture({ maxItems: 0 });
    const apple = itemByLabel(scenario.fixture, 'Apple');
    keydown(apple, 'Space');
    scenario.fixture.detectChanges();
    keydown(apple, 'ArrowDown');
    scenario.fixture.detectChanges();
    keydown(apple, 'ArrowDown');
    scenario.fixture.detectChanges();
    keydown(apple, 'Enter');
    scenario.fixture.detectChanges();

    expect(scenario.host.sourceItems.map((i) => i.value)).toContain('apple');
    expect(scenario.host.targetItems.length).toBe(0);
  });

  it('shows the empty-state message in both zones when both are empty', async () => {
    const scenario = await createFixture({ sourceItems: [], targetItems: [] });
    const empties = Array.from(
      scenario.fixture.nativeElement.querySelectorAll('.ino-dragdrop__empty'),
    ).map((el) => (el as HTMLElement).textContent);
    expect(empties).toEqual(['All items placed.', 'Drop items here.']);
  });

  it('renders the count badge only when maxItems is finite', async () => {
    expect(fixture.nativeElement.querySelector('.ino-dragdrop__count')).toBeNull();

    const scenario = await createFixture({ maxItems: 5 });
    expect(scenario.fixture.nativeElement.querySelector('.ino-dragdrop__count')?.textContent).toContain(
      '0 / 5',
    );
  });

  it('[disabled] marks every item non-draggable and aria-disabled', async () => {
    const scenario = await createFixture({ disabled: true });
    const apple = itemByLabel(scenario.fixture, 'Apple');
    keydown(apple, 'Space');
    scenario.fixture.detectChanges();
    expect(apple.getAttribute('aria-grabbed')).toBe('false');
    expect(droppables(scenario.fixture).every((el) => el.getAttribute('aria-disabled') === 'true')).toBe(
      true,
    );
  });
});
