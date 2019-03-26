import { Command, IExecuteInput, Message, MessageKind, ArgType } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsNetwork } from '@5qtrs/flexd-ops-core';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

// ----------------
// Exported Classes
// ----------------

export class ListNetworkCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new ListNetworkCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'List Networks',
      cmd: 'ls',
      summary: 'Lists networks',
      description: 'Lists the networks in the Flexd platform.',
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

  private async listNetworks(input: IExecuteInput) {
    let networks = [];
    try {
      if (!input.options.quiet) {
        const message = await Message.create({
          header: 'Listing Networks',
          message: 'Fetching a list of networks in the Flex platform...',
          kind: MessageKind.info,
        });
        await message.write(input.io);
        input.io.spin(true);
      }
      networks = await this.core.listNetworks();
    } catch (error) {
      const message = await Message.create({
        header: 'List Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to list the networks in the Flexd platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return undefined;
    }
    return networks;
  }

  private async noNetworks(input: IExecuteInput) {
    const message = await Message.create({
      header: 'No Networks',
      message: 'There are currently no networks in the Flexd platform.',
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async displayNetworks(networks: IFlexdOpsNetwork[], input: IExecuteInput) {
    if (input.options.format === 'json') {
      input.io.writeLine(JSON.stringify(networks, null, 2));
    } else {
      const table = await Table.create({
        width: input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
      });

      table.addRow([Text.blue('Network Name'), Text.blue('Account & Region')]);
      for (const network of networks) {
        table.addRow(['', '']);
        const details = Text.create(network.account, Text.dim(' • '), network.region);
        table.addRow([network.name, details]);
      }
      input.io.writeLine(table.toText());
    }

    input.io.writeLine();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const networks = await this.listNetworks(input);
    if (networks === undefined) {
      return 1;
    }

    if (!networks.length) {
      await this.noNetworks(input);
    } else {
      await this.displayNetworks(networks, input);
    }

    return 0;
  }
}
