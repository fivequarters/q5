import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService, ProfileService } from '../../../services';
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
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
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

export class ClientAccessAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ClientAccessAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, action] = input.arguments as string[];

    const clientService = await AgentService.create(input);
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);

    await executeService.newLine();

    const allowedActions = ['user:*', 'client:*', 'issuer:*', 'function:*'];
    if (allowedActions.indexOf(action) === -1) {
      const text = ["The '", Text.bold('action'), "' options must be one of the following values:"];
      text.push(...allowedActions.map(act => Text.create(" '", Text.bold(act), "'")));
      await executeService.error('Invalid Options', Text.create(text));
    }

    const profile = await profileService.getExecutionProfile(['account']);

    const client = await clientService.getAgent(id);

    const newAccess = {
      action,
      account: profile.account,
      subscription: action === 'function:*' ? profile.subscription : undefined,
      boundary: action === 'function:*' ? profile.boundary : undefined,
      function: action === 'function:*' ? profile.function : undefined,
    };

    const resourcePath = [`/account/${newAccess.account}/`];
    if (action === 'function:*') {
      if (newAccess.subscription) {
        resourcePath.push(`subscription/${newAccess.subscription}/`);
        if (newAccess.boundary) {
          resourcePath.push(`boundary/${newAccess.boundary}/`);
          if (newAccess.function) {
            resourcePath.push(`function/${newAccess.function}/`);
          }
        }
      }
    }

    const resource = resourcePath.join('');

    await clientService.confirmAddAgentAccess(client, { action, resource });

    const update = { access: { allow: [{ action, resource }] } };
    if (client.access && client.access.allow) {
      update.access.allow.push(...client.access.allow);
    }

    const updatedClient = await clientService.addAgentAccess(client.id, update);

    await clientService.displayAgent(updatedClient);

    return 0;
  }
}
