import { IAwsOptions } from '@5qtrs/aws-base';
import { OpsApiAws, IOpsApiSetup } from '@5qtrs/ops-api-aws';
import { OpsCoreAws } from '@5qtrs/ops-core-aws';
// ------------------
// Internal Constants
// ------------------

const apiName = 'user';
const apiWorkspaceName = `${apiName}-api`;
const apiRoutes = [`/${apiName}/*`];

// ----------------
// Exported Classes
// ----------------

export class OpsUserAws extends OpsApiAws {
  public static async create(opsCore: OpsCoreAws) {
    return new OpsUserAws(opsCore);
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
    return true;
  }

  public async onSetupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {}
}
