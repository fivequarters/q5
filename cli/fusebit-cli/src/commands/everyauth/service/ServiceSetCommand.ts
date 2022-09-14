import { Command, Message, MessageKind, IExecuteInput, ICommandIO } from '@5qtrs/cli';
import { ExecuteService, ConnectorService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Service Parameter',
  cmd: 'set',
  summary: 'Set a configuration parameter for a service',
  description: Text.create(
    'Set one or more configuration parameters for a service, from the list of allowed parameters.'
  ),
  arguments: [
    {
      name: 'service',
      description: 'The name of the service to deploy. Use `service ls` to see the list of available services',
      required: true,
    },
  ],
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
  acceptsUnknownOptions: true,
};

// ----------------
// Exported Classes
// ----------------

export class ServiceSetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ServiceSetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const serviceId = input.arguments[0] as string;
    const output = input.options.output as string;

    const flags = await this.extractFlags(input);

    const connectorService = await ConnectorService.create(input, { s: 'Service', p: 'Services' });

    const connector = await connectorService.fetchEntity(serviceId);

    const validKeys = Object.keys(connector.data.configuration).filter((key) => connectorService.filterCfg(key) >= 0);

    if (Object.keys(flags).length === 0) {
      const msg: (string | Text)[] = [`The following parameters are available: `];

      validKeys.forEach((key) => msg.push(...[Text.bold(key), ', ']));

      const message = await Message.create({
        header: 'Available Parameters',
        message: Text.create(msg),
        kind: MessageKind.error,
      });
      await message.write(input.io);
      return 0;
    }

    // Check to see if the parameter is present, if not return error
    await Promise.all(
      Object.keys(flags).map(async (key) => validKeys.includes(key) || this.onUnknownConfig(key, validKeys, input.io))
    );

    // Modify variable in configuration section
    Object.entries(flags).forEach(([key, value]: [string, string]) => (connector.data.configuration[key] = value[0]));

    // POST connector
    let entity = await connectorService.deployEntity(serviceId, connector);

    // Wait for deploy complete.
    const response = await connectorService.waitForEntity(entity.id);
    entity = response.data;

    // Output either modified configuration in JSON or success message
    if (output === 'json') {
      input.io.writeLineRaw(JSON.stringify((await connectorService.makeEntitiesJson([connector]))[0], null, 2));
      return 0;
    }
    await connectorService.displayEntities([connector], true, connectorService.filterCfg, false);
    return 0;
  }

  private async extractFlags(input: IExecuteInput) {
    const flags = Object.keys(input.options)
      .filter((key) => key.startsWith('--'))
      .reduce((p: Record<string, any>, key) => {
        p[key.slice(2)] = input.options[key];
        return p;
      }, {});

    return flags;
  }

  private async onUnknownConfig(entry: string, valid: string[], io: ICommandIO) {
    const errorMessage = `Unknown configuration option '${entry}'; valid: ${valid.join(', ')}`;
    const message = await Message.create({
      header: 'Invalid Option',
      message: errorMessage,
      kind: MessageKind.error,
    });
    await message.write(io);
    throw new Error(errorMessage);
  }
}
