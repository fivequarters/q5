import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, VersionService, tryGetFusebit, getProfileSettingsFromFusebit } from '../../services';

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
    await input.io.writeLine();

    let profileService = await ProfileService.create(input);
    const versionService = await VersionService.create(input);

    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary', 'function'],
      getProfileSettingsFromFusebit(tryGetFusebit())
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

    const version = await versionService.getVersion();
    await request({
      method: 'DELETE',
      url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
        profile.boundary
      }/function/${profile.function}`,
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
        'User-Agent': `fusebit-cli/${version}`,
      },
      validStatus: status => status === 200,
    });

    input.io.writeLine('Function removed.');

    return 0;
  }
}
