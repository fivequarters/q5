import { IExecuteInput } from '@5qtrs/cli';
import { FusebitOpsCore, IFusebitOpsPublishDetails } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

// ----------------
// Exported Classes
// ----------------

export class DisplayService {
  private input: IExecuteInput;

  private constructor(input: IExecuteInput) {
    this.input = input;
  }

  public static async create(core: FusebitOpsCore, input: IExecuteInput) {
    return new DisplayService(input);
  }

  public async displayPublishedApi(items: IFusebitOpsPublishDetails[], showHeader: boolean) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(items, null, 2));
    } else {
      const table = await Table.create({
        width: this.input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
      });

      if (showHeader) {
        table.addRow([Text.blue('Publish Id'), Text.blue('Publish Details')]);
      }
      for (const item of items) {
        table.addRow(['', '']);
        const [date, time] = item.timestamp.toLocaleString().split(',');
        const details = Text.create(
          date.trim(),
          Text.dim(' • '),
          time.trim(),
          Text.dim(' • '),
          Text.italic(item.user),
          Text.eol(),
          Text.dim(item.comment ? Text.create(item.comment).truncate(60)[0] : '<no comment>')
        );
        table.addRow([item.id, details]);
      }
      this.input.io.writeLine(table.toText());
    }

    this.input.io.writeLine();
  }
}
