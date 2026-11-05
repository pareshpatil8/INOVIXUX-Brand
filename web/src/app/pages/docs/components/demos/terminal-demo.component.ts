import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InoTerminalComponent } from '../../../../components/terminal/ino-terminal.component';

/**
 * Hand-authored terminal demo for the §2 Component Publish Contract coverage
 * (docs 26 §2). Demonstrates command submission, output handling, history recall,
 * busy state, error output, and sizing variants.
 */
@Component({
  selector: 'docs-terminal-demo',
  standalone: true,
  imports: [CommonModule, InoTerminalComponent],
  template: `
    <div class="demo-section">
      <h3 class="demo-heading">Basic Terminal with Welcome Message</h3>
      <p class="demo-note">
        Type commands and press Enter. Use <kbd>↑</kbd>/<kbd>↓</kbd> to recall history.
      </p>
      <ino-terminal
        #terminal1
        ariaLabel="Basic terminal"
        prompt="$ "
        [welcomeMessage]="['Welcome to the demo terminal', 'Type "help", "echo", or "error" for examples.']"
        (commandSubmit)="handleCommand(terminal1, $event)"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Small Scrollback (sm)</h3>
      <p class="demo-note">Fixed block-size: 200px. Good for inline examples.</p>
      <ino-terminal
        #terminal2
        ariaLabel="Small terminal"
        prompt="› "
        size="sm"
        (commandSubmit)="handleCommand(terminal2, $event)"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Large Scrollback (lg)</h3>
      <p class="demo-note">Fixed block-size: 440px. For detailed output.</p>
      <ino-terminal
        #terminal3
        ariaLabel="Large terminal"
        prompt="$ "
        size="lg"
        (commandSubmit)="handleCommand(terminal3, $event)"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Busy State</h3>
      <p class="demo-note">
        Click "Start" to toggle busy. While busy, the input is disabled and shows an
        animated busy row. After 2 seconds, it auto-clears and re-enables input.
      </p>
      <div style="display: flex; gap: var(--ino-space-3); margin-bottom: var(--ino-space-3)">
        <button (click)="toggleBusy(terminal4)">Start Task</button>
        <button (click)="terminal4.clear()">Clear</button>
      </div>
      <ino-terminal
        #terminal4
        ariaLabel="Busy state demo"
        prompt="$ "
        [busy]="busyState"
        [welcomeMessage]="['Task manager demo. Click "Start Task" to begin.']"
        (commandSubmit)="handleCommand(terminal4, $event)"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Readonly Mode</h3>
      <p class="demo-note">
        No input row. Perfect for displaying output-only logs or read-only transcripts.
      </p>
      <ino-terminal
        #terminal5
        ariaLabel="Readonly output"
        prompt="$ "
        readonly
        [welcomeMessage]="[
          '--- Build Log ---',
          'Compiling source files...',
          'Testing components...',
          'Building bundles...',
          'All tasks completed successfully.'
        ]"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Error Output</h3>
      <p class="demo-note">
        Type "fail" to see error lines rendered in the danger-safe text color.
      </p>
      <ino-terminal
        #terminal6
        ariaLabel="Error demo"
        prompt="$ "
        (commandSubmit)="handleCommand(terminal6, $event)"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Disabled State</h3>
      <p class="demo-note">The input is disabled and the widget is dimmed.</p>
      <ino-terminal
        ariaLabel="Disabled terminal"
        prompt="$ "
        disabled
        [welcomeMessage]="['This terminal is disabled.']"
      ></ino-terminal>
    </div>

    <div class="demo-section">
      <h3 class="demo-heading">Comfort Mode (Fluid Density)</h3>
      <p class="demo-note">The input row height follows the global density (shown in fluid here).</p>
      <div data-density="fluid">
        <ino-terminal
          ariaLabel="Fluid density terminal"
          prompt="$ "
          (commandSubmit)="handleCommand(terminal7, $event)"
        ></ino-terminal>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-note {
        font-size: var(--ino-control-font-size);
        color: var(--ino-color-on-surface-muted);
        margin: var(--ino-space-2) 0;
      }

      kbd {
        display: inline-block;
        padding: var(--ino-space-1) var(--ino-space-2);
        background: var(--ino-color-surface);
        border: 1px solid var(--ino-color-border);
        border-radius: var(--ino-radius-sm);
        font-family: var(--ino-font-mono);
        font-size: 0.875em;
      }

      button {
        padding: var(--ino-space-2) var(--ino-space-3);
        background: var(--ino-color-primary);
        color: var(--ino-color-on-primary);
        border: none;
        border-radius: var(--ino-radius-md);
        cursor: pointer;
        font-size: var(--ino-control-font-size);

        &:hover {
          opacity: 0.9;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    `,
  ],
})
export class TerminalDemoComponent {
  busyState = false;

  handleCommand(terminal: InoTerminalComponent, command: string): void {
    if (command === 'help') {
      terminal.writeOutput([
        'Available commands:',
        '  help     - Show this help message',
        '  echo <text> - Echo the text',
        '  error    - Show an error message',
        '  clear    - Clear the terminal',
      ]);
    } else if (command.startsWith('echo ')) {
      const text = command.slice(5);
      terminal.writeOutput(text);
    } else if (command === 'error' || command === 'fail') {
      terminal.writeOutput('An error occurred', 'error');
    } else if (command === 'clear') {
      terminal.clear();
    } else {
      terminal.writeOutput(`command not found: ${command}`, 'error');
    }
  }

  toggleBusy(terminal: InoTerminalComponent): void {
    this.busyState = true;
    terminal.writeOutput('Task started...');
    setTimeout(() => {
      terminal.writeOutput('Task completed.');
      this.busyState = false;
    }, 2000);
  }
}
