import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { EC2, ServiceDiscovery } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const vpcCIDR = '10.0.0.0/16';
const subnet1CIDR = '10.0.0.0/18';
const subnet2CIDR = '10.0.64.0/18';
const subnet3CIDR = '10.0.128.0/18';
const subnet4CIDR = '10.0.192.0/18';
const defaultRouteCIDR = '0.0.0.0/0';
const subnetPublicCIDRs = [subnet1CIDR, subnet2CIDR];
const subnetPrivateCIDRs = [subnet3CIDR, subnet4CIDR];
const vpcType = 'vpc';
const securityGroupType = 'sg';
const internetGatewayType = 'ig';
const natGatewayType = 'ng';
const publicSubnetType = 'pub-sn';
const privateSubnetType = 'pri-sn';
const publicRouteTableType = 'pub-rt';
const privateRouteTableType = 'pri-rt';

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsNetworkDetail {
  vpcId: string;
  securityGroupId: string;
  lambdaSecurityGroupId: string;
  publicSubnets: IAwsSubnetDetail[];
  privateSubnets: IAwsSubnetDetail[];
}

export interface IAwsSubnetDetail {
  id: string;
  availabilityZone: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsNetwork extends AwsBase<typeof EC2> {
  public static async create(config: IAwsConfig) {
    return new AwsNetwork(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async networkExists(name: string): Promise<boolean> {
    const vpcId = await this.getVpcId(name);
    return vpcId !== undefined;
  }
  public async ensureNetwork(
    name: string,
    createIfNotExists: boolean,
    discoveryDomain: string,
    existingVpcId?: string,
    existingPublicSubnetIds?: string[],
    existingPrivateSubnetIds?: string[]
  ): Promise<IAwsNetworkDetail> {
    const vpcId = await this.ensureVpc(name, createIfNotExists, existingVpcId);
    const securityGroupId = await this.ensureSecurityGroup(name, vpcId, createIfNotExists);
    const lambdaSecurityGroupId = await this.ensureLambdaSecurityGroup(name, vpcId, createIfNotExists);
    await this.ensureCloudMap(vpcId, name, discoveryDomain);

    let publicSubnets: IAwsSubnetDetail[] = [];
    if (existingPublicSubnetIds) {
      for (let id of existingPublicSubnetIds) {
        publicSubnets.push(await this.getExistingSubnet(id));
        await this.tagPublic(id, true);
        await this.tagResource(id, name, publicSubnetType);
      }
    } else if (createIfNotExists) {
      const internetGatewayId = await this.ensureInternetGateway(name, vpcId);
      const publicRouteTableId = await this.ensureRouteTable(name, vpcId, true, internetGatewayId);
      publicSubnets = await this.ensureSubnets(name, vpcId, true, publicRouteTableId);
    } else {
      publicSubnets = await this.getExistingSubnets(name, true);
    }

    let privateSubnets: IAwsSubnetDetail[] = [];
    if (existingPrivateSubnetIds) {
      for (let id of existingPrivateSubnetIds) {
        privateSubnets.push(await this.getExistingSubnet(id));
        await this.tagPublic(id, false);
        await this.tagResource(id, name, privateSubnetType);
      }
    } else if (createIfNotExists) {
      const natGatewayId = await this.ensureNatGateway(name, vpcId, publicSubnets[0].id);
      const privateRouteTableId = await this.ensureRouteTable(name, vpcId, false, natGatewayId);
      privateSubnets = await this.ensureSubnets(name, vpcId, false, privateRouteTableId);
    } else {
      privateSubnets = await this.getExistingSubnets(name, false);
    }

    return {
      vpcId,
      securityGroupId,
      lambdaSecurityGroupId,
      publicSubnets,
      privateSubnets,
    };
  }

  public async getVpcId(name: string): Promise<string | undefined> {
    const ec2 = await this.getAws();

    const params = {
      Filters: [
        {
          Name: 'tag:Name',
          Values: [this.getResourceName(name, vpcType)],
        },
      ],
    };
    return new Promise((resolve, reject) => {
      ec2.describeVpcs(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        if (data.Vpcs.length > 1) {
          return reject(this.getMultipleResourceError(name, vpcType));
        }
        const id = data && data.Vpcs && data.Vpcs[0] ? data.Vpcs[0].VpcId : undefined;
        resolve(id);
      });
    });
  }

  public async getNatGateway(name: string, vpcId: string): Promise<string> {
    const ec2 = await this.getAws();
    const params = {
      Filter: [
        {
          Name: 'vpc-id',
          Values: [vpcId],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.describeNatGateways(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        if (data.NatGateways.length > 1) {
          return reject(this.getMultipleResourceError(name, natGatewayType));
        }
        const id = data && data.NatGateways && data.NatGateways[0] ? data.NatGateways[0].NatGatewayId : undefined;
        resolve(id);
      });
    });
  }

  public async getExistingSubnet(id: string): Promise<IAwsSubnetDetail> {
    const ec2 = await this.getAws();
    const params = {
      SubnetIds: [id],
    };

    return new Promise((resolve, reject) => {
      ec2.describeSubnets(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const subnet = data && data.Subnets && data.Subnets.length ? data.Subnets[0] : undefined;
        if (!subnet) {
          return reject(new Error(`Subnet '${id}' does not exist.`));
        }
        resolve({
          id: subnet.SubnetId,
          availabilityZone: subnet.AvailabilityZone,
        });
      });
    });
  }

  public async getExistingSubnets(name: string, isPublic: boolean): Promise<IAwsSubnetDetail[]> {
    const ec2 = await this.getAws();
    const params = {
      Filters: [
        {
          Name: 'tag:Name',
          Values: [this.getResourceName(name, isPublic ? publicSubnetType : privateSubnetType)],
        },
      ],
    };
    return new Promise((resolve, reject) => {
      ec2.describeSubnets(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        if (data && data.Subnets && data.Subnets.length > 0) {
          return resolve(data.Subnets.map((s: any) => ({ id: s.SubnetId, availabilityZone: s.AvailabilityZone })));
        } else {
          return reject(new Error(`No existing ${isPublic ? 'public' : 'private'} subnets found on network '${name}'`));
        }
      });
    });
  }

