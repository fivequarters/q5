import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ClientService, ExecuteService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Clients',
  cmd: 'ls',
  summary: 'List clients',
  description: 'Lists clients of the given account',
  arguments: [
    {
      name: 'name',
      description: Text.create(
        'Only list clients with a display name that includes the given text ',
        Text.dim('(case-sensitive)')
      ),
      required: false,
    },
  ],
  options: [
    {
      name: 'issuer',
      aliases: ['i'],
      description: 'Only list clients with an identity that includes the given issuer',
    },
    {
      name: 'subject',
      aliases: ['s'],
      description: Text.create(
        "Only list clients with an identity that includes the given subject; can only be used with the '",
        Text.bold('--issuer'),
        "' option"
      ),
    },
    {
      name: 'count',
      aliases: ['c'],
      description: 'The number of clients to list at a given time',
      type: ArgType.integer,
      default: '10',
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
    const displayNameContains = input.arguments[0] as string;
    const issuerContains = input.options.issuer as string;
    const subjectContains = input.options.subject as string;
    const output = input.options.output as string;
    const count = input.options.count as string;
    const next = input.options.next as string;

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const options: any = {
      displayNameContains,
      issuerContains,
      subjectContains,
      count,
      next,
    };

    if (output === 'json') {
      const result = await clientService.listClients(options);
      const json = JSON.stringify(result, null, 2);
      input.io.writeLineRaw(json);
    } else {
      let clientCount = 1;
      let getMore = true;
      let result;
      let firstDisplay = true;
      while (getMore) {
        result = await clientService.listClients(options);
        await clientService.displayClients(result.items, firstDisplay, clientCount);
        firstDisplay = false;
        getMore = result.next ? await clientService.confirmListMore() : false;
        if (getMore) {
          options.next = result.next;
          clientCount += result.items.length;
        }
      }
    }

    return 0;
  }
}
