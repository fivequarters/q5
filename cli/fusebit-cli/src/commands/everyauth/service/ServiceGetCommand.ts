import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ConnectorService, IConnector } from '../../../services/ConnectorService';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get a service',
  cmd: 'get',
  summary: 'Get a specific service',
  description: Text.create("Get a service and list it's current configuration."),
  arguments: [
    {
      name: 'service',
      description: 'List a specific service.',
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
};

// ----------------
// Exported Classes
// ----------------

export class ServiceGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ServiceGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const serviceId = input.arguments[0] as string;

    const output = input.options.output as string;

    const connectorService = await ConnectorService.create(input, { s: 'Service', p: 'Services' });

    const connector = await connectorService.fetchEntity(serviceId);
    if (output === 'json') {
      input.io.writeLineRaw(JSON.stringify((await connectorService.makeEntitiesJson([connector]))[0], null, 2));
      return 0;
    }
    await connectorService.displayEntities([connector], true, connectorService.filterCfg, false);
    return 0;
  }
}
