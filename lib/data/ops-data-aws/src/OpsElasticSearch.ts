const superagent = require('superagent');
const fs = require('fs');
import * as AWS from 'aws-sdk';
import { IOpsDeployment, OpsDataException } from '@5qtrs/ops-data';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { debug } from './OpsDebug';

AWS.config.apiVersions = {
	es: '2015-01-01',
	iam: '2010-05-08',
	cloudwatchlogs: '2014-03-28',
};

type ElasticSearchCreds = { username: string; password: string; hostname: string };
function generatePassword(): string {
	const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#^~,.-_';
	const pwLen = 15 + Math.random() * 15; // At least 15 characters long.
	let password = '';

	for (let i = 0; i < pwLen; i++) {
		// It ain't the best, but it makes up for it in length.
		password += dict[Math.round(Math.random() * dict.length)];
	}

	return password;
}

const parseElasticSearchUrl = (url: string): ElasticSearchCreds | undefined => {
	let esCreds = url.match(/https:\/\/([^:]+):(.*)@([^@]+$)/i);
	if (esCreds && esCreds[1] && esCreds[2] && esCreds[3]) {
		return { username: esCreds[1], password: esCreds[2], hostname: esCreds[3] };
	}
	return undefined;
};

const loadElasticSearchConfigFile = (deployment: IOpsDeployment): any => {
	const fn = deployment.elasticSearch;

	console.log('loadElasticSearchConfigFIle', fn);

	// If the path doesn't exist, throw.
	if (!fs.existsSync(fn)) {
		throw OpsDataException.invalidElasticSearchUrl(fn);
	}

	try {
		// If the file exists, try to read it.
		return JSON.parse(fs.readFileSync(fn));
	} catch (e) {
		throw OpsDataException.invalidElasticSearchUrl(fn);
	}
};

const getDefaultElasticSearchConfig = async (
	awsDataConfig: OpsDataAwsConfig,
	awsConfig: IAwsConfig,
	provider: OpsDataAwsProvider,
	tables: OpsDataTables,
	deployment: IOpsDeployment
): Promise<any> => {
	const networkData = await OpsNetworkData.create(awsDataConfig, provider, tables);
	const network = await networkData.get(deployment.networkName, deployment.region);

	// Update the VPC and password information
	const username = 'user';
	const password = generatePassword();

	return {
		DomainName: deployment.deploymentName + '-' + deployment.region + '-' + 'fusebit',

		ElasticsearchVersion: '7.4',

		CognitoOptions: { Enabled: false },

		DomainEndpointOptions: { EnforceHTTPS: true },

		EBSOptions: { EBSEnabled: true, VolumeType: 'gp2', VolumeSize: 10 },

		ElasticsearchClusterConfig: {
			InstanceType: 'r5.large.elasticsearch',
			InstanceCount: 1,
			DedicatedMasterEnabled: false,
			ZoneAwarenessEnabled: false,
			WarmEnabled: false,
		},

		NodeToNodeEncryptionOptions: {
			Enabled: true,
		},

		EncryptionAtRestOptions: {
			Enabled: true,
			KmsKeyId: `arn:aws:kms:${deployment.region}:${awsConfig.account}:alias/aws/es`,
		},

		LogPublishingOptions: {
			ES_APPLICATION_LOGS: {
				CloudWatchLogsLogGroupArn: `arn:aws:logs:${deployment.region}:${awsConfig.account}:log-group:/aws/aes/domains/${deployment.deploymentName}-${deployment.region}-es-fusebit/application-logs`,
				Enabled: true,
			},
		},

		AdvancedSecurityOptions: {
			Enabled: true,
			InternalUserDatabaseEnabled: true,
			MasterUserOptions: {
				MasterUserName: username,
				MasterUserPassword: password,
			},
		},

		VPCOptions: {
			SecurityGroupIds: [network.securityGroupId],
			SubnetIds: network.privateSubnets.map(sn => sn.id),
		},
	};
};

