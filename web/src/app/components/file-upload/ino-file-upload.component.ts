import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  booleanAttribute,
  numberAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoControlSize } from '../control-size';
import { InoLabelComponent } from '../label/ino-label.component';

export type InoFileUploadMode = 'basic' | 'advanced';
export type InoFileUploadItemStatus = 'idle' | 'uploading' | 'success' | 'error';
export type InoFileUploadRejectionReason = 'accept' | 'size' | 'maxFiles';

export interface InoFileUploadItem {
  id: string;
  file: File;
  status: InoFileUploadItemStatus;
  /** 0-100, only meaningful while `status === 'uploading'`. */
  progress?: number;
  /** Shown when `status === 'error'`. */
  error?: string;
}

export interface InoFileUploadRejection {
  file: File;
  reason: InoFileUploadRejectionReason;
  message: string;
}

let idCounter = 0;
let itemIdCounter = 0;

/**
 * `<ino-file-upload>` — labeled multi-file picker (INO-145, INO-31 T-5, File group). KYB is a
 * document-intake product, so this is scoped as a functional blocker, not polish: basic mode
 * (single "Choose" affordance, PrimeNG `FileUpload` "basic" benchmark) and advanced mode
 * (dropzone + per-file list with progress/preview/cancel/retry, PrimeNG "advanced" benchmark).
 *
 * **Controlled, not stateful.** `@Input() items` / `@Output() itemsChange` (array form of this
 * repo's `value`/`valueChange` banana-in-a-box convention — see `ino-input`'s doc comment) — the
 * host owns the canonical item list, including `status`/`progress`/`error`, because only the host
 * knows how the actual upload transport works (XHR, `fetch`, a resumable protocol, …). This
 * component never performs a network request itself: `(upload)` emits the newly accepted items as
 * an *intent*, `(cancel)`/`(retry)` emit per-item intents, and the host pushes updated `items` back
 * in as the real upload progresses. See SPEC.md §1.
 *
 * **Validation runs before an item is ever created.** `accept` (comma-separated MIME types/
 * extensions, same grammar as the native `accept` attribute) and `maxFileSize`/`maxFiles` are
 * checked client-side the moment files are chosen or dropped; rejected files never become
 * `InoFileUploadItem`s — they surface via `(rejected)` and an inline `role="alert"` list (DoD row
 * 8's "accessible error reporting"), so a screen reader hears exactly which file failed and why.
 *
 * **`readonly` keeps the native `<input type="file">` focusable** (matching `ino-input`/
 * `ino-select`'s "readonly never means `disabled`" rule) even though the DOM has no native
 * `readonly` semantic for file inputs — a `(click)` guard on the input itself blocks the OS picker
 * dialog from opening while leaving the control in the tab order and the existing item list
 * visible (read-only document review, not blocked-from-review). See SPEC.md §2.
 *
 * **`captureMode`** sets the native `capture` attribute (`'user' | 'environment'`) on the hidden
 * file input — this is what gives mobile browsers/webviews (including Capacitor's, since it is not
 * a port, SPEC.md §9) a direct camera affordance with zero additional native dependency, rather
 * than reaching for a Capacitor camera plugin this issue would otherwise have to flag as a new
 * vendor addition.
 */
