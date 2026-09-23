import {
  ComponentRef,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  Renderer2,
  SimpleChanges,
  ViewContainerRef,
  booleanAttribute,
  inject,
} from '@angular/core';

import { InoControlSize } from '../control-size';
import { InoOverlayPosition, computeOverlayPlacement } from '../overlay/overlay-position';
import { InoTooltipComponent } from './ino-tooltip.component';

let tooltipIdCounter = 0;

/**
 * `[inoTooltip]` — advisory hint anchored to the host element (INO-31 T-22 / INO-149). Parity
 * benchmark: PrimeNG 22.1.1 `pTooltip` (`specs/primeng/llms-22.1.1.txt` line 126) — a benchmark
 * only, nothing here imports it.
 *
 * ```html
 * <button inoTooltip="Delete this item" inoTooltipPosition="top">Delete</button>
 * ```
 *
 * Reuses `computeOverlayPlacement` from the shared `overlay/overlay-position.ts` (INO-271) —
 * imported as-is, since the signature needed no changes for this third consumer.
 *
 * ## Triggers: hover AND focus, never click
 *
 * The issue names "focus and hover triggers" — both are wired unconditionally, matching the
 * WAI-ARIA APG tooltip pattern (content that appears "on hover or focus" is exactly SC 1.4.13's
 * trigger set). There is deliberately no click/tap trigger and no `inoTooltipEvent` axis to choose
 * one: a tooltip that only some callers can dismiss by moving the pointer away would be an
 * inconsistent contract, and PrimeNG's own default (`tooltipEvent="hover"`, i.e. hover **and**
 * focus together) already lands on this pair.
 *
 * ## WCAG 1.4.13 (Content on Hover or Focus) — dismissible, hoverable, persistent
 *
 * - **Dismissible**: `Escape` closes the tooltip without moving focus or the pointer
 *   (`onKeydown`/document listener), and never touches the trigger's own focus state.
 * - **Hoverable**: the panel's own `panelEnter`/`panelLeave` keep it open while the pointer is
 *   over the panel itself, not just the trigger — `hide()` only runs once neither the trigger nor
 *   the panel is hovered/focused.
 * - **Persistent**: the tooltip does not time out on its own; it stays until one of hide's actual
 *   triggers fires (pointer/focus leaves both surfaces, Escape, or the directive is destroyed).
 */
@Directive({
  selector: '[inoTooltip]',
  standalone: true,
})
export class InoTooltipDirective implements OnChanges, OnDestroy {
  @Input('inoTooltip') content = '';
  @Input() inoTooltipPosition: InoOverlayPosition = 'top';
  @Input() inoTooltipSize: InoControlSize = 'default';
  @Input() inoTooltipShowDelay = 300;
  /** Grace period before hiding — long enough for the pointer to reach the panel itself (hoverable). */
  @Input() inoTooltipHideDelay = 100;
  @Input({ transform: booleanAttribute }) inoTooltipDisabled = false;

  /**
   * Lifecycle outputs conforming to the same rule as `<ino-popover>`/`<ino-confirm-popup>`/
   * `<ino-modal>` (`../overlay/SPEC.md` §2): fire once per real show/hide transition. Unlike those
   * components, the tooltip has no `[(open)]`-equivalent bindable input — `show()`/`hide()` are the
   * only paths that ever run, so there is no double-emission risk to guard against here.
   */
  @Output() shown = new EventEmitter<void>();
  @Output() hidden = new EventEmitter<void>();

  private readonly vcr = inject(ViewContainerRef);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;

