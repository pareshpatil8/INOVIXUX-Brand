import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoFocusTrapDirective } from '../focus-trap/ino-focus-trap.directive';
import { InoAutofocusComponent } from './ino-autofocus.component';
import { InoAutofocusDirective } from './ino-autofocus.directive';

/**
 * Host state lives in signals, not plain fields. Under Angular 22's zoneless change detection a
 * plain field assignment never marks the view dirty, so `fixture.detectChanges()` refreshes
 * nothing and a test that flips an input silently asserts against the previous binding — the same
 * lesson `ino-focus-trap.spec.ts` recorded after three tests failed exactly that way.
 */

function byId(fixture: ComponentFixture<unknown>, id: string): HTMLElement {
  const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`);
  if (!el) {
    throw new Error(`missing #${id}`);
  }
  return el;
}

/** Flushes the `queueMicrotask` the directive defers focus placement onto. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('InoAutofocusDirective', () => {
  @Component({
    standalone: true,
    imports: [InoAutofocusDirective],
    template: `
      <button type="button" id="outside">outside</button>
      <button
        type="button"
        id="host"
        inoAutofocus
        [inoAutofocus]="enabled()"
        [inoAutofocusTarget]="target()"
        [inoAutofocusPreventScroll]="preventScroll()"
        [inoAutofocusTrigger]="trigger()"
      >
        host
      </button>
    `,
  })
  class HostButtonComponent {
    readonly enabled = signal(true);
    readonly target = signal('');
    readonly preventScroll = signal(false);
    readonly trigger = signal(0);
  }

  @Component({
    standalone: true,
    imports: [InoAutofocusDirective],
    template: `
      <div id="host" inoAutofocus [inoAutofocusTarget]="target()">
        <button type="button" id="first">first</button>
        <button type="button" id="second">second</button>
      </div>
    `,
  })
  class HostContainerComponent {
    readonly target = signal('');
  }

  @Component({
    standalone: true,
    imports: [InoFocusTrapDirective, InoAutofocusDirective],
    template: `
      <div inoFocusTrap [inoFocusTrapAutoFocus]="false">
        <button type="button" id="trapped" inoAutofocus>trapped</button>
      </div>
    `,
  })
  class HostInsideTrapComponent {}

  let fixture: ComponentFixture<unknown>;

  afterEach(() => {
    fixture?.destroy();
  });

  it('focuses the host element itself when it is natively focusable', async () => {
    fixture = TestBed.createComponent(HostButtonComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'host'));
  });

  it('does not focus when inoAutofocus is false', async () => {
    fixture = TestBed.createComponent(HostButtonComponent);
    (fixture.componentInstance as HostButtonComponent).enabled.set(false);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).not.toBe(byId(fixture, 'host'));
  });

  it('focuses an explicit inoAutofocusTarget selector within the host', async () => {
    fixture = TestBed.createComponent(HostContainerComponent);
    (fixture.componentInstance as HostContainerComponent).target.set('#second');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'second'));
  });

  it('falls back to the first focusable descendant when the host itself is not focusable', async () => {
    fixture = TestBed.createComponent(HostContainerComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'first'));
  });

  it('is a no-op inside an ancestor [inoFocusTrap], regardless of the trap being disabled', async () => {
    fixture = TestBed.createComponent(HostInsideTrapComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).not.toBe(byId(fixture, 'trapped'));
  });

  it('re-runs focus placement when inoAutofocusTrigger changes after the first activation', async () => {
    fixture = TestBed.createComponent(HostButtonComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    byId(fixture, 'outside').focus();
    expect(document.activeElement).toBe(byId(fixture, 'outside'));

    (fixture.componentInstance as HostButtonComponent).trigger.set(1);
    fixture.detectChanges();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'host'));
  });

  it('does not re-run on the first change detection pass (ngOnChanges before ngOnInit)', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture = TestBed.createComponent(HostButtonComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    focusSpy.mockRestore();
  });

  it('forwards inoAutofocusPreventScroll to the native focus() call', async () => {
    fixture = TestBed.createComponent(HostButtonComponent);
    (fixture.componentInstance as HostButtonComponent).preventScroll.set(true);
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    focusSpy.mockRestore();
  });

  it('focusNow() re-runs placement imperatively', async () => {
    fixture = TestBed.createComponent(HostButtonComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flush();

    byId(fixture, 'outside').focus();

    const directive = fixture.debugElement
      .query((de) => de.nativeElement === byId(fixture, 'host'))
      .injector.get(InoAutofocusDirective);
    directive.focusNow();
    await flush();

    expect(document.activeElement).toBe(byId(fixture, 'host'));
  });
});

describe('InoAutofocusComponent', () => {
  @Component({
    standalone: true,
    imports: [InoAutofocusComponent],
    template: `
      <ino-autofocus [target]="target()">
        <button type="button" id="a">a</button>
        <button type="button" id="b">b</button>
      </ino-autofocus>
    `,
  })
  class WrapperHost {
    readonly target = signal('');
  }

  const flushWrapper = () => new Promise<void>((resolve) => queueMicrotask(resolve));

  it('focuses through the element form without adding a wrapper node', async () => {
    await TestBed.configureTestingModule({ imports: [WrapperHost] }).compileComponents();
    const fixture = TestBed.createComponent(WrapperHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flushWrapper();

    const host = (fixture.nativeElement as HTMLElement).querySelector('ino-autofocus')!;
    expect(host.firstElementChild?.id).toBe('a');
    expect(document.activeElement?.id).toBe('a');

    fixture.destroy();
  });

  it('respects an aliased target input through hostDirectives', async () => {
    const fixture = TestBed.createComponent(WrapperHost);
    fixture.componentInstance.target.set('#b');
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await flushWrapper();

    expect(document.activeElement?.id).toBe('b');

    fixture.destroy();
  });
});
