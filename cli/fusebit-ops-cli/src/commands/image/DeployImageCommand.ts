import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { ExecuteService, ApiPublishService, SettingsService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class DeployImageCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    return new DeployImageCommand(core);
  }

  private constructor(core: FusebitOpsCore) {
    super({
      name: 'Image Deploy',
      cmd: 'deploy',
      summary: 'Deploy the image',
      description: 'Deploys the image to a given deployment.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the deployment',
        },
        {
          name: 'image',
          description: "The image to deploy in the form of '{repo}:{tag}'",
        },
      ],
      options: [
        {
          name: 'comment',
          aliases: ['c'],
          description: 'A comment to include with the code',
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the deployment to the Fusebit platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, image] = input.arguments as string[];

    const executeService = await ExecuteService.create(this.core, input);
    const settingsService = await SettingsService.create(this.core, input);
    const publishService = await ApiPublishService.create(this.core, input);

    const deployment = await executeService.execute(
      {
        header: 'Deployment Check',
        message: Text.create("Determining if the '", Text.bold(name), "' deployment exists... "),
        errorHeader: 'Check Error',
        errorMessage: Text.create(
          "An error was encountered when trying to determine if the '",
          Text.bold(name),
          "' deployment already exists. "
        ),
      },
      async () => this.core.getDeployment(name)
    );

    if (!deployment) {
      await executeService.execute({
        header: 'No Deployment',
        message: Text.create("The '", Text.bold(name), "' deployment does not exist."),
      });
      return 1;
    }

    const user = await settingsService.getUser();
    if (!user) {
      return 1;
    }

    deployment.createdBy = user;

    const instanceLaunched = await executeService.execute(
      {
        header: 'Launching Instance',
        message: Text.create('Launching the Fusebit service instance... '),
        errorHeader: 'Check Error',
        errorMessage: Text.create('An error was encountered when trying to launch the Fusebit service instance. '),
      },
      async () => {
        await this.core.deployInstance(name, image);
        return true;
      }
    );
    if (!instanceLaunched) {
      return 1;
    }

    await executeService.result({
      header: 'Image Deployed',
      message: Text.create(
        "A new instance with the '",
        Text.bold(image),
        "' image was successfully deployed to the  '",
        Text.bold(name),
        "' deployment."
      ),
    });

    return 0;
  }
}
