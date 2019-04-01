import { Table } from '@5qtrs/table';
import { IText, Text } from '@5qtrs/text';
import { EOL } from 'os';
import { Readable, Writable } from 'stream';
import TTY from 'tty';

// ------------------
// Internal Constants
// ------------------

const defaultOutputWidth: number = 80;
const controlCKey = '\u0003';
const backspaceKey = 127;
const returnKey = '\r';
const maskCharacter = '•';
const affirmKeys = ['y', 'Y'];
const denyKeys = ['n', 'N'];
const allowedKeys = affirmKeys.slice().concat(denyKeys);

// -------------------
// Exported Interfaces
// -------------------

export interface IPromptOptions {
  prompt: IText;
  placeholder?: IText;
  mask?: boolean;
  singleKeys?: string[];
  required?: boolean;
  yesNo?: boolean;
}

export interface ICommandIO {
  outputWidth: number;
  enableStyle: boolean;
  write: (text?: IText) => Promise<void>;
  writeLine: (text?: IText) => Promise<void>;
  prompt: (options: IPromptOptions) => Promise<string>;
  spin: (enabled: boolean) => void;
}

export interface ICommandOptions {
  output?: Writable;
  input?: Readable;
  outputWidth?: number;
  enableStyle?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class CommandIO implements ICommandIO {
  public get outputWidth() {
    return this.outputWidthProp;
  }

  public get enableStyle() {
    return this.enableStyleProp;
  }

  public static async create(options?: ICommandOptions) {
    options = options || {};
    const output = options.output || process.stdout;
    const input = options.input || process.stdin;
    const outputWidth = options.outputWidth || defaultOutputWidth;
    let enableStyle = false;
    if (options.enableStyle === undefined) {
      const outputTTY = output as TTY.WriteStream;
      enableStyle = outputTTY.isTTY === true;
    }

    return new CommandIO(output, input, outputWidth, enableStyle);
  }
  private spinnerTimeout?: NodeJS.Timeout;
  private spinner: boolean;
  private output: Writable;
  private input: Readable;
  private outputWidthProp: number;
  private enableStyleProp: boolean;

  private constructor(output: Writable, input: Readable, outputWidth: number, enableStyle: boolean) {
    this.output = output;
    this.input = input;
    this.outputWidthProp = outputWidth;
    this.enableStyleProp = enableStyle;
    this.spinner = false;
  }

  public async write(text?: IText) {
    this.spinner = false;
    if (this.spinnerTimeout) {
      clearTimeout(this.spinnerTimeout);
    }
    if (text) {
      if (text.length > this.outputWidth) {
        const asText = text instanceof Text ? text : Text.create(text);
        const wrapped = asText.wrap(this.outputWidth);
        text = Text.join(wrapped, EOL);
      }
      this.output.write(text.toString(this.enableStyle));
    }
  }

  public async writeLine(text?: IText) {
    this.write(text);
    this.output.write(EOL);
  }

  public async prompt(options: IPromptOptions): Promise<string> {
    this.spinner = false;
    if (options.yesNo) {
      options.required = true;
      options.singleKeys = allowedKeys;
      options.placeholder = 'Y/N';
    }
    if (this.spinnerTimeout) {
      clearTimeout(this.spinnerTimeout);
    }
    return new Promise(async (resolve, reject) => {
      this.setRawMode(true);
      this.input.setEncoding('utf8');

      const prompt = options.prompt instanceof Text ? options.prompt : Text.blue(options.prompt);
      await this.write(prompt.toString(this.enableStyle) + ' ');
      if (options.placeholder) {
        const placeholder = options.placeholder instanceof Text ? options.placeholder : Text.dim(options.placeholder);
        await this.write(placeholder.toString(this.enableStyle));
      }
      await this.writeIfTTY(EOL);
      this.moveCursor(prompt.length + 1, -1);

      let value = '';
      const listener = async (key: string) => {
        const done = (shouldExit: boolean) => {
          this.write(EOL);
          this.write(EOL);
          this.setRawMode(false);
          this.input.removeListener('data', listener);
          if (shouldExit) {
            process.exit();
          } else {
            let finalValue = value.toString();
            if (options.yesNo) {
              finalValue = affirmKeys.indexOf(finalValue) === -1 ? '' : 'Y';
            }
            resolve(finalValue);
          }
        };

        const keyCode = key.charCodeAt(0);
        if (keyCode === backspaceKey) {
          if (value.length) {
            value = value.substring(0, value.length - 1);
            this.moveCursor(-1, 0);
            this.clearLine(1);
            if (!value.length && options.placeholder) {
              await this.write(options.placeholder.toString(this.enableStyle));
              this.moveCursor(-options.placeholder.length, 0);
            }
          }
        } else if (key === controlCKey) {
          done(true);
        } else if (key === returnKey) {
          if (value.length || !options.required) {
            done(false);
          }
        } else if (keyCode >= 32 && keyCode < 127) {
          if (options.singleKeys) {
            if (options.singleKeys.indexOf(key) !== -1) {
              value += key;
              this.clearLine(1);
              await this.write(options.mask ? maskCharacter : key);
              done(false);
            }
          } else {
            value += key;
            this.clearLine(1);
            await this.write(options.mask ? maskCharacter : key);
          }
        }
      };
      this.input.on('data', listener);
    });
  }

  public spin(enabled: boolean) {
    const output = this.output as TTY.WriteStream;
    if (output && output.isTTY) {
      this.spinner = enabled;
      if (this.spinner) {
        let count = 1;
        let firstSpin = true;
        const animation = () => {
          if (this.spinner) {
            if (firstSpin) {
              firstSpin = false;
            } else {
              this.moveCursor(0, -2);
            }
            this.clearLine(0);
            for (let i = 0; i < count; i++) {
              this.output.write(Text.dim('•').toString());
            }
            this.output.write(EOL);
            this.output.write(EOL);
            count++;
            if (count >= 10) {
              count = 1;
            }
            this.spinnerTimeout = setTimeout(animation, 500);
          }
        };

        this.spinnerTimeout = setTimeout(animation, 1000 * 2);
      }
    }
  }

  private setRawMode(enabled: boolean) {
    const input = this.input as TTY.ReadStream;
    if (input && input.isTTY) {
      input.setRawMode(enabled);
      input.resume();
    }
  }

  private moveCursor(x: number, y: number) {
    const output = this.output as TTY.WriteStream;
    if (output && output.isTTY) {
      // @ts-ignore;
      output.moveCursor(x, y);
    }
  }

  private clearLine(mode: number) {
    const output = this.output as TTY.WriteStream;
    if (output && output.isTTY) {
      // @ts-ignore
      output.clearLine(mode);
    }
  }

  private writeIfTTY(text?: IText) {
    const output = this.output as TTY.WriteStream;
    if (output && output.isTTY) {
      this.write(text);
    }
  }
}
