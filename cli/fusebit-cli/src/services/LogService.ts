import { Text, IText } from '@5qtrs/text';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IColumnConstraint, Table } from '@5qtrs/table';

const queryTimeout = 2 * 60; // Max two minutes

export interface ILogsResult {
  status: string;
  recordsMatched?: number;
  results: any[];
}

export class LogService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;
  private from?: string;
  private to?: string;
  private limit?: number;
  private functionId?: string;
  private connectorId?: string;
  private integrationId?: string;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
    this.from = input.options.from as string | undefined;
    this.to = input.options.to as string | undefined;
    this.limit = input.options.limit as number | undefined;
    this.functionId = input.options.function as string | undefined;
    this.connectorId = input.options.connector as string | undefined;
    this.integrationId = input.options.integration as string | undefined;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new LogService(profileService, executeService, input);
  }

  private async validateAndNormalizeParams(): Promise<IFusebitExecutionProfile> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (this.functionId && (!profile.boundary || !profile.subscription)) {
      throw new Error(
        `When '--function is specified, both subscriptionId and boundaryId must also be specified through the profile or the command line options.`
      );
    }
    const count =
      (this.functionId === undefined ? 0 : 1) +
      (this.connectorId === undefined ? 0 : 1) +
      (this.integrationId === undefined ? 0 : 1);
    if (count > 1) {
      throw new Error(`Only one of '--function', '--connector', or '--integration' can be specified.`);
    }
    if (count > 0 && !profile.subscription) {
      throw new Error(
        `If one of '--function', '--connector', or '--integration' is specified, the '--subscription' must also be specified.`
      );
    }
    if (this.functionId && profile.boundary === undefined) {
      throw new Error(`When '--function' is specified, the '--boundary' must also be specified.`);
    }
    if (this.connectorId && profile.boundary !== 'connector' && profile.boundary !== undefined) {
      throw new Error(`When '--connector' is specified, the boundary must be set to 'connector' or left unset.`);
    } else if (this.connectorId) {
      profile.boundary = 'connector';
    }
    if (this.integrationId && profile.boundary !== 'integration' && profile.boundary !== undefined) {
      throw new Error(`When '--integration' is specified, the boundary must be set to 'integration' or left unset.`);
    } else if (this.integrationId) {
      profile.boundary = 'integration';
    }
    return profile;
  }

  public async displayParams(filter: string | undefined, stats?: string) {
    const profile = await this.validateAndNormalizeParams();
    if (this.input.options.output !== 'json') {
      const details = [
        Text.dim('Account: '),
        profile.account,
        Text.eol(),
        Text.dim('Subscription: '),
        profile.subscription || 'unset',
        ...(!this.integrationId && !this.connectorId
          ? [
              Text.eol(),
              Text.dim('Boundary: '),
              profile.boundary || Text.dim('unset'),
              Text.eol(),
              Text.dim('Function: '),
              this.functionId || Text.dim('unset'),
            ]
          : []),
        ...(this.integrationId ? [Text.eol(), Text.dim('Integration: '), this.integrationId] : []),
        ...(this.connectorId ? [Text.eol(), Text.dim('Connector: '), this.connectorId] : []),
        Text.eol(),
        Text.dim('From: '),
        this.from || Text.dim('unset (default 5 mins ago)'),
        Text.eol(),
        Text.dim('To: '),
        this.to || Text.dim('unset (default now)'),
        Text.eol(),
        Text.dim('Limit: '),
        this.limit ? this.limit.toString() : Text.dim('unset (default 20)'),
        Text.eol(),
        Text.dim('Filter: '),
        filter || Text.dim('unset'),
        ...(stats ? [Text.eol(), Text.dim('Aggregation: '), stats] : []),
      ];
      await this.executeService.result(Text.bold(`Get ${stats ? 'Stats' : 'Logs'}`), Text.create(details));
    }
  }

  public async displayLogs(logs: ILogsResult) {
    if (this.input.options.output !== 'json') {
      const details = [
        Text.dim('Records matched: '),
        logs.recordsMatched?.toString() || '0',
        Text.eol(),
        Text.dim('Records displayed: '),
        logs.results.length.toString(),
      ];
      await this.executeService.result(Text.bold('Results'), Text.create(details));
      console.log();
    }
    if (this.input.options.output !== 'pretty') {
      console.log(JSON.stringify(logs, null, 2));
      return;
    }
    for (let record of logs.results) {
      const status = record.response?.statusCode;
      const statusLine =
        status >= 200 && status < 300
          ? Text.green(status.toString())
          : status >= 400
          ? Text.red(status.toString())
          : (status || '???').toString();
      const line = [
        Text.bold(new Date(record.timestamp).toISOString()),
        ' ',
        statusLine,
        ' ',
        record.request?.method || '???',
        ' ',
        Text.dim(record.request?.url || '???'),
        ' ',
        `${record.metrics?.common?.duration || '???'}ms`,
        ' ',
        Text.dim(record.requestId || '???'),
      ];
      // const formattedMessage = await Message.create({ message: Text.create(line) });
      process.stdout.write(Text.create(line).toString() + '\n');
      if (status >= 400) {
        const cmd = `    fuse log get "requestId = '${record.requestId}'" --from ${new Date(
          new Date(record.timestamp).getTime() - 1000
        ).toISOString()} --to ${new Date(new Date(record.timestamp).getTime() + 1000).toISOString()} -o raw`;
        process.stdout.write(Text.dim(cmd).toString() + '\n');
      }
    }
  }

  public async displayStats(logs: ILogsResult) {
    if (this.input.options.output === 'json') {
      console.log(JSON.stringify(logs, null, 2));
      return;
    }
    const details = [Text.dim('Records matched: '), logs.recordsMatched?.toString() || '0'];
    await this.executeService.result(Text.bold('Results'), Text.create(details));
    if (this.input.options.output === 'raw') {
      console.log(JSON.stringify(logs, null, 2));
      return;
    }
    if (logs.results.length > 0) {
      const fieldTypes: { [key: string]: string } = {};
      const textFields: string[] = [];
      const numFields: string[] = [];
      logs.results.forEach((r) => {
        Object.keys(r).forEach((f) => {
          if (!fieldTypes[f]) {
            fieldTypes[f] = typeof r[f];
          }
        });
      });
      const columns: IColumnConstraint[] = [];
      for (let field of Object.keys(fieldTypes)) {
        columns.push({ flexShrink: 1, flexGrow: 1 });
        const isNumField = fieldTypes[field] === 'number' && field.indexOf('(') > 0;
        if (isNumField) {
          numFields.push(field);
        } else {
          textFields.push(field);
        }
      }
      const minmax: { [key: string]: { min: number; max: number } } = {};
      logs.results.forEach((r) => {
        numFields.forEach((f) => {
          if (!minmax[f]) {
            minmax[f] = { min: r[f], max: r[f] };
          } else {
            minmax[f] = { min: Math.min(minmax[f].min, r[f]), max: Math.max(minmax[f].max, r[f]) };
          }
        });
      });
      const table = await Table.create({
        width: this.input.io.outputWidth || 120,
        count: columns.length,
        gutter: Text.dim(' | '),
        columns,
      });
      const row: IText[] = [];
      textFields.forEach((f) => row.push(Text.bold(f)));
      numFields.forEach((f) => {
        row.push(Text.bold(f));
      });
      table.addRow(row);
      logs.results.forEach((r) => {
        const row: IText[] = [];
        textFields.forEach((f) => row.push((r[f] || '').toString()));
        numFields.forEach((f) => {
          row.push(
            `${'\u2588'.repeat(Math.round((10 * r[f]) / (minmax[f].max - minmax[f].min || r[f])))} ${(
              r[f] || ''
            ).toString()}`
          );
        });
        table.addRow(row);
      });
      this.input.io.writeLine(table.toText());
      this.input.io.writeLine();
    }
  }

  public async getLogs(filter?: string, stats?: string): Promise<ILogsResult> {
    const profile = await this.validateAndNormalizeParams();
    const startQueryUrl = [
      `${profile.baseUrl}/v1/account/${profile.account}`,
      profile.subscription
        ? `/subscription/${profile.subscription}${
            profile.boundary && !this.integrationId && !this.connectorId
              ? `/boundary/${profile.boundary}${this.functionId ? `/function/${this.functionId}` : ``}`
              : ``
          }${this.integrationId ? `/boundary/integration/function/${this.integrationId}` : ``}${
            this.connectorId ? `/boundary/connector/function/${this.connectorId}` : ``
          }`
        : ``,
      `/logs`,
    ].join('');
    let startQueryData: any = {
      limit: this.limit,
      filter,
      stats,
      from: this.from,
      to: this.to,
    };
    Object.keys(startQueryData).forEach((k) => {
      if (startQueryData[k] === undefined) {
        delete startQueryData[k];
      }
    });
    if (this.input.options.verbose) {
      console.log('STARTING LOGS QUERY', startQueryUrl, startQueryData);
    }

    const noun = stats ? 'stats' : 'logs';
    const Noun = stats ? 'Stats' : 'Logs';
    const response = await this.executeService.execute(
      {
        header: `Get ${Noun}`,
        message: Text.create(`Running ${noun} query...`),
        errorHeader: `Get ${Noun} Error`,
        errorMessage: Text.create(`Error running ${noun} query`),
      },
      async () => {
        const { queryId } = await this.executeService.simpleRequest({
          method: 'POST',
          url: startQueryUrl,
          headers: {
            Authorization: `Bearer ${profile.accessToken}`,
          },
          data: startQueryData,
        });
        let timeRemaining = queryTimeout;
        let currentWait = 2;
        const queryStatusUrl = `${startQueryUrl}/${encodeURIComponent(queryId)}`;
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, currentWait * 1000));
          timeRemaining -= currentWait;
          if (timeRemaining < 0) {
            throw new Error(
              `The ${noun} query did not finish within the ${queryTimeout}s timeout. Try limiting the time span of the query.`
            );
          }
          if (queryTimeout - timeRemaining > 20) {
            currentWait = 10;
          }
          const data = await this.executeService.simpleRequest({
            method: 'GET',
            url: queryStatusUrl,
            headers: {
              Authorization: `Bearer ${profile.accessToken}`,
            },
          });
          if (this.input.options.verbose) {
            console.log('QUERY POLL RESULT', data.status);
          }
          if (data.status === 'complete') {
            return data;
          }
          if (data.status !== 'scheduled' && data.status !== 'running') {
            throw new Error(`Error running the ${noun} query. Query status is '${data.status}'.`);
          }
        }
      }
    );

    return response as ILogsResult;
  }
}
