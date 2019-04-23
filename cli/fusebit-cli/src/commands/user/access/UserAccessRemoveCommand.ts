import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../../services';
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
      description: 'The id of the user from which to remove access.',
    },
    {
      name: 'action',
      description: 'The action to remove from the user',
    },
    {
      name: 'resource',
      description: 'The resource to remove from the user',
    },
  ],
  options: [
    {
      name: 'confirm',
      description: [
        'If set to true, the details regarding removing access from the user will be displayed along with a',
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

export class UserAccessRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserAccessRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id, action, resource] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const user = await userService.getUser(id);
    user.access = user.access || {};
    user.access.allow = user.access.allow || [];

    let accessIndex = -1;
    for (let i = 0; i < user.access.allow.length; i++) {
      const access = user.access.allow[i];
      if (access.action === action && access.resource === resource) {
        accessIndex = i;
        i = user.access.allow.length;
      }
    }

    if (accessIndex === -1) {
      await executeService.warning(
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
      return 1;
    }

    const access = { action, resource };

    if (confirm) {
      await userService.confirmRemoveUserAccess(user, access);
    }

    user.access.allow.splice(accessIndex, 1);

    const update = { access: { allow: user.access.allow } };
    const updatedUser = await userService.removeUserAccess(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
