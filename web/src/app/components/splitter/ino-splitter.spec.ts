import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoSplitterComponent } from './ino-splitter.component';
import { InoSplitterPanelComponent } from './ino-splitter-panel.component';

function keydown(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

@Component({
  standalone: true,
  imports: [InoSplitterComponent, InoSplitterPanelComponent],
  template: `
    <ino-splitter
      [orientation]="orientation"
      [disabled]="disabled"
      [readonly]="readonly"
      (sizesChange)="sizes = $event"
      (panelCollapsedChange)="lastCollapsedEvent = $event"
    >
      <ino-splitter-panel [minSize]="10" [collapsible]="collapsibleFirst">A</ino-splitter-panel>
      <ino-splitter-panel [minSize]="10">B</ino-splitter-panel>
      <ino-splitter-panel [minSize]="10" [collapsible]="true">C</ino-splitter-panel>
    </ino-splitter>
  `,
})
class HostComponent {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  disabled = false;
  readonly = false;
  collapsibleFirst = false;
  sizes: number[] | null = null;
  lastCollapsedEvent: { index: number; collapsed: boolean } | null = null;
}

@Component({
  standalone: true,
  imports: [InoSplitterComponent, InoSplitterPanelComponent],
  template: `
    <ino-splitter>
      <ino-splitter-panel [size]="30">A</ino-splitter-panel>
      <ino-splitter-panel [size]="70">B</ino-splitter-panel>
    </ino-splitter>
  `,
})
class ExplicitSizeHostComponent {}

@Component({
  standalone: true,
  imports: [InoSplitterComponent, InoSplitterPanelComponent],
  template: `
    <ino-splitter [readonly]="true">
      <ino-splitter-panel [minSize]="10">A</ino-splitter-panel>
      <ino-splitter-panel [minSize]="10">B</ino-splitter-panel>
    </ino-splitter>
  `,
})
class ReadonlyHostComponent {}

@Component({
  standalone: true,
  imports: [InoSplitterComponent, InoSplitterPanelComponent],
  template: `
    <ino-splitter [disabled]="true">
      <ino-splitter-panel [minSize]="10">A</ino-splitter-panel>
      <ino-splitter-panel [minSize]="10">B</ino-splitter-panel>
    </ino-splitter>
  `,
})
class DisabledHostComponent {}

describe('InoSplitterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function gutters(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="separator"]'));
  }

  function panelEls(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('ino-splitter-panel'));
  }

  it('distributes three unset panels evenly (~33.33% each)', () => {
    const panels = panelEls();
    panels.forEach((p) => {
      expect(Number(p.style.flexBasis.replace('%', ''))).toBeCloseTo(33.33, 1);
    });
  });

  it('renders panels.length - 1 gutters, each role="separator"', () => {
    expect(gutters().length).toBe(2);
  });

  it('a horizontal splitter gutter carries aria-orientation="vertical" (inverted, SPEC.md §4)', () => {
    expect(gutters()[0].getAttribute('aria-orientation')).toBe('vertical');
  });

  it('ArrowRight on a gutter grows the panel before it and shrinks the one after by the same amount', () => {
    const panels = panelEls();
    const before = Number(panels[0].style.flexBasis.replace('%', ''));
    const after = Number(panels[1].style.flexBasis.replace('%', ''));

    keydown(gutters()[0], 'ArrowRight');
    fixture.detectChanges();

    const newBefore = Number(panels[0].style.flexBasis.replace('%', ''));
    const newAfter = Number(panels[1].style.flexBasis.replace('%', ''));
    expect(newBefore).toBeCloseTo(before + 5, 3);
    expect(newAfter).toBeCloseTo(after - 5, 3);
    expect(host.sizes).not.toBeNull();
  });

  it('Home on a gutter clamps the before-panel to its minSize', () => {
    keydown(gutters()[0], 'Home');
    fixture.detectChanges();

    const panels = panelEls();
    expect(Number(panels[0].style.flexBasis.replace('%', ''))).toBeCloseTo(10, 3);
  });

  it('End on a gutter pushes the after-panel down to its minSize', () => {
    keydown(gutters()[0], 'End');
    fixture.detectChanges();

    const panels = panelEls();
    expect(Number(panels[1].style.flexBasis.replace('%', ''))).toBeCloseTo(10, 3);
  });

  it('collapsing the last panel gives its space to the second-to-last and expanding restores it', () => {
    const panels = panelEls();
    const lastBefore = Number(panels[2].style.flexBasis.replace('%', ''));
    const toggleSelector = '.ino-splitter__collapse-toggle--after';
    expect(fixture.nativeElement.querySelector(toggleSelector)).toBeTruthy();

    (fixture.nativeElement.querySelector(toggleSelector) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(Number(panels[2].style.flexBasis.replace('%', ''))).toBe(0);
    expect(host.lastCollapsedEvent).toEqual({ index: 2, collapsed: true });

    // Re-query rather than reusing the first click's button reference: `*ngIf`/`*ngFor`-rendered
    // elements are not guaranteed to be the same DOM node across change-detection passes.
    (fixture.nativeElement.querySelector(toggleSelector) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(Number(panels[2].style.flexBasis.replace('%', ''))).toBeCloseTo(lastBefore, 3);
    expect(host.lastCollapsedEvent).toEqual({ index: 2, collapsed: false });
  });
});

describe('InoSplitterComponent — readonly', () => {
  it('keeps gutters tab-stoppable but blocks keyboard resize (focusable but inert)', async () => {
    await TestBed.configureTestingModule({ imports: [ReadonlyHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ReadonlyHostComponent);
    fixture.detectChanges();

    const gutter = fixture.nativeElement.querySelector('[role="separator"]') as HTMLElement;
    const panel = fixture.nativeElement.querySelector('ino-splitter-panel') as HTMLElement;
    const before = Number(panel.style.flexBasis.replace('%', ''));

    expect(gutter.getAttribute('tabindex')).toBe('0');
    expect(gutter.getAttribute('data-readonly')).toBe('true');

    keydown(gutter, 'ArrowRight');
    fixture.detectChanges();
    expect(Number(panel.style.flexBasis.replace('%', ''))).toBeCloseTo(before, 3);
  });
});

describe('InoSplitterComponent — disabled', () => {
  it('removes gutters from the tab order', async () => {
    await TestBed.configureTestingModule({ imports: [DisabledHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DisabledHostComponent);
    fixture.detectChanges();

    const gutter = fixture.nativeElement.querySelector('[role="separator"]') as HTMLElement;
    expect(gutter.getAttribute('tabindex')).toBe('-1');
    expect(gutter.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('InoSplitterComponent — explicit sizes', () => {
  it('honours explicit size inputs without redistributing them', async () => {
    await TestBed.configureTestingModule({ imports: [ExplicitSizeHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ExplicitSizeHostComponent);
    fixture.detectChanges();

    const panels = Array.from(fixture.nativeElement.querySelectorAll('ino-splitter-panel')) as HTMLElement[];
    expect(Number(panels[0].style.flexBasis.replace('%', ''))).toBeCloseTo(30, 3);
    expect(Number(panels[1].style.flexBasis.replace('%', ''))).toBeCloseTo(70, 3);
  });
});
