import { Command, IExecuteInput, IOptionsSet, Message, MessageKind, ICommandIO } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsCoreSettings } from '@5qtrs/fusebit-ops-core';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

function optionsToSettings(options: IOptionsSet, settings: IFlexdOpsCoreSettings) {
  if (options.awsProdAccount) {
    settings.awsProdAccount = options.awsProdAccount as string;
  }
  if (options.awsProdRole) {
    settings.awsProdRole = options.awsProdRole as string;
  }
  if (options.awsUserAccount) {
    settings.awsUserAccount = options.awsUserAccount as string;
  }
  if (options.awsUserName) {
    settings.awsUserName = options.awsUserName as string;
  }
  if (options.awsSecretAccessKey) {
    settings.awsUserSecretAccessKey = options.awsSecretAccessKey as string;
  }
  if (options.awsAccessKeyId) {
    settings.awsUserAccessKeyId = options.awsAccessKeyId as string;
  }
}

// ----------------
// Exported Classes
// ----------------

export class InitCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new InitCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'CLI Initialize',
      cmd: 'init',
      summary: 'Initialize the CLI',
      description: 'Initializes use of the CLI to be able to perform operations on the Flexd platform.',
      options: [
        {
          name: 'awsProdAccount',
          description: 'The AWS production account number',
        },
        {
          name: 'awsProdRole',
          description: 'The AWS production role to assume to access the AWS account/role store',
        },
        {
          name: 'awsUserAccount',
          description: 'The AWS user account number',
        },
        {
          name: 'awsUserName',
          description: 'The AWS user name',
        },
        {
          name: 'awsSecretAccessKey',
          description: 'The AWS user secret access key',
        },
        {
          name: 'awsAccessKeyId',
          description: 'The AWS user access key id',
        },
      ],
      modes: ['init'],
    });
    this.core = core;
  }

  private async getSettings(input: IExecuteInput) {
    let settings = undefined;
    try {
      settings = await this.core.getSettings();
      optionsToSettings(input.options, settings);
    } catch (error) {
      const message = await Message.create({
        header: 'Init Error:',
        message: 'An error was encountered when reading the CLI settings.',
        kind: MessageKind.error,
      });
      message.write(input.io);
      await this.core.logError(error, message.toString());
    }

    return settings;
  }

  private async promptForMissingSettings(settings: IFlexdOpsCoreSettings, io: ICommandIO) {
    const accountInfoNeeded = !settings.awsProdAccount || !settings.awsProdRole || !settings.awsUserAccount;
    const userInfoNeeded = !settings.awsUserAccessKeyId || !settings.awsUserSecretAccessKey || !settings.awsUserName;

    if (accountInfoNeeded || userInfoNeeded) {
      await io.writeLine(Text.bold("To initialize the Flexd Ops CLI we'll need to collect some information."));
      await io.writeLine();
    }

    if (accountInfoNeeded) {
      await io.writeLine(
        [
          'Please provide the following information about the AWS accounts on which you are hosting',
          'your installation of the Flexd platform. The AWS production account number',
          'is required. If you use a different account for your AWS users, you can also',
          'provide an optional AWS user account and the role in your AWS production',
          'account to assume to gain access to your AWS production account.',
        ].join(' ')
      );
      await io.writeLine();

      while (!settings.awsProdAccount || !settings.awsProdAccount.length) {
        const promptOptions = {
          prompt: 'AWS production account number:',
          placeholder: '(Required)',
          required: true,
        };
        settings.awsProdAccount = await io.prompt(promptOptions);
      }

      while (!settings.awsUserAccount) {
        const promptOptions = {
          prompt: 'AWS users account number:',
          placeholder: '(Optional)',
        };
        settings.awsUserAccount = await io.prompt(promptOptions);
      }

      while (settings.awsUserAccount && (!settings.awsProdRole || !settings.awsProdRole.length)) {
        const promptOptions = {
          prompt: 'AWS production role that users assume:',
          placeholder: '(Required)',
          required: true,
        };
        settings.awsProdRole = await io.prompt(promptOptions);
      }
    }

    if (userInfoNeeded) {
      const settingsPath = await this.core.getSettingsPath();
      await io.writeLine(
        Text.create(
          'Please provide information about your ',
          Text.bold('individual'),
          ' AWS user account that you use to access the AWS accounts on which you are ',
          'hosting your installation of the Flexd platform.',
          Text.eol(),
          Text.eol(),
          Text.boldItalic(`Note: Your secret access key will be stored on disk at '${settingsPath}'`)
        )
      );
      await io.writeLine();

      while (!settings.awsUserName || !settings.awsUserName.length) {
        const promptOptions = {
          prompt: 'AWS user name:',
          placeholder: '(Required)',
          required: true,
        };
        settings.awsUserName = await io.prompt(promptOptions);
      }

      while (!settings.awsUserAccessKeyId || !settings.awsUserAccessKeyId.length) {
        const promptOptions = {
          prompt: 'AWS access key id:',
          placeholder: '(Required)',
          required: true,
        };
        settings.awsUserAccessKeyId = await io.prompt(promptOptions);
      }

      while (!settings.awsUserSecretAccessKey || !settings.awsUserSecretAccessKey.length) {
        const promptOptions = {
          prompt: 'AWS secret access key:',
          placeholder: '(Required)',
          required: true,
        };
        settings.awsUserSecretAccessKey = await io.prompt(promptOptions);
      }
    }
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const settings = await this.getSettings(input);
    if (!settings) {
      return 1;
    }

    try {
      await this.promptForMissingSettings(settings, input.io);
    } catch (error) {
      const message = await Message.create({
        header: 'Init Error',
        message: 'An error was encountered when collecting CLI settings information.',
        kind: MessageKind.error,
      });
      await message.write(input.io);
      await this.core.logError(error, message.toString());
      return 1;
    }

    try {
      await this.core.setSettings(settings);
    } catch (error) {
      const message = await Message.create({
        header: 'Init Error',
        message: 'An error was encountered when writing the CLI settings.',
        kind: MessageKind.error,
      });
      message.write(input.io);
      await this.core.logError(error, message.toString());
      return 1;
    }

    const message = await Message.create({
      header: 'Init Complete',
      message: Text.create(
        'The Flexd Ops CLI has been successfully initialized.',
        Text.eol(),
        Text.eol(),
        'Any initialization setting can be updated in the future by excuting ',
        'the init command again and specifiying the setting as a command option.'
      ),
      kind: MessageKind.result,
    });
    await message.write(input.io);

    return 0;
  }
}
