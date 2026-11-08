import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoAnimateonscrollComponent } from './ino-animateonscroll.component';
import { InoAnimateOnScrollDirective } from './ino-animateonscroll.directive';

/**
 * Host state lives in signals, not plain fields — under Angular 22's zoneless change detection a
 * plain field assignment never marks the view dirty, so `fixture.detectChanges()` refreshes
 * nothing and a test that flips an input silently asserts against the previous binding (the
 * `ino-autofocus.spec.ts` / `ino-focus-trap.spec.ts` lesson).
 *
 * jsdom ships no `IntersectionObserver` at all — that native absence is itself one of the
 * directive's contract rows (§3.3: silent no-op, content stays visible), so one test runs
 * against it directly and every other test installs the mock below first.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observed: Element[] = [];

  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.push(el);
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Drives the directive the way a real viewport crossing would. */
  intersect(isIntersecting: boolean): void {
    const target = this.observed[0];
    this.callback(
      [{ isIntersecting, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  static latest(): MockIntersectionObserver {
    const instance = MockIntersectionObserver.instances.at(-1);
    if (!instance) {
      throw new Error('no IntersectionObserver was constructed');
    }
    return instance;
  }
}

const globalScope = globalThis as { IntersectionObserver?: unknown };
const realIntersectionObserver = globalScope.IntersectionObserver;
const realMatchMedia = window.matchMedia;

/** Mutable switch the stubbed `matchMedia` reads through, so a test can flip the OS
 *  reduced-motion preference mid-session and assert the directive reads it live. */
const motionPreference = { reduced: false };

function installEnvironment(): void {
  MockIntersectionObserver.instances = [];
  motionPreference.reduced = false;
  globalScope.IntersectionObserver = MockIntersectionObserver;
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return query.includes('prefers-reduced-motion') ? motionPreference.reduced : false;
      },
      media: query,
    }) as MediaQueryList) as typeof window.matchMedia;
}

function restoreEnvironment(): void {
  if (realIntersectionObserver === undefined) {
    delete globalScope.IntersectionObserver;
  } else {
    globalScope.IntersectionObserver = realIntersectionObserver;
  }
  window.matchMedia = realMatchMedia;
}

function hostOf(fixture: ComponentFixture<unknown>, selector: string): HTMLElement {
  const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  if (!el) {
    throw new Error(`missing ${selector}`);
  }
  return el;
}

