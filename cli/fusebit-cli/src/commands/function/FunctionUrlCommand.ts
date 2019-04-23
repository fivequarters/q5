import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, VersionService, tryGetFusebit, getProfileSettingsFromFusebit } from '../../services';

export class FunctionUrlCommand extends Command {
  private constructor() {
    super({
      name: 'Get Function Location',
      cmd: 'url',
      summary: 'Get the execution URL of a deployed function.',
      description: [
        `Returns the execution URL of a deployed function. Since this is the only output of the command, it is useful for scripting.`,
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The id of the function.',
        },
      ],
    });
  }

  public static async create() {
    return new FunctionUrlCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    const versionService = await VersionService.create(input);
    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary', 'function'],
      getProfileSettingsFromFusebit(tryGetFusebit())
    );

    const version = await versionService.getVersion();
    let response = await request({
      url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
        profile.boundary
      }/function/${profile.function}/location`,
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
        'User-Agent': `fusebit-cli/${version}`,
      },
      validStatus: status => status === 200,
    });

    // This is intentionally bare output - for scripting
    console.log(response.data.location);

    return 0;
  }
}
