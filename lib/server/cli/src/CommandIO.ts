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
const returnKey = '\r';
const maskCharacter = '•';

// -------------------
// Exported Interfaces
// -------------------

export interface ICommandIO {
  outputWidth?: number;
  enableStyle?: boolean;
  write: (text?: IText) => Promise<void>;
  writeLine: (text?: IText) => Promise<void>;
  prompt: (prompt: IText, placeholder?: IText, mask?: boolean) => Promise<string>;
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
  private output: Writable;
  private input: Readable;
  private outputWidthProp: number;
  private enableStyleProp: boolean;

  private constructor(output: Writable, input: Readable, outputWidth: number, enableStyle: boolean) {
    this.output = output;
    this.input = input;
    this.outputWidthProp = outputWidth;
    this.enableStyleProp = enableStyle;
  }

  public async write(text?: IText) {
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

  public async prompt(prompt: IText, placeholder?: IText, mask?: boolean): Promise<string> {
    return new Promise(async (resolve, reject) => {
      this.setRawMode(true);
      this.input.setEncoding('utf8');

      await this.write(EOL);
      await this.write(prompt.toString(this.enableStyle) + ' ');
      if (placeholder) {
        await this.write(placeholder.toString(this.enableStyle));
      }
      await this.writeIfTTY(EOL);
      this.moveCursor(prompt.length + 1, -1);

      let value = '';
      this.input.on('data', async (key: string) => {
        if (key === controlCKey || key === returnKey) {
          this.write(EOL);
          this.write(EOL);
          this.setRawMode(false);
          if (key === controlCKey) {
            process.exit();
          } else {
            resolve(value.toString());
          }
        } else {
          value += key;
          this.clearLine(1);
          await this.write(mask ? maskCharacter : key);
        }
      });
    });
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

  private writeIfTTY(text?: string) {
    const output = this.output as TTY.WriteStream;
    if (output && output.isTTY) {
      this.write(text);
    }
  }
}
