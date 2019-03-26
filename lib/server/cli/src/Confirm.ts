import { CellAlignment, Table } from '@5qtrs/table';
import { IText, Text } from '@5qtrs/text';
import { ICommandIO } from './CommandIO';

// ------------------
// Internal Constants
// ------------------

const defaultConsoleWidth = 80;

// -------------------
// Exported Interfaces
// -------------------

export interface IConfirmDetail {
  name: IText;
  value: IText;
}

export interface IConfirmInput {
  header?: IText;
  details?: IConfirmDetail[];
}

// ----------------
// Exported Classes
// ----------------

export class Confirm {
  public static async create(input: IConfirmInput) {
    return new Confirm(input);
  }

  private header: IText;
  private details: IConfirmDetail[];

  private constructor(input: IConfirmInput) {
    this.header = input.header || '';
    this.details = input.details ? input.details.slice() : [];
  }

  public async prompt(io: ICommandIO) {
    if (this.header) {
      const header = this.header instanceof Text ? this.header : Text.blue(this.header);
      await io.writeLine(header);
      await io.writeLine();
    }

    if (this.details && this.details.length) {
      const columns: any = [{ min: 0, max: 0 }, { flexShrink: 0, flexGrow: 0 }, { flexShrink: 1, flexGrow: 1 }];
      const table = await Table.create({
        width: io.outputWidth || defaultConsoleWidth,
        count: 3,
        gutter: 3,
        columns,
      });
      for (const detail of this.details) {
        const name = detail.name instanceof Text ? detail.name : Text.create(detail.name);
        const value = detail.value instanceof Text ? detail.value : Text.bold(detail.value);
        table.addRow(['', name, value]);
      }
      await io.writeLine(table.toText());
      await io.writeLine();
    }

    const promptOptions = { prompt: 'Confirm:', yesNo: true };
    const result = await io.prompt(promptOptions);
    return result.length > 0;
  }

  public toString() {
    const details = this.details.map(detail => `${detail.name}=${detail.value}`);
    return `${this.header} ${details.join()}`;
  }
}
