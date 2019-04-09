import { Command, ArgType, IExecuteInput, MessageKind } from '@5qtrs/cli';
import { ExecuteService, ClientService, ProfileService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Client Access',
  cmd: 'add',
  summary: 'Add access to a client',
  description: 'Adds an access statement to the given client.',
  arguments: [
    {
      name: 'client',
      description: 'The id of the client to give access to',
    },
    {
      name: 'action',
      description: 'The action to allow the client to perform',
    },
  ],
  options: [
    {
      name: 'subscription',
      aliases: ['s'],
      description: ['The subscription to which access should be given to the client'].join(' '),
      defaultText: 'profile value',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: ['The boundary to which access should be given to the client'].join(' '),
      defaultText: 'profile value',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'The function to which access should be given to the client',
      defaultText: 'profile value',
    },
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding adding the access to the client will be displayed along with a',
        'prompt for confirmation.',
      ].join(' '),
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ClientAccessAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAccessAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, action] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const clientService = await ClientService.create(input);
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);

    const allowedActions = ['user:*', 'client:*', 'issuer:*', 'function:*'];
    if (allowedActions.indexOf(action) === -1) {
      const text = ["The '", Text.bold('action'), "' options must be one of the following values:"];
      text.push(...allowedActions.map(act => Text.create(" '", Text.bold(act), "'")));
      await executeService.error('Invalid Options', Text.create(text));
      return 1;
    }

    const profile = await profileService.getExecutionProfile(['account']);

    const client = await clientService.getClient(id);

    const newAccess = {
      action,
      account: profile.account,
      subscription: action === 'function:*' ? profile.subscription : undefined,
      boundary: action === 'function:*' ? profile.boundary : undefined,
      function: action === 'function:*' ? profile.function : undefined,
    };

    if (confirm) {
      await clientService.confirmAddClientAccess(client, newAccess);
    }

    const resourcePath = [`/account/${newAccess.account}`];
    if (action === 'function:*') {
      if (newAccess.subscription) {
        resourcePath.push(`/subscription/${newAccess.subscription}`);
        if (newAccess.boundary) {
          resourcePath.push(`/boundary/${newAccess.boundary}`);
          if (newAccess.function) {
            resourcePath.push(`/function/${newAccess.function}`);
          }
        }
      }
    }

    const update = { access: { allow: [{ action, resource: resourcePath.join('') }] } };
    if (client.access && client.access.allow) {
      update.access.allow.push(...client.access.allow);
    }

    const updatedClient = await clientService.addClientAccess(client.id, update);

    await clientService.displayClient(updatedClient);

    return 0;
  }
}
