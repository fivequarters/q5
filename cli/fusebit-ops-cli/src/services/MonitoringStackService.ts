import AWS from 'aws-sdk';

import * as grafanaConfig from '@5qtrs/grafana-config';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import { IOpsNetwork } from '@5qtrs/ops-data';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

const STACK_SERVICE_PREFIX = 'stack-';

interface IDatabaseCredentials {
  username: string;
  password: string;
  schemaName: string;
  endpoint: string;
}

export class MonitoringStackService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new MonitoringStackService(opsSvc, execSvc, config, credentials, input);
  }

  constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput
  ) {}

  private getGrafanaIniFile(credentials: IDatabaseCredentials) {
    const configTemplate = grafanaConfig.getConfigTemplate();
  }
}
