import { Command, ArgType, IExecuteInput, MessageKind } from '@5qtrs/cli';
import { ExecuteService, UserService, ProfileService } from '../../../services';
import { Text } from '@5qtrs/text';

export class UserAccessAddCommand extends Command {
  private constructor() {
    super({
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
          description: ['The subscription to which access should be given to the user'].join(' '),
          defaultText: 'profile value',
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: ['The boundary to which access should be given to the user'].join(' '),
          defaultText: 'profile value',
        },
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function to which access should be given to the user',
          defaultText: 'profile value',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the access to the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserAccessAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, action] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);

    // const allowedActions = ['account:*', 'subscription:*', 'boundary:*', 'function:*'];
    // if (allowedActions.indexOf(action) === -1) {
    //   const text = ["The '", Text.bold('action'), "' options must be one of the following values:"];
    //   text.push(...allowedActions.map(act => Text.create(" '", Text.bold(act), "'")));
    //   await executeService.result({
    //     header: 'Invalid Options',
    //     message: Text.create(text),
    //     kind: MessageKind.error,
    //   });
    //   return 1;
    // }

    // const expectedOptions = ['account'];
    // if (action === 'subscription:*') {
    //   expectedOptions.push('subscription');
    // }
    // if (action === 'boundary:*') {
    //   expectedOptions.push('subscription');
    //   expectedOptions.push('boundary');
    // }
    // if (action === 'function:*') {
    //   expectedOptions.push('subscription');
    //   expectedOptions.push('boundary');
    //   expectedOptions.push('function');
    // }

    const profile = await profileService.getExecutionProfile();
    if (!profile) {
      return 1;
    }

    const user = await userService.getUser(id);
    if (!user) {
      executeService.verbose();
      return 1;
    }

    const newAccess = {
      action,
      account: profile.account,
      subscription: profile.subscription,
      boundary: profile.boundary,
      function: profile.function,
    };

    if (confirm) {
      const confirmed = await userService.confirmAddUserAccess(user, newAccess);
      if (!confirmed) {
        return 1;
      }
    }

    const resourcePath = [];
    if (newAccess.subscription) {
      resourcePath.push(`/subscription/${newAccess.subscription}`);
      if (newAccess.boundary) {
        resourcePath.push(`/boundary/${newAccess.boundary}`);
        if (newAccess.function) {
          resourcePath.push(`/function/${newAccess.function}`);
        }
      }
    } else {
      resourcePath.push(`/account/${newAccess.account}`);
    }

    user.access = user.access || {};
    user.access.allow = user.access.allow || [];
    user.access.allow.push({
      action,
      resource: resourcePath.join(''),
    });

    const updatedUser = await userService.updateUser(user);
    if (!updatedUser) {
      executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'User Access Added',
      message: Text.create("User access was successfully added to user '", Text.bold(user.id), "'"),
    });

    await userService.displayUser(user);

    return 0;
  }
}
