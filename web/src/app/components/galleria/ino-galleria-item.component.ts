import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ino-galleria-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img [src]="src" [alt]="alt" class="ino-galleria-item__image" />
    <div class="ino-galleria-item__caption" *ngIf="caption">{{ caption }}</div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .ino-galleria-item__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ino-galleria-item__caption {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: var(--ino-space-md);
        font-size: var(--ino-font-size-sm);
      }
    `,
  ],
})
export class InoGalleriaItemComponent {
  @Input() src!: string;
  @Input() alt = '';
  @Input() caption?: string;
}
