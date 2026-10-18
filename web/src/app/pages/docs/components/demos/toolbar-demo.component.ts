import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoToolbarComponent } from '../../../../components/toolbar/ino-toolbar.component';
import { InoButtonComponent } from '../../../../components/button/ino-button.component';

/**
 * Hand-authored toolbar demo for the §2 Component Publish Contract coverage
 * (docs 26 §2). The generic renderer cannot handle slot-based content projection,
 * so toolbar requires a custom demo component.
 */
@Component({
  selector: 'docs-toolbar-demo',
  standalone: true,
  imports: [CommonModule, InoToolbarComponent, InoButtonComponent],
  template: `
    <div class="demo-section">
      <h3 class="demo-heading">Basic Layout (Comfortable)</h3>
      <ino-toolbar ariaLabel="Main toolbar" density="comfortable">
        <div slot="start">
          <button ino-button variant="secondary" size="default">Menu</button>
          <button ino-button variant="ghost" size="default">New</button>
        </div>
        <div slot="center">
          <h2 class="toolbar-title">Page Title</h2>
        </div>
        <div slot="end">
          <button ino-button variant="ghost" size="default">Settings</button>
          <button ino-button variant="primary" size="default">Save</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Dense Mode</h3>
      <ino-toolbar ariaLabel="Dense toolbar" density="dense">
        <div slot="start">
          <button ino-button variant="secondary" size="sm">Back</button>
        </div>
        <div slot="center">
          <h3 class="toolbar-title">Document Editor</h3>
        </div>
        <div slot="end">
          <button ino-button variant="ghost" size="sm">Share</button>
          <button ino-button variant="primary" size="sm">Publish</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Start Slot Only</h3>
      <ino-toolbar ariaLabel="Navigation toolbar" density="comfortable">
        <div slot="start">
          <button ino-button variant="ghost" size="default">Dashboard</button>
          <button ino-button variant="ghost" size="default">Reports</button>
          <button ino-button variant="ghost" size="default">Settings</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">End Slot Only</h3>
      <ino-toolbar ariaLabel="Actions toolbar" density="comfortable">
        <div slot="end">
          <button ino-button variant="ghost" size="default">Help</button>
          <button ino-button variant="secondary" size="default">Log Out</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">All Three Slots</h3>
      <ino-toolbar ariaLabel="Full toolbar" density="comfortable">
        <div slot="start">
          <button ino-button variant="ghost" size="default">☰</button>
          <button ino-button variant="ghost" size="default">←</button>
          <button ino-button variant="ghost" size="default">→</button>
        </div>
        <div slot="center">
          <input type="search" placeholder="Search…" class="toolbar-search" />
        </div>
        <div slot="end">
          <button ino-button variant="ghost" size="default">👤</button>
          <button ino-button variant="ghost" size="default">⚙️</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Keyboard Navigation (Arrow Keys)</h3>
      <p class="demo-note">
        Tab into the toolbar below, then use <kbd>←</kbd> / <kbd>→</kbd> arrow keys to move focus
        between toolbar items. <kbd>Home</kbd> moves to the first item, <kbd>End</kbd> to the last.
      </p>
      <ino-toolbar ariaLabel="Keyboard navigation example" density="comfortable">
        <div slot="start">
          <button ino-button variant="secondary" size="default">First</button>
          <button ino-button variant="secondary" size="default">Second</button>
          <button ino-button variant="secondary" size="default">Third</button>
          <button ino-button variant="secondary" size="default">Fourth</button>
          <button ino-button variant="secondary" size="default">Fifth</button>
        </div>
      </ino-toolbar>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Overflow Scrolling</h3>
      <div style="max-width: 400px">
        <ino-toolbar ariaLabel="Overflow example" density="comfortable">
          <div slot="start">
            <button ino-button variant="ghost" size="default">Item 1</button>
            <button ino-button variant="ghost" size="default">Item 2</button>
            <button ino-button variant="ghost" size="default">Item 3</button>
            <button ino-button variant="ghost" size="default">Item 4</button>
            <button ino-button variant="ghost" size="default">Item 5</button>
            <button ino-button variant="ghost" size="default">Item 6</button>
          </div>
        </ino-toolbar>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-section {
        margin-block-end: var(--ino-spacing-6);
      }

      .demo-heading {
        margin-block-start: 0;
        margin-block-end: var(--ino-spacing-3);
        font-size: var(--ino-font-size-md);
        font-weight: var(--ino-font-weight-semibold);
        color: var(--ino-color-on-surface);
      }

      .demo-note {
        margin-block-end: var(--ino-spacing-3);
        padding: var(--ino-spacing-3);
        background-color: var(--ino-color-surface-sunken);
        border-radius: var(--ino-radius-sm);
        font-size: var(--ino-font-size-sm);
        color: var(--ino-color-on-surface-muted);
      }

      .demo-note kbd {
        padding: 2px 6px;
        background-color: var(--ino-color-surface);
        border: 1px solid var(--ino-color-border);
        border-radius: var(--ino-radius-xs);
        font-family: var(--ino-font-family-mono);
        font-size: 0.9em;
      }

      .toolbar-title {
        margin: 0;
        font-size: var(--ino-font-size-md);
        font-weight: var(--ino-font-weight-semibold);
        color: var(--ino-color-on-surface);
      }

      .toolbar-search {
        padding: var(--ino-spacing-2) var(--ino-spacing-3);
        background-color: var(--ino-color-surface-sunken);
        border: 1px solid var(--ino-color-border);
        border-radius: var(--ino-radius-sm);
        font-family: var(--ino-font-family-base);
        font-size: var(--ino-font-size-sm);
        color: var(--ino-color-on-surface);
        outline: none;
      }

      .toolbar-search:focus {
        border-color: var(--ino-color-accent);
        box-shadow: var(--ino-focus-ring);
      }
    `,
  ],
})
export class ToolbarDemoComponent {}
