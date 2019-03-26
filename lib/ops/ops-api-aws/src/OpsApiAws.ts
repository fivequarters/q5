import { OpsCoreAws } from '@5qtrs/ops-core-aws';
import { IAwsOptions } from '@5qtrs/aws-base';
import { AwsLambda, IAwsLambdaOptions } from '@5qtrs/aws-lambda';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsApiDeploy {
  s3Bucket: string;
  s3Key: string;
  apiOptions?: IAwsLambdaOptions;
}

export interface IOpsApiSetup extends IOpsApiDeploy {
  deployment: string;
  network: string;
}

// ----------------
// Exported Classes
// ----------------

export class OpsApiAws {
  protected opsCore: OpsCoreAws;

  public static async create(opsCore: OpsCoreAws) {
    return new OpsApiAws(opsCore);
  }

  protected constructor(opsCore: OpsCoreAws) {
    this.opsCore = opsCore;
  }

  public getApiName(): string {
    throw new Error(`The 'getApiName()' method must be implemented in a derived class.`);
  }

  public getApiWorkspaceName(): string {
    throw new Error(`The 'getApiWorkspaceName()' method must be implemented in a derived class.`);
  }

  public getApiRoutes(): string[] {
    throw new Error(`The 'getApiRoutes()' method must be implemented in a derived class.`);
  }

  protected async onIsApiSetup(options: IAwsOptions): Promise<boolean> {
    return true;
  }

  protected getLambdaName() {
    return `${this.getApiName()}-api`;
  }

  protected async onSetupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {}

  public async isApiSetup(options: IAwsOptions): Promise<boolean> {
    const lambdaName = this.getLambdaName();
    const lambda = await AwsLambda.create(options);
    const functionExists = await lambda.functionExists(lambdaName);
    if (!functionExists) {
      return false;
    }

    return this.onIsApiSetup(options);
  }

  public async setupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {
    const lambdaName = this.getLambdaName();
    const lambda = await AwsLambda.create(options);
    await lambda.ensureFunction(lambdaName, setup.s3Bucket, setup.s3Key, setup.apiOptions);
    await this.onSetupApi(setup, options);
    return;
  }

  public async deployApi(deploy: IOpsApiDeploy, options: IAwsOptions) {
    const apiName = this.getApiName();
    const lambda = await AwsLambda.create(options);
    const detail = await lambda.deployFunction(apiName, deploy.s3Bucket, deploy.s3Key, deploy.apiOptions);
    await lambda.promoteFunction(apiName, detail.version);
    return detail;
  }
}
