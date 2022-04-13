import { Command, Message, MessageKind, IExecuteInput, ICommandIO, ICommand } from '@5qtrs/cli';
import { ExecuteService, ConnectorService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

// ----------------
// Exported Classes
// ----------------

export class ServiceUnsupportedCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create(
    protoCommand: { name: string; cmd: string; summary: string; description: Text },
    extraArguments: { name: string; description: string; required: false }[],
    verb: string
  ) {
    const command = {
      ...protoCommand,
      arguments: [
        {
          name: 'service',
          description: `The name of the service to ${verb}.`,
          required: true,
        },
        ...extraArguments,
      ],
      options: [
        {
          name: 'output',
          aliases: ['o'],
          description: "The format to display the output: 'pretty', 'json'",
          default: 'pretty',
        },
      ],
    };

    return new ServiceUnsupportedCommand(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const serviceId = input.arguments[0] as string;

    const errorMessage = `Unsupported for ${serviceId} at this service level.  Contact https://fusebit.io to upgrade.`;
    const message = await Message.create({
      header: 'Out of Plan',
      message: errorMessage,
      kind: MessageKind.error,
    });
    await message.write(input.io);
    return 0;
  }
}
