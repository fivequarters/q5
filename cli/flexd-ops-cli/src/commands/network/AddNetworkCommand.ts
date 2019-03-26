import { Command, IExecuteInput, Confirm, ArgType, Message, MessageKind } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsNetwork } from '@5qtrs/flexd-ops-core';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

// ----------------
// Exported Classes
// ----------------

export class AddNetworkCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new AddNetworkCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Add Network',
      cmd: 'add',
      summary: 'Add a network',
      description: 'Adds a network to the Flexd platform in the given AWS account and region.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the network',
        },
        {
          name: 'account',
          description: 'The name of the AWS account to create the network in',
        },
        {
          name: 'region',
          description: 'The region code of the AWS region to create the network in',
        },
      ],
      options: [
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the network to the Flexd platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  private async doesNetworkExist(network: IFlexdOpsNetwork, input: IExecuteInput) {
    let networkExists = undefined;
    try {
      const message = await Message.create({
        header: 'Network Check',
        message: 'Determining if the network already exists...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      networkExists = await this.core.networkExists(network);
    } catch (error) {
      const message = await Message.create({
        header: 'Check Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to determine if the network already exists.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return networkExists;
  }

  private async alreadyExists(network: IFlexdOpsNetwork, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Already Exists',
      message: Text.create("The '", Text.bold(network.name), "' network already exists."),
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async confirmNetwork(network: IFlexdOpsNetwork, input: IExecuteInput) {
    const confirm = input.options.confirm as boolean;
    let add = !confirm;
    if (confirm) {
      const confirmPrompt = await Confirm.create({
        header: 'Add the network to the Flexd platform?',
        details: [
          { name: 'Network Name', value: network.name },
          { name: 'Aws Account Name', value: network.account },
          { name: 'Aws Region', value: network.region },
        ],
      });
      add = await confirmPrompt.prompt(input.io);
    }

    return add;
  }

  private async cancelAdd(input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Canceled',
      message: 'Adding the network was canceled.',
      kind: MessageKind.warning,
    });
    await message.write(input.io);
  }

  private async addNetwork(network: IFlexdOpsNetwork, input: IExecuteInput) {
    try {
      const message = await Message.create({
        header: 'Add Network',
        message: 'Adding the network to the Flex platform...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      await this.core.addNetwork(network);
    } catch (error) {
      const message = await Message.create({
        header: 'Add Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to add the network to the Flexd platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return false;
    }
    return true;
  }

  private async addComplete(network: IFlexdOpsNetwork, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Complete',
      message: Text.create("The '", Text.bold(network.name), "' network was successfully added to the Flexd platform."),
      kind: MessageKind.result,
    });
    await message.write(input.io);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, account, region] = input.arguments as string[];
    const network = { name, account, region };

    const networkExists = await this.doesNetworkExist(network, input);
    if (networkExists === undefined) {
      return 1;
    }

    if (networkExists) {
      await this.alreadyExists(network, input);
      return 0;
    }

    const confirmed = await this.confirmNetwork(network, input);

    if (!confirmed) {
      await this.cancelAdd(input);
    } else {
      const platformInstalled = await this.addNetwork(network, input);
      if (!platformInstalled) {
        return 1;
      }

      await this.addComplete(network, input);
    }

    return 0;
  }
}
