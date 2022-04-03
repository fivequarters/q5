import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService, ProfileService } from '../../../../services';
import { Text } from '@5qtrs/text';

import { isSpecialized, Permissions, UserPermissions } from '@5qtrs/constants';

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
      name: 'resource',
      aliases: ['r'],
      description: 'Low level setting. The fully specified resource to which access should be given to the client',
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
    let resource = input.options.resource as string;

    const userService = await AgentService.create(input, true);
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    if (!resource && UserPermissions.indexOf(action) === -1) {
      const text = ["The '", Text.bold('action'), "' options must be one of the following values:"];
      text.push(...UserPermissions.map((act) => Text.create(" '", Text.bold(act), "'")));
      await executeService.error('Invalid Options', Text.create(text));
    }

    const profile = await profileService.getExecutionProfile(['account']);

    const user = await userService.getAgent(id);

    if (!resource) {
      const isFunctionPermission = isSpecialized(Permissions.allFunction, action);
      const newAccess = {
        action,
        account: profile.account,
        subscription: isFunctionPermission ? profile.subscription : undefined,
        boundary: isFunctionPermission ? profile.boundary : undefined,
        function: isFunctionPermission ? profile.function : undefined,
      };

      const resourcePath = [`/account/${newAccess.account}/`];
      if (isFunctionPermission) {
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

      resource = resourcePath.join('');
    }

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
