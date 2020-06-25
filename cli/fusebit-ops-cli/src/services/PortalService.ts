import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsDomain, IListOpsDomainOptions, IListOpsDomainResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import * as AWS from 'aws-sdk';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { OpsCert } from '@5qtrs/ops-data-aws';
import Fs from 'fs';
import Path from 'path';
import Rimraf from 'rimraf';
import Https from 'https';
import Zip from 'jszip';
import Os from 'os';

export interface FusebitDistribution {
  Domain: string;
  Distribution: AWS.CloudFront.DistributionSummary;
  Tags: AWS.CloudFront.TagList;
}

interface FusebitPortalMetadata {
  cloudFrontId: string;
  cloudFrontDomain: string;
  certificateArn: string;
}

// ----------------
// Exported Classes
// ----------------

export interface IPortal {
  domain: string;
  rootDomain: IOpsDomain;
  version: string;
  configUrl: string;
  files: string[];
}

export class PortalService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;

  private constructor(input: IExecuteInput, opsService: OpsService, executeService: ExecuteService) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    return new PortalService(input, opsService, executeService);
  }

  public async getRootDomain(domain: string): Promise<IOpsDomain> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const rootDomain = domain.split('.').slice(1).join('.');

    if (!rootDomain) {
      this.executeService.warning(
        'Domain Name Error',
        `The portal must be deployed on a subdomain of a domain previously registered with 'fuse-ops domain add'.`
      );
      throw Error('No root domain');
    }

    const existingDomains = await this.executeService.execute(
      {
        header: 'Domain Check',
        message: `Listing available domains...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.listAll()
    );

    const existing = (existingDomains || []).find((d) => d.domainName === rootDomain);

    if (!existing) {
      this.executeService.warning(
        'Root Domain Does Not Exist',
        `The root domain of the portal '${Text.bold(
          rootDomain
        )}' does not exist. You must first register the '${Text.bold(
          rootDomain
        )}' domain with 'fuse-ops domain add'. Currently registered root domains are: ${
          existingDomains && existingDomains.length > 0 ? existingDomains.map((d) => d.domainName).join(', ') : 'N/A'
        }.`
      );
      throw Error('Root domain does not exist');
    }

    return existing;
  }

  public async confirmDeployPortal(portal: IPortal) {
    const confirmPrompt = await Confirm.create({
      header: 'Deploy the Fusebit Portal?',
      details: [
        { name: 'Domain', value: portal.domain },
        { name: 'Version', value: portal.version },
        { name: 'Config URL', value: portal.configUrl },
        { name: 'Files', value: portal.files.length > 0 ? portal.files.join(', ') : '<none>' },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Deploy Canceled',
        Text.create('Deployment of the Fusebit Portal was cancelled')
      );
      throw new Error('Deploy Canceled');
    }
  }

  public async confirmRemovePortal(domain: string) {
    const confirmPrompt = await Confirm.create({
      header: 'Remove the Fusebit Portal?',
      details: [{ name: 'Domain', value: domain }],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Remove Canceled', Text.create('Removal of the Fusebit Portal was cancelled'));
      throw new Error('Remove Canceled');
    }
  }

  public async removePortal(domain: string): Promise<void> {
    const metadata = (await this.executeService.execute(
      {
        header: 'Metadata',
        message: `Getting Fusebit Portal metadata...`,
        errorHeader: 'Portal Remove Error',
      },
      () => this.getMetadata(domain)
    )) as FusebitPortalMetadata;
    await this.executeService.execute(
      {
        header: 'Route53',
        message: `Removing Route53 entries...`,
        errorHeader: 'Portal Remove Error',
      },
      () => this.removeRoute53(domain, metadata)
    );
    await this.executeService.execute(
      {
        header: 'CloudFront',
        message: `Removing CloudFront...`,
        errorHeader: 'Portal Remove Error',
      },
      () => this.removeCloudFront(metadata)
    );
    await this.executeService.execute(
      {
        header: 'X.509 Certificate',
        message: `Removing ACM Certificate...`,
        errorHeader: 'Portal Remove Error',
      },
      () => this.removeCertificate(metadata)
    );
    await this.executeService.execute(
      {
        header: 'S3 Bucket',
        message: `Removing S3 Bucket...`,
        errorHeader: 'Portal Remove Error',
      },
      () => this.removeS3(domain)
    );
  }

  public async deployPortal(portal: IPortal): Promise<void> {
    const src = (await this.executeService.execute(
      {
        header: 'Preparing Deployment',
        message: `Downloading and configuring Fusebit Portal deployment package...`,
        errorHeader: 'Portal Deploy Error',
      },
      () => this.prepareDeployment(portal)
    )) as string;
    try {
      await this.executeService.execute(
        {
          header: 'S3 Bucket',
          message: `Configuring S3 Bucket...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.ensureS3(portal)
      );
      await this.executeService.execute(
        {
          header: 'Upload',
          message: `Uploading files to S3...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.upload(portal, src)
      );
      const certificateArn = (await this.executeService.execute(
        {
          header: 'X.509 Certificate',
          message: `Configuring ACM Certificate...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.ensureCertificate(portal)
      )) as string;
      const fusebitPortalMetadata = (await this.executeService.execute(
        {
          header: 'CloudFront',
          message: `Configuring CloudFront...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.ensureCloudFront(portal, certificateArn)
      )) as FusebitPortalMetadata;
      await this.executeService.execute(
        {
          header: 'Route53',
          message: `Configuring Route53...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.ensureRoute53(portal, fusebitPortalMetadata.cloudFrontDomain)
      );
      await this.executeService.execute(
        {
          header: 'Metadata',
          message: `Updating Metadata in S3...`,
          errorHeader: 'Portal Deploy Error',
        },
        () => this.updateMetadata(portal, fusebitPortalMetadata)
      );
    } finally {
      Rimraf.sync(src);
    }
  }

  private async ensureRoute53(portal: IPortal, cloudFrontDomain: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const route53 = await opsDataContext.provider.getAwsRoute53FromMainAccount();
    const alias = {
      name: cloudFrontDomain,
      hostedZone: 'Z2FDTNDATAQYW2', // CloudFront Hosted Zone ID is fixed
    };
    await route53.ensureRecord(portal.rootDomain.domainName, { name: portal.domain, alias, type: 'A' });
    await route53.ensureRecord(portal.rootDomain.domainName, { name: `*.${portal.domain}`, alias, type: 'A' });
  }

  private async removeRoute53(domain: string, metadata: FusebitPortalMetadata): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const route53 = await opsDataContext.provider.getAwsRoute53FromMainAccount();
    const rootDomain = await this.getRootDomain(domain);
    const alias = {
      name: metadata.cloudFrontDomain,
      hostedZone: 'Z2FDTNDATAQYW2', // CloudFront Hosted Zone ID is fixed
    };
    await route53.deleteRecord(rootDomain.domainName, { name: domain, alias, type: 'A' });
    // For some reason Route53 encodes the '*' as '\\052'
    await route53.deleteRecord(rootDomain.domainName, { name: `\\052.${domain}`, alias, type: 'A' });
  }

  private async prepareDeployment(portal: IPortal): Promise<string> {
    const src = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'fusebit-portal-'));
    try {
      const buildSrc = Path.join(src, 'build');
      const zipFileName = Path.join(src, 'portal.zip');
      const portalPackageUrl = `https://cdn.fusebit.io/fusebit/js/fusebit-portal/${portal.version.replace(
        /\./g,
        '/'
      )}/portal.zip`;

      await this.download(portalPackageUrl, zipFileName);
      Fs.mkdirSync(buildSrc);
      const files = await this.unzip(zipFileName, buildSrc);
      await this.configure(buildSrc, portal);
      portal.files.forEach((f) => {
        let fn = Path.basename(f);
        if (files.indexOf(fn) === -1) {
          files.push(fn);
        }
      });

      return src;
    } catch (e) {
      Rimraf.sync(src);
      throw e;
    }
  }

  private async getMetadata(domain: string): Promise<FusebitPortalMetadata> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    return new Promise((resolve, reject) => {
      var params = {
        Bucket: this.getS3Bucket(domain),
      };
      return s3.getBucketTagging(params, (e, d) => {
        if (e) {
          if (e.code === 'NoSuchBucket') {
            return reject(new Error(`The Fusebit Portal '${domain}' does not exist.`));
          }
          return reject(e);
        }
        const getTag = (key: string): string => {
          const result = (d.TagSet.find((t) => t.Key === `fusebit-portal-${key}`) || {}).Value;
          if (!result) {
            reject(new Error(`Unable to read Fusebit Portal metadata. Missing '${key}' value.`));
            return '';
          }
          return result as string;
        };
        resolve({
          cloudFrontId: getTag('cloudFrontId'),
          cloudFrontDomain: getTag('cloudFrontDomain'),
          certificateArn: getTag('certificateArn'),
        });
      });
    });
  }

  private async updateMetadata(portal: IPortal, metadata: FusebitPortalMetadata): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    return new Promise((resolve, reject) => {
      var params = {
        Bucket: this.getS3Bucket(portal.domain),
        Tagging: {
          TagSet: [
            {
              Key: 'fusebit-portal-cloudFrontId',
              Value: metadata.cloudFrontId,
            },
            {
              Key: 'fusebit-portal-cloudFrontDomain',
              Value: metadata.cloudFrontDomain,
            },
            {
              Key: 'fusebit-portal-certificateArn',
              Value: metadata.certificateArn,
            },
          ],
        },
      };
      return s3.putBucketTagging(params, (e, d) => (e ? reject(e) : resolve()));
    });
  }

  private async upload(portal: IPortal, src: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const s3Bucket = this.getS3Bucket(portal.domain);
    const build = Path.join(src, 'build');

    // In first pass, upload all files except top level *.html and *.json files
    await uploadDir('', false);
    // In second pass, upload only top level *.json and *.html files and disable caching of them
    await uploadDir('', true);

    async function uploadFile(fileName: string, noCache: boolean) {
      return new Promise((resolve, reject) => {
        let extension = fileName.split('.').pop();
        let contentType = 'application/octet-stream';
        switch (extension) {
          case 'html':
            contentType = 'text/html';
            break;
          case 'css':
            contentType = 'text/css';
            break;
          case 'js':
            contentType = 'application/javascript';
            break;
          case 'json':
            contentType = 'application/json';
            break;
          case 'png':
            contentType = 'image/png';
            break;
          case 'jpg':
            contentType = 'image/jpg';
            break;
          case 'gif':
            contentType = 'image/gif';
            break;
        }
        let params = {
          Body: Fs.readFileSync(Path.join(build, fileName)),
          Bucket: s3Bucket,
          Key: fileName,
          CacheControl: noCache ? 'no-cache' : undefined,
          ContentType: contentType,
          ACL: 'public-read',
        };
        return s3.putObject(params, (e, d) => (e ? reject(e) : resolve()));
      });
    }

    async function uploadDir(subdir: string, firstPass: boolean) {
      const list = Fs.readdirSync(Path.join(build, subdir), { withFileTypes: true });
      for (var i = 0; i < list.length; i++) {
        if (list[i].isDirectory()) {
          if (firstPass) {
            await uploadDir(Path.join(subdir, list[i].name), firstPass);
          }
        } else if (list[i].isFile()) {
          if (list[i].name.match(/\.html$/) || list[i].name.match(/\.json$/)) {
            if (firstPass && subdir) {
              await uploadFile(Path.join(subdir, list[i].name), false);
            } else if (!firstPass && !subdir) {
              await uploadFile(Path.join(subdir, list[i].name), true);
            }
          } else if (firstPass) {
            await uploadFile(Path.join(subdir, list[i].name), false);
          }
        }
      }
    }
  }

  private async ensureCertificate(portal: IPortal): Promise<string> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const opsCert = await OpsCert.create(opsDataContext.provider);
    // Override region - CloudFront only works with ACM certs from us-east-1:
    const cert = await opsCert.issueCert(portal.domain, { ...awsConfig, region: 'us-east-1' });
    return cert.arn;
  }

  private async removeCertificate(metadata: FusebitPortalMetadata): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const acm = new AWS.ACM({
      apiVersion: '2015-12-08',
      signatureVersion: 'v4',
      region: 'us-east-1',
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    return await new Promise((resolve, reject) => {
      acm.deleteCertificate({ CertificateArn: metadata.certificateArn }, (e) =>
        e && e.code !== 'ResourceNotFoundException' ? reject(e) : resolve()
      );
    });
  }

  private getS3Bucket(domain: string): string {
    return domain;
  }

  private getS3BucketDomain(portal: IPortal, awsConfig: IAwsConfig): string {
    return `${portal.domain}.s3-website-${awsConfig.region}.amazonaws.com`;
    // return `${portal.domain}.s3.${awsConfig.region}.amazonaws.com`;
  }

  public async listPortals(): Promise<FusebitDistribution[]> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const cf = new AWS.CloudFront({
      apiVersion: '2019-03-26',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    async function listTags(arn: string): Promise<AWS.CloudFront.Tags> {
      return new Promise((resolve, reject) => {
        return cf.listTagsForResource({ Resource: arn }, (e, d) => (e ? reject(e) : resolve(d.Tags)));
      });
    }

    return await new Promise((resolve, reject) => {
      const portals: FusebitDistribution[] = [];
      function listOne(params: AWS.CloudFront.ListDistributionsRequest) {
        cf.listDistributions(params, async (e, d) => {
          if (e) {
            return reject(e);
          }
          if (d.DistributionList && d.DistributionList.Items) {
            for (var i = 0; i < d.DistributionList.Items.length; i++) {
              if (d.DistributionList && d.DistributionList.Items) {
                const tags = await listTags(d.DistributionList.Items[i].ARN);
                if (tags.Items) {
                  const domainTag = tags.Items.find((t) => t.Key === 'fusebit-portal-domain');
                  if (domainTag) {
                    portals.push({
                      Domain: domainTag.Value || '',
                      Distribution: d.DistributionList.Items[i],
                      Tags: tags.Items,
                    });
                  }
                }
              }
            }
            if (d.DistributionList.NextMarker) {
              return listOne({ Marker: d.DistributionList.NextMarker });
            }
          }
          resolve(portals);
        });
      }
      return listOne({});
    });
  }

  private async getDistributionForPortal(domain: string): Promise<FusebitDistribution> {
    const portals = await this.listPortals();
    const portal = portals.find((p) => p.Domain === domain);
    if (!portal) {
      throw new Error(`No CloudFront distribution found for portal '${domain}'`);
    }
    return portal;
  }

  private async removeCloudFront(metadata: FusebitPortalMetadata): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const cf = new AWS.CloudFront({
      apiVersion: '2019-03-26',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    return await new Promise((resolve, reject) => {
      cf.getDistributionConfig(
        {
          Id: metadata.cloudFrontId,
        },
        (e, d) => {
          if (e) {
            if (e.code === 'NoSuchDistribution') {
              return resolve();
            }
            return reject(e);
          }
          const etag = d.ETag as string;
          delete d.ETag;
          const dc = d.DistributionConfig as AWS.CloudFront.DistributionConfig;
          if (dc.Enabled) {
            dc.Enabled = false;
            cf.updateDistribution(
              {
                DistributionConfig: d.DistributionConfig as AWS.CloudFront.DistributionConfig,
                Id: metadata.cloudFrontId,
                IfMatch: etag,
              },
              (e, d) => {
                if (e) return reject(e);
                cf.waitFor('distributionDeployed', { Id: metadata.cloudFrontId }, (e) => {
                  if (e) return reject(e);
                  cf.deleteDistribution({ Id: metadata.cloudFrontId, IfMatch: d.ETag }, (e) => resolve());
                });
              }
            );
          } else {
            cf.deleteDistribution({ Id: metadata.cloudFrontId, IfMatch: etag }, (e) => {
              if (e) reject(e);
              else resolve();
            });
          }
        }
      );
    });
  }

  private async ensureCloudFront(portal: IPortal, certificateArn: string): Promise<FusebitPortalMetadata> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const cf = new AWS.CloudFront({
      apiVersion: '2019-03-26',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const s3BucketDomain = this.getS3BucketDomain(portal, awsConfig);

    return await new Promise((resolve, reject) => {
      let params = {
        DistributionConfigWithTags: {
          DistributionConfig: {
            CallerReference: portal.domain,
            Comment: `Fusebit Portal ${portal.domain}`,
            DefaultCacheBehavior: {
              ForwardedValues: {
                Cookies: {
                  Forward: 'none',
                },
                QueryString: false,
              },
              MinTTL: 0,
              TargetOriginId: portal.domain,
              TrustedSigners: {
                Enabled: false,
                Quantity: 0,
              },
              ViewerProtocolPolicy: 'redirect-to-https',
            },
            Enabled: true,
            Origins: {
              Items: [
                {
                  DomainName: s3BucketDomain,
                  Id: portal.domain,
                  CustomOriginConfig: {
                    HTTPPort: 80,
                    HTTPSPort: 443,
                    OriginProtocolPolicy: 'http-only',
                    OriginSslProtocols: { Items: ['TLSv1', 'TLSv1.1', 'TLSv1.2'], Quantity: 3 },
                  },
                },
              ],
              Quantity: 1,
            },
            Aliases: {
              Quantity: 2,
              Items: [portal.domain, `*.${portal.domain}`],
            },
            ViewerCertificate: {
              ACMCertificateArn: certificateArn,
              SSLSupportMethod: 'sni-only',
            },
          },
          Tags: {
            Items: [
              {
                Key: 'Name',
                Value: portal.domain,
              },
              {
                Key: 'fusebit-ops-version',
                Value: require('../../package.json').version,
              },
              {
                Key: 'fusebit-portal-domain',
                Value: portal.domain,
              },
              {
                Key: 'fusebit-portal-version',
                Value: portal.version,
              },
              {
                Key: 'fusebit-portal-config-url',
                Value: portal.configUrl,
              },
            ],
          },
        },
      };
      cf.createDistributionWithTags(params, async (e, d) => {
        if (e) {
          if (e.code === 'DistributionAlreadyExists') {
            const distribution = await this.getDistributionForPortal(portal.domain);
            return cf.tagResource(
              {
                Resource: distribution.Distribution.ARN,
                Tags: params.DistributionConfigWithTags.Tags,
              },
              (e, d) =>
                e
                  ? reject(e)
                  : resolve({
                      cloudFrontDomain: distribution.Distribution.DomainName,
                      cloudFrontId: distribution.Distribution.Id,
                      certificateArn,
                    })
            );
          }
          return reject(e);
        }
        cf.waitFor('distributionDeployed', { Id: (d.Distribution as AWS.CloudFront.Distribution).Id }, (e) =>
          e
            ? reject(e)
            : resolve({
                cloudFrontDomain: (d.Distribution as AWS.CloudFront.Distribution).DomainName,
                cloudFrontId: (d.Distribution as AWS.CloudFront.Distribution).Id,
                certificateArn,
              })
        );
      });
    });
  }

  private async ensureS3(portal: IPortal): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const s3Bucket = this.getS3Bucket(portal.domain);

    await new Promise((resolve, reject) => {
      let params = {
        Bucket: s3Bucket,
        CreateBucketConfiguration:
          awsConfig.region === 'us-east-1'
            ? undefined
            : {
                LocationConstraint: awsConfig.region,
              },
      };
      s3.createBucket(params, (e, d) => {
        if (e) {
          if (e.code === 'BucketAlreadyOwnedByYou') {
            return resolve();
          }
          return reject(e);
        }
        return resolve();
      });
    });

    await new Promise((resolve, reject) => {
      let params = {
        Bucket: s3Bucket,
        WebsiteConfiguration: {
          ErrorDocument: {
            Key: 'index.html',
          },
          IndexDocument: {
            Suffix: 'index.html',
          },
        },
      };
      s3.putBucketWebsite(params, (e, d) => (e ? reject(e) : resolve()));
    });
  }

  private async removeS3(domain: string): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: awsConfig.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const s3Bucket = this.getS3Bucket(domain);

    while (true) {
      const list = (await new Promise((resolve, reject) => {
        s3.listObjects({ Bucket: s3Bucket, MaxKeys: 1000 }, (e, d) => (e ? reject(e) : resolve(d.Contents)));
      })) as AWS.S3.ObjectList | undefined;
      if (!list || list.length === 0) {
        break;
      }
      await new Promise((resolve, reject) => {
        s3.deleteObjects(
          { Bucket: s3Bucket, Delete: { Objects: list.map((i) => ({ Key: i.Key as string })), Quiet: true } },
          (e, d) =>
            e
              ? reject(e)
              : d && d.Errors && d.Errors.length > 0
              ? reject(new Error('Error deleting files from S3'))
              : resolve()
        );
      });
    }

    await new Promise((resolve, reject) => {
      s3.deleteBucket({ Bucket: s3Bucket }, (e, d) => (e ? reject(e) : resolve()));
    });
  }

  private async configure(buildSrc: string, portal: IPortal): Promise<void> {
    let index = Fs.readFileSync(Path.join(buildSrc, 'index.html'), { encoding: 'utf8' });
    index = index
      .replace(/__REACT_APP_FUSEBIT_PORTAL_CONFIG__/g, portal.configUrl)
      .replace(/__REACT_APP_FUSEBIT_PORTAL_DOMAIN__/g, portal.domain);
    Fs.writeFileSync(Path.join(buildSrc, 'index.html'), index);
    for (var i = 0; i < portal.files.length; i++) {
      Fs.copyFileSync(portal.files[i], Path.join(buildSrc, Path.basename(portal.files[i])));
    }
  }

  private async download(portalPackageUrl: string, zipFileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = Fs.createWriteStream(zipFileName);
      const request = Https.get(portalPackageUrl, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to get '${portalPackageUrl}' (${response.statusCode})`));
        }
        response.pipe(file);
      });
      file.on('finish', () => resolve());
      request.on('error', (err) => reject(err));
      file.on('error', (err) => reject(err));
      request.end();
    });
  }

  private async unzip(zipFileName: string, dest: string): Promise<string[]> {
    const d = Fs.readFileSync(zipFileName);
    var zip = new Zip();
    return zip.loadAsync(d).then(async (contents: any) => {
      let directories: any[] = [];
      let files: any[] = [];
      contents.forEach((path: string, file: any) => (file.dir ? directories.push(file) : files.push(file)));
      for (let i = 0; i < directories.length; i++) {
        Fs.mkdirSync(Path.join(dest, directories[i].name));
      }
      let f: string[] = [];
      for (let i = 0; i < files.length; i++) {
        await files[i].async('nodebuffer').then((content: any) => {
          Fs.writeFileSync(Path.join(dest, files[i].name), content);
          f.push(files[i].name);
        });
      }
      return f;
    });
  }

  public async addDomain(domain: IOpsDomain): Promise<IOpsDomain> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const domainData = opsDataContext.domainData;

    const domainWithNameServers = await this.executeService.execute(
      {
        header: 'Add Domain',
        message: `Adding the '${Text.bold(domain.domainName)}' domain to the Fusebit platform...`,
        errorHeader: 'Domain Error',
      },
      () => domainData.add(domain)
    );

    this.executeService.result(
      'Domain Added',
      `The '${Text.bold(domain.domainName)}' domain was successfully added to Fusebit platform`
    );

    return domainWithNameServers as IOpsDomain;
  }

  public async displayPortals(portals: FusebitDistribution[]): Promise<void> {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(portals, null, 2));
      return;
    }

    const getProp = (portal: FusebitDistribution, prop: string) =>
      (portal.Tags.find((t) => t.Key === prop) || {}).Value;

    const model = portals.map((portal) => ({
      domain: portal.Domain,
      version: getProp(portal, 'fusebit-portal-version'),
      configUrl: getProp(portal, 'fusebit-portal-config-url'),
      opsVersion: getProp(portal, 'fusebit-ops-version'),
    }));

    if (model.length == 0) {
      await this.executeService.warning('No Portals', 'There are no existing Fusebit Portals');
      return;
    }

    await this.executeService.message(Text.cyan('Portal Domain'), Text.cyan('Details'));
    for (var i = 0; i < model.length; i++) {
      const details = [
        Text.dim('URL: '),
        `https://${model[i].domain}`,
        Text.eol(),
        Text.dim('Version: '),
        model[i].version || '<not set>',
        Text.eol(),
        Text.dim('Config URL: '),
        model[i].configUrl || '<not set>',
        Text.eol(),
        Text.dim('Fuse-ops Version: '),
        model[i].opsVersion || '<not set>',
      ];

      await this.executeService.message(Text.bold(model[i].domain), Text.create(details));
    }
  }

  public async displayPortal(portal: IPortal) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(portal, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Portal Domain'), Text.cyan('Details'));
    this.writePortals(portal);
  }

  private async writePortals(portal: IPortal) {
    const details = [
      Text.dim('Version: '),
      portal.version,
      Text.eol(),
      Text.dim('Config URL: '),
      portal.configUrl,
      Text.eol(),
      Text.dim('Files: '),
      portal.files.length > 0 ? portal.files.join(', ') : '<none>',
    ];

    await this.executeService.message(Text.bold(portal.domain), Text.create(details));
  }
}
