import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ClientService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Clients',
  cmd: 'ls',
  summary: 'List clients',
  description: 'Lists clients of the given account',
  options: [
    {
      name: 'name',
      description: 'Only list clients with a display name that includes the given value (case-sensistive)',
    },
    {
      name: 'iss',
      description: 'Only list clients with an issuer that includes the given value (case-sensistive)',
    },
    {
      name: 'sub',
      description: 'Only list clients with a subject that includes the given value (case-sensistive)',
    },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of clients to list at a given time',
      type: ArgType.integer,
      default: '10',
    },
    {
      name: 'next',
      aliases: ['n'],
      description: 'The opaque token from a previous list command used to continue listing',
    },
    {
      name: 'format',
      aliases: ['f'],
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ClientListCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const displayNameContains = input.options.name as string;
    const issuerContains = input.options.iss as string;
    const subjectContains = input.options.sub as string;
    const format = input.options.format as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const clientService = await ClientService.create(input);

    const options: any = {
      displayNameContains,
      issuerContains,
      subjectContains,
      count,
      next,
    };

    if (format === 'json') {
      input.io.writeRawOnly(true);
      const result = await clientService.listClients(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      await input.io.writeLine();

      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await clientService.listClients(options);
        await clientService.displayClients(result.items, firstDisplay);
        firstDisplay = false;
        getMore = result.next ? await clientService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
        }
      }
    }

    return 0;
  }
}