const appendIamRoleToES = async (esCreds: ElasticSearchCreds, iamArn: string) => {
	let patch = [{ op: 'add', path: '/all_access', value: { backend_roles: [iamArn] } }];

	try {
		let result = await superagent
			.patch(`https://${esCreds.hostname}/_opendistro/_security/api/rolesmapping`)
			.send(patch)
			.auth(esCreds.username, esCreds.password);
	} catch (e) {
		console.log('Failed to update IAM role: ', e);
	}
};

const waitForCluster = async (esCreds: ElasticSearchCreds, maxWait: number) => {
	let pass = false;
	let attempts = maxWait;
	const delay = 1000;

	do {
		attempts -= 1;
		try {
			let result = await superagent
				.get(`https://${esCreds.hostname}/_cluster/health`)
				.timeout(delay)
				.auth(esCreds.username, esCreds.password);

			// Responded with a 200; good enough.
			pass = true;
		} catch (e) {
			continue;
		}
	} while (!pass && attempts > 0);

	return attempts != 0;
};

const createElasticSearch = async (awsConfig: IAwsConfig, deployment: IOpsDeployment, esCfg: any) => {
	console.log('XXX createElasticSearch');

	const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
	const options = {
		signatureVersion: 'v4',
		region: awsConfig.region,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey,
		sessionToken: credentials.sessionToken,
	};

	let iam = new AWS.IAM(options);
	let cloudwatchlogs = new AWS.CloudWatchLogs(options);
	let es = new AWS.ES(options);

	// Make sure the service role exists first: CreateServiceLinkedRole
	await new Promise((resolve, reject) => {
		let params = { AWSServiceName: 'es.amazonaws.com', Description: '' };
		iam.createServiceLinkedRole(params, (err: any, data: any) => {
			debug('iam.createServiceLinkedRole', err, JSON.stringify(data));
			if (err && err.code != 'InvalidInput') {
				return reject(OpsDataException.failedElasticSearchCreate(err));
			}
			resolve(data);
		});
	});

	// Create the log groups resource policy
	await new Promise((resolve, reject) => {
		let params = {
			policyDocument: JSON.stringify({
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Principal: { Service: 'es.amazonaws.com' },
						Action: ['logs:PutLogEvents', 'logs:CreateLogStream'],
						Resource: `arn:aws:logs:${deployment.region}:${awsConfig.account}:log-group:/aws/aes/domains/${esCfg.DomainName}/application-logs:*`,
					},
				],
			}),
			policyName: `AES-${esCfg.DomainName}-Application-logs`,
		};
		cloudwatchlogs.putResourcePolicy(params, (err: any, data: any) => {
			debug('cloudwatchlogs.putResourcePolicy', err, JSON.stringify(data));
			if (err && err.code != 'ResourceAlreadyExistsException') {
				return reject(OpsDataException.failedElasticSearchCreate(err));
			} else resolve(data);
		});
	});

	await new Promise((resolve, reject) =>
		es.createElasticsearchDomain(esCfg, (err: any, data: any) => {
			debug('es.createElasticsearchDomain', err, JSON.stringify(data));
			if (err != null) {
				debug('Received err:', err.code);
				if (err.code != 'ResourceAlreadyExistsException') {
					return reject(OpsDataException.failedElasticSearchCreate(err));
				}
			}
			if (!data || !data.DomainStatus || !data.DomainStatus.Endpoint) {
				return reject(OpsDataException.failedElasticSearchCreate(err));
			}
			debug('Successful ES cluster create');
			debug(JSON.stringify(data));
			deployment.elasticSearch = `https://${esCfg.AdvancedSecurityOptions.MasterUserOptions.MasterUserName}:${esCfg.AdvancedSecurityOptions.MasterUserOptions.MasterUserPassword}@${data.DomainStatus.Endpoint}`;
			resolve();
		})
	);
};

export {
	parseElasticSearchUrl,
	loadElasticSearchConfigFile,
	getDefaultElasticSearchConfig,
	waitForCluster,
	appendIamRoleToES,
	createElasticSearch,
};
