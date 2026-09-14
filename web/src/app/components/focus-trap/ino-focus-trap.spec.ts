import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoFocusTrapComponent } from './ino-focus-trap.component';
import { InoFocusTrapDirective } from './ino-focus-trap.directive';

/**
 * Retires pending item **P-1** (`docs/brand/16-design-system-parity-vs-echeque-reference.md`
 * §"Pending items"): modal focus trap, WCAG 2.2 SC 2.1.2. That row was an assertion in a doc
 * with no executable check behind it. These are the executable check.
 *
 * Tab traversal is simulated by focusing the sentinels directly rather than dispatching `Tab`
 * keydowns: jsdom implements no native tab order, so a synthetic `Tab` event moves nothing. The
 * sentinels are exactly the elements a real browser's tab order hands focus to at the boundary,
 * so focusing them is a faithful stand-in for the wrap that matters — and it is also the reason
 * the implementation uses sentinels rather than `preventDefault()` on keydown.
 *
 * Host state is held in signals rather than plain fields. Under Angular 22's zoneless change
 * detection a plain field assignment never marks the view dirty, so `fixture.detectChanges()`
 * refreshes nothing and a test that flips an input silently asserts against the *old* binding —
 * it fails for a reason that has nothing to do with the trap. `fixture.changeDetectorRef
 * .markForCheck()` does not rescue it either; a signal write is what schedules the refresh.
 */

@Component({
  standalone: true,
  imports: [InoFocusTrapDirective],
  template: `
    <button type="button" id="outside">outside</button>
    <div
      inoFocusTrap
      [inoFocusTrapDisabled]="disabled()"
      [inoFocusTrapAutoFocus]="autoFocus()"
      [inoFocusTrapInitialFocus]="initialFocus()"
    >
      <button type="button" id="first">first</button>
      <button type="button" id="middle" [disabled]="middleDisabled()">middle</button>
      <a id="link" href="#x">link</a>
      <button type="button" id="last">last</button>
    </div>
  `,
})
class HostComponent {
  readonly disabled = signal(false);
  readonly autoFocus = signal(true);
  readonly initialFocus = signal('');
  readonly middleDisabled = signal(false);
}

function sentinels(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '[data-ino-focus-trap-sentinel]',
    ),
  );
}

function byId(fixture: ComponentFixture<unknown>, id: string): HTMLElement {
  const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`);
  if (!el) {
    throw new Error(`missing #${id}`);
  }
  return el;
}

/** Flush the `queueMicrotask` the directive defers auto-focus onto. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('InoFocusTrapDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    // Attach to the real document: focus() is a no-op on a detached tree in jsdom.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('seats one sentinel as the first child and one as the last', () => {
    const container = byId(fixture, 'first').parentElement!;
    const [leading, trailing] = sentinels(fixture);

    expect(sentinels(fixture)).toHaveLength(2);
    expect(container.firstElementChild).toBe(leading);
    expect(container.lastElementChild).toBe(trailing);
  });

  it('hides the sentinels from assistive technology', () => {
    for (const sentinel of sentinels(fixture)) {
      expect(sentinel.getAttribute('aria-hidden')).toBe('true');
      expect(sentinel.tabIndex).toBe(0);
    }
  });

  it('moves focus to the first tabbable element on activation', async () => {
    await flush();
    expect(document.activeElement).toBe(byId(fixture, 'first'));
  });

  it('honours an initialFocus selector', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.initialFocus.set('#link');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'link'));
  });

  it('does not move focus when autoFocus is off', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autoFocus.set(false);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).not.toBe(byId(fixture, 'first'));
  });

  it('wraps Tab past the last element back to the first', () => {
    const [, trailing] = sentinels(fixture);
    trailing.focus();

    expect(document.activeElement).toBe(byId(fixture, 'first'));
  });

  it('wraps Shift+Tab before the first element to the last', () => {
    const [leading] = sentinels(fixture);
    leading.focus();

    expect(document.activeElement).toBe(byId(fixture, 'last'));
  });

  it('skips disabled controls when wrapping', () => {
    fixture.componentInstance.middleDisabled.set(true);
    fixture.detectChanges();

    const [leading] = sentinels(fixture);
    leading.focus();
    expect(document.activeElement).toBe(byId(fixture, 'last'));

    // #middle is disabled, so tabbing forward from #first lands on #link, never on #middle.
    const container = byId(fixture, 'first').parentElement!;
    const tabbableIds = Array.from(container.querySelectorAll<HTMLElement>('button, a'))
      .filter((el) => !el.hasAttribute('disabled'))
      .map((el) => el.id);
    expect(tabbableIds).not.toContain('middle');
  });

  it('pulls focus back when it escapes the container', () => {
    byId(fixture, 'outside').focus();

    // The document-level focusin guard is the escape hatch for focus the sentinels never see
    // (browser chrome, iframes, third-party script).
    expect(document.activeElement).toBe(byId(fixture, 'first'));
  });

  it('releases focus and removes its sentinels when disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await flush();

    expect(sentinels(fixture)).toHaveLength(0);

    // SC 2.1.2 is about *release* as much as containment: once suspended, focus may leave.
    byId(fixture, 'outside').focus();
    expect(document.activeElement).toBe(byId(fixture, 'outside'));
  });

  it('restores focus to the pre-activation element on deactivate', async () => {
    fixture.destroy();

    const outsideHost = document.createElement('button');
    outsideHost.id = 'opener';
    document.body.appendChild(outsideHost);
    outsideHost.focus();

    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();
    expect(document.activeElement).toBe(byId(fixture, 'first'));

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(outsideHost);
    outsideHost.remove();
  });

  it('re-seats the trailing sentinel when content is appended after activation', () => {
    const container = byId(fixture, 'first').parentElement!;
    const late = document.createElement('button');
    late.id = 'late';
    container.appendChild(late);

    // MutationObserver callbacks are microtasks; the directive re-seats on the next one.
    return flush().then(() => {
      const [, trailing] = sentinels(fixture);
      expect(container.lastElementChild).toBe(trailing);

      trailing.focus();
      expect(document.activeElement).toBe(byId(fixture, 'first'));
    });
  });
});

describe('InoFocusTrapComponent', () => {
  @Component({
    standalone: true,
    imports: [InoFocusTrapComponent],
    template: `
      <ino-focus-trap [disabled]="disabled()">
        <button type="button" id="a">a</button>
        <button type="button" id="b">b</button>
      </ino-focus-trap>
    `,
  })
  class WrapperHost {
    readonly disabled = signal(false);
  }

  it('traps through the element form without adding a wrapper node', async () => {
    await TestBed.configureTestingModule({ imports: [WrapperHost] }).compileComponents();
    const fixture = TestBed.createComponent(WrapperHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    const trap = (fixture.nativeElement as HTMLElement).querySelector('ino-focus-trap')!;
    const found = Array.from(trap.querySelectorAll<HTMLElement>('[data-ino-focus-trap-sentinel]'));

    // hostDirectives means the trap operates on <ino-focus-trap> itself — the buttons are its
    // direct children, with no intermediate div.
    expect(found).toHaveLength(2);
    expect(trap.firstElementChild).toBe(found[0]);
    expect(trap.lastElementChild).toBe(found[1]);
    expect(document.activeElement?.id).toBe('a');

    found[1].focus();
    expect(document.activeElement?.id).toBe('a');

    fixture.destroy();
  });
});
