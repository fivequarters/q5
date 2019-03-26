import { IAwsOptions } from '@5qtrs/aws-base';
import { OpsApiAws, IOpsApiSetup } from '@5qtrs/ops-api-aws';
import { OpsCoreAws } from '@5qtrs/ops-core-aws';
import { AwsDynamo } from '@5qtrs/aws-dynamo';

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
    const dynamo = await AwsDynamo.create(options);
    return await dynamo.tableExists(apiName);
  }

  public async onSetupApi(setup: IOpsApiSetup, options: IAwsOptions): Promise<void> {
    const dynamo = await AwsDynamo.create(options);
    await dynamo.ensureTable({
      name: apiName,
      attributes: { id: 'S' },
      keys: ['id'],
    });
  }
}
