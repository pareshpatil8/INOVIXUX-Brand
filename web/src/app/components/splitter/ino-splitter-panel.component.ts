import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';

let idCounter = 0;

/**
 * `<ino-splitter-panel>` — one resizable pane, projected as a direct child of `<ino-splitter>`.
 * Dumb like `ino-tab-panel`: owns no resize math of its own. The parent reads `size`/`minSize`/
 * `collapsible` once and writes `flexBasis`/`collapsed` back on every drag, keyboard resize, or
 * collapse toggle — not `@Input`s, since the parent is the single owner of layout state (same
 * split `ino-tab-panel.active` uses for selection state). See `ino-splitter.component.ts` and
 * `SPEC.md`.
 */
@Component({
  selector: 'ino-splitter-panel',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-splitter-panel',
    '[style.flex-basis.%]': 'flexBasis',
    '[class.ino-splitter-panel--collapsed]': 'collapsed',
    '[attr.aria-hidden]': 'collapsed ? "true" : null',
    '[attr.data-collapsed]': 'collapsed ? "true" : null',
  },
})
export class InoSplitterPanelComponent {
  /** Initial size as a percentage of the splitter's main axis. Omit to split the main axis evenly
   *  among every panel that also omits it — see `SPEC.md` §1. */
  @Input({ transform: numberAttribute }) size: number | null = null;
  /** Minimum size as a percentage of the main axis; a drag or keyboard resize on either of this
   *  panel's gutters never pushes it below this floor. */
  @Input({ transform: numberAttribute }) minSize = 0;
  /** Renders a collapse/expand toggle button on this panel's own gutter — see `SPEC.md` §4. */
  @Input({ transform: booleanAttribute }) collapsible = false;

  readonly panelId = `ino-splitter-panel-${++idCounter}`;

  private _flexBasis = 0;
  private _collapsed = false;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  get flexBasis(): number {
    return this._flexBasis;
  }

  /** Set by `<ino-splitter>` on every layout recompute. A plain `OnPush` component only re-renders
   *  its own host bindings when its OWN view is marked dirty — a parent-side `markForCheck()` marks
   *  the parent's ancestor path, not this sibling leaf reached only through content projection —
   *  so the setter marks this view directly (same reasoning `ino-tab-panel.active`'s setter
   *  documents). */
  set flexBasis(value: number) {
    if (this._flexBasis === value) {
      return;
    }
    this._flexBasis = value;
    this.cdr.markForCheck();
  }

  get collapsed(): boolean {
    return this._collapsed;
  }

  set collapsed(value: boolean) {
    if (this._collapsed === value) {
      return;
    }
    this._collapsed = value;
    this.cdr.markForCheck();
  }
}
