import { Message, IExecuteInput, Confirm, MessageKind } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitFunctionShort {
  functionId: string;
  boundaryId: string;
}

export interface IFusebitFunctionListOptions {
  cron?: boolean;
  next?: string;
  count?: number;
}

export interface IFusebitFunctionListResult {
  items: IFusebitFunctionShort[];
  next?: string;
}

// ----------------
// Exported Classes
// ----------------

export class FunctionService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new FunctionService(profileService, executeService, input);
  }

  public async listFunctions(options: IFusebitFunctionListOptions): Promise<IFusebitFunctionListResult> {
    let profile = await this.profileService.getExecutionProfile(['subscription']);
    let cronMessage = '';

    const query = [];
    if (options.cron !== undefined) {
      cronMessage = options.cron ? 'CRON ' : 'non-CRON ';
      query.push(`cron=${options.cron}`);
    }
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }

    const queryString = `?${query.join('&')}`;
    const boundaryUrl = profile.boundary ? `/boundary/${profile.boundary}/function` : '/function';

    const result = await this.executeService.executeRequest(
      {
        header: 'List Functions',
        message: Text.create(
          'Listing ',
          Text.bold(cronMessage),
          `functions of account '`,
          Text.bold(profile.account || ''),
          "', subscription '",
          Text.bold(profile.subscription || ''),
          profile.boundary ? "', boundary '" + Text.bold(profile.boundary) + "'" : "'"
        ),
        errorHeader: 'List Functions Error',
        errorMessage: Text.create("Unable to list the functions of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${
          profile.subscription
        }${boundaryUrl}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Functions?', yesNo: true });
    return result.length > 0;
  }

  public async displayFunctions(functions: IFusebitFunctionShort[], firstDisplay: boolean) {
    if (!functions.length) {
      await this.executeService.info('No Functions', `No ${firstDisplay ? '' : 'more '}functions to list`);
      return;
    }

    const boundaries: { [index: string]: string[] } = {};
    for (const functionShort of functions) {
      const { boundaryId, functionId } = functionShort;
      boundaries[boundaryId] = boundaries[boundaryId] || [];
      boundaries[boundaryId].push(functionId);
    }

    const message = await Message.create({
      header: Text.cyan('Boundaries'),
      message: Text.cyan('Functions'),
    });
    await message.write(this.input.io);

    for (const boundary in boundaries) {
      await this.writeBoundary(boundary, boundaries[boundary]);
    }
  }

  private async writeBoundary(boundaryName: string, functions: string[]) {
    const functionList = Text.join(functions, Text.dim(', '));
    await this.executeService.message(Text.bold(boundaryName), functionList);
  }
}
