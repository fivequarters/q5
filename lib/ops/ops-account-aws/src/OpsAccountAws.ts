import { IAwsOptions } from '@5qtrs/aws-base';
import { OpsApiAws, IOpsApiSetup } from '@5qtrs/ops-api-aws';
import { OpsCoreAws } from '@5qtrs/ops-core-aws';
import { AccountDataAws, INewUser, IUser, IIssuer } from '@5qtrs/account-data-aws';

export { INewUser } from '@5qtrs/account-data-aws';

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
    const accountData = await AccountDataAws.create(options);
    return accountData.isSetup();
  }

  public async onSetupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {
    const accountData = await AccountDataAws.create(options);
    return accountData.setup();
  }

  public async addRootUser(issuer: IIssuer, rootUser: INewUser, options: IAwsOptions): Promise<IUser> {
    const accountData = await AccountDataAws.create(options);
    return accountData.addRootUser(issuer, rootUser);
  }
}
