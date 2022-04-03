import { Command, ICommand, IExecuteInput, ArgType, MessageKind, Message } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { InitCommand, VersionCommand, ServiceCommand, IdentityCommand } from './commands/everyauth';

// ------------------
// Internal Constants
// ------------------

const cli: ICommand = {
  name: 'EveryAuth CLI',
  description: 'A command-line tool (CLI) for EveryAuth any-service authentication.',
  cli: 'fuse',
  docsUrl: 'https://everyauth.io/docs',
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
  subCommands.push(await InitCommand.create({ autoPKI: true, prettyPrint: true }));
  subCommands.push(await VersionCommand.create());
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
    if (!skipInit) {
      await InitCommand.createDefaultProfileIfNoneExists(input);
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