  public async getSubnet(name: string, vpcId: string, cidr: string): Promise<IAwsSubnetDetail | undefined> {
    const ec2 = await this.getAws();
    const params = {
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId],
        },
        {
          Name: 'cidr-block',
          Values: [cidr],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.describeSubnets(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const subnet = data && data.Subnets && data.Subnets.length ? data.Subnets[0] : undefined;
        resolve(
          subnet
            ? {
                id: subnet.SubnetId,
                availabilityZone: subnet.AvailabilityZone,
              }
            : undefined
        );
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new EC2(config);
  }

  private async ensureVpc(name: string, createIfNotExists: boolean, existingVpcId?: string): Promise<string> {
    let vpcId = await this.getVpcId(name);
    if (!vpcId) {
      if (existingVpcId) {
        vpcId = existingVpcId;
      } else if (createIfNotExists) {
        vpcId = await this.createVpc();
      } else {
        throw new Error(`The VPC of the network '${name}' does not exist`);
      }
    }
    await this.waitForVpc(vpcId);
    await this.tagResource(vpcId, name, vpcType);
    return vpcId;
  }

  private async ensureSecurityGroup(name: string, vpcId: string, createIfNotExists: boolean): Promise<string> {
    let securityGroupId = await this.getSecurityGroup(name, vpcId);
    if (!securityGroupId) {
      if (createIfNotExists) {
        securityGroupId = await this.createSecurityGroup(name, vpcId);
      } else {
        throw new Error(`The security group of network '${name}' on VPC '${vpcId}' does not exist`);
      }
    }
    await this.authorizeSecurityGroupIngress(securityGroupId);
    await this.tagResource(securityGroupId, name, securityGroupType);
    return securityGroupId;
  }

  private async ensureLambdaSecurityGroup(name: string, vpcId: string, createIfNotExists: boolean): Promise<string> {
    let securityGroupId = await this.getSecurityGroup(name, vpcId, true);
    if (!securityGroupId) {
      if (createIfNotExists) {
        securityGroupId = await this.createSecurityGroup(name, vpcId, true);
      } else {
        throw new Error(`The Lambda security group of network '${name}' on VPC '${vpcId}' does not exist`);
      }
    }
    await this.authorizeSecurityGroupIngress(securityGroupId);
    await this.revokeSecurityGroupLambdaEgress(securityGroupId);
    await this.authorizeSecurityGroupLambdaEgress(securityGroupId);
    await this.tagResource(securityGroupId, name, securityGroupType, true);
    return securityGroupId;
  }

  private async ensureInternetGateway(name: string, vpcId: string): Promise<string> {
    let internetGatewayId = await this.getInternetGateway(name, vpcId);
    if (!internetGatewayId) {
      internetGatewayId = await this.createInternetGateway();
      await this.attachInternetGateway(vpcId, internetGatewayId);
    }
    await this.tagResource(internetGatewayId, name, internetGatewayType);
    return internetGatewayId;
  }

  private async ensureNatGateway(name: string, vpcId: string, publicSubnetId: string): Promise<string> {
    let natGatewayId = await this.getNatGateway(name, vpcId);
    if (!natGatewayId) {
      const elasticIpId = await this.allocateElasticIp();
      natGatewayId = await this.createNatGateway(elasticIpId, publicSubnetId);
      await this.waitForNatGateway(natGatewayId);
    }
    await this.tagResource(natGatewayId, name, natGatewayType);
    return natGatewayId;
  }

  private async ensureRouteTable(name: string, vpcId: string, isPublic: boolean, gatewayId: string): Promise<string> {
    let routeTableId = await this.getRouteTable(name, isPublic, vpcId);
    if (!routeTableId) {
      routeTableId = await this.createRouteTable(vpcId);
    }
    await this.createRoute(routeTableId, gatewayId, defaultRouteCIDR);
    await this.tagResource(routeTableId, name, isPublic ? publicRouteTableType : privateRouteTableType);
    await this.tagPublic(routeTableId, isPublic);
    return routeTableId;
  }

  private async ensureSubnets(
    name: string,
    vpcId: string,
    isPublic: boolean,
    routeTableId: string
  ): Promise<IAwsSubnetDetail[]> {
    const subnets: IAwsSubnetDetail[] = [];
    const availabilityZones = await this.getAvailabilityZones();
    const subnetCIDRs = isPublic ? subnetPublicCIDRs : subnetPrivateCIDRs;
    for (let i = 0; i < subnetCIDRs.length; i++) {
      const zone = availabilityZones[i] || availabilityZones[0];
      let subnet = await this.getSubnet(name, vpcId, subnetCIDRs[i]);
      if (!subnet) {
        subnet = await this.createSubnet(vpcId, subnetCIDRs[i], zone);
      }
      subnets.push(subnet);
    }

    for (const subnet of subnets) {
      await this.waitForSubnet(subnet.id);
      await this.associateRouteTable(routeTableId, subnet.id);
      await this.tagPublic(subnet.id, isPublic);
      await this.tagResource(subnet.id, name, isPublic ? publicSubnetType : privateSubnetType);
    }

    return subnets;
  }

  private async createVpc(): Promise<string> {
    const ec2 = await this.getAws();
    const params = {
      CidrBlock: vpcCIDR,
    };

    return new Promise((resolve, reject) => {
      ec2.createVpc(params, async (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const id = data.Vpc.VpcId;
        resolve(id);
      });
    });
  }

  private async waitForVpc(id: string): Promise<string> {
    const ec2 = await this.getAws();
    const params = { VpcIds: [id] };
    return new Promise((resolve, reject) => {
      ec2.waitFor('vpcAvailable', params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve(id);
      });
    });
  }

