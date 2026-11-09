import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InoBreadcrumbComponent, InoBreadcrumbItem } from './ino-breadcrumb.component';

/**
 * Covers the two behaviours that are easy to get subtly wrong and aren't visible from reading the
 * template in isolation: the last item is current-page regardless of `href` (SPEC.md §2), and the
 * collapsed-middle overflow always hides a non-empty slice once it triggers (SPEC.md §3).
 * `provideRouter([])` satisfies the `RouterLink` directive's injected `Router` — no real routes
 * are navigated in these tests.
 */
describe('InoBreadcrumbComponent', () => {
  let fixture: ComponentFixture<InoBreadcrumbComponent>;

  const items: InoBreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics' },
    { label: 'Laptops', href: '/products/electronics/laptops' },
    { label: 'Current model' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoBreadcrumbComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InoBreadcrumbComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('treats the last item as current-page even though it has no href', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const current = fixture.nativeElement.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Current model');
  });

  it('does not collapse when maxVisible is 0 (default)', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    expect(fixture.componentInstance['isCollapsed']).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.ino-breadcrumb__crumb--ellipsis').length).toBe(0);
  });

  it('collapses to first + … + last two once items.length exceeds maxVisible and 3', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('maxVisible', 3);
    fixture.detectChanges();

    const nodes = fixture.componentInstance['nodes'];
    expect(nodes).toEqual([
      { kind: 'item', item: items[0], isCurrent: false },
      { kind: 'ellipsis', hidden: [items[1], items[2]] },
      { kind: 'item', item: items[3], isCurrent: false },
      { kind: 'item', item: items[4], isCurrent: true },
    ]);
  });

  it('never collapses into an ellipsis that would hide zero items', () => {
    const short: InoBreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Current', href: '/products/current' },
    ];
    fixture.componentRef.setInput('items', short);
    fixture.componentRef.setInput('maxVisible', 1);
    fixture.detectChanges();

    expect(fixture.componentInstance['isCollapsed']).toBe(false);
  });

  it('renders nothing when items is empty and not loading', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('renders every non-current crumb as inert text under [readonly], current-page unaffected', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ino-breadcrumb__label--link').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
      'Current model',
    );
  });

  it('emits itemClick with the clicked item on a navigable crumb', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const clicked: InoBreadcrumbItem[] = [];
    fixture.componentInstance.itemClick.subscribe((item) => clicked.push(item));

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.ino-breadcrumb__label--link');
    link.click();

    expect(clicked).toEqual([items[0]]);
  });
});