@Component({
  selector: 'ino-file-upload',
  standalone: true,
  imports: [CommonModule, InoLabelComponent],
  templateUrl: './ino-file-upload.component.html',
  styleUrl: './ino-file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ino-file-upload',
    '[attr.data-size]': 'size',
    '[class.ino-file-upload--basic]': "mode === 'basic'",
    '[class.ino-file-upload--dragover]': 'dragover',
    '[class.ino-file-upload--loading]': 'loading',
    '[attr.aria-busy]': 'loading || null',
  },
})
export class InoFileUploadComponent implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() mode: InoFileUploadMode = 'advanced';
  @Input({ transform: booleanAttribute }) multiple = false;
  /** Native `accept` grammar: comma-separated MIME types (`image/png`), wildcards (`image/*`), or
   *  extensions (`.pdf`). Empty string accepts everything. */
  @Input() accept = '';
  /** Bytes. `0` (default) means unlimited. */
  @Input({ transform: numberAttribute }) maxFileSize = 0;
  /** `0` (default) means unlimited. Counted against `items.length` at the moment new files land. */
  @Input({ transform: numberAttribute }) maxFiles = 0;
  @Input() items: InoFileUploadItem[] = [];
  @Input() hint = '';
  @Input() error = '';
  @Input() size: InoControlSize = 'default';
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) loading = false;
  /** Advanced mode only — disables the drop target without removing the "Choose" affordance. */
  @Input({ transform: booleanAttribute }) dragDrop = true;
  @Input() chooseLabel = 'Choose files';
  @Input() dropHint = 'or drag and drop files here';
  /** Sets the native `capture` attribute — mobile-only camera affordance, no plugin required. */
  @Input() captureMode: 'user' | 'environment' | '' = '';

  @Output() readonly itemsChange = new EventEmitter<InoFileUploadItem[]>();
  /** Newly accepted files the host should start uploading. */
  @Output() readonly upload = new EventEmitter<InoFileUploadItem[]>();
  @Output() readonly cancel = new EventEmitter<InoFileUploadItem>();
  @Output() readonly retry = new EventEmitter<InoFileUploadItem>();
  @Output() readonly remove = new EventEmitter<InoFileUploadItem>();
  @Output() readonly rejected = new EventEmitter<InoFileUploadRejection[]>();

  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  protected readonly uploadId = `ino-file-upload-${++idCounter}`;
  protected readonly hintId = `${this.uploadId}-hint`;
  protected readonly errorId = `${this.uploadId}-error`;
  protected readonly rejectionsId = `${this.uploadId}-rejections`;

  protected dragover = false;
  protected rejections: InoFileUploadRejection[] = [];

  private readonly previewUrls = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.pruneStalePreviewUrls();
    }
  }

  ngOnDestroy(): void {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  protected get describedBy(): string | null {
    const ids = [
      this.error ? this.errorId : this.hint ? this.hintId : null,
      this.rejections.length ? this.rejectionsId : null,
    ].filter((id): id is string => !!id);
    return ids.length ? ids.join(' ') : null;
  }

  protected get singleFileName(): string | null {
    return this.items[0]?.file.name ?? null;
  }

  protected previewUrl(item: InoFileUploadItem): string | null {
    if (!item.file.type.startsWith('image/')) {
      return null;
    }
    let url = this.previewUrls.get(item.id);
    if (!url) {
      url = URL.createObjectURL(item.file);
      this.previewUrls.set(item.id, url);
    }
    return url;
  }

  private pruneStalePreviewUrls(): void {
    const liveIds = new Set(this.items.map((item) => item.id));
    for (const [id, url] of this.previewUrls) {
      if (!liveIds.has(id)) {
        URL.revokeObjectURL(url);
        this.previewUrls.delete(id);
      }
    }
  }

  // ── Choosing ────────────────────────────────────────────────────────────────────────────────

  /** Blocks the OS picker while leaving the input focusable — see the class doc comment on why
   *  `readonly` can't use the native `readonly` attribute here. */
  onInputClick(event: Event): void {
    if (this.readonly || this.loading) {
      event.preventDefault();
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  // ── Drag and drop (advanced mode only) ─────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    if (!this.canAcceptDrop()) {
      return;
    }
    event.preventDefault();
    this.dragover = true;
  }

  onDragLeave(): void {
    this.dragover = false;
  }

  onDrop(event: DragEvent): void {
    if (!this.canAcceptDrop()) {
      return;
    }
    event.preventDefault();
    this.dragover = false;
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  private canAcceptDrop(): boolean {
    return this.mode === 'advanced' && this.dragDrop && !this.disabled && !this.readonly && !this.loading;
  }

  // ── Validation + add ────────────────────────────────────────────────────────────────────────

  private addFiles(fileList: FileList | null): void {
    if (!fileList?.length || this.disabled || this.readonly || this.loading) {
      return;
    }

    const incoming = this.multiple ? Array.from(fileList) : [fileList[0]];
    const accepted: InoFileUploadItem[] = [];
    const rejections: InoFileUploadRejection[] = [];
    let count = this.multiple ? this.items.length : 0;

    for (const file of incoming) {
      if (this.maxFiles > 0 && count >= this.maxFiles) {
        rejections.push({
          file,
          reason: 'maxFiles',
          message: `Only ${this.maxFiles} file${this.maxFiles === 1 ? '' : 's'} allowed.`,
        });
        continue;
      }
      if (!this.matchesAccept(file)) {
        rejections.push({ file, reason: 'accept', message: `${file.name} is not an accepted file type.` });
        continue;
      }
      if (this.maxFileSize > 0 && file.size > this.maxFileSize) {
        rejections.push({
          file,
          reason: 'size',
          message: `${file.name} exceeds the ${formatBytes(this.maxFileSize)} limit.`,
        });
        continue;
      }
      accepted.push({ id: `ino-file-upload-item-${++itemIdCounter}`, file, status: 'idle' });
      count++;
    }

    this.rejections = rejections;
    if (rejections.length) {
      this.rejected.emit(rejections);
    }
    if (accepted.length) {
      const nextItems = this.multiple ? [...this.items, ...accepted] : accepted;
      this.items = nextItems;
      this.itemsChange.emit(nextItems);
      this.upload.emit(accepted);
    }
  }

  private matchesAccept(file: File): boolean {
    const rules = this.accept
      .split(',')
      .map((rule) => rule.trim().toLowerCase())
      .filter(Boolean);
    if (!rules.length) {
      return true;
    }
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    return rules.some((rule) => {
      if (rule.startsWith('.')) {
        return name.endsWith(rule);
      }
      if (rule.endsWith('/*')) {
        return type.startsWith(rule.slice(0, -1));
      }
      return type === rule;
    });
  }

  // ── Item actions ────────────────────────────────────────────────────────────────────────────

  removeItem(item: InoFileUploadItem): void {
    if (this.disabled || this.readonly) {
      return;
    }
    const next = this.items.filter((candidate) => candidate.id !== item.id);
    this.items = next;
    this.itemsChange.emit(next);
    this.remove.emit(item);
  }

  cancelItem(item: InoFileUploadItem): void {
    this.cancel.emit(item);
  }

  retryItem(item: InoFileUploadItem): void {
    this.retry.emit(item);
  }

  dismissRejections(): void {
    this.rejections = [];
  }

  protected formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}
