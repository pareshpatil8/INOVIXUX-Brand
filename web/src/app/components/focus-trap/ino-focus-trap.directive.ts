import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  booleanAttribute,
  inject,
} from '@angular/core';

/**
 * `[inoFocusTrap]` — confines Tab / Shift+Tab to a container element, per WAI-ARIA APG's modal
 * dialog pattern and WCAG 2.2 SC 2.1.2 (No Keyboard Trap: focus must be *contained* while the
 * dialog is open and *released* when it closes — a trap with no exit is the failure, not the goal).
 *
 * Exists as a standalone primitive because four components need identical behavior: `<ino-modal>`
 * (U-7), Drawer (T-24), Popover (T-23) and ConfirmDialog (T-25). Before this directive, the only
 * implementation was hand-rolled inside `<ino-modal>` and asserted but never tested — pending item
 * **P-1** in `docs/brand/16-design-system-parity-vs-echeque-reference.md`. The parity benchmark is
 * PrimeNG's `pFocusTrap` (22.1.1); `inoFocusTrapDisabled` is the one-for-one counterpart of
 * `pFocusTrapDisabled`. PrimeNG is a benchmark, not a dependency — nothing here imports it.
 *
 * ## Why sentinels rather than a `keydown` handler
 *
 * The hand-rolled version in `<ino-modal>` intercepted `Tab`, computed the focusable list and
 * called `preventDefault()` at the boundaries. That approach cannot see focus it never receives a
 * keydown for: focus moved out by the browser's own chrome (address bar, Find bar, devtools), by
 * an `<iframe>`'s internal tab order, or programmatically by third-party script. This directive
 * instead seats two `tabindex="0"` sentinel spans as the first and last children of the host. The
 * browser's native tab order does the work, and focus landing on a sentinel means "you tabbed off
 * the end" — so wrapping is a plain focus move, not a cancelled keystroke. A document-level
 * `focusin` guard catches the remaining escape routes the sentinels can't observe.
 *
 * ## Nesting
 *
 * Active traps form a stack; only the topmost one enforces containment. A ConfirmDialog opened
 * over an already-open Modal therefore takes over cleanly and hands control back on close, instead
 * of the two fighting over `document.activeElement`.
 */
@Directive({
  selector: '[inoFocusTrap]',
  standalone: true,
})
export class InoFocusTrapDirective implements OnInit, OnChanges, OnDestroy {
  /**
   * Suspends the trap without removing the directive. Counterpart of PrimeNG's
   * `pFocusTrapDisabled`. Flipping this back to `false` re-activates and re-runs auto-focus,
   * which is the behavior a Drawer wants when it re-opens.
   */
  @Input({ transform: booleanAttribute }) inoFocusTrapDisabled = false;

  /**
   * Move focus into the container on activation. Defaults to `true` because every consumer of
   * this primitive is a dialog-like surface, and APG requires initial focus to land inside.
   * Set `false` only when the consumer places focus itself.
   */
  @Input({ transform: booleanAttribute }) inoFocusTrapAutoFocus = true;

  /**
   * CSS selector for the element that should receive initial focus, resolved within the
   * container. Falls back to the first tabbable element, then to the container itself. Use this
   * rather than `autofocus`, which browsers apply inconsistently to dynamically inserted DOM.
   */
  @Input() inoFocusTrapInitialFocus = '';

  /**
   * Return focus to whatever was focused before activation, on deactivate or destroy. This is
   * the half of SC 2.4.3 (Focus Order) that hand-rolled traps usually miss: dismissing a dialog
   * should put the user back on the control that opened it, not at the top of the document.
   */
  @Input({ transform: booleanAttribute }) inoFocusTrapRestoreFocus = true;

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  private active = false;
  private initialized = false;
  private previouslyFocused: HTMLElement | null = null;
  private leading: HTMLElement | null = null;
  private trailing: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  /** Set while this directive is itself moving focus, so the focusin guard ignores its own work. */
  private settingFocus = false;

  ngOnInit(): void {
    console.log('DBG ngOnInit');
    this.sync();
    this.initialized = true;
  }

