import { Command, IExecuteInput, Confirm, ArgType, Message, MessageKind } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsDomain } from '@5qtrs/flexd-ops-core';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

// ----------------
// Exported Classes
// ----------------

export class AddDomainCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new AddDomainCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Add Domain',
      cmd: 'add',
      summary: 'Add a domain',
      description: 'Adds a domain to the Flexd platform in the given AWS account.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the domain',
        },
        {
          name: 'account',
          description: 'The name of the AWS account to create the domain in',
        },
      ],
      options: [
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the domain to the Flexd platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  private async doesDomainExist(domain: IFlexdOpsDomain, input: IExecuteInput) {
    let domainExists = undefined;
    try {
      const message = await Message.create({
        header: 'Domain Check',
        message: 'Determining if the domain already exists...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      domainExists = await this.core.domainExists(domain);
    } catch (error) {
      const message = await Message.create({
        header: 'Check Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to determine if the domain already exists.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return domainExists;
  }

  private async alreadyExists(domain: IFlexdOpsDomain, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Already Exists',
      message: Text.create("The '", Text.bold(domain.name), "' domain already exists."),
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async confirmDomain(domain: IFlexdOpsDomain, input: IExecuteInput) {
    const confirm = input.options.confirm as boolean;
    let add = !confirm;
    if (confirm) {
      const confirmPrompt = await Confirm.create({
        header: 'Add the domain to the Flexd platform?',
        details: [{ name: 'Domain Name', value: domain.name }, { name: 'Aws Account Name', value: domain.account }],
      });
      add = await confirmPrompt.prompt(input.io);
    }

    return add;
  }

  private async cancelAdd(input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Canceled',
      message: 'Adding the domain was canceled.',
      kind: MessageKind.warning,
    });
    await message.write(input.io);
  }

  private async addDomain(domain: IFlexdOpsDomain, input: IExecuteInput) {
    try {
      const message = await Message.create({
        header: 'Add Domain',
        message: 'Adding the domain to the Flex platform...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      await this.core.addDomain(domain);
    } catch (error) {
      const message = await Message.create({
        header: 'Add Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to add the domain to the Flexd platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return false;
    }
    return true;
  }

  private async addComplete(domain: IFlexdOpsDomain, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Complete',
      message: Text.create("The '", Text.bold(domain.name), "' domain was successfully added to the Flexd platform."),
      kind: MessageKind.result,
    });
    await message.write(input.io);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, account, region] = input.arguments as string[];
    const domain = { name, account, region };

    const domainExists = await this.doesDomainExist(domain, input);
    if (domainExists === undefined) {
      return 1;
    }

    if (domainExists) {
      await this.alreadyExists(domain, input);
      return 0;
    }

    const confirmed = await this.confirmDomain(domain, input);

    if (!confirmed) {
      await this.cancelAdd(input);
    } else {
      const platformInstalled = await this.addDomain(domain, input);
      if (!platformInstalled) {
        return 1;
      }

      await this.addComplete(domain, input);
    }

    return 0;
  }
}
