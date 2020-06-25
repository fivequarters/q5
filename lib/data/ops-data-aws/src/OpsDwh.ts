import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { debug } from './OpsDebug';
import { LambdaDwhZip } from '@5qtrs/ops-lambda-set';

const Async = require('async');

export async function createDwhExport(config: OpsDataAwsConfig, awsConfig: IAwsConfig, deployment: IOpsDeployment) {
  debug('IN DWH SETUP');

  const dataWarehouseKeyBase64 = config.dataWarehouseKeyBase64;

  let DwhPrefix = awsConfig.prefix || 'global';

  const Config = {
    // Lambda function that is triggered by scheduled Cloud Watch Events to exports data to DWH
    exporter: {
      name: `${DwhPrefix}-dwh-export`,
      timeout: 60,
      memory: 512,
      runtime: 'nodejs10.x',
      role: `${config.arnPrefix}:iam::${awsConfig.account}:role/${config.dwhExportRoleName}`,
    },

    // Scheduled Cloud Watch Events that trigger the scheduler Lambda
    trigger: {
      name: `${DwhPrefix}-dwh-export-trigger`,
      schedule: 'cron(0 8 * * ? *)', // Every 8am GMT (1am PST)
      // re: ? in the cron expression, see quirks https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
    },
  };

  const DeploymentPackage = LambdaDwhZip();

  let ctx: any = {};

  AWS.config.apiVersions = {
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let lambda = new AWS.Lambda(options);
  let cloudwatchevents = new AWS.CloudWatchEvents(options);

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        (cb: any) => createDwhExportTrigger(cb),
        (cb: any) => createDwhExporter(cb),
        (cb: any) => allowTriggerToExecuteExporter(cb),
        (cb: any) => addExporterAsTriggerTarget(cb),
        // TODO, tjanczuk, create CloudTrail to track execution of this funnel and preserve historical record
      ],
      (e: any) => {
        if (e) return reject(e);
        debug('DWH DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });

  function addExporterAsTriggerTarget(cb: any) {
    debug('Adding exporter Lambda as target of scheduled Cloud Watch Event...');
    return cloudwatchevents.putTargets(
      {
        Rule: Config.trigger.name,
        Targets: [{ Arn: ctx.exporterArn, Id: Config.trigger.name }],
      },
      (e, d) => {
        if (e) return cb(e);
        if (d.FailedEntryCount && d.FailedEntryCount > 0)
          return cb(
            new Error(
              'Error adding exporter Lambda as target of scheduled Cloud Watch Event: ' + JSON.stringify(d, null, 2)
            )
          );
        debug('Added.');
        cb();
      }
    );
  }

  function allowTriggerToExecuteExporter(cb: any) {
    debug('Adding permissions for Cloud Watch Event to call executor Lambda...');
    return lambda.addPermission(
      {
        FunctionName: Config.exporter.name,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: ctx.ruleArn,
        StatementId: Config.exporter.name,
      },
      (e) => {
        if (e) {
          if (e.code === 'ResourceConflictException') {
            debug('Permissions already exist.');
            return cb();
          }
          return cb(e);
        }
        debug('Added permissions.');
        cb();
      }
    );
  }

  function createDwhExportTrigger(cb: any) {
    debug('Creating exporter Cloud Watch Event...');
    return cloudwatchevents.putRule(
      {
        Name: Config.trigger.name,
        Description: 'Trigger for DWH exporter',
        ScheduleExpression: Config.trigger.schedule,
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.ruleArn = d.RuleArn;
        debug('Created scheduled Cloud Watch Event:', ctx.ruleArn);
        cb();
      }
    );
  }

  function createDwhExporter(cb: any) {
    debug('Creating DWH exporter Lambda function...');
    let params = {
      FunctionName: Config.exporter.name,
      Description: 'DWH exporter',
      Handler: 'index.handler',
      Role: Config.exporter.role,
      MemorySize: Config.exporter.memory,
      Timeout: Config.exporter.timeout,
      Runtime: Config.exporter.runtime,
      Code: {
        ZipFile: DeploymentPackage,
      },
      Environment: {
        Variables: {
          AWS_S3_BUCKET: config.getS3Bucket(deployment),
          DEPLOYMENT_ID: awsConfig.prefix || 'global',
          FUSEBIT_GC_BQ_KEY_BASE64: dataWarehouseKeyBase64,
        },
      },
    };
    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          debug('Function already exists, updating...');
          let updateCodeParams = {
            FunctionName: params.FunctionName,
            ZipFile: params.Code.ZipFile,
          };
          let updateConfigurationParams = {
            ...params,
          };
          delete updateConfigurationParams.Code;
          return Async.series(
            [
              (cb: any) => lambda.updateFunctionCode(updateCodeParams, cb),
              (cb: any) => lambda.updateFunctionConfiguration(updateConfigurationParams, cb),
            ],
            (e: any, results: any[]) => {
              if (e) return cb(e);
              ctx.exporterArn = results[0].FunctionArn;
              ctx.exporterExisted = true;
              debug('Exporter updated:', ctx.exporterArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.exporterArn = d.FunctionArn;
      debug('Exporter created:', ctx.exporterArn);
      cb();
    });
  }
}
