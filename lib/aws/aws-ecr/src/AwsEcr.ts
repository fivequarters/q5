import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { fromBase64 } from '@5qtrs/base64';
import { spawn } from '@5qtrs/child-process';
import { ECR } from 'aws-sdk';
import { Readable } from 'stream';

// ------------------
// Internal Constants
// ------------------

const repositoryNotFoundCode = 'RepositoryNotFoundException';

// ------------------
// Internal Functions
// ------------------

function mapToRepo(item: any) {
  return {
    arn: item.repositoryArn,
    id: item.repositoryId,
    name: item.repositoryName,
    url: item.repositoryUri,
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsRepository {
  arn: string;
  id: string;
  name: string;
  url: string;
}

export interface IAwsImage {
  repository: string;
  tag: string;
  size: number;
  updatedAt: Date;
}

// ----------------
// Exported Classes
// ----------------

export class AwsEcr extends AwsBase<typeof ECR> {
  public static async create(config: IAwsConfig) {
    return new AwsEcr(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async pullImage(repository: string, tag: string) {
    const accountId = this.config.govCloud ? '848193282749' : '321612923577';
    const region = this.config.govCloud ? 'us-gov-west-1' : 'us-west-2';
    const auth = await this.getAuth(accountId);
    const decoded = fromBase64(auth.token);
    const token = decoded.substring(4);
    const command = [
      `docker login -u AWS --password-stdin ${auth.loginUrl} &&`,
      `docker pull ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag} &&`,
      `docker tag ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag} ${repository}:${tag}`,
    ].join(' ');

    let options = { shell: true, stdin: new Readable() };
    options.stdin.push(token);
    options.stdin.push(null);
    const result = await spawn(command, options);
    if (result.code !== 0) {
      const message = `Docker login and pull failed with output: ${result.stderr.toString()}`;
      throw new Error(message);
    }

    await this.pushImage(repository, tag);
  }

  public async pushImage(repository: string, tag: string) {
    const repo = await this.getRepository(repository);
    if (!repo) {
      const message = `No such ECR '${repository}' repository`;
      throw new Error(message);
    }

    const accountId = this.awsAccount;
    const region = this.awsRegion;
    const auth = await this.getAuth();
    const decoded = fromBase64(auth.token);
    const token = decoded.substring(4);
    const command = [
      `docker login -u AWS --password-stdin ${auth.loginUrl} &&`,
      `docker tag ${repository}:${tag} ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag} &&`,
      `docker push ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag}`,
    ].join(' ');

    let options = { shell: true, stdin: new Readable() };
    options.stdin.push(token);
    options.stdin.push(null);
    const result = await spawn(command, options);
    if (result.code !== 0) {
      const message = `Docker login and push failed with output: ${result.stderr.toString()}`;
      throw new Error(message);
    }
  }

  public async describeImages(name: string): Promise<IAwsImage[]> {
    const ecr = await this.getAws();
    const params = {
      repositoryName: name,
      filter: {
        tagStatus: 'ANY',
      },
      maxResults: 1000,
    };

    return new Promise((resolve, reject) => {
      ecr.describeImages(params, (error, data) => {
        if (error) {
          return reject(error);
        }

        const images: IAwsImage[] = [];
        if (data.imageDetails) {
          for (const image of data.imageDetails) {
            images.push({
              repository: name,
              size: image.imageSizeInBytes || 0,
              tag: image.imageTags && image.imageTags.length ? image.imageTags[0] : '<unknown>',
              updatedAt: image.imagePushedAt || new Date(),
            });
          }
        }

        resolve(images);
      });
    });
  }

  public async repositoryExists(name: string): Promise<boolean> {
    try {
      await this.getRepository(name);
      return true;
    } catch (error) {
      if (error.code === repositoryNotFoundCode) {
        return false;
      }

      throw error;
    }
  }

  public async createRepository(name: string): Promise<IAwsRepository> {
    const ecr = await this.getAws();

    const params = {
      repositoryName: name,
    };

    return new Promise((resolve, reject) => {
      ecr.createRepository(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const repo = data.repository ? mapToRepo(data.repository) : undefined;
        resolve(repo);
      });
    });
  }

  public async getRepository(name: string): Promise<IAwsRepository> {
    const ecr = await this.getAws();

    const params = {
      repositoryNames: [name],
    };

    return new Promise((resolve, reject) => {
      ecr.describeRepositories(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const repo = mapToRepo(data.repositories[0]);
        resolve(repo);
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new ECR(config);
  }

  private async getAuth(registryId?: string): Promise<any> {
    const ecr = await this.getAws();

    return new Promise((resolve, reject) => {
      ecr.getAuthorizationToken(registryId ? { registryIds: [registryId] } : {}, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const auth = {
          token: data.authorizationData[0].authorizationToken,
          loginUrl: data.authorizationData[0].proxyEndpoint,
        };
        resolve(auth);
      });
    });
  }
}
