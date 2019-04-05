import { Command, ArgType, IExecuteInput, MessageKind } from '@5qtrs/cli';
import { ExecuteService, IssuerService } from '../../services';
import { Text } from '@5qtrs/text';

export class IssuerAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add Issuer',
      cmd: 'add',
      summary: 'Add an issuer',
      description: 'Adds an issuer to the given account.',
      arguments: [
        {
          name: 'issuer',
          description: 'The issuer to add',
        },
      ],
      options: [
        {
          name: 'displayName',
          description: 'The display name of the issuer',
        },
        {
          name: 'jsonKeyUri',
          description: [
            'The URL of the hosted json keys file. The file may be either in the',
            'JSON Web Key Specification format (RFC 7517) or may be a JSON object with key ids as the',
            'object property names and the corresponding public key data as the property value.',
          ].join(' '),
        },
        {
          name: 'publicKey',
          description: [
            "The local path of a public key file. If this option is specified, the 'keyId' option",
            'must also be specified',
          ].join(' '),
        },
        {
          name: 'keyId',
          description: [
            "The key id for the public key. If this option is specified, the 'publicKey' option",
            'must also be specified',
          ].join(' '),
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: [
            'If set to true, the details regarding adding the issuer will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new IssuerAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;
    const displayName = input.options.displayName as string;
    const jsonKeyUri = input.options.jsonKeyUri as string;
    const publicKey = input.options.publicKey as string;
    const keyId = input.options.keyId as string;

    const issuerService = await IssuerService.create(input);
    const executeService = await ExecuteService.create(input);

    if (jsonKeyUri && publicKey) {
      await executeService.error(
        'Invaild Options',
        Text.create(
          "The '",
          Text.bold('publicKey'),
          "' option can not be specified if the '",
          Text.bold('jsonKeyUri'),
          "' option is specified."
        )
      );
      return 1;
    }

    if (jsonKeyUri && keyId) {
      await executeService.error(
        'Invaild Options',
        Text.create(
          "The '",
          Text.bold('keyId'),
          "' option can not be specified if the '",
          Text.bold('jsonKeyUri'),
          "' option is specified."
        )
      );
      return 1;
    }

    if ((keyId === undefined && publicKey !== undefined) || (keyId !== undefined && publicKey === undefined)) {
      await executeService.error(
        'Invaild Options',
        Text.create(
          "Both the '",
          Text.bold('keyId'),
          "' option can and the '",
          Text.bold('publicKey'),
          "' option must be specified."
        )
      );
      return 1;
    }

    const newIssuer = {
      displayName,
      jsonKeyUri,
      publicKeyPath: publicKey,
      publicKeyId: keyId,
    };

    if (confirm) {
      const confirmed = await issuerService.confirmAddIssuer(id, newIssuer);
      if (!confirmed) {
        return 1;
      }
    }

    const issuer = await issuerService.addIssuer(id, newIssuer);
    if (!issuer) {
      executeService.verbose();
      return 1;
    }

    await executeService.result(
      'Issuer Added',
      Text.create("The '", Text.bold(id), "' issuer was successfully added'")
    );

    await issuerService.displayIssuer(issuer);

    return 0;
  }
}
