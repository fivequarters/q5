import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsStack, IOpsNewStack, IListOpsStackOptions, IListOpsStackResult } from '@5qtrs/ops-data';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

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

  public async confirmDeployStack(stack: IOpsNewStack) {
    const confirmPrompt = await Confirm.create({
      header: 'Deploy the stack to the Fusebit platform?',
      details: [
        { name: 'Deployment', value: stack.deploymentName },
        { name: 'Tag', value: stack.tag },
        { name: 'Size', value: stack.size ? stack.size.toString() : '<default>' },
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

  public async promote(deploymentName: string, id: number): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Promote Stack',
        message: `Promoting stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Promote Error',
      },
      () => stackData.promote(deploymentName, id)
    );

    await this.executeService.result(
      'Stack Promoted',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully promoted`
    );

    return result as IOpsStack;
  }

  public async demote(deploymentName: string, id: number, force: boolean): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Demote Stack',
        message: `Demote stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Demote Error',
      },
      () => stackData.demote(deploymentName, id, force)
    );

    await this.executeService.result(
      'Stack Demoted',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully demoted`
    );

    return result as IOpsStack;
  }

  public async remove(deploymentName: string, id: number, force: boolean): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    await this.executeService.execute(
      {
        header: 'Remove Stack',
        message: `Remove stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Remove Error',
      },
      () => stackData.remove(deploymentName, id, force)
    );

    await this.executeService.result(
      'Stack Removed',
      `Stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}' was successfully removed`
    );
  }

  public async getStack(deploymentName: string, id: number): Promise<IOpsStack> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Get Stack',
        message: `Getting stack '${Text.bold(id.toString())}' of deployment '${Text.bold(deploymentName)}'`,
        errorHeader: 'Stack Error',
      },
      () => stackData.get(deploymentName, id)
    );
    return result as IOpsStack;
  }

  public async listAllStacks(deploymentName?: string): Promise<IOpsStack[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const stackData = opsDataContext.stackData;

    const result = await this.executeService.execute(
      {
        header: 'Get Stacks',
        message: `Getting the stacks on the Fusebit platform...`,
        errorHeader: 'Stack Error',
      },
      () => stackData.listAll(deploymentName)
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

  public async displayStacks(stacks: IOpsStack[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(stacks, null, 2));
      return;
    }

    if (stacks.length == 0) {
      await this.executeService.warning('No Stacks', 'There are no stacks on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.blue('Stack'), Text.blue('Details'));
    for (const stack of stacks) {
      this.writeStacks(stack);
    }
  }

  public async displayStack(stack: IOpsStack) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(stack, null, 2));
      return;
    }

    await this.executeService.message(Text.blue('Stack'), Text.blue('Details'));
    this.writeStacks(stack);
  }

  private async writeStacks(stack: IOpsStack) {
    const details = [
      Text.dim('Tag: '),
      stack.tag,
      Text.eol(),
      Text.dim('Size: '),
      stack.size.toString(),
      Text.eol(),
      Text.dim('Status: '),
      stack.active ? 'ACTIVE' : 'NOT ACTIVE',
    ];
    const stackName = [Text.bold(stack.deploymentName), ':', Text.bold(stack.id.toString())];

    await this.executeService.message(Text.create(stackName), Text.create(details));
  }
}
