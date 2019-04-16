import { Command, IExecuteInput, ArgType, Message } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, ExecuteService, FunctionService } from '../../services';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

export class FunctionListCommand extends Command {
  private constructor() {
    super({
      name: 'List Functions',
      cmd: 'ls',
      summary: 'List deployed functions',
      description: [`Lists functions deployed within a given subscription or boundary.`].join(' '),
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
    await input.io.writeLine();

    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription']);

    const result = await executeService.execute(
      {
        header: 'List Functions',
        message: Text.create(
          'Listing ',
          Text.bold(`${input.options.cron === undefined ? '' : input.options.cron === true ? 'CRON ' : 'non-CRON '}`),
          `functions of account '`,
          Text.bold(profile.account || ''),
          "', subscription '",
          Text.bold(profile.subscription || ''),
          profile.boundary ? "', boundary '" + Text.bold(profile.boundary) + "'" : "'"
        ),
        errorHeader: 'List Functions Error',
        errorMessage: 'Unable to list functions',
      },
      async () => {
        let result: string[] = [];
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
              ? `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
                  profile.boundary
                }/function`
              : `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/function`,
            headers: {
              Authorization: `Bearer ${profile.accessToken}`,
              'User-Agent': `fusebit-cli/${require('../../package.json').version}`,
            },
            query,
            validStatus: status => status === 200,
          });
          let functions = response.data.items
            .map((x: { functionId: string; boundaryId: string }) => `${x.boundaryId}/${x.functionId}`)
            .sort();
          result = result.concat(functions);
          if (response.data.next) {
            next = response.data.next;
          } else {
            return result;
          }
        }
      }
    );

    if (result === undefined) {
      executeService.verbose();
      return 1;
    }

    await functionService.displayFunctions(result);

    return 0;
  }
}
