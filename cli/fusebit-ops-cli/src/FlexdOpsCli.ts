import { Command, ICommand, Message, MessageKind, ICommandIO, IExecuteInput, ArgType } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { FlexdOpsCore } from '@5qtrs/fusebit-ops-core';
import {
  InitCommand,
  InstallCommand,
  AccountCommand,
  NetworkCommand,
  DomainCommand,
  CodeCommand,
  ImageCommand,
  DeploymentCommand,
} from './commands';

// ------------------
// Internal Functions
// ------------------

function getMfaCodeResolver(io: ICommandIO) {
  return async (accountId: string) => {
    const message = await Message.create({
      header: 'Authentication Required',
      message: Text.create(
        "Access to AWS account '",
        Text.bold(accountId),
        "' is required to continue executing the current command."
      ),
      kind: MessageKind.info,
    });

    await message.write(io);

    let mfaCode = '';
    while (!mfaCode) {
      const promptOptions = {
        prompt: 'MFA code:',
        placeholder: '(Required)',
        required: true,
      };
      mfaCode = await io.prompt(promptOptions);
    }

    const message2 = await Message.create({
      header: 'Authenticating',
      message: 'Authenticating with AWS...',
      kind: MessageKind.info,
    });

    await message2.write(io);
    io.spin(true);

    return { code: mfaCode };
  };
}

// ----------------
// Exported Classes
// ----------------

export class FlexdOpsCli extends Command {
  private core: FlexdOpsCore;

  public static async create(io: ICommandIO) {
    const mfaResolver = getMfaCodeResolver(io);
    const core = await FlexdOpsCore.create(mfaResolver);

    const subCommands: Command[] = [];
    subCommands.push(await InitCommand.create(core));
    subCommands.push(await InstallCommand.create(core));
    subCommands.push(await AccountCommand.create(core));
    subCommands.push(await NetworkCommand.create(core));
    subCommands.push(await DomainCommand.create(core));
    subCommands.push(await CodeCommand.create(core));
    subCommands.push(await ImageCommand.create(core));
    subCommands.push(await DeploymentCommand.create(core));

    const cli = {
      name: 'Flexd Ops CLI',
      description: 'A command-line tool (CLI) for the managing the operations of the Flexd platform.',
      cli: 'flx-ops',
      options: [
        {
          name: 'verbose',
          aliases: ['v'],
          description: 'Provide error details on command execution failure',
          type: ArgType.boolean,
          default: 'false',
        },
      ],
      subCommands,
    };

    return new FlexdOpsCli(cli, core);
  }

  private constructor(cli: ICommand, core: FlexdOpsCore) {
    super(cli);
    this.core = core;
  }

  protected async onSubCommandExecuted(command: Command, input: IExecuteInput, result: number) {
    if (result && input.options.verbose) {
      const logs = await this.core.getLogs();
      for (const entry of logs) {
        const message = await Message.create({
          header: 'Log Entry',
          message: Text.create(
            entry.message ? entry.message : '',
            Text.eol(),
            Text.eol(),
            entry.error ? Text.dim(entry.error.message) : ''
          ),
          kind: MessageKind.warning,
        });
        await message.write(input.io);
      }
    }
  }

  protected async onGetMode() {
    return this.core.getMode();
  }
}
