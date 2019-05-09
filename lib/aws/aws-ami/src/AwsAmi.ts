import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { AwsAmiException } from './AwsAmiException';
import { EC2 } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const officialUbuntuOwnerId = '099720109477';
const ubuntuSeverNamePrefix = 'ubuntu/images/hvm-ssd/ubuntu-';
const ubuntuServerArch = 'amd64-server';

// ------------------
// Internal Functions
// ------------------

function mapFilters(filters: any) {
  const mapped = [];
  for (const key in filters) {
    if (key) {
      mapped.push({ Name: key, Values: [filters[key]] });
    }
  }
  return mapped;
}

function mapAmi(ami: any): IAwsAmi {
  return {
    id: ami.ImageId,
    state: ami.State,
    name: ami.Name,
    created: new Date(ami.CreationDate),
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsAmi {
  id: string;
  state: string;
  name: string;
  created: Date;
}

// ----------------
// Exported Classes
// ----------------

export class AwsAmi extends AwsBase<typeof EC2> {
  public static async create(config: IAwsConfig) {
    return new AwsAmi(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  protected onGetAws(config: IAwsConfig) {
    return new EC2(config);
  }

  public async getUbuntuServerAmi(version: string): Promise<IAwsAmi> {
    const filters = {
      'owner-id': officialUbuntuOwnerId,
      state: 'available',
    };

    const amis = await this.describeImages(filters);

    let mostRecent;
    if (amis.length) {
      for (const ami of amis) {
        if (
          ami.name &&
          ami.name.indexOf(ubuntuSeverNamePrefix) === 0 &&
          ami.name.indexOf(version) !== -1 &&
          ami.name.indexOf(ubuntuServerArch) !== -1
        ) {
          if (!mostRecent || ami.created > mostRecent.created) {
            mostRecent = ami;
          }
        }
      }
    }

    if (!mostRecent) {
      throw AwsAmiException.noSuchUbuntuServerAmi(version);
    }

    return mostRecent;
  }

  private async describeImages(filters: any): Promise<IAwsAmi[]> {
    const ec2 = await this.getAws();
    const params = {
      Filters: mapFilters(filters),
    };

    return new Promise((resolve, reject) => {
      ec2.describeImages(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve(data.Images ? data.Images.map(mapAmi) : []);
      });
    });
  }
}
