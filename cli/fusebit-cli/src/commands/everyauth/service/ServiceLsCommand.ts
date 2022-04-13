import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ConnectorService, IConnector } from '../../../services/ConnectorService';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List available services',
  cmd: 'ls',
  summary: 'List all of the available services',
  description: Text.create(
    "List all of the available services, or list a single service along with it's valid configuration keys."
  ),
  arguments: [
    {
      name: 'service',
      description: "Optional: if specified, list a specific service and it's allowed configuration keys.",
      required: false,
    },
  ],
  options: [
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of services to list at a given time',
      type: ArgType.integer,
      default: '100',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: Text.create([
        "The opaque next token obtained from a previous list command when using the '",
        Text.bold('--output json'),
        "' option ",
      ]),
    },
  ],
  acceptsUnknownArguments: true,
};

// ----------------
// Exported Classes
// ----------------

export class ServiceLsCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ServiceLsCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const serviceId = input.arguments[0] as string;

    const output = input.options.output as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const options: any = {
      count,
      next,
    };

    const connectorService = await ConnectorService.create(input, { s: 'Service', p: 'Services' });

    if (serviceId) {
      const connector = await connectorService.fetchEntity(serviceId);
      if (output === 'json') {
        input.io.writeLineRaw(JSON.stringify((await connectorService.makeEntitiesJson([connector]))[0], null, 2));
        return 0;
      }
      await connectorService.displayEntities([connector], true, connectorService.filterCfg, false);
      return 0;
    }

    let result = await connectorService.listEntities(options);
    if (output === 'json') {
      input.io.writeLineRaw(
        JSON.stringify({ items: await connectorService.makeEntitiesJson(result.items), next: result.next }, null, 2)
      );
      return 0;
    }

    await input.io.writeLine();

    let getMore = true;
    let firstDisplay = true;
    while (getMore) {
      await input.io.writeLine(result.items.map((item) => item.id).join(', '));
      // await connectorService.displayEntities(result.items, firstDisplay, connectorService.filterCfg, false);
      firstDisplay = false;
      getMore = result.next ? await connectorService.confirmListMore() : false;
      if (getMore) {
        options.next = result.next;
        result = await connectorService.listEntities(options);
      }
    }

    return 0;
  }
}
