import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { fromBase64 } from '@5qtrs/base64';
import { spawn } from '@5qtrs/child-process';
import { ECR } from 'aws-sdk';

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

interface IAwsRepository {
  arn: string;
  id: string;
  name: string;
  url: string;
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
      `docker login -u AWS -p ${token} ${auth.loginUrl} &&`,
      `docker tag ${repository}:${tag} ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag} &&`,
      `docker push ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag}`,
    ].join(' ');

    const result = await spawn(command, { shell: true });
    if (result.code !== 0) {
      const message = `Docker login and push failed with output: ${result.stderr.toString()}`;
      throw new Error(message);
    }
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

  private async getAuth(): Promise<any> {
    const ecr = await this.getAws();

    return new Promise((resolve, reject) => {
      ecr.getAuthorizationToken({}, (error: any, data: any) => {
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
