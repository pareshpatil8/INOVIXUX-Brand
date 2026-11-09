import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InoMegaMenuComponent } from './ino-megamenu.component';
import { InoMegaMenuItem } from './ino-megamenu.types';

/**
 * Covers behaviour not visible from reading the template alone: panel open/close on click and
 * Escape (SPEC.md §2), the roving-tabindex Arrow map on the bar and inside an open panel
 * (SPEC.md §2-3), and `readonly`/`disabled`/`loading`/empty rendering. `provideRouter([])`
 * satisfies `RouterLink`'s injected `Router` — no real routes are navigated.
 */
describe('InoMegaMenuComponent', () => {
  let fixture: ComponentFixture<InoMegaMenuComponent>;

  const items: InoMegaMenuItem[] = [
    {
      label: 'Products',
      columns: [
        { heading: 'Payments', items: [{ label: 'Checkout', href: '/checkout' }, { label: 'Invoicing', href: '/invoicing' }] },
        { heading: 'Banking', items: [{ label: 'Accounts', href: '/accounts' }] },
      ],
    },
    {
      label: 'Solutions',
      columns: [{ items: [{ label: 'Healthcare', href: '/healthcare' }] }],
    },
    { label: 'Pricing', href: '/pricing' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InoMegaMenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InoMegaMenuComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  function triggers(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.ino-megamenu__trigger'));
  }

  function panelLinks(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.ino-megamenu__link'));
  }

  it('renders nothing when items is empty and not loading', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="menubar"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No items');
  });

  it('opens a panel on trigger click and sets aria-expanded', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const trigger = triggers()[0];
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panelLinks().length).toBe(3);
  });

  it('closes the panel on a second click of the same trigger', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const trigger = triggers()[0];
    trigger.click();
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panelLinks().length).toBe(0);
  });

  it('closes the open panel on Escape from within it', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    triggers()[0].click();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('.ino-megamenu__panel');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-megamenu__panel')).toBeNull();
  });

  function focusedTrigger(): HTMLButtonElement {
    const match = triggers().find((el) => el.getAttribute('tabindex') === '0');
    if (!match) {
      throw new Error('no trigger is the current tab stop');
    }
    return match;
  }

  it('moves the roving tab stop to the next top-level item on ArrowRight (horizontal)', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    focusedTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(triggers()[1].getAttribute('tabindex')).toBe('0');
    expect(triggers()[0].getAttribute('tabindex')).toBe('-1');
  });

  it('wraps from the last to the first top-level item on ArrowRight', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    focusedTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(triggers()[2].getAttribute('tabindex')).toBe('0');

    focusedTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(triggers()[0].getAttribute('tabindex')).toBe('0');
  });

  it('skips a disabled top-level item when roving with Arrow keys', () => {
    const withDisabled: InoMegaMenuItem[] = [
      { label: 'One', href: '/one' },
      { label: 'Two', href: '/two', disabled: true },
      { label: 'Three', href: '/three' },
    ];
    fixture.componentRef.setInput('items', withDisabled);
    fixture.detectChanges();

    focusedTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(triggers()[2].getAttribute('tabindex')).toBe('0');
  });

  it('marks the item matching activeHref with aria-current="page"', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('activeHref', '/pricing');
    fixture.detectChanges();

    const pricing = triggers().find((el) => el.textContent?.includes('Pricing'));
    expect(pricing?.getAttribute('aria-current')).toBe('page');
  });

  it('emits itemClick with the clicked panel link', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    triggers()[0].click();
    fixture.detectChanges();

    const clicked: unknown[] = [];
    fixture.componentInstance.itemClick.subscribe((entry) => clicked.push(entry));

    panelLinks()[0].click();

    expect(clicked.length).toBe(1);
    expect((clicked[0] as { label: string }).label).toBe('Checkout');
  });

  it('closes the panel after a link is activated', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    triggers()[0].click();
    fixture.detectChanges();

    panelLinks()[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ino-megamenu__panel')).toBeNull();
  });

  it('renders panel links as inert text under [readonly] without blocking the panel from opening', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    triggers()[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a.ino-megamenu__link').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.ino-megamenu__link--inert').length).toBe(3);
  });

  it('moves focus to the first panel link on ArrowDown (INO-931)', async () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const trigger = focusedTrigger();
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(panelLinks()[0]);
  });

  it('moves focus to the first panel link on Enter and Space (INO-931)', async () => {
    for (const key of ['Enter', ' ']) {
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const trigger = focusedTrigger();
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.ownerDocument.activeElement).toBe(panelLinks()[0]);
    }
  });

  it('closes an open panel instead of leaving it stranded when roving to the next trigger (INO-931)', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    triggers()[0].click();
    fixture.detectChanges();
    expect(triggers()[0].getAttribute('aria-expanded')).toBe('true');

    focusedTrigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(triggers()[0].getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.ino-megamenu__panel')).toBeNull();
  });

  it('renders a loading skeleton instead of items', () => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="menubar"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.ino-megamenu__skeleton').length).toBe(3);
  });
});
