import { Command, IExecuteInput, Message, MessageKind, ArgType } from '@5qtrs/cli';
import { FusebitOpsCore, IFusebitOpsDomain } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

// ----------------
// Exported Classes
// ----------------

export class ListDomainCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    return new ListDomainCommand(core);
  }

  private constructor(core: FusebitOpsCore) {
    super({
      name: 'List Domains',
      cmd: 'ls',
      summary: 'Lists domains',
      description: 'Lists the domains in the Fusebit platform.',
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

  private async listDomains(input: IExecuteInput) {
    let domains = [];
    try {
      if (!input.options.quiet) {
        const message = await Message.create({
          header: 'Listing Domains',
          message: 'Fetching a list of domains in the Fusebit platform...',
          kind: MessageKind.info,
        });
        await message.write(input.io);
        input.io.spin(true);
      }
      domains = await this.core.listDomains();
    } catch (error) {
      const message = await Message.create({
        header: 'List Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to list the domains in the Fusebit platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return undefined;
    }
    return domains;
  }

  private async noDomains(input: IExecuteInput) {
    const message = await Message.create({
      header: 'No Domains',
      message: 'There are currently no domains in the Fusebit platform.',
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async displayDomains(domains: IFusebitOpsDomain[], input: IExecuteInput) {
    if (input.options.format === 'json') {
      input.io.writeLine(JSON.stringify(domains, null, 2));
    } else {
      const table = await Table.create({
        width: input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexGrow: 0, min: 20 }, { flexGrow: 0, min: 20 }],
      });
      table.addRow([Text.blue('Domain Name'), Text.blue('AWS Account')]);
      for (const domain of domains) {
        table.addRow([domain.name, domain.account]);
      }
      input.io.writeLine(table.toText());
    }

    input.io.writeLine();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const domains = await this.listDomains(input);
    if (domains === undefined) {
      return 1;
    }

    if (!domains.length) {
      await this.noDomains(input);
    } else {
      await this.displayDomains(domains, input);
    }

    return 0;
  }
}
