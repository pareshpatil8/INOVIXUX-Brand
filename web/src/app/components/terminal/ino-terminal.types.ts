/**
 * One scrollback entry. `input` lines are command echoes (rendered with the prompt);
 * `system` lines are the welcome banner; `output`/`error` are whatever the consumer
 * appends via `writeOutput()`.
 */
export interface InoTerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

/** Fixed scrollback block-size (doc 26 §5 row: "fixed-height scales"). */
export type InoTerminalSize = 'sm' | 'md' | 'lg';
