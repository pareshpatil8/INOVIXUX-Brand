import { Injectable } from '@angular/core';

import { InoDraggableDirective } from './ino-draggable.directive';
import { InoDroppableDirective } from './ino-droppable.directive';

interface CarryingState {
  draggable: InoDraggableDirective;
  data: unknown;
  source: HTMLElement;
  isKeyboard: boolean;
}

/** Clears the `aria-live` region this long after writing it, so the next announcement — even
 *  one with identical text — is read as a fresh change rather than silently merged. SPEC.md §3.3. */
const ANNOUNCE_CLEAR_MS = 500;

/**
 * Per-app coordinator for `[inoDraggable]` / `[inoDroppable]`: the registry of droppables used
 * for keyboard navigation (DOM order, SPEC.md §5.4), the single `aria-live` announcer region
 * (SPEC.md §3.3 — "the caller does not create or manage this region"), and the in-memory
 * "currently dragging" payload native HTML5 DnD can't hand to `dragover` safely (browsers block
 * `dataTransfer.getData` outside `drop`, so droppables read this instead).
 *
 * `providedIn: 'root'` — one instance per app, matching the spec's "set up once per app" region.
 */
@Injectable({ providedIn: 'root' })
export class InoDragDropService {
  private droppables = new Set<InoDroppableDirective>();
  private carrying: CarryingState | null = null;
  private focusedDroppable: InoDroppableDirective | null = null;

  private draggingData: unknown = undefined;
  private draggingSource: HTMLElement | null = null;
  private isDragging = false;

  private liveRegion: HTMLElement | null = null;
  private clearTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private announceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // --- Mouse / native HTML5 DnD coordination -------------------------------------------------

  setDraggingData(data: unknown, source: HTMLElement): void {
    this.draggingData = data;
    this.draggingSource = source;
    this.isDragging = true;
  }

  clearDraggingData(): void {
    this.draggingData = undefined;
    this.draggingSource = null;
    this.isDragging = false;
  }

  getDraggingData(): unknown {
    return this.draggingData;
  }

  getDraggingSource(): HTMLElement | null {
    return this.draggingSource;
  }

  isMouseDragging(): boolean {
    return this.isDragging;
  }

  // --- Draggable lifecycle --------------------------------------------------------------------

  deregisterDraggable(draggable: InoDraggableDirective): void {
    if (this.carrying?.draggable === draggable) {
      this.clearCarryingState();
    }
  }

  // --- Droppable registry (keyboard navigation order) -----------------------------------------

  registerDroppable(droppable: InoDroppableDirective): void {
    this.droppables.add(droppable);
  }

  deregisterDroppable(droppable: InoDroppableDirective): void {
    this.droppables.delete(droppable);
    if (this.focusedDroppable === droppable) {
      this.focusedDroppable = null;
    }
  }

  /** DOM order (SPEC.md §5.4 default) — `compareDocumentPosition` rather than registration
   *  order, since directives on conditionally-rendered rows don't register in document order. */
  private getOrderedDroppables(): InoDroppableDirective[] {
    return Array.from(this.droppables).sort((a, b) => {
      const posA = a.getElement();
      const posB = b.getElement();
      const position = posA.compareDocumentPosition(posB);
      // eslint-disable-next-line no-bitwise
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      // eslint-disable-next-line no-bitwise
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  getFocusedDroppable(): InoDroppableDirective | null {
    return this.focusedDroppable;
  }

  // --- Keyboard carry state --------------------------------------------------------------------

  setCarryingState(state: CarryingState): void {
    this.carrying = state;
    this.focusedDroppable = null;
  }

  clearCarryingState(): void {
    if (this.focusedDroppable) {
      this.focusedDroppable.setKeyboardFocusActive(false);
    }
    this.carrying = null;
    this.focusedDroppable = null;
  }

  isCarrying(): boolean {
    return this.carrying !== null;
  }

  /** Arrow-key navigation moves real DOM focus onto the droppable zone (SPEC.md §3.4), so the
   *  draggable's own `keydown` handler stops receiving events once focus leaves it. These two
   *  methods let `[inoDroppable]` forward Enter/Escape, while carrying, back to the active
   *  draggable's existing logic instead of duplicating it. */
  attemptDropOnFocusedZone(): void {
    this.carrying?.draggable.attemptDropOnFocused();
  }

  cancelCarrying(): void {
    this.carrying?.draggable.cancelKeyboardDrag();
  }

  setCurrentDraggableCarrying(draggable: InoDraggableDirective): void {
    if (this.carrying) {
      this.carrying.draggable = draggable;
    }
  }

  /** Arrow-key navigation while carrying (SPEC.md §3.1 step 3 / §5.4): moves focus to the
   *  next `[inoDroppable]` in DOM order and announces its availability. */
  navigateToNextDroppable(code: string): void {
    const ordered = this.getOrderedDroppables();
    if (ordered.length === 0) return;

    const forward = code === 'ArrowDown' || code === 'ArrowRight';
    const currentIndex = this.focusedDroppable ? ordered.indexOf(this.focusedDroppable) : -1;

    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = forward ? 0 : ordered.length - 1;
    } else {
      nextIndex = forward
        ? (currentIndex + 1) % ordered.length
        : (currentIndex - 1 + ordered.length) % ordered.length;
    }

    const previous = this.focusedDroppable;
    const next = ordered[nextIndex];
    this.focusedDroppable = next;

    previous?.setKeyboardFocusActive(false);
    next.setKeyboardFocusActive(true);
    next.getElement().focus();

    this.announce(next.describeAvailability());
  }

  // --- `aria-live` announcer (SPEC.md §3.3) ----------------------------------------------------

  private ensureLiveRegion(): HTMLElement {
    if (this.liveRegion?.isConnected) return this.liveRegion;

    const existing = document.querySelector<HTMLElement>('[data-ino-dragdrop-announce]');
    if (existing) {
      this.liveRegion = existing;
      return existing;
    }

    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-ino-dragdrop-announce', '');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clipPath = 'inset(50%)';
    document.body.appendChild(region);
    this.liveRegion = region;
    return region;
  }

  /** Clears then (on the next microtask) writes `message`, so two consecutive identical
   *  announcements both get read instead of the second being a silent no-op DOM write. */
  announce(message: string): void {
    const region = this.ensureLiveRegion();

    if (this.announceTimeoutId) clearTimeout(this.announceTimeoutId);
    if (this.clearTimeoutId) clearTimeout(this.clearTimeoutId);

    region.textContent = '';
    this.announceTimeoutId = setTimeout(() => {
      region.textContent = message;
      this.clearTimeoutId = setTimeout(() => {
        region.textContent = '';
      }, ANNOUNCE_CLEAR_MS);
    }, 0);
  }
}
