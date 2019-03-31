import { Command, IExecuteInput, Confirm, ArgType, MessageKind, Message } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsPublishDetails, IFlexdOpsDeployment } from '@5qtrs/flexd-ops-core';
import { ExecuteService, ApiPublishService, DisplayService, SettingsService, ApiSetupService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class RootDeploymentCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new RootDeploymentCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Deployment',
      cmd: 'root',
      summary: 'Root user access to a deployment',
      description: 'Provides root user access to a deployment in the Flexd platform.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the new deployment to gain root user access to',
        },
      ],
      options: [
        {
          name: 'profile',
          description: "The name of the 'flx-cli' profile to populate with root user credentials.",
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the deployment to the Flexd platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name] = input.arguments as string[];
    const profile = input.options.comment as string;

    const executeService = await ExecuteService.create(this.core, input);
    const settingsService = await SettingsService.create(this.core, input);

    const user = await settingsService.getUser();
    if (!user) {
      return 1;
    }

    const [first, last] = user.split('.');

    const confirm = input.options.confirm as boolean;
    let install = !confirm;
    if (confirm) {
      const confirmPrompt = await Confirm.create({
        header: 'Add root user access?',
        details: [
          { name: 'First Name', value: first },
          { name: 'Last Name', value: last },
          { name: 'Deployment', value: name },
        ],
      });
      install = await confirmPrompt.prompt(input.io);
    }

    if (!install) {
      const message = await Message.create({
        header: 'Root User Canceled',
        message: 'Adding the root user was canceled.',
        kind: MessageKind.warning,
      });
      await message.write(input.io);
      return 0;
    }

    const newUser = await executeService.execute(
      {
        header: 'Adding Root User',
        message: Text.create('Adding the root user to the deployment... '),
        errorHeader: 'Check Error',
        errorMessage: Text.create('An error was encountered when trying to add the root user. '),
      },
      async () => this.core.addRootUser(name, first, last)
    );
    if (newUser === undefined) {
      return 0;
    }

    console.log(newUser);

    return 0;
  }
}
