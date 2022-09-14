import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService } from '../../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove User Access',
  cmd: 'rm',
  summary: 'Removes access from a user',
  description: "Removes a user's access to a given account, subscription, boundary or function.",
  arguments: [
    {
      name: 'user',
      description: 'The id of the user from which to remove access',
    },
    {
      name: 'action',
      description: 'The action of the access to remove from the user',
    },
    {
      name: 'resource',
      description: 'The resource of the access to remove from the user',
      required: false,
    },
  ],
  options: [
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

export class UserAccessRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserAccessRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, action, rawResource] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    let resource = !rawResource || rawResource[rawResource.length - 1] === '/' ? rawResource : `${rawResource}/`;

    const user = await userService.getAgent(id);
    user.access = user.access || {};
    user.access.allow = user.access.allow || [];

    let accessIndex = -1;
    for (let i = 0; i < user.access.allow.length; i++) {
      const access = user.access.allow[i];
      if (access.action === action) {
        if (resource && access.resource.indexOf(resource) !== -1) {
          accessIndex = i;
          resource = access.resource;
          i = user.access.allow.length;
        } else {
          if (accessIndex === -1) {
            accessIndex = i;
            resource = access.resource;
          } else {
            await executeService.error(
              'Multiple Resources',
              Text.create(
                "The user '",
                Text.bold(user.id),
                "' has more than one access with action '",
                Text.bold(action),
                "' so the resource must be specified"
              )
            );
          }
        }
      }
    }

    if (accessIndex === -1) {
      await executeService.error(
        'No Access',
        Text.create(
          "The user '",
          Text.bold(user.id),
          "' does not have any access with action '",
          Text.bold(action),
          "' for resource '",
          Text.bold(resource),
          "'"
        )
      );
    }

    const access = { action, resource };

    await userService.confirmRemoveAgentAccess(user, access);

    user.access.allow.splice(accessIndex, 1);

    const update = { access: { allow: user.access.allow } };
    const updatedUser = await userService.removeAgentAccess(user.id, update);

    await userService.displayAgent(updatedUser);

    return 0;
  }
}
