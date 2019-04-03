import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, tryGetFlexd, getProfileSettingsFromFlexd } from '../../services';

export class FunctionRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Function',
      cmd: 'rm',
      summary: 'Remove a deployed function',
      description: [
        'Permanently removes a deployed function.',
        `${EOL}${EOL}This is a destructive action and can not be undone.`,
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id of the function to remove.',
          default: 'profile value',
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: ['If set to true, the function will be deleted without asking for confirmation.'].join(' '),
          type: ArgType.boolean,
          default: 'false',
        },
      ],
      modes: [],
    });
  }

  public static async create() {
    return new FunctionRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary', 'function'],
      getProfileSettingsFromFlexd(tryGetFlexd())
    );

    if (
      !input.options.confirm &&
      !(await input.io.prompt({
        prompt: `Remove function ${profile.boundary}/${profile.function}? This cannot be undone.`,
        yesNo: true,
      }))
    ) {
      input.io.writeLine('No changes made.');
      return 0;
    }

    let response = await request({
      method: 'DELETE',
      url: `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${
        profile.function
      }`,
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
      validStatus: status => status === 200,
    });

    input.io.writeLine('Function removed.');

    return 0;
  }
}
