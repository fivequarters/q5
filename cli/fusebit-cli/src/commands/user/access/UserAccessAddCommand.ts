import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService, ProfileService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add User Access',
  cmd: 'add',
  summary: 'Add access to a user',
  description: 'Adds an access statement to the given user.',
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to give access to',
    },
    {
      name: 'action',
      description: 'The action to allow the user to perform',
    },
  ],
  options: [
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'The subscription to which access should be given to the user',
      defaultText: 'profile value',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary to which access should be given to the user',
      defaultText: 'profile value',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'The function to which access should be given to the user',
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

export class UserAccessAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserAccessAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, action] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const allowedActions = [
      'user:*',
      'client:*',
      'issuer:*',
      'function:*',
      'subscription:get',
      'account:get',
      'audit:get',
    ];
    if (allowedActions.indexOf(action) === -1) {
      const text = ["The '", Text.bold('action'), "' options must be one of the following values:"];
      text.push(...allowedActions.map(act => Text.create(" '", Text.bold(act), "'")));
      await executeService.error('Invalid Options', Text.create(text));
    }

    const profile = await profileService.getExecutionProfile(['account']);

    const user = await userService.getAgent(id);

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

    await userService.confirmAddAgentAccess(user, { action, resource });

    const update = { access: { allow: [{ action, resource }] } };
    if (user.access && user.access.allow) {
      update.access.allow.push(...user.access.allow);
    }

    const updatedUser = await userService.addAgentAccess(user.id, update);

    await userService.displayAgent(updatedUser);

    return 0;
  }
}
