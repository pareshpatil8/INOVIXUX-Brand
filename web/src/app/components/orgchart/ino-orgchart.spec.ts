import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InoOrgchartComponent, InoOrgChartNode } from './ino-orgchart.component';

function makeRoot(): InoOrgChartNode {
  return {
    label: 'CEO',
    value: 'ceo',
    sublabel: 'Chief Executive',
    children: [
      {
        label: 'CTO',
        value: 'cto',
        children: [
          { label: 'Frontend', value: 'frontend' },
          { label: 'Backend', value: 'backend', disabled: true },
          { label: 'Mobile', value: 'mobile' },
        ],
      },
      { label: 'CFO', value: 'cfo' },
      { label: 'COO', value: 'coo' },
    ],
  };
}

@Component({
  standalone: true,
  imports: [InoOrgchartComponent],
  template: `<ino-orgchart
    label="Company structure"
    [value]="root"
    [selectionMode]="selectionMode"
    [selected]="selected"
    [zoom]="zoom"
    [loading]="loading"
    [disabled]="disabled"
    [collapsible]="collapsible"
    (selectedChange)="onSelectedChange($event)"
  />`,
})
class HostComponent {
  root: InoOrgChartNode | null = makeRoot();
  selectionMode: 'none' | 'single' = 'single';
  selected = '';
  zoom = 1;
  loading = false;
  disabled = false;
  collapsible = true;
  emitted: string[] = [];

  onSelectedChange(value: string): void {
    this.emitted.push(value);
    this.selected = value;
  }
}

@Component({
  standalone: true,
  imports: [InoOrgchartComponent],
  template: `<ino-orgchart ariaLabel="Templated chart" [value]="root">
    <ng-template let-node>
      <strong class="custom-node">{{ node.label }} / {{ node.data }}</strong>
    </ng-template>
  </ino-orgchart>`,
})
class TemplateHostComponent {
  root: InoOrgChartNode = { label: 'Root', value: 'root', data: 'extra' };
}

