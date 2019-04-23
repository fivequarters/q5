import { Command, IExecuteInput, Message, MessageKind, ArgType } from '@5qtrs/cli';
import { FusebitOpsCore, IFusebitOpsDomain } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';
import { Table, CellAlignment } from '@5qtrs/table';

// ----------------
// Exported Classes
// ----------------

export class GetDomainCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    return new GetDomainCommand(core);
  }

  private constructor(core: FusebitOpsCore) {
    super({
      name: 'Get Domain',
      cmd: 'get',
      summary: 'Gets a domain',
      description: 'Retrieve the details of a given domain in the Fusebit platform.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the domain',
        },
      ],
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

  private async getDomain(name: string, input: IExecuteInput) {
    let domain;
    try {
      if (!input.options.quiet) {
        const message = await Message.create({
          header: 'Getting Domain',
          message: 'Retrieving the details of the domain in the Flex platform...',
          kind: MessageKind.info,
        });
        await message.write(input.io);
        input.io.spin(true);
      }
      domain = await this.core.getDomain(name);
    } catch (error) {
      const message = await Message.create({
        header: 'Get Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to get the domain in the Fusebit platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return undefined;
    }

    if (domain === undefined) {
      const message = await Message.create({
        header: 'No Domain',
        message: Text.create("There is no '", Text.bold(name), "' domain in the Fusebit platform."),
        kind: MessageKind.error,
      });
      await message.write(input.io);
    }

    return domain;
  }

  private async displayDomain(domain: IFusebitOpsDomain, input: IExecuteInput) {
    if (input.options.format === 'json') {
      input.io.writeLine(JSON.stringify(domain, null, 2));
    } else {
      const table = await Table.create({
        width: input.io.outputWidth,
        count: 2,
        gutter: 3,
        columns: [{ flexGrow: 0, flexShrink: 0 }, { flexGrow: 1 }],
      });
      table.setRowConstraint({ cells: [{ align: CellAlignment.right }] });
      table.addRow([Text.blue('Domain Name'), domain.name]);
      table.addRow(['', '']);
      table.addRow([Text.blue('AWS Account'), domain.account]);
      table.addRow(['', '']);
      if (domain.nameServers && domain.nameServers.length) {
        table.addRow([Text.blue('Name Servers'), domain.nameServers.join(' ')]);
      }
      input.io.writeLine(table.toText());
    }

    input.io.writeLine();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const name = input.arguments[0] as string;

    const domain = await this.getDomain(name, input);
    if (domain === undefined) {
      return 1;
    }

    await this.displayDomain(domain, input);
    return 0;
  }
}
