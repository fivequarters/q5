import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../services';
import { Text } from '@5qtrs/text';

export class IssuerRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Issuer',
      cmd: 'rm',
      summary: 'Remove an issuer',
      description: 'Removes the association between the account and the issuer.',
      arguments: [
        {
          name: 'issuer',
          description: 'The id of the issuer from which to remove the association to the account.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the issuer will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    const issuer = await issuerService.getIssuer(id);
    if (!issuer) {
      executeService.verbose();
      return 1;
    }

    if (confirm) {
      const confirmed = await issuerService.confirmRemoveIssuer(id, issuer);
      if (!confirmed) {
        return 1;
      }
    }

    const removeOk = await issuerService.removeIssuer(id);
    if (!removeOk) {
      executeService.verbose();
      return 1;
    }

    await executeService.result(
      'Issuer Removed',
      Text.create("The '", Text.bold(id), "' issuer was successfully remove'")
    );

    return 0;
  }
}