  private readonly tooltipId = `ino-tooltip-${++tooltipIdCounter}`;
  private ref: ComponentRef<InoTooltipComponent> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private hostHovered = false;
  private hostFocused = false;
  private panelHovered = false;
  private escapeBound = false;

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.ref?.instance.open) {
      event.stopPropagation();
      this.forceHide();
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['inoTooltipDisabled'] && this.inoTooltipDisabled) || (changes['content'] && !this.content)) {
      this.forceHide();
    }
    if (this.ref) {
      this.ref.setInput('text', this.content);
      this.ref.setInput('position', this.inoTooltipPosition);
      this.ref.setInput('size', this.inoTooltipSize);
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.unbindEscape();
    this.ref?.destroy();
  }

  @HostListener('mouseenter')
  protected onHostEnter(): void {
    this.hostHovered = true;
    this.scheduleShow();
  }

  @HostListener('mouseleave')
  protected onHostLeave(): void {
    this.hostHovered = false;
    this.scheduleHide();
  }

  @HostListener('focusin')
  protected onHostFocusIn(): void {
    this.hostFocused = true;
    this.scheduleShow();
  }

  @HostListener('focusout')
  protected onHostFocusOut(): void {
    this.hostFocused = false;
    this.scheduleHide();
  }

  private scheduleShow(): void {
    if (this.inoTooltipDisabled || !this.content) {
      return;
    }
    this.clearTimers();
    this.zone.runOutsideAngular(() => {
      this.showTimer = setTimeout(() => this.zone.run(() => this.show()), this.inoTooltipShowDelay);
    });
  }

  private scheduleHide(): void {
    this.clearTimers();
    this.zone.runOutsideAngular(() => {
      this.hideTimer = setTimeout(() => {
        if (!this.hostHovered && !this.hostFocused && !this.panelHovered) {
          this.zone.run(() => this.hide());
        }
      }, this.inoTooltipHideDelay);
    });
  }

  private show(): void {
    const wasOpen = this.ref?.instance.open ?? false;

    if (!this.ref) {
      this.ref = this.vcr.createComponent(InoTooltipComponent);
      this.ref.instance.tooltipId = this.tooltipId;
      this.ref.instance.panelEnter.subscribe(() => {
        this.panelHovered = true;
        this.clearTimers();
      });
      this.ref.instance.panelLeave.subscribe(() => {
        this.panelHovered = false;
        this.scheduleHide();
      });
      this.bindEscape();
    }

    this.ref.setInput('text', this.content);
    this.ref.setInput('position', this.inoTooltipPosition);
    this.ref.setInput('size', this.inoTooltipSize);
    this.ref.setInput('open', true);
    this.renderer.setAttribute(this.host, 'aria-describedby', this.tooltipId);

    // The panel isn't laid out yet on this tick — same deferral <ino-confirm-popup> uses before
    // measuring its own panel. `setTimeout`, not `queueMicrotask`: zone drains microtasks before
    // `ApplicationRef.tick()` runs, so a microtask fires before the panel exists in the DOM.
    setTimeout(() => this.reposition());

    if (!wasOpen) {
      this.shown.emit();
    }
  }

  private hide(): void {
    if (!this.ref?.instance.open) {
      return;
    }
    this.ref.setInput('open', false);
    this.renderer.removeAttribute(this.host, 'aria-describedby');
    this.hidden.emit();
  }

  private forceHide(): void {
    this.hostHovered = false;
    this.hostFocused = false;
    this.panelHovered = false;
    this.clearTimers();
    this.hide();
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private bindEscape(): void {
    if (this.escapeBound || typeof document === 'undefined') {
      return;
    }
    this.zone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.onDocumentKeydown, true);
    });
    this.escapeBound = true;
  }

  private unbindEscape(): void {
    if (!this.escapeBound) {
      return;
    }
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
    this.escapeBound = false;
  }

  private reposition(): void {
    if (!this.ref || typeof window === 'undefined') {
      return;
    }
    const hostEl = this.ref.location.nativeElement as HTMLElement;
    const panel = hostEl.querySelector<HTMLElement>('.ino-tooltip');
    if (!panel) {
      return;
    }
    const placement = computeOverlayPlacement(
      this.host.getBoundingClientRect(),
      { width: panel.offsetWidth, height: panel.offsetHeight },
      this.inoTooltipPosition,
      { width: window.innerWidth, height: window.innerHeight },
      8,
    );
    this.ref?.setInput('top', placement.top);
    this.ref?.setInput('left', placement.left);
    this.ref?.setInput('position', placement.position);
  }
}
