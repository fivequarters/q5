// ------------------
// Internal Constants
// ------------------

const awsRegionInstances: { [index: string]: AwsRegion } = {};

const awsRegions: { [index: string]: IAwsRegion } = {
  'us-east-1': {
    name: 'N. Virginia',
    fullName: 'US East (N. Virginia)',
    code: 'us-east-1',
    public: true,
    zones: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
  },
  'us-east-2': {
    name: 'Ohio',
    fullName: 'US East (Ohio)',
    code: 'us-east-2',
    public: true,
    zones: ['us-east-2a', 'us-east-2b', 'us-east-2c'],
  },
  'us-west-1': {
    name: 'N. California',
    fullName: 'US West (N. California)',
    code: 'us-west-1',
    public: true,
    zoneLimit: 2,
    zones: ['us-west-1a', 'us-west-1b', 'us-west-1c'],
  },
  'us-west-2': {
    name: 'Oregon',
    fullName: 'US West (Oregon)',
    code: 'us-west-2',
    public: true,
    zones: ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
  },
  'us-gov-west-1': {
    name: 'GovCloud West',
    fullName: 'AWS GovCloud (US)',
    code: 'us-gov-west-1',
    public: false,
    zones: ['us-gov-west-1a', 'us-gov-west-1b', 'us-gov-west-1c'],
  },
  'us-gov-east-1': {
    name: 'GovCloud East',
    fullName: 'AWS GovCloud (US-East)',
    code: 'us-gov-east-1',
    public: false,
    zones: ['us-gov-east-1a', 'us-gov-east-1b', 'us-gov-east-1c'],
  },
  'ca-central-1': {
    name: 'Canada',
    fullName: 'Canada (Central)',
    code: 'ca-central-1',
    public: true,
    zones: ['ca-central-1a', 'ca-central-1b'],
  },
  'eu-north-1': {
    name: 'Stockholm',
    fullName: 'EU (Stockholm)',
    code: 'eu-north-1',
    public: true,
    zones: ['eu-north-1a', 'eu-north-1b', 'eu-north-1c'],
  },
  'eu-west-1': {
    name: 'Ireland',
    fullName: 'EU (Ireland)',
    code: 'eu-west-1',
    public: true,
    zones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
  },
  'eu-west-2': {
    name: 'London',
    fullName: 'EU (London)',
    code: 'eu-west-2',
    public: true,
    zones: ['eu-west-2a', 'eu-west-2b', 'eu-west-2c'],
  },
  'eu-west-3': {
    name: 'Paris',
    fullName: 'EU (Paris)',
    code: 'eu-west-3',
    public: true,
    zones: ['eu-west-3a', 'eu-west-3b', 'eu-west-3c'],
  },
  'eu-central-1': {
    name: 'Frankfurt',
    fullName: 'EU (Frankfurt)',
    code: 'eu-central-1',
    public: true,
    zones: ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
  },
  'ap-northeast-1': {
    name: 'Tokyo',
    fullName: 'Asia Pacific (Tokyo)',
    code: 'ap-northeast-1',
    public: true,
    zoneLimit: 3,
    zones: ['ap-northeast-1a', 'ap-northeast-1b', 'ap-northeast-1c', 'ap-northeast-1d'],
  },
  'ap-northeast-2': {
    name: 'Seoul',
    fullName: 'Asia Pacific (Seoul)',
    code: 'ap-northeast-2',
    public: true,
    zones: ['ap-northeast-2a', 'ap-northeast-2c'],
  },
  'ap-northeast-3': {
    name: 'Osaka',
    fullName: 'Asia Pacific (Osaka-Local)',
    code: 'ap-northeast-3',
    public: false,
    zones: ['ap-northeast-3a'],
  },
  'ap-southeast-1': {
    name: 'Singapore',
    fullName: 'Asia Pacific (Singapore)',
    code: 'ap-southeast-1',
    public: true,
    zones: ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
  },
  'ap-southeast-2': {
    name: 'Sydney',
    fullName: 'Asia Pacific (Sydney)',
    code: 'ap-southeast-2',
    public: true,
    zones: ['ap-southeast-2a', 'ap-southeast-2b', 'ap-southeast-2c'],
  },
  'ap-south-1': {
    name: 'Mumbai',
    fullName: 'Asia Pacific (Mumbai)',
    code: 'ap-south-1',
    public: true,
    zones: ['ap-south-1a', 'ap-south-1b'],
  },
  'sa-east-1': {
    name: 'São Paulo',
    fullName: 'South America (São Paulo)',
    code: 'sa-east-1',
    public: true,
    zoneLimit: 2,
    zones: ['sa-east-1a', 'sa-east-1b', 'sa-east-1c'],
  },
  'cn-north-1': {
    name: 'Beijing',
    fullName: 'China (Beijing)',
    code: 'cn-north-1',
    public: false,
    zones: ['cn-north-1a', 'cn-north-1b'],
  },
  'cn-northwest-1': {
    name: 'Ningxia',
    fullName: 'China (Ningxia)',
    code: 'cn-northwest-1',
    public: false,
    zones: ['cn-northwest-1a', 'cn-northwest-1b', 'cn-northwest-1c'],
  },
};

// --------------------
// Internale Interfaces
// --------------------

interface IAwsRegion {
  name: string;
  fullName: string;
  code: string;
  public: boolean;
  zoneLimit?: number;
  zones: string[];
}

// ----------------
// Exported Classes
// ----------------

export class AwsRegion {
  public get code() {
    return this.region.code;
  }

  public get name() {
    return this.region.name;
  }

  public get fullName() {
    return this.region.fullName;
  }

  public get public() {
    return this.region.public;
  }

  public get zoneLimit() {
    return this.region.zoneLimit;
  }

  public get zones() {
    return this.region.zones.slice(0);
  }

  public static async fromCode(code: string) {
    if (!awsRegionInstances[code]) {
      const regionData = awsRegions[code];
      if (!regionData) {
        throw new Error(`Unknown AWS region code '${code}'`);
      }
      awsRegionInstances[code] = new AwsRegion(regionData);
    }
    return awsRegionInstances[code];
  }
  private region: IAwsRegion;

  public static isRegion(code: string) {
    return awsRegions[code] !== undefined;
  }

  private constructor(region: IAwsRegion) {
    this.region = region;
  }
}
