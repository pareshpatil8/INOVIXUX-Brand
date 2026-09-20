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
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { InoControlSize } from '../control-size';
import { InoStepComponent } from './ino-step.component';

/**
 * `<ino-stepper>` — a wizard-style step navigator driven by content-projected `<ino-step>`
 * children, reusing the tablist/tab/tabpanel interaction model `<ino-tabs>` already implements
 * (roving tabindex, one visible panel, click/Enter/Space to activate) — see SPEC.md §7 for why
 * that pattern was reused rather than inventing an ARIA "stepper" role, which the APG does not
 * define. What's new relative to `ino-tabs`: a numbered/checkmark step indicator, a connector
 * line between steps, `orientation` (horizontal/vertical), and `linear` gating.
 *
 * `linear` (default `true`, matching the KYB onboarding flow this issue serves): a step can only
 * be activated once every step before it has `completed` set. This is the "validation gating
 * between steps" the issue calls out — the stepper itself never validates anything; it only reads
 * the `completed` flag the consumer's form sets once its own validation passes (`ino-step`'s doc
 * comment). Set `linear = false` for free navigation between any non-disabled step, matching
 * `ino-tabs`'s default behaviour exactly.
 *
 * Controlled/uncontrolled follows the same "bind `[activeId]` for controlled, omit it for
 * uncontrolled" split as `ino-tabs`.
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
  @Input() activeId?: string;
  @Input() size: InoControlSize = 'default';
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input({ transform: booleanAttribute }) linear = true;
  @Input({ transform: booleanAttribute }) readonly = false;

  @Output() activeIdChange = new EventEmitter<string>();

  @ContentChildren(InoStepComponent) private stepsQuery!: QueryList<InoStepComponent>;
  @ViewChild('track') private trackRef?: ElementRef<HTMLElement>;

  protected steps: InoStepComponent[] = [];
  private internalActiveId?: string;
  private stepsSub?: Subscription;

  /** OnPush + `@ContentChildren.changes` fires outside any template event, same reason
   *  `ino-tabs` needs this — without it, a projected step added/removed after the initial render
   *  would resync `steps` without repainting. */
  private readonly cdr = inject(ChangeDetectorRef);

  private get isControlled(): boolean {
    return this.activeId !== undefined;
  }

  protected get currentActiveId(): string | undefined {
    return this.isControlled ? this.activeId : this.internalActiveId;
  }

  ngAfterContentInit(): void {
    this.syncSteps();
    this.stepsSub = this.stepsQuery.changes.subscribe(() => this.syncSteps());
  }

  ngOnDestroy(): void {
    this.stepsSub?.unsubscribe();
  }

  private syncSteps(): void {
    this.steps = this.stepsQuery.toArray();
    if (!this.isControlled && (!this.internalActiveId || !this.steps.some(s => s.id === this.internalActiveId))) {
      this.internalActiveId = this.steps.find(s => !s.disabled)?.id;
    }
    this.applyActiveState();
    this.cdr.markForCheck();
  }

  private applyActiveState(): void {
    const active = this.currentActiveId;
    for (const step of this.steps) {
      step.setActive(step.id === active);
    }
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
    if (step.disabled || this.readonly || step.id === this.currentActiveId || !this.isReachable(index)) {
      return;
    }
    if (!this.isControlled) {
      this.internalActiveId = step.id;
      this.applyActiveState();
    }
    this.activeIdChange.emit(step.id);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const enabled = this.steps
      .map((step, i) => ({ step, i }))
      .filter(({ step }) => !step.disabled);
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
        targetIndex = this.nextEnabledIndex(index, rtl ? -1 : 1, enabled.map(e => e.i));
        break;
      case backwardKey:
        targetIndex = this.nextEnabledIndex(index, rtl ? 1 : -1, enabled.map(e => e.i));
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
