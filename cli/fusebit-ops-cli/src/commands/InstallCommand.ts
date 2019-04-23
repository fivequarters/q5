import { Command, ICommand, IExecuteInput, Message, MessageKind, ArgType, Confirm } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class InstallCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const command = {
      name: 'Fusebit Platform Install',
      cmd: 'install',
      summary: 'Installs the Fusebit platform',
      description: 'Installs the Fusebit platform on the AWS production account.',
      options: [
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before installing the Fusebit platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
      modes: ['install'],
    };
    return new InstallCommand(command, core);
  }

  private constructor(commnd: ICommand, core: FusebitOpsCore) {
    super(commnd);
    this.core = core;
  }

  private async isPlatfromInstalled(input: IExecuteInput) {
    let platformInstalled = undefined;
    try {
      const message = await Message.create({
        header: 'Install Check',
        message: 'Determining if the Fusebit platform is already installed...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      platformInstalled = await this.core.installationExists();
    } catch (error) {
      const message = await Message.create({
        header: 'Install Error',
        message: 'An error was encountered when trying to determine if the Fusebit platform was installed.',
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return platformInstalled;
  }

  private async getProdAccount(input: IExecuteInput) {
    let prodAccount = undefined;
    try {
      prodAccount = await this.core.getProdAccount();
    } catch (error) {
      const message = await Message.create({
        header: 'Install Error',
        message: 'An error was encountered when trying to read the AWS production account setting.',
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return prodAccount;
  }

  private async alreadyInstalled(prodAccount: string, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Already Installed',
      message: Text.create('The Fusebit platform is already installed on AWS account: ', Text.boldItalic(prodAccount)),
      kind: MessageKind.info,
    });
    await message.write(input.io);
  }

  private async confirmInstall(prodAccount: string, input: IExecuteInput) {
    const confirm = input.options.confirm as boolean;
    let install = !confirm;
    if (confirm) {
      const confirmPrompt = await Confirm.create({
        header: 'Install the Fusebit platform?',
        details: [{ name: 'Aws Production Account', value: prodAccount }],
      });
      install = await confirmPrompt.prompt(input.io);
    }

    return install;
  }

  private async cancelInstall(input: IExecuteInput) {
    const message = await Message.create({
      header: 'Install Canceled',
      message: 'The Fusebit platform installation was canceled.',
      kind: MessageKind.warning,
    });
    await message.write(input.io);
  }

  private async installPlatform(input: IExecuteInput) {
    try {
      const message = await Message.create({
        header: 'Install',
        message: 'Installing the Fusebit platform...',
        kind: MessageKind.info,
      });
      await message.write(input.io);
      input.io.spin(true);
      await this.core.ensureInstallation();
    } catch (error) {
      const message = await Message.create({
        header: 'Install Error',
        message: 'An error was encountered when trying to install the Fusebit platform.',
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return false;
    }
    return true;
  }

  private async installComplete(prodAccount: string, input: IExecuteInput) {
    const message = await Message.create({
      header: 'Install Complete',
      message: Text.create(
        'The Fusebit platform has been successfully installed on AWS account: ',
        Text.boldItalic(prodAccount)
      ),
      kind: MessageKind.result,
    });
    await message.write(input.io);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    await this.core.setupAccountApi('stage');

    const isPlatformInstalled = await this.isPlatfromInstalled(input);
    if (isPlatformInstalled === undefined) {
      return 1;
    }

    const prodAccount = await this.getProdAccount(input);
    if (prodAccount === undefined) {
      return 1;
    }

    if (isPlatformInstalled) {
      await this.alreadyInstalled(prodAccount, input);
      return 0;
    }

    const confirmed = await this.confirmInstall(prodAccount, input);

    if (!confirmed) {
      await this.cancelInstall(input);
    } else {
      const platformInstalled = await this.installPlatform(input);
      if (!platformInstalled) {
        return 1;
      }

      await this.installComplete(prodAccount, input);
    }

    return 0;
  }
}
