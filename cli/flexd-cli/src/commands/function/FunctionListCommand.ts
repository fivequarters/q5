import { EOL } from 'os';
import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService } from '../../services';

export class FunctionListCommand extends Command {
  private constructor() {
    super({
      name: 'List Functions',
      cmd: 'ls',
      summary: 'List deployed functions',
      description: [
        `Retrieves a list of deployed functions in the given boundary.${EOL}${EOL}If`,
        'the profile does not specify the subscription, or boundary, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        'access to boundary to retrieve a list of deployed functions within it.',
      ].join(' '),
      options: [
        {
          name: 'cron',
          description: [
            'If set to true, only scheduled functions are returned. If set to false, only non-scheduled functions are returned. ',
            'If unspecified, both scheduled and unscheduled functions are returned',
          ].join(' '),
          type: ArgType.boolean,
        },
      ],
    });
  }

  public static async create() {
    return new FunctionListCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription']);

    let next: string | undefined;

    while (true) {
      let query: any = {};
      if (next) {
        query.next = next;
      }
      if (input.options.cron !== undefined) {
        query.cron = input.options.cron;
      }
      let response = await request({
        url: profile.boundary
          ? `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function`
          : `${profile.baseUrl}/v1/subscription/${profile.subscription}/function`,
        headers: {
          Authorization: `Bearer ${profile.token}`,
        },
        query,
      });

      let functions = response.data.items
        .map((x: { functionId: string; boundaryId: string }) => `${x.boundaryId}/${x.functionId}`)
        .sort();
      if (functions.length === 0) {
        console.log('No matching functions found');
      } else {
        functions.forEach((f: string) => console.log(f));
      }
      if (
        !response.data.next ||
        !(await input.io.prompt({ prompt: 'There is more data. Display more?', yesNo: true }))
      ) {
        return 0;
      }
      next = response.data.next;
    }
  }
}