  ngOnChanges(): void {
    console.log('DBG ngOnChanges init=', this.initialized, 'disabled=', this.inoFocusTrapDisabled);
    // ngOnChanges fires before ngOnInit for bound inputs; let ngOnInit own the first activation
    // so auto-focus runs exactly once.
    if (this.initialized) {
      this.sync();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  /**
   * Re-reads the container's tabbable content. Only needed when content changes in a way the
   * host's own `childList` observer cannot see (e.g. a descendant several levels down becoming
   * enabled); sentinel placement is maintained automatically.
   */
  refresh(): void {
    if (this.active) {
      this.seatSentinels();
    }
  }

  private sync(): void {
    if (this.inoFocusTrapDisabled) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  private activate(): void {
    if (this.active || typeof document === 'undefined') {
      return;
    }

    this.active = true;
    this.previouslyFocused = activeElement();
    this.leading = createSentinel();
    this.trailing = createSentinel();
    this.leading.addEventListener('focus', this.onLeadingFocus);
    this.trailing.addEventListener('focus', this.onTrailingFocus);
    this.seatSentinels();

    this.observer = new MutationObserver(() => this.seatSentinels());
    this.observer.observe(this.host, { childList: true });

    pushTrap(this);

    if (this.inoFocusTrapAutoFocus) {
      // The host's projected content is not laid out yet on the activation tick — the same
      // deferral `<ino-modal>` uses before focusing its panel.
      queueMicrotask(() => {
        if (this.active && this.inoFocusTrapAutoFocus) {
          this.focusInitial();
        }
      });
    }
  }

  private deactivate(): void {
    console.log('DBG deactivate active=', this.active);
    if (!this.active) {
      return;
    }

    this.active = false;
    popTrap(this);

    this.observer?.disconnect();
    this.observer = null;

    this.leading?.removeEventListener('focus', this.onLeadingFocus);
    this.trailing?.removeEventListener('focus', this.onTrailingFocus);
    this.leading?.remove();
    this.trailing?.remove();
    this.leading = null;
    this.trailing = null;

    const restoreTo = this.previouslyFocused;
    this.previouslyFocused = null;

    // Only restore if we still hold focus. If something else has already moved focus on
    // (a toast action, the next dialog in a wizard), yanking it back would be the bug.
    if (
      this.inoFocusTrapRestoreFocus &&
      restoreTo?.isConnected &&
      this.host.contains(activeElement())
    ) {
      restoreTo.focus();
    }
  }

  /**
   * Keeps the sentinels as the true first and last children. Content projected in after
   * activation (a Drawer rendering its body, a dialog appending a footer) would otherwise land
   * *after* the trailing sentinel and fall outside the trap.
   */
  private seatSentinels(): void {
    const { leading, trailing, host } = this;
    if (!leading || !trailing) {
      return;
    }
    // Guarded so the observer does not re-fire on its own repositioning.
    if (host.firstChild !== leading) {
      host.insertBefore(leading, host.firstChild);
    }
    if (host.lastChild !== trailing) {
      host.appendChild(trailing);
    }
  }

  /** Focus reached the leading sentinel, i.e. Shift+Tab off the first element — wrap to the end. */
  private readonly onLeadingFocus = (): void => {
    const items = this.tabbables();
    this.moveFocus(items[items.length - 1]);
  };

  /** Focus reached the trailing sentinel, i.e. Tab off the last element — wrap to the start. */
  private readonly onTrailingFocus = (): void => {
    this.moveFocus(this.tabbables()[0]);
  };

  private focusInitial(): void {
    const requested = this.inoFocusTrapInitialFocus
      ? this.host.querySelector<HTMLElement>(this.inoFocusTrapInitialFocus)
      : null;
    this.moveFocus(requested ?? this.tabbables()[0] ?? this.container());
  }

  /**
   * Last-resort target when a container has no tabbable content at all (an empty Drawer, a
   * confirm dialog still loading). Focus must stay inside, so the container takes it — which
   * requires it to be programmatically focusable.
   */
  private container(): HTMLElement {
    if (!this.host.hasAttribute('tabindex')) {
      this.host.setAttribute('tabindex', '-1');
    }
    return this.host;
  }

  private moveFocus(target: HTMLElement | undefined): void {
    if (!target) {
      return;
    }
    this.settingFocus = true;
    target.focus();
    this.settingFocus = false;
  }

  /** Called by the document-level guard when focus lands outside this (topmost) trap. */
  reclaimFocus(): void {
    if (this.settingFocus) {
      return;
    }
    this.moveFocus(this.tabbables()[0] ?? this.container());
  }

  isActive(): boolean {
    return this.active;
  }

  contains(node: Node | null): boolean {
    return !!node && this.host.contains(node);
  }

  /**
   * The container's tabbable elements in true tab order: positive `tabindex` values first in
   * ascending order, then everything at `tabindex="0"` in document order — the order the browser
   * itself uses. A naive `querySelectorAll` order would wrap to the wrong element whenever a
   * consumer uses a positive tabindex.
   */
  private tabbables(): HTMLElement[] {
    const candidates = Array.from(
      this.host.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute(SENTINEL_ATTR) && el.tabIndex >= 0 && this.isVisible(el));

    const positive: { el: HTMLElement; order: number; index: number }[] = [];
    const natural: HTMLElement[] = [];

    candidates.forEach((el, index) => {
      if (el.tabIndex > 0) {
        positive.push({ el, order: el.tabIndex, index });
      } else {
        natural.push(el);
      }
    });

    positive.sort((a, b) => a.order - b.order || a.index - b.index);
    return [...positive.map((p) => p.el), ...natural];
  }

  /**
   * Walks ancestors up to the container looking for anything that removes the element from the
   * tab order. Deliberately *not* the `offsetParent === null` shortcut the old modal code used:
   * `offsetParent` is null for any `position: fixed` element, so a fixed-position action bar
   * inside a dialog would have been silently dropped from the trap.
   */
  private isVisible(el: HTMLElement): boolean {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      if (node.hidden || node.hasAttribute('inert') || node.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        return false;
      }
      if (node === this.host) {
        break;
      }
    }
    // A closed <details> hides everything but its <summary>.
    const details = el.closest('details');
    return !details || details.open || el.tagName === 'SUMMARY';
  }
}

const SENTINEL_ATTR = 'data-ino-focus-trap-sentinel';

/**
 * Structural, not stylistic. These declarations exist to remove the sentinel from layout and
 * from paint while keeping it focusable — none of them is a colour, space, radius, duration,
 * shadow or font-size, so there is no design value here to route through a token (see
 * `SPEC.md`, DoD row 1). `inset-block/inline` rather than `top`/`left` keeps it RTL-safe.
 */
const SENTINEL_STYLE = [
  'position:fixed',
  'inset-block-start:0',
  'inset-inline-start:0',
  'width:1px',
  'height:1px',
  'opacity:0',
  'pointer-events:none',
].join(';');

function createSentinel(): HTMLElement {
  const el = document.createElement('span');
  el.setAttribute(SENTINEL_ATTR, '');
  el.setAttribute('tabindex', '0');
  // Hidden from assistive tech: the sentinel is a tab-order mechanism, not content. Screen
  // reader users navigating by virtual cursor never encounter it.
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('style', SENTINEL_STYLE);
  return el;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Resolves the deepest active element, crossing shadow boundaries. */
function activeElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement as HTMLElement;
  }
  return el;
}

/*
 * Trap stack. Only the topmost active trap enforces containment, so stacked surfaces
 * (ConfirmDialog over Modal) hand control back and forth instead of both pulling focus. One
 * shared document listener serves every trap — the escape routes it exists for (browser chrome,
 * iframes, programmatic focus) are document-level events the sentinels never receive.
 */
const trapStack: InoFocusTrapDirective[] = [];

function onDocumentFocusIn(event: FocusEvent): void {
  const top = trapStack[trapStack.length - 1];
  if (top?.isActive() && !top.contains(event.target as Node)) {
    top.reclaimFocus();
  }
}

function pushTrap(trap: InoFocusTrapDirective): void {
  trapStack.push(trap);
  if (trapStack.length === 1) {
    document.addEventListener('focusin', onDocumentFocusIn, true);
  }
}

function popTrap(trap: InoFocusTrapDirective): void {
  const index = trapStack.indexOf(trap);
  if (index > -1) {
    trapStack.splice(index, 1);
  }
  if (trapStack.length === 0) {
    document.removeEventListener('focusin', onDocumentFocusIn, true);
  }
}
