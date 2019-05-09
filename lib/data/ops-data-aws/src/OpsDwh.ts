import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
const Async = require('async');
const Fs = require('fs');
const Path = require('path');

export async function createDwhExport(config: OpsDataAwsConfig, awsConfig: IAwsConfig) {
  if (!process.env.FUSEBIT_GC_BQ_KEY_BASE64) {
    throw new Error('You must specify the FUSEBIT_GC_BQ_KEY_BASE64 environment variable.');
  }

  const Config = {
    // Lambda function that is triggered by scheduled Cloud Watch Events to exports data to DWH
    exporter: {
      name: `${awsConfig.prefix || 'global'}-dwh-export`,
      timeout: 60,
      memory: 512,
      runtime: 'nodejs8.10',
      role: 'arn:aws:iam::321612923577:role/fusebit-dwh-export', // pre-created
    },

    // Scheduled Cloud Watch Events that trigger the scheduler Lambda
    trigger: {
      name: `${awsConfig.prefix || 'global'}-dwh-export-trigger`,
      schedule: 'cron(0 8 * * ? *)', // Every 8am GMT (1am PST)
      // re: ? in the cron expression, see quirks https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
    },
  };

  const DeploymentPackage = Fs.readFileSync(Path.join(__dirname, '../lambda/dwh/dist/dwh_export.zip'));

  let ctx: any = {};

  AWS.config.apiVersions = {
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  AWS.config.accessKeyId = credentials.accessKeyId;
  AWS.config.secretAccessKey = credentials.secretAccessKey;
  AWS.config.sessionToken = credentials.sessionToken;
  AWS.config.region = awsConfig.region;
  AWS.config.signatureVersion = 'v4';

  let lambda = new AWS.Lambda();
  let cloudwatchevents = new AWS.CloudWatchEvents();

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
        // console.log('DWH DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });

  function addExporterAsTriggerTarget(cb: any) {
    // console.log('Adding exporter Lambda as target of scheduled Cloud Watch Event...');
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
        // console.log('Added.');
        cb();
      }
    );
  }

  function allowTriggerToExecuteExporter(cb: any) {
    // console.log('Adding permissions for Cloud Watch Event to call executor Lambda...');
    return lambda.addPermission(
      {
        FunctionName: Config.exporter.name,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: ctx.ruleArn,
        StatementId: Config.exporter.name,
      },
      e => {
        if (e) {
          if (e.code === 'ResourceConflictException') {
            // console.log('Permissions already exist.');
            return cb();
          }
          return cb(e);
        }
        // console.log('Added permissions.');
        cb();
      }
    );
  }

  function createDwhExportTrigger(cb: any) {
    // console.log('Creating exporter Cloud Watch Event...');
    return cloudwatchevents.putRule(
      {
        Name: Config.trigger.name,
        Description: 'Trigger for DWH exporter',
        ScheduleExpression: Config.trigger.schedule,
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.ruleArn = d.RuleArn;
        // console.log('Created scheduled Cloud Watch Event:', ctx.ruleArn);
        cb();
      }
    );
  }

  function createDwhExporter(cb: any) {
    // console.log('Creating DWH exporter Lambda function...');
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
          AWS_S3_BUCKET: config.getS3Bucket(awsConfig),
          DEPLOYMENT_ID: awsConfig.prefix || 'global',
          FUSEBIT_GC_BQ_KEY_BASE64: process.env.FUSEBIT_GC_BQ_KEY_BASE64 as string,
        },
      },
    };
    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          // console.log('Function already exists, updating...');
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
              // console.log('Exporter updated:', ctx.exporterArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.exporterArn = d.FunctionArn;
      // console.log('Exporter created:', ctx.exporterArn);
      cb();
    });
  }
}
