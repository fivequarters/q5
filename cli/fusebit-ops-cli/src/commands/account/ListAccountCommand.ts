import { Command, IExecuteInput, Message, MessageKind, ArgType } from '@5qtrs/cli';
import { FusebitOpsCore, IFusebitOpsAccount } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

// ----------------
// Exported Classes
// ----------------

export class ListAccountCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    return new ListAccountCommand(core);
  }

  private constructor(core: FusebitOpsCore) {
    super({
      name: 'List Accounts',
      cmd: 'ls',
      summary: 'Lists accounts',
      description: 'Lists the accounts in the Fusebit platform.',
      options: [
        {
          name: 'quiet',
          aliases: ['q'],
          description: 'Only write the result to stdout',
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'format',
          aliases: ['f'],
          description: "The format to display the output: 'table', 'json'",
          default: 'table',
        },
      ],
    });
    this.core = core;
  }

  private async listAccounts(input: IExecuteInput) {
    let accounts = [];
    try {
      if (!input.options.quiet) {
        const message = await Message.create({
          header: 'Listing Accounts',
          message: 'Fetching a list of accounts in the Flex platform...',
          kind: MessageKind.info,
        });
        await message.write(input.io);
        input.io.spin(true);
      }
      accounts = await this.core.listAccounts();
    } catch (error) {
      const message = await Message.create({
        header: 'List Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to list the accounts in the Fusebit platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return undefined;
    }
    return accounts;
  }

  private async noAccounts(input: IExecuteInput) {
    const message = await Message.create({
      header: 'No Accounts',
      message: 'There are currently no accounts in the Fusebit platform.',
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async displayAccounts(accounts: IFusebitOpsAccount[], input: IExecuteInput) {
    if (input.options.format === 'json') {
      input.io.writeLine(JSON.stringify(accounts, null, 2));
    } else {
      const table = await Table.create({
        width: input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
      });

      table.addRow([Text.blue('Account Name'), Text.blue('AWS Account Id & Role')]);
      for (const account of accounts) {
        table.addRow(['', '']);
        const details = Text.create(account.id, Text.dim(' • '), account.role);
        table.addRow([account.name, details]);
      }
      input.io.writeLine(table.toText());
    }

    input.io.writeLine();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const accounts = await this.listAccounts(input);
    if (accounts === undefined) {
      return 1;
    }

    if (!accounts.length) {
      await this.noAccounts(input);
    } else {
      await this.displayAccounts(accounts, input);
    }

    return 0;
  }
}