  private async allocateElasticIp(): Promise<string> {
    const ec2 = await this.getAws();
    const params = { Domain: 'vpc' };
    return new Promise((resolve, reject) => {
      ec2.allocateAddress(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.AllocationId);
      });
    });
  }

  private async createNatGateway(elasticIpId: string, publicSubnetId: string): Promise<string> {
    const ec2 = await this.getAws();
    const params = {
      AllocationId: elasticIpId,
      SubnetId: publicSubnetId,
    };

    return new Promise((resolve, reject) => {
      ec2.createNatGateway(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.NatGateway.NatGatewayId);
      });
    });
  }

  private async waitForNatGateway(id: string): Promise<string> {
    const ec2 = await this.getAws();
    const params = { NatGatewayIds: [id] };
    return new Promise((resolve, reject) => {
      ec2.waitFor('natGatewayAvailable', params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve(id);
      });
    });
  }

  private async createSubnet(vpcId: string, cidr: string, availabilityZone: string): Promise<IAwsSubnetDetail> {
    const ec2 = await this.getAws();
    const params = {
      VpcId: vpcId,
      CidrBlock: cidr,
      AvailabilityZone: availabilityZone,
    };
    return new Promise((resolve, reject) => {
      ec2.createSubnet(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const subnetAvailabilityZone = data.Subnet.AvailabilityZone;
        const id = data.Subnet.SubnetId;
        resolve({ id, availabilityZone: subnetAvailabilityZone });
      });
    });
  }

  private async waitForSubnet(id: string): Promise<IAwsSubnetDetail> {
    const ec2 = await this.getAws();
    const params = { SubnetIds: [id] };
    return new Promise((resolve, reject) => {
      ec2.waitFor('subnetAvailable', params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const availabilityZone = data.Subnets[0].AvailabilityZone;
        resolve({ id, availabilityZone });
      });
    });
  }

  private async getInternetGateway(name: string, vpcId: string): Promise<string> {
    const ec2 = await this.getAws();

    const params = {
      Filters: [
        {
          Name: 'attachment.vpc-id',
          Values: [vpcId],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.describeInternetGateways(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        if (data.InternetGateways.length > 1) {
          return reject(this.getMultipleResourceError(name, 'internet gateways'));
        }
        const id =
          data && data.InternetGateways && data.InternetGateways[0] ? data.InternetGateways[0].InternetGatewayId : '';
        resolve(id);
      });
    });
  }

  private async createInternetGateway(): Promise<string> {
    const ec2 = await this.getAws();
    return new Promise((resolve, reject) => {
      ec2.createInternetGateway({}, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const id = data.InternetGateway.InternetGatewayId;
        resolve(id);
      });
    });
  }

  private async attachInternetGateway(vpcId: string, gatewayId: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      VpcId: vpcId,
      InternetGatewayId: gatewayId,
    };
    return new Promise((resolve, reject) => {
      ec2.attachInternetGateway(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async getRouteTable(name: string, isPublic: boolean, vpcId: string): Promise<string> {
    const ec2 = await this.getAws();

    const params = {
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.describeRouteTables(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const filtered = data.RouteTables.filter((routeTable: any) => {
          const tags = routeTable.Tags;
          for (const tag of tags) {
            if (tag.Key === 'public') {
              return isPublic;
            }
          }
          return !isPublic;
        });

        if (filtered.length > 1) {
          return reject(this.getMultipleResourceError(name, `${isPublic ? 'public' : 'private'} route table`));
        }
        const id = filtered[0] ? filtered[0].RouteTableId : '';
        resolve(id);
      });
    });
  }

  private async createRouteTable(vpcId: string): Promise<string> {
    const ec2 = await this.getAws();
    const params = {
      VpcId: vpcId,
    };
    return new Promise((resolve, reject) => {
      ec2.createRouteTable(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const id = data.RouteTable.RouteTableId;
        resolve(id);
      });
    });
  }

  private async associateRouteTable(routeTableId: string, subnetId: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      RouteTableId: routeTableId,
      SubnetId: subnetId,
    };

    return new Promise((resolve, reject) => {
      ec2.associateRouteTable(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async createRoute(routeTableId: string, gatewayId: string, cidr: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      DestinationCidrBlock: cidr,
      RouteTableId: routeTableId,
      GatewayId: gatewayId,
    };

    return new Promise((resolve, reject) => {
      ec2.createRoute(params, (error: any) => {
        if (error && error.code !== 'RouteAlreadyExists') {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async getSecurityGroup(name: string, vpcId: string, forLambda: boolean = false): Promise<string> {
    const ec2 = await this.getAws();

    const params = {
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId],
        },
        {
          Name: 'tag:Name',
          Values: [`${name}-${securityGroupType}${forLambda ? '-lambda' : ''}`],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.describeSecurityGroups(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        if (data.SecurityGroups.length > 1) {
          return reject(this.getMultipleResourceError(name, 'security group'));
        }
        const id = data && data.SecurityGroups && data.SecurityGroups[0] ? data.SecurityGroups[0].GroupId : '';
        resolve(id);
      });
    });
  }

  private async createSecurityGroup(name: string, vpcId: string, forLambda: boolean = false): Promise<string> {
    const ec2 = await this.getAws();
    const fullName = this.getFullName(name);
    const params = {
      Description: `Security Group for ${fullName} Deployment${forLambda ? ' for Lambda VPC access' : ''}`,
      GroupName: `SG-${fullName}${forLambda ? '-lambda' : ''}`,
      VpcId: vpcId,
    };

    return new Promise((resolve, reject) => {
      ec2.createSecurityGroup(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const id = data.GroupId;
        resolve(id);
      });
    });
  }

  private async authorizeSecurityGroupIngress(securityGroupId: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      GroupId: securityGroupId,
      IpPermissions: [
        {
          FromPort: 80,
          IpProtocol: 'tcp',
          IpRanges: [
            {
              CidrIp: '0.0.0.0/0',
            },
          ],
          ToPort: 80,
        },
        {
          FromPort: 443,
          IpProtocol: 'tcp',
          IpRanges: [
            {
              CidrIp: '0.0.0.0/0',
            },
          ],
          ToPort: 443,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.authorizeSecurityGroupIngress(params, (error: any) => {
        if (error && error.code !== 'InvalidPermission.Duplicate') {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async authorizeSecurityGroupLambdaEgress(securityGroupId: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      GroupId: securityGroupId,
      IpPermissions: [
        {
          FromPort: -1,
          ToPort: -1,
          IpProtocol: '-1',
          IpRanges: [
            { CidrIp: '0.0.0.0/5' },
            { CidrIp: '8.0.0.0/7' },
            { CidrIp: '11.0.0.0/8' },
            { CidrIp: '12.0.0.0/6' },
            { CidrIp: '16.0.0.0/4' },
            { CidrIp: '32.0.0.0/3' },
            { CidrIp: '64.0.0.0/2' },
            { CidrIp: '128.0.0.0/1' },
          ],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.authorizeSecurityGroupEgress(params, (error: any) => {
        if (error && error.code !== 'InvalidPermission.Duplicate') {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async revokeSecurityGroupLambdaEgress(securityGroupId: string): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      GroupId: securityGroupId,
      IpPermissions: [
        {
          FromPort: -1,
          ToPort: -1,
          IpProtocol: '-1',
          IpRanges: [{ CidrIp: '0.0.0.0/0' }],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.revokeSecurityGroupEgress(params, (error: any) => {
        if (error && error.code !== 'InvalidPermission.NotFound') {
          return reject(error);
        }

        resolve();
      });
    });
  }

  private async getAvailabilityZones(): Promise<string[]> {
    const ec2 = await this.getAws();

    return new Promise((resolve, reject) => {
      ec2.describeAvailabilityZones({}, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const results: string[] = [];
        if (data && data.AvailabilityZones) {
          for (const zone of data.AvailabilityZones) {
            if (zone.State === 'available') {
              results.push(zone.ZoneName);
            }
          }
        }
        resolve(results);
      });
    });
  }

  private async tagPublic(id: string, isPublic: boolean): Promise<void> {
    if (!isPublic) {
      return;
    }

    const ec2 = await this.getAws();
    const params = {
      Resources: [id],
      Tags: [
        {
          Key: 'public',
          Value: 'true',
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.createTags(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async tagResource(id: string, name: string, type: string, forLambda: boolean = false): Promise<void> {
    const ec2 = await this.getAws();
    const params = {
      Resources: [id],
      Tags: [
        {
          Key: 'region',
          Value: this.awsRegion,
        },
        {
          Key: 'Name',
          Value: `${this.getResourceName(name, type)}${forLambda ? '-lambda' : ''}`,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      ec2.createTags(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private getMultipleResourceError(name: string, resourceName: string) {
    const fullName = this.getFullName(name);
    const message = `Mulitple ${resourceName} instances found for the '${fullName}' network`;
    return new Error(message);
  }

  private getResourceName(name: string, type: string) {
    const fullName = this.getFullName(name);
    return `${fullName}-${type}`;
  }

  private async getCloudMapSdk() {
    console.log(this.awsRegion);
    const creds = await this.awsCreds?.getCredentials();
    return new ServiceDiscovery({
      ...creds,
      region: this.awsRegion,
    });
  }

  public async ensureCloudMap(vpcId: string, networkName: string, discoveryDomain: string) {
    const mapSdk = await this.getCloudMapSdk();
    const zones = await mapSdk.listNamespaces().promise();
    for (const zone of zones.Namespaces as AWS.ServiceDiscovery.NamespaceSummariesList) {
      if (zone.Description === networkName) {
        return;
      }
    }

    await mapSdk
      .createPrivateDnsNamespace({
        Description: networkName,
        Name: discoveryDomain,
        Vpc: vpcId,
      })
      .promise();
  }
}
