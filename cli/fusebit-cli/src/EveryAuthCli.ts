import { Command, ICommand, IExecuteInput, ArgType, MessageKind, Message } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import {
  InitCommand,
  VersionCommand,
  ServiceCommand,
  IdentityCommand,
  TokenCommand,
  ProfileCommand,
} from './commands/everyauth';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'EveryAuth CLI',
  description: 'A command-line tool (CLI) for EveryAuth any-service authentication.',
  cli: 'everyauth',
  docsUrl: 'https://github.com/fusebit/everyauth-express',
  options: [
    {
      name: 'verbose',
      aliases: ['v'],
      description: 'Provide error details on command execution failure',
      type: ArgType.boolean,
      default: 'false',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands: Command[] = [];
  subCommands.push(
    await InitCommand.create({
      prettyPrint: true,
      command: {
        description: 'Initialize the EveryAuth environment',
        arguments: [
          {
            name: 'token',
            description: 'An optional token used for initializing a specific environment.',
            default: FusebitProfile.defaultEveryAuthProfileId,
          },
        ],
        options: [
          {
            name: 'profile',
            aliases: ['p'],
            description: 'The name of the profile to create with the initalization of the CLI',
          },
          {
            name: 'email',
            aliases: ['e'],
            description:
              'Optional e-mail address. If you lose access to your account, you can recover it using this e-mail.',
          },
        ],
      },
    })
  );
  subCommands.push(await ProfileCommand.create());
  subCommands.push(await VersionCommand.create());
  subCommands.push(await TokenCommand.create());
  subCommands.push(await ServiceCommand.create());
  subCommands.push(await IdentityCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

class EveryAuthCli extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    cli.subCommands = await getSubCommands();
    return new EveryAuthCli(cli);
  }

  protected async onSubCommandExecuting(command: Command, input: IExecuteInput) {
    let current = command;
    let skipInit = current.skipBuiltInProfile;

    while (!skipInit && current.parent) {
      current = current.parent;
      skipInit = current.skipBuiltInProfile;
    }

    if (!skipInit && !(await InitCommand.doProfilesExist(input))) {
      const message = await Message.create({
        kind: MessageKind.warning,
        header: 'Run init first',
        message: Text.create(
          'This command requires an initialized environment. Please run:',
          Text.eol(),
          '  ',
          Text.bold('everyauth init'),
          Text.eol(),
          Text.eol(),
          'This will initalize the environment.'
        ),
      });
      message.write(input.io);

      return 1;
    }

    if (
      (process.env.FUSEBIT_AUTHORIZATION_ACCOUNT_ID || process.env.FUSEBIT_ACCOUNT_ID) &&
      input.options.output === 'pretty'
    ) {
      const message = await Message.create({
        kind: MessageKind.warning,
        header: 'Profile Overrides',
        message: Text.create(
          'The command will execute with the following profile overrides: ',
          Text.eol(),
          Text.eol(),
          'Authorization account Id: ',
          Text.bold(process.env.FUSEBIT_AUTHORIZATION_ACCOUNT_ID || 'N/A'),
          Text.eol(),
          'Account Id: ',
          Text.bold(process.env.FUSEBIT_ACCOUNT_ID || 'N/A')
        ),
      });
      message.write(input.io);
    }
    return super.onSubCommandExecuting(command, input);
  }

  protected async onSubCommandError(command: Command, input: IExecuteInput, error: Error) {
    const verbose = (input.options.verbose as boolean) || process.env.FUSEBIT_DEBUG;
    try {
      input.io.writeRaw(
        Text.create(
          Text.red('[ Unhandled Error ] ').bold(),
          Text.eol(),
          Text.eol(),
          Text.bold('Message'),
          Text.eol(),
          error.message,
          ...(verbose
            ? [
                Text.eol(),
                Text.eol(),
                Text.bold('Stack Trace'),
                Text.eol(),
                error.stack || '<No Stack Trace>',
                Text.eol(),
                Text.eol(),
              ]
            : [])
        )
      );
    } catch (__) {
      console.log(error);
    }
    return 1;
  }
}

export { EveryAuthCli as Cli };
