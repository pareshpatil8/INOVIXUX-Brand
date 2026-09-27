import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { InoControlSize } from '../control-size';
import { InoStepComponent } from './ino-step.component';

export type InoStepperOrientation = 'horizontal' | 'vertical';

/**
 * `<ino-stepper>` — wizard-like multi-step workflow container (T-27 / INO-31 F-1). Parity
 * benchmark: PrimeNG `Stepper` (`specs/primeng/llms-22.1.1.txt` line 113, "displays a wizard-like
 * workflow by guiding users through the multi-step progression") — a benchmark, not a runtime
 * dependency.
 *
 * Container/leaf split identical to `<ino-tabs>`/`<ino-tab>` (T-26); see that component's SPEC.md
 * §1 for why each step is a real projected child rather than a data-driven `items` array.
 *
 * `linear` (default `true`, matching the PrimeNG benchmark's default) gates how far a caller can
 * jump ahead: in linear mode, a step becomes reachable only once `next()` has advanced *to* it at
 * least once (`furthestIndex`); in non-linear mode every non-`disabled` step is always reachable.
 * See SPEC.md §1.
 *
 * ```html
 * <ino-stepper #stepper [(activeIndex)]="step">
 *   <ino-step label="Account">…</ino-step>
 *   <ino-step label="Payment">…</ino-step>
 *   <ino-step label="Review">…</ino-step>
 * </ino-stepper>
 * <button (click)="stepper.previous()">Back</button>
 * <button (click)="stepper.next()">Next</button>
 * ```
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
    '[attr.data-orientation]': 'orientation',
    '[attr.data-size]': 'size',
  },
})
export class InoStepperComponent implements AfterContentInit, OnDestroy {
  @Input({ transform: numberAttribute }) activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();
  @Input({ transform: booleanAttribute }) linear = true;
  @Input() orientation: InoStepperOrientation = 'horizontal';
  @Input() size: InoControlSize = 'default';

  @ContentChildren(InoStepComponent) private stepQuery!: QueryList<InoStepComponent>;

  protected steps: InoStepComponent[] = [];
  private furthestIndex = 0;
  private subscription: Subscription | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterContentInit(): void {
    this.furthestIndex = this.activeIndex;
    this.syncSteps();
    this.subscription = this.stepQuery.changes.subscribe(() => this.syncSteps());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Advances to the next step, unlocking it in linear mode. No-op past the last step.
   *  Deliberately bypasses `isReachable()` — the whole point of `next()` is to unlock the
   *  following step, so gating it on "already reachable" would make it permanently a no-op past
   *  index 0 in linear mode (the bug this comment replaces: see stepper.spec.ts). */
  next(): void {
    if (this.clampedIndex >= this.steps.length - 1) {
      return;
    }
    this.activate(this.clampedIndex + 1);
  }

  /** Returns to the previous step. Always allowed — going back never needs unlocking, and the
   *  target index is by definition `<= furthestIndex` already. */
  previous(): void {
    if (this.clampedIndex <= 0) {
      return;
    }
    this.activate(this.clampedIndex - 1);
  }

  protected isActive(step: InoStepComponent): boolean {
    return this.steps.indexOf(step) === this.clampedIndex;
  }

  protected isReachable(step: InoStepComponent): boolean {
    if (step.disabled) {
      return false;
    }
    const index = this.steps.indexOf(step);
    return this.linear ? index <= this.furthestIndex : true;
  }

  /** Click/keyboard-driven selection — unlike `next()`/`previous()`, this path must respect
   *  `isReachable()`: a header click can target ANY step, including ones beyond the linear
   *  frontier, which is exactly what that gate exists to block. */
  protected select(step: InoStepComponent): void {
    if (!this.isReachable(step)) {
      return;
    }
    const index = this.steps.indexOf(step);
    if (index === -1 || index === this.clampedIndex) {
      return;
    }
    this.activate(index);
  }

  private activate(index: number): void {
    this.activeIndex = index;
    this.furthestIndex = Math.max(this.furthestIndex, index);
    this.activeIndexChange.emit(index);
    this.applyActive();
  }

  /** Roving-tabindex header navigation, same automatic-activation model `ino-tabs` uses
   *  (SPEC.md §1), constrained to reachable steps only — an unreached step in linear mode is
   *  skipped by arrow navigation exactly as a disabled step is. */
  protected onKeydown(event: KeyboardEvent, step: InoStepComponent): void {
    const reachable = this.steps.filter((s) => this.isReachable(s));
    if (!reachable.length) {
      return;
    }
    const currentIndex = reachable.indexOf(step);
    let nextIndex: number | null = null;

    const isNext = this.orientation === 'horizontal' ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
    const isPrev = this.orientation === 'horizontal' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';

    if (isNext) {
      nextIndex = (currentIndex + 1) % reachable.length;
    } else if (isPrev) {
      nextIndex = (currentIndex - 1 + reachable.length) % reachable.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = reachable.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const target = reachable[nextIndex];
    this.select(target);
    queueMicrotask(() => document.getElementById(target.headerId)?.focus());
  }

  private get clampedIndex(): number {
    if (!this.steps.length) {
      return 0;
    }
    return Math.min(Math.max(0, this.activeIndex), this.steps.length - 1);
  }

  private syncSteps(): void {
    this.steps = this.stepQuery.toArray();
    this.furthestIndex = Math.max(this.furthestIndex, this.clampedIndex);
    this.applyActive();
  }

  private applyActive(): void {
    const activeIndex = this.clampedIndex;
    this.steps.forEach((step, index) => {
      step.active = index === activeIndex;
      step.completed = index < this.furthestIndex;
    });
    this.cdr.markForCheck();
  }
}
