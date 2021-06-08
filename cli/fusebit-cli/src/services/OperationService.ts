import { Text } from '@5qtrs/text';
import { request, IHttpResponse } from '@5qtrs/request';
import { IExecuteInput } from '@5qtrs/cli';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

export class OperationService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new OperationService(profileService, executeService, input);
  }

  public getOperation(profile: IFusebitExecutionProfile, operationId: string): Promise<IHttpResponse> {
    return request({
      method: 'GET',
      url: [
        `${profile.baseUrl}/v2/account/${profile.account}`,
        `/subscription/${profile.subscription}`,
        `/operation/${operationId}`,
      ].join(''),
      headers: { Authorization: `bearer ${profile.accessToken}` },
    });
  }

  public async displayOperationResults(operation: IHttpResponse) {
    await this.executeService.result(
      'Operation Finished',
      Text.create(
        `Operation '`,
        Text.bold(operation.data.operationId),
        `' completed with `,
        operation.data.message ? `message: ${operation.data.message}.` : `status: ${operation.status}.`
      )
    );
  }

  public async displayOperation(operationId: string) {
    await this.executeService.result(
      'Operation In Progress',
      Text.create(`Operation '`, Text.bold(operationId), `' is in progress.`)
    );
  }

  public async waitForCompletion(operationId: string) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    let operation = await this.getOperation(profile, operationId);
    if (operation.status !== 202) {
      return operation;
    }

    const upperCase = (s: string) => s[0].toUpperCase() + s.substr(1);

    await this.executeService.execute(
      {
        header: `${upperCase(operation.data.verb)} ${upperCase(operation.data.type)}...`,
        message: Text.create(
          "Waiting for operation '",
          Text.bold(`${operationId}`),
          `' to finish ${operation.data.verb} the ${operation.data.type}: ${operation.data.location.entityId}.`,
          Text.eol()
        ),
        errorHeader: 'Operation Error',
        errorMessage: Text.create(
          `Operation '`,
          Text.bold(operationId),
          `' completed with `,
          operation.data.message ? `message: ${operation.data.message}.` : `status: ${operation.status}.`
        ),
      },

      async () => {
        while (operation.status === 202) {
          operation = await this.getOperation(profile, operationId);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    );
    return operation;
  }

  public async listOperations() {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const result = await this.executeService.executeRequest(
      {
        header: 'List Operations',
        message: Text.create('Listing Operations...'),
        errorHeader: 'List Operations Error',
        errorMessage: Text.create('Unable to list operations: '),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/operation/`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }
}