describe('InoOrgchartComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TemplateHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  /** First render, called after the test has staged its host state. The zoneless unit-test
   *  builder never re-evaluates host bindings for a plain post-render field mutation
   *  (`detectChanges`/`markForCheck`/`whenStable` all skip it; event listeners are what mark
   *  views dirty) — so state-variant tests configure first and render once, instead of mutating
   *  after render. Interaction tests are unaffected: DOM events mark the views dirty themselves. */
  function render(): void {
    fixture.detectChanges();
  }

  function nodes(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]'));
  }

  function nodeByLabel(label: string): HTMLElement {
    return nodes().find(
      (el) => el.querySelector('.ino-orgchart__node-label')?.textContent?.trim() === label,
    )!;
  }

  function keydown(el: HTMLElement, key: string): void {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function chart(): InoOrgchartComponent {
    return fixture.debugElement.children[0].componentInstance as InoOrgchartComponent;
  }

  // ── Rendering / semantics ────────────────────────────────────────────────────────────────────

  it('renders every node expanded by default with tree-of-nodes semantics', () => {
    render();
    expect(nodes().length).toBe(7);
    const tree = fixture.nativeElement.querySelector('[role="tree"]') as HTMLElement;
    expect(tree.getAttribute('aria-labelledby')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('[role="group"]').length).toBe(2);
    expect(nodeByLabel('CEO').getAttribute('aria-level')).toBe('1');
    expect(nodeByLabel('CTO').getAttribute('aria-level')).toBe('2');
    expect(nodeByLabel('Frontend').getAttribute('aria-level')).toBe('3');
  });

  it('marks branch nodes with aria-expanded and leaves leaves unmarked', () => {
    render();
    expect(nodeByLabel('CEO').getAttribute('aria-expanded')).toBe('true');
    expect(nodeByLabel('CFO').hasAttribute('aria-expanded')).toBe(false);
  });

  it('exactly one node is the roving tab stop', () => {
    render();
    const stops = nodes().filter((el) => el.getAttribute('tabindex') === '0');
    expect(stops.length).toBe(1);
    expect(stops[0]).toBe(nodeByLabel('CEO'));
  });

  it('renders the default node content with label and sublabel', () => {
    render();
    const ceo = nodeByLabel('CEO');
    expect(ceo.querySelector('.ino-orgchart__node-sublabel')?.textContent?.trim()).toBe(
      'Chief Executive',
    );
  });

  it('renders the empty state when value is null', () => {
    host.root = null;
    render();
    const empty = fixture.nativeElement.querySelector('.ino-orgchart__empty') as HTMLElement;
    expect(empty.textContent?.trim()).toBe('No data.');
    expect(nodes().length).toBe(0);
  });

  it('projects a custom node template with the node as context', () => {
    const templated = TestBed.createComponent(TemplateHostComponent);
    templated.detectChanges();
    const custom = templated.nativeElement.querySelector('.custom-node') as HTMLElement;
    expect(custom.textContent?.trim()).toBe('Root / extra');
    expect(templated.nativeElement.querySelector('.ino-orgchart__node-label')).toBeNull();
  });

  // ── Expand / collapse ───────────────────────────────────────────────────────────────────────

  it('collapses and re-expands a subtree via the toggler', () => {
    render();
    const toggle = nodeByLabel('CTO').parentElement!.querySelector(
      '.ino-orgchart__toggle',
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(nodes().length).toBe(4);
    expect(nodeByLabel('CTO').getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(nodes().length).toBe(7);
    expect(nodeByLabel('CTO').getAttribute('aria-expanded')).toBe('true');
  });

  it('hides togglers when collapsible is false', () => {
    host.collapsible = false;
    render();
    expect(fixture.nativeElement.querySelectorAll('.ino-orgchart__toggle').length).toBe(0);
  });

  // ── Arrow traversal (SPEC.md §5) ────────────────────────────────────────────────────────────

  it('ArrowDown descends into the first enabled child of an expanded branch', () => {
    render();
    keydown(nodeByLabel('CEO'), 'ArrowDown');
    expect(nodeByLabel('CTO').getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown expands a collapsed branch without moving focus', () => {
    render();
    chart().toggleExpand(host.root!.children![0]);
    fixture.detectChanges();
    const cto = nodeByLabel('CTO');
    keydown(cto, 'ArrowDown');
    expect(cto.getAttribute('aria-expanded')).toBe('true');
    expect(chart().isExpanded(host.root!.children![0])).toBe(true);
  });

  it('ArrowUp collapses an expanded branch, then ascends to the parent', () => {
    render();
    const cto = nodeByLabel('CTO');
    keydown(cto, 'ArrowUp');
    expect(cto.getAttribute('aria-expanded')).toBe('false');
    keydown(nodeByLabel('CTO'), 'ArrowUp');
    expect(nodeByLabel('CEO').getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight/ArrowLeft move between enabled siblings, clamped at the edges', () => {
    render();
    keydown(nodeByLabel('CTO'), 'ArrowRight');
    expect(nodeByLabel('CFO').getAttribute('tabindex')).toBe('0');
    keydown(nodeByLabel('CFO'), 'ArrowRight');
    expect(nodeByLabel('COO').getAttribute('tabindex')).toBe('0');
    keydown(nodeByLabel('COO'), 'ArrowRight');
    expect(nodeByLabel('COO').getAttribute('tabindex')).toBe('0');
    keydown(nodeByLabel('COO'), 'ArrowLeft');
    expect(nodeByLabel('CFO').getAttribute('tabindex')).toBe('0');
  });

  it('sibling traversal skips disabled nodes', () => {
    render();
    keydown(nodeByLabel('Frontend'), 'ArrowRight');
    expect(nodeByLabel('Mobile').getAttribute('tabindex')).toBe('0');
    expect(nodeByLabel('Backend').hasAttribute('tabindex')).toBe(false);
  });

  it('Home and End jump to the first/last enabled sibling', () => {
    render();
    keydown(nodeByLabel('Mobile'), 'Home');
    expect(nodeByLabel('Frontend').getAttribute('tabindex')).toBe('0');
    keydown(nodeByLabel('Frontend'), 'End');
    expect(nodeByLabel('Mobile').getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp on the root is a no-op', () => {
    render();
    keydown(nodeByLabel('CEO'), 'ArrowUp');
    expect(nodeByLabel('CEO').getAttribute('tabindex')).toBe('0');
  });

  // ── Selection (SPEC.md §3) ──────────────────────────────────────────────────────────────────

  it('Enter selects a node and re-activating it deselects', () => {
    render();
    keydown(nodeByLabel('CFO'), 'Enter');
    expect(host.emitted).toEqual(['cfo']);
    expect(nodeByLabel('CFO').getAttribute('aria-selected')).toBe('true');
    keydown(nodeByLabel('CFO'), 'Enter');
    expect(host.emitted).toEqual(['cfo', '']);
    expect(nodeByLabel('CFO').getAttribute('aria-selected')).toBe('false');
  });

  it('click selects in single mode', () => {
    render();
    nodeByLabel('CTO').click();
    fixture.detectChanges();
    expect(host.emitted).toEqual(['cto']);
  });

  it('selectionMode none renders no aria-selected and never emits', () => {
    host.selectionMode = 'none';
    render();
    expect(nodeByLabel('CFO').hasAttribute('aria-selected')).toBe(false);
    nodeByLabel('CFO').click();
    keydown(nodeByLabel('CFO'), 'Enter');
    expect(host.emitted).toEqual([]);
  });

  it('disabled nodes cannot be selected', () => {
    render();
    nodeByLabel('Backend').click();
    fixture.detectChanges();
    expect(host.emitted).toEqual([]);
  });

  // ── Chart-level states ──────────────────────────────────────────────────────────────────────

  it('loading sets aria-busy, shows the spinner, and suppresses interaction', () => {
    host.loading = true;
    render();
    const tree = fixture.nativeElement.querySelector('[role="tree"]') as HTMLElement;
    expect(tree.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ino-orgchart__spinner')).toBeTruthy();
    nodeByLabel('CFO').click();
    keydown(nodeByLabel('CFO'), 'Enter');
    expect(host.emitted).toEqual([]);
  });

  it('disabled removes every node from the tab order and suppresses interaction', () => {
    host.disabled = true;
    render();
    expect(nodes().every((el) => !el.hasAttribute('tabindex'))).toBe(true);
    const tree = fixture.nativeElement.querySelector('[role="tree"]') as HTMLElement;
    expect(tree.getAttribute('aria-disabled')).toBe('true');
    nodeByLabel('CFO').click();
    expect(host.emitted).toEqual([]);
  });

  // ── Zoom (SPEC.md §6) ───────────────────────────────────────────────────────────────────────

  it('zoom scales the chart surface font-size', () => {
    host.zoom = 1.5;
    render();
    const scroller = fixture.nativeElement.querySelector('.ino-orgchart__scroller') as HTMLElement;
    expect(scroller.getAttribute('style')).toContain('* 1.5)');
  });

  it('zoom clamps to [0.5, 2] and defaults non-numeric input to 1', () => {
    render();
    const instance = chart();
    instance.zoom = 99;
    expect(instance.zoom).toBe(2);
    instance.zoom = 0.01;
    expect(instance.zoom).toBe(0.5);
    instance.zoom = Number.NaN;
    expect(instance.zoom).toBe(1);
  });
});
