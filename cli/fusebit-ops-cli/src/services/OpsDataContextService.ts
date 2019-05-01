import { IExecuteInput, ICommandIO, Message, MessageKind } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

// -------------------
// Exported Interfaces
// -------------------

// ----------------
// Exported Classes
// ----------------

export class OpsDataContextService {
  private input: IExecuteInput;

  private constructor(input: IExecuteInput) {
    this.input = input;
  }

  public static async create(input: IExecuteInput) {
    return new MfaCodeResolverService(input);
  }

  private getMfaCodeResolver(io: ICommandIO) {
    return async (accountId: string) => {
      const message = await Message.create({
        header: 'Auth Required',
        message: Text.create(
          "Access to AWS account '",
          Text.bold(accountId),
          "' is required to continue executing the current command."
        ),
        kind: MessageKind.info,
      });

      await message.write(io);

      let mfaCode = '';
      while (!mfaCode) {
        const promptOptions = {
          prompt: 'MFA code:',
          placeholder: '(Required)',
          required: true,
        };
        mfaCode = await io.prompt(promptOptions);
      }

      const message2 = await Message.create({
        header: 'Auth',
        message: 'Authenticating with AWS...',
        kind: MessageKind.info,
      });

      await message2.write(io);
      io.spin(true);

      return { code: mfaCode };
    };
  }
}