describe('InoAnimateOnScrollDirective', () => {
  @Component({
    standalone: true,
    imports: [InoAnimateOnScrollDirective],
    template: `
      <div
        id="host"
        inoAnimateOnScroll
        [inoAnimateOnScroll]="enabled()"
        [inoAnimateOnScrollEnterClass]="enterClass()"
        [inoAnimateOnScrollLeaveClass]="leaveClass()"
        [inoAnimateOnScrollThreshold]="threshold()"
        [inoAnimateOnScrollRootMargin]="rootMargin()"
        [inoAnimateOnScrollOnce]="once()"
        (inoAnimateOnScrollEnter)="enters = enters + 1"
        (inoAnimateOnScrollLeave)="leaves = leaves + 1"
      >
        revealed content
      </div>
    `,
  })
  class HostComponent {
    readonly enabled = signal(true);
    readonly enterClass = signal('fx-enter');
    readonly leaveClass = signal('fx-leave');
    readonly threshold = signal(0.1);
    readonly rootMargin = signal('0px');
    readonly once = signal(false);
    enters = 0;
    leaves = 0;
  }

  beforeEach(installEnvironment);
  afterEach(restoreEnvironment);

  function create(configure?: (host: HostComponent) => void): {
    fixture: ComponentFixture<HostComponent>;
    host: HostComponent;
    el: HTMLElement;
  } {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    // Configure-then-render: inputs set after the first detectChanges never propagate under the
    // zoneless harness, so every test shapes its bindings before this first render.
    configure?.(host);
    fixture.detectChanges();
    return { fixture, host, el: hostOf(fixture, '#host') };
  }

  it('observes the host and applies enter classes (and emits) on intersection', () => {
    const { host, el } = create();
    const observer = MockIntersectionObserver.latest();
    expect(observer.observed).toEqual([el]);
    expect(el.classList.contains('fx-enter')).toBe(false);

    observer.intersect(true);
    expect(el.classList.contains('fx-enter')).toBe(true);
    expect(el.classList.contains('fx-leave')).toBe(false);
    expect(host.enters).toBe(1);
    expect(host.leaves).toBe(0);
  });

  it('never applies leave classes before the host has entered once', () => {
    const { host, el } = create();
    MockIntersectionObserver.latest().intersect(false);
    expect(el.classList.contains('fx-leave')).toBe(false);
    expect(host.leaves).toBe(0);
  });

  it('swaps enter/leave classes across a full repeat cycle', () => {
    const { host, el } = create();
    const observer = MockIntersectionObserver.latest();

    observer.intersect(true);
    observer.intersect(false);
    expect(el.classList.contains('fx-enter')).toBe(false);
    expect(el.classList.contains('fx-leave')).toBe(true);
    expect(host.leaves).toBe(1);

    observer.intersect(true);
    expect(el.classList.contains('fx-enter')).toBe(true);
    expect(el.classList.contains('fx-leave')).toBe(false);
    expect(host.enters).toBe(2);
  });

  it('once: disconnects after the first enter and keeps the enter classes', () => {
    const { el } = create((host) => host.once.set(true));
    const observer = MockIntersectionObserver.latest();

    observer.intersect(true);
    expect(observer.disconnected).toBe(true);
    expect(el.classList.contains('fx-enter')).toBe(true);
  });

  it('passes threshold and rootMargin through to the observer options', () => {
    create((host) => {
      host.threshold.set(0.4);
      host.rootMargin.set('-25% 0px');
    });
    const observer = MockIntersectionObserver.latest();
    expect(observer.options?.threshold).toBe(0.4);
    expect(observer.options?.rootMargin).toBe('-25% 0px');
  });

  it('rebuilds the observer when an option input changes after init', () => {
    const { fixture, host } = create();
    const first = MockIntersectionObserver.latest();

    host.threshold.set(0.75);
    fixture.detectChanges();

    const second = MockIntersectionObserver.latest();
    expect(first.disconnected).toBe(true);
    expect(second).not.toBe(first);
    expect(second.options?.threshold).toBe(0.75);
  });

  it('disabled via the selector input: constructs no observer', () => {
    create((host) => host.enabled.set(false));
    expect(MockIntersectionObserver.instances.length).toBe(0);
  });

  it('reduced motion: applies no class and emits no event', () => {
    motionPreference.reduced = true;
    const { host, el } = create();

    MockIntersectionObserver.latest().intersect(true);
    expect(el.classList.contains('fx-enter')).toBe(false);
    expect(host.enters).toBe(0);
    expect(el.textContent).toContain('revealed content');
  });

  it('reads the motion preference live: flipping it mid-session stops further transitions', () => {
    const { host, el } = create();
    const observer = MockIntersectionObserver.latest();

    observer.intersect(true);
    expect(el.classList.contains('fx-enter')).toBe(true);

    motionPreference.reduced = true;
    observer.intersect(false);
    // No new transition — and the already-applied enter class is left alone (§3.2).
    expect(el.classList.contains('fx-enter')).toBe(true);
    expect(el.classList.contains('fx-leave')).toBe(false);
    expect(host.leaves).toBe(0);
  });

  it('without IntersectionObserver (jsdom native state) it is a no-op and content stays visible', () => {
    delete globalScope.IntersectionObserver;
    const { el } = create();
    expect(el.classList.contains('fx-enter')).toBe(false);
    expect(el.textContent).toContain('revealed content');
  });

  it('splits multi-class strings on whitespace', () => {
    const { el } = create((host) => host.enterClass.set('fx-fade  fx-rise'));
    MockIntersectionObserver.latest().intersect(true);
    expect(el.classList.contains('fx-fade')).toBe(true);
    expect(el.classList.contains('fx-rise')).toBe(true);
  });

  it('disconnects on destroy', () => {
    const { fixture } = create();
    const observer = MockIntersectionObserver.latest();
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});

describe('InoAnimateonscrollComponent (element form)', () => {
  @Component({
    standalone: true,
    imports: [InoAnimateonscrollComponent],
    template: `
      <ino-animateonscroll
        id="wrapper"
        enterClass="fx-enter"
        leaveClass="fx-leave"
        [threshold]="0.3"
        [once]="once()"
        (enter)="enters = enters + 1"
        (leave)="leaves = leaves + 1"
      >
        <p>projected block</p>
      </ino-animateonscroll>
    `,
  })
  class ElementHostComponent {
    readonly once = signal(true);
    enters = 0;
    leaves = 0;
  }

  beforeEach(installEnvironment);
  afterEach(restoreEnvironment);

  it('forwards the aliased inputs and outputs to the one shared implementation', () => {
    TestBed.configureTestingModule({ imports: [ElementHostComponent] });
    const fixture = TestBed.createComponent(ElementHostComponent);
    fixture.detectChanges();

    const el = hostOf(fixture, '#wrapper');
    const observer = MockIntersectionObserver.latest();
    expect(observer.observed).toEqual([el]);
    expect(observer.options?.threshold).toBe(0.3);

    observer.intersect(true);
    expect(el.classList.contains('fx-enter')).toBe(true);
    expect(fixture.componentInstance.enters).toBe(1);
    // `once` on: the observer disconnected after the first enter and the class stays.
    expect(observer.disconnected).toBe(true);
  });
});
