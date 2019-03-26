import { CellOverflow, Table } from '@5qtrs/table';
import { IText, Text } from '@5qtrs/text';
import { ICommandIO } from './CommandIO';

// ------------------
// Internal Constants
// ------------------

const defaultConsoleWidth = 80;

// -------------------
// Exported Interfaces
// -------------------

export enum MessageKind {
  error = 'error',
  warning = 'warning',
  info = 'info',
  result = 'result',
}

export interface IMessageInput {
  kind?: MessageKind;
  header?: IText;
  message: IText;
}

// ----------------
// Exported Classes
// ----------------

export class Message {
  public static async create(input: IMessageInput) {
    return new Message(input);
  }
  private kind: MessageKind;
  private header: IText;
  private message: IText;

  private constructor(input: IMessageInput) {
    this.kind = input.kind !== undefined ? input.kind : MessageKind.result;
    this.header = input.header || '';
    this.message = input.message;
  }

  public async write(io: ICommandIO) {
    const header = await this.getHeaderText();
    const columns: any = [{ min: 17, max: 17 }, { flexShrink: 1, flexGrow: 1 }];
    if (!header.length) {
      columns.shift();
    }

    const table = await Table.create({
      width: io.outputWidth || defaultConsoleWidth,
      count: columns.length,
      gutter: Text.dim('  │  '),
      columns,
    });

    const row = header.length ? [header, this.message] : [this.message];
    table.addRow(row);
    io.writeLine(table.toText());
    io.writeLine();
  }

  public toString() {
    return this.header ? `${this.header}: ${this.message}` : this.message.toString();
  }

  private async getHeaderText() {
    if (this.header instanceof Text) {
      return this.header;
    }
    switch (this.kind) {
      case MessageKind.error:
        return Text.red(this.header);
      case MessageKind.info:
        return Text.blue(this.header);
      case MessageKind.result:
        return Text.green(this.header);
      default:
        return Text.yellow(this.header);
    }
  }
}
