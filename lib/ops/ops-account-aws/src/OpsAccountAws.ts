import { Config } from '@5qtrs/config';
import { IAwsOptions } from '@5qtrs/aws-base';
import { OpsApiAws, IOpsApiSetup } from '@5qtrs/ops-api-aws';
import { OpsCoreAws } from '@5qtrs/ops-core-aws';
import { AccountDataAwsContextFactory } from '@5qtrs/account-data-aws';

// ------------------
// Internal Constants
// ------------------

const apiName = 'account';
const apiWorkspaceName = `${apiName}-api`;
const apiRoutes = [`/${apiName}/*`];

// ----------------
// Exported Classes
// ----------------

export class OpsAccountAws extends OpsApiAws {
  public static async create(opsCore: OpsCoreAws) {
    return new OpsAccountAws(opsCore);
  }

  private constructor(opsCore: OpsCoreAws) {
    super(opsCore);
  }

  public getApiName() {
    return apiName;
  }

  public getApiWorkspaceName() {
    return apiWorkspaceName;
  }

  public getApiRoutes() {
    return apiRoutes.slice();
  }

  public async onIsApiSetup(options: IAwsOptions): Promise<boolean> {
    const { creds, deployment } = options;
    // @ts-ignore;
    const factory = await AccountDataAwsContextFactory.create(creds, deployment);
    const dataContext = await factory.create(new Config({}));
    return dataContext.isSetup();
  }

  public async onSetupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {
    const { creds, deployment } = options;
    // @ts-ignore;
    const factory = await AccountDataAwsContextFactory.create(creds, deployment);
    const dataContext = await factory.create(new Config({}));
    return dataContext.setup();
  }
}
