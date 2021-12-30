import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import * as grafanaConfig from '@5qtrs/grafana-config';
import awsUserData from '@5qtrs/user-data';
import { IOpsNetwork } from '@5qtrs/ops-data';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

interface IMonitoringStack {
  // defaults to official image from grafana and fusebit grafana fork.
  grafanaUseFusebitFork?: boolean;
  grafanaImagePath?: string;
  tempoImagePath?: string;
  lokiImagePath?: string;
  // defaults to latest
  grafanaImageTag?: string;
  lokiImageTag?: string;
  tempoImageTag?: string;
}
