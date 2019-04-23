import { Command, IExecuteInput, Confirm, ArgType, Message, MessageKind } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsAccount } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

// ----------------
// Exported Classes
// ----------------

export class AddAccountCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new AddAccountCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Add Account',
      cmd: 'add',
      summary: 'Add an account',
      description: 'Adds an account to the Flexd platform with the given AWS account id.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the account',
        },
        {
          name: 'id',
          description: 'The id of the AWS account to add',
        },
        {
          name: 'role',
          description: 'The role that needs to be assumed to access the AWS account',
        },
      ],
      options: [
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the account to the Flexd platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  private async doesAccountExist(account: IFlexdOpsAccount, input: IExecuteInput) {
    let accountExists = undefined;
    try {
      const message = await Message.create({
        header: 'Account Check',
        message: 'Determining if the account already exists...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      accountExists = await this.core.accountExists(account);
    } catch (error) {
      const message = await Message.create({
        header: 'Check Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to determine if the account already exists.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return accountExists;
  }

  private async alreadyExists(account: IFlexdOpsAccount, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Already Exists',
      message: Text.create("The '", Text.bold(account.name), "' account already exists."),
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async confirmAccount(account: IFlexdOpsAccount, input: IExecuteInput) {
    const confirm = input.options.confirm as boolean;
    let add = !confirm;
    if (confirm) {
      const confirmPrompt = await Confirm.create({
        header: 'Add the account to the Flexd platform?',
        details: [
          { name: 'Account Name', value: account.name },
          { name: 'Aws Account Id', value: account.id },
          { name: 'Aws Role', value: account.role },
        ],
      });
      add = await confirmPrompt.prompt(input.io);
    }

    return add;
  }

  private async cancelAdd(input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Canceled',
      message: 'Adding the account was canceled.',
      kind: MessageKind.warning,
    });
    await message.write(input.io);
  }

  private async addAccount(account: IFlexdOpsAccount, input: IExecuteInput) {
    try {
      const message = await Message.create({
        header: 'Add Account',
        message: 'Adding the account to the Flex platform...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      await this.core.addAccount(account);
    } catch (error) {
      const message = await Message.create({
        header: 'Add Error',
        message:
          error.code !== undefined
            ? 'An error was encountered when trying to add the account to the Flexd platform.'
            : error.message,
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return false;
    }
    return true;
  }

  private async addComplete(account: IFlexdOpsAccount, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Add Complete',
      message: Text.create("The '", Text.bold(account.name), "' account was successfully added to the Flexd platform."),
      kind: MessageKind.result,
    });
    await message.write(input.io);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, id, role] = input.arguments as string[];
    const account = { name, id, role };

    const accountExists = await this.doesAccountExist(account, input);
    if (accountExists === undefined) {
      return 1;
    }

    if (accountExists) {
      await this.alreadyExists(account, input);
      return 0;
    }

    const confirmed = await this.confirmAccount(account, input);

    if (!confirmed) {
      await this.cancelAdd(input);
    } else {
      const platformInstalled = await this.addAccount(account, input);
      if (!platformInstalled) {
        return 1;
      }

      await this.addComplete(account, input);
    }

    return 0;
  }
}
