import { Command, IExecuteInput, ArgType, Message } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, ExecuteService } from '../../services';
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
    let profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
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
    } else if (result.length === 0) {
      const message = await Message.create({
        message: 'No matching functions found',
      });
      await message.write(input.io);
    } else {
      const table = await Table.create({
        width: input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
      });

      table.addRow([Text.bold('Boundary'), Text.bold('Function')]);

      for (const entry of result) {
        table.addRow(entry.split('/'));
      }

      input.io.writeLine(table.toText());
    }
    return 0;
  }
}
