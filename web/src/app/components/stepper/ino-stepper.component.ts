import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoControlSize } from '../control-size';
import { InoStepComponent } from './ino-step.component';

export type InoStepperOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-stepper>` — a wizard-style step navigator driven by content-projected `<ino-step>`
 * children, reusing the tablist/tab/tabpanel interaction model `<ino-tabs>` already implements
 * (roving tabindex, one visible panel, click/Enter/Space to activate). Recovered to full DS parity
 * by INO-361 after the original richer branch (#20) was closed without its web deltas landing —
 * see SPEC.md §1.
 *
 * `linear` (default `true`): a step can only be activated once every step before it has
 * `completed` set. The stepper itself never validates anything; it only reads the `completed` flag
 * the consumer's form sets once its own validation passes (`ino-step`'s doc comment). Set
 * `linear = false` for free navigation between any non-disabled step.
 *
 * Controlled/uncontrolled and **index-based selection** follow the same decision `<ino-tabs>`
 * makes and documents in its SPEC.md §2 — consistency with the already-merged React Native /
 * Flutter ports, which are controlled-only and index-based by their own design.
 *
 * `next()`/`previous()` are convenience methods for a "Back"/"Next" button pair outside the
 * component (`#stepper` template ref). `next()` still goes through `selectStep()`, so it respects
 * `linear` gating — the caller must set the current step's `completed` flag before `next()` can
 * advance past it. `previous()` is always allowed: going back never needs unlocking.
 */
@Component({
  selector: 'ino-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ino-stepper.component.html',
  styleUrl: './ino-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-stepper',
    '[attr.data-size]': 'size',
    '[attr.data-orientation]': 'orientation',
  },
})
export class InoStepperComponent implements AfterContentInit, OnDestroy {
  @Input({ transform: numberAttribute }) activeIndex?: number;
  @Input() size: InoControlSize = 'default';
  @Input() orientation: InoStepperOrientation = 'horizontal';
  @Input({ transform: booleanAttribute }) linear = true;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() activeIndexChange = new EventEmitter<number>();

  @ContentChildren(InoStepComponent) private stepsQuery!: QueryList<InoStepComponent>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  protected steps: InoStepComponent[] = [];
  private internalActiveIndex?: number;
  private stepsSub?: Subscription;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  private get isControlled(): boolean {
    return this.activeIndex !== undefined;
  }

  protected get currentActiveIndex(): number | undefined {
    const index = this.isControlled ? this.activeIndex : this.internalActiveIndex;
    if (index === undefined || !this.steps.length) {
      return index;
    }
    return Math.min(Math.max(0, index), this.steps.length - 1);
  }

  ngAfterContentInit(): void {
    this.syncSteps();
    this.stepsSub = this.stepsQuery.changes.subscribe(() => this.syncSteps());
  }

  ngOnDestroy(): void {
    this.stepsSub?.unsubscribe();
  }

  /** Advances to the next step via `selectStep()` — so it respects `isReachable()`/`linear`
   *  gating exactly like a header click would. No-op past the last step, or if the next step is
   *  not yet reachable (the caller hasn't marked the current step `completed`). */
  next(): void {
    const current = this.currentActiveIndex ?? 0;
    if (current >= this.steps.length - 1) {
      return;
    }
    this.selectStep(this.steps[current + 1], current + 1);
  }

  /** Returns to the previous step. Always allowed — going back never needs unlocking, and the
   *  target index is by definition already reachable. */
  previous(): void {
    const current = this.currentActiveIndex ?? 0;
    if (current <= 0) {
      return;
    }
    this.selectStep(this.steps[current - 1], current - 1);
  }

  private syncSteps(): void {
    this.steps = this.stepsQuery.toArray();
    if (
      !this.isControlled &&
      (this.internalActiveIndex === undefined ||
        this.internalActiveIndex >= this.steps.length ||
        this.steps[this.internalActiveIndex]?.disabled)
    ) {
      const firstEnabled = this.steps.findIndex((s) => !s.disabled);
      this.internalActiveIndex = firstEnabled === -1 ? undefined : firstEnabled;
    }
    this.applyActiveState();
    this.cdr.markForCheck();
  }

  private applyActiveState(): void {
    const active = this.currentActiveIndex;
    this.steps.forEach((step, index) => {
      step.active = index === active;
    });
  }

  /** In `linear` mode, index `i` unlocks only once every step before it is `completed` — the
   *  gate the whole component exists to add on top of `ino-tabs`'s free navigation. Index 0 is
   *  always reachable (there is nothing before it to complete). Non-linear mode never gates. */
  protected isReachable(index: number): boolean {
    if (!this.linear) {
      return true;
    }
    for (let i = 0; i < index; i++) {
      if (!this.steps[i]?.completed) {
        return false;
      }
    }
    return true;
  }

  protected selectStep(step: InoStepComponent, index: number): void {
    if (step.disabled || this.readonly || index === this.currentActiveIndex || !this.isReachable(index)) {
      return;
    }
    if (!this.isControlled) {
      this.internalActiveIndex = index;
      this.applyActiveState();
    }
    this.activeIndexChange.emit(index);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const enabled = this.steps.map((step, i) => ({ step, i })).filter(({ step }) => !step.disabled);
    if (enabled.length === 0) {
      return;
    }
    const horizontal = this.orientation === 'horizontal';
    const rtl = horizontal && this.isRtl();
    const forwardKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    const backwardKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
    let targetIndex: number | undefined;

    switch (event.key) {
      case forwardKey:
        targetIndex = this.nextEnabledIndex(index, rtl ? -1 : 1, enabled.map((e) => e.i));
        break;
      case backwardKey:
        targetIndex = this.nextEnabledIndex(index, rtl ? 1 : -1, enabled.map((e) => e.i));
        break;
      case 'Home':
        targetIndex = enabled[0].i;
        break;
      case 'End':
        targetIndex = enabled[enabled.length - 1].i;
        break;
      case 'Enter':
      case ' ':
        this.selectStep(this.steps[index], index);
        event.preventDefault();
        return;
      default:
        return;
    }

    if (targetIndex === undefined) {
      return;
    }
    event.preventDefault();
    this.focusAndSelect(targetIndex);
  }

  private nextEnabledIndex(from: number, step: 1 | -1, enabledIndexes: number[]): number {
    const count = this.steps.length;
    let i = from;
    for (let attempts = 0; attempts < count; attempts++) {
      i = (i + step + count) % count;
      if (enabledIndexes.includes(i)) {
        return i;
      }
    }
    return from;
  }

  private focusAndSelect(index: number): void {
    const el = this.trackRef?.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    el?.focus();
    this.selectStep(this.steps[index], index);
  }

  private isRtl(): boolean {
    const host = this.trackRef?.nativeElement;
    return !!host && getComputedStyle(host).direction === 'rtl';
  }
}
