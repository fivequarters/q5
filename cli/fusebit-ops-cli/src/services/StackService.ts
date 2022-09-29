import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsStack, IOpsNewStack, IListOpsStackOptions, IListOpsStackResult, IOpsDeployment } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { request } from '@5qtrs/request';

// ----------------
// Exported Classes
// ----------------

export class StackService {
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
    return new StackService(input, opsService, executeService);
  }

  public async confirmDeployStack(deployment: IOpsDeployment, stack: IOpsNewStack) {
    const confirmPrompt = await Confirm.create({
      header: 'Deploy the stack to the Fusebit platform?',
      details: [
        { name: 'Deployment', value: stack.deploymentName },
        { name: 'Tag', value: stack.tag },
        { name: 'Size', value: stack.size ? stack.size.toString() : '<Default>' },
        { name: 'Elastic Search', value: deployment.elasticSearch },
        { name: 'Environment', value: stack.env || '<Not set>' },
        { name: 'AMI', value: stack.ami || '<Official Ubuntu AMI>' },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Deploy Canceled',
        Text.create('Deploying the stack to the Fusebit platform was canceled')
      );
      throw new Error('Deploy Canceled');
    }
  }

  public async confirmPromoteStack(stack: IOpsStack) {
    const confirmPrompt = await Confirm.create({
      header: 'Promote the stack?',
      details: [
        { name: 'Deployment', value: stack.deploymentName },
        { name: 'Id', value: stack.id.toString() },
        { name: 'Tag', value: stack.tag },
        { name: 'Size', value: stack.size.toString() },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Promote Canceled', Text.create('Promoting the stack was canceled'));
      throw new Error('Promote Canceled');
    }
  }

  public async confirmDemoteStack(stack: IOpsStack) {
    const confirmPrompt = await Confirm.create({
      header: 'Demote the stack?',
      details: [
        { name: 'Deployment', value: stack.deploymentName },
        { name: 'Id', value: stack.id.toString() },
        { name: 'Tag', value: stack.tag },
        { name: 'Size', value: stack.size.toString() },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Demote Canceled', Text.create('Demoting the stack was canceled'));
      throw new Error('Demote Canceled');
    }
  }

  public async confirmRemoveStack(stack: IOpsStack) {
    const confirmPrompt = await Confirm.create({
      header: 'Remove the stack?',
      details: [
        { name: 'Deployment', value: stack.deploymentName },
        { name: 'Id', value: stack.id.toString() },
        { name: 'Tag', value: stack.tag },
        { name: 'Size', value: stack.size.toString() },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning('Remove Canceled', Text.create('Removing the stack was canceled'));
      throw new Error('Remove Canceled');
    }
  }

  public async waitForStack(stack: IOpsStack, deployment: IOpsDeployment, disableHealthCheck?: boolean): Promise<void> {
    let url = `https://stack-${stack.id}.${deployment.deploymentName}.${deployment.region}.${
      deployment.domainName
    }/v1/${disableHealthCheck ? 'healthz' : 'health'}`;

    await this.executeService.execute(
      {
        header: 'Waiting for the New Stack',
        message: `Waiting up to 5 minutes for the new stack '${stack.id}' on deployment '${Text.bold(
          deployment.deploymentName
        )}' to report healthy at ${url}`,
        errorHeader: 'Error',
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        for (let i = 0; i < 27; i++) {
          let response = await request({ method: 'GET', url, validStatus: () => true });
          if (disableHealthCheck && response.status === 404) return;
          if (response.status === 200) return;
          await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        }
        throw new Error(
          `Stack '${stack.id}' on deployment '${Text.bold(
            deployment.deploymentName
          )}' did not report healthy within 5 minutes. You can manually check the health status of the stack at ${url}`
        );
      }
    );

    await this.executeService.result(
      'Stack is Healthy',
      `The new stack '${stack.id}' on deployment '${Text.bold(deployment.deploymentName)}' is healthy`
    );
  }

  public async deploy(newStack: IOpsNewStack): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const { deploymentName, tag } = newStack;

    const stack = await this.executeService.execute(
      {
        header: 'Deploying Stack',
        message: `Deploying a stack for deployment '${Text.bold(deploymentName)}' with tag '${Text.bold(tag)}'`,
        errorHeader: 'Deploy Error',
      },
      () => stackData.deploy(newStack)
    );

    await this.executeService.result(
      'Stack Deployed',
      `A stack for deployment '${Text.bold(deploymentName)}' with tag '${Text.bold(tag)}' was successfully deployed`
    );

    return stack as IOpsStack;
  }

  public async promote(deploymentName: string, region: string, id: number): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Promote Stack',
        message: `Promoting stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Promote Error',
      },
      () => stackData.promote(deploymentName, region, id)
    );

    await this.executeService.result(
      'Stack Promoted',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully promoted`
    );

    return result as IOpsStack;
  }

  public async demote(deploymentName: string, region: string, id: number, force: boolean): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Demote Stack',
        message: `Demote stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Demote Error',
      },
      () => stackData.demote(deploymentName, region, id, force)
    );

    await this.executeService.result(
      'Stack Demoted',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully demoted`
    );

    return result as IOpsStack;
  }

  public async remove(deploymentName: string, region: string, id: number, force: boolean): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    await this.executeService.execute(
      {
        header: 'Remove Stack',
        message: `Remove stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Remove Error',
      },
      () => stackData.remove(deploymentName, region, id, force)
    );

    await this.executeService.result(
      'Stack Removed',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully removed`
    );

    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify({ id, deploymentName, region, active: false }, null, 2));
    }
  }

  public async getStack(deploymentName: string, region: string, id: number): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Get Stack',
        message: `Getting stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Stack Error',
      },
      () => stackData.get(deploymentName, region, id)
    );
    return result as IOpsStack;
  }

  public async listAllStacks(options?: IListOpsStackOptions): Promise<IOpsStack[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Get Stacks',
        message: `Getting the stacks on the Fusebit platform...`,
        errorHeader: 'Stack Error',
      },
      () => stackData.listAll(options)
    );
    return result as IOpsStack[];
  }

  public async listStacks(options?: IListOpsStackOptions): Promise<IListOpsStackResult> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const messages =
      options && options.next
        ? {}
        : {
            header: 'Get Stacks',
            message: `Getting the stacks on the Fusebit platform...`,
            errorHeader: 'Stack Error',
          };

    const result = await this.executeService.execute(messages, () => stackData.list(options));
    return result as IListOpsStackResult;
  }

  public async confirmListMore(): Promise<boolean> {
    const confirmPrompt = await Confirm.create({ header: 'Get More Stacks?' });
    return confirmPrompt.prompt(this.input.io);
  }

  public async displayStacks(stacks: IOpsStack[], deployments: IOpsDeployment[]) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(stacks, null, 2));
      return;
    }

    if (stacks.length == 0) {
      await this.executeService.warning('No Stacks', 'There are no stacks on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.cyan('Stack'), Text.cyan('Details'));
    for (const stack of stacks) {
      let deployment: IOpsDeployment | undefined = undefined;
      for (const d of deployments) {
        if (d.deploymentName === stack.deploymentName && d.region === stack.region) {
          deployment = d;
          break;
        }
      }
      this.writeStacks(stack, deployment);
    }
  }

  public async displayStack(stack: IOpsStack) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(stack, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Stack'), Text.cyan('Details'));
    this.writeStacks(stack);
  }

  private async writeStacks(stack: IOpsStack, deployment?: IOpsDeployment) {
    const details = [
      Text.dim('Tag: '),
      stack.tag,
      Text.eol(),
      Text.dim('Size: '),
      stack.size.toString(),
      Text.eol(),
      Text.dim('Elastic Search: '),
      deployment?.elasticSearch ? 'supported' : 'disabled',
      Text.eol(),
      Text.dim('fuse-ops Version: '),
      stack.fuseopsVersion,
      Text.eol(),
      Text.dim('Status: '),
      stack.active ? 'ACTIVE' : 'NOT ACTIVE',
    ];
    if (deployment) {
      details.push(
        Text.eol(),
        Text.dim('Base URL: '),
        `https://stack-${stack.id}.${stack.deploymentName}.${stack.region}.${deployment.domainName}`
      );
    }
    const stackName = [Text.bold(stack.deploymentName), ':', Text.bold(stack.id.toString())];

    await this.executeService.message(Text.create(stackName), Text.create(details));
  }
}
