import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';

// -------------------
// Exported Interfaces
// -------------------

export interface IExcuteMessages {
  header?: IText;
  message?: IText;
  errorHeader?: IText;
  errorMessage?: IText;
}

// ----------------
// Exported Classes
// ----------------

export class ExecuteService {
  private input: IExecuteInput;

  private constructor(input: IExecuteInput) {
    this.input = input;
  }

  public static async create(input: IExecuteInput) {
    return new ExecuteService(input);
  }

  public async execute<T>(messages: IExcuteMessages, func?: () => Promise<T | undefined>) {
    try {
      if (messages.header || messages.message) {
        if (!this.input.options.quiet) {
          const message = await Message.create({
            header: messages.header,
            message: messages.message || '',
            kind: MessageKind.info,
          });
          await message.write(this.input.io);
          this.input.io.spin(true);
        }
      }
      return func ? func() : undefined;
    } catch (error) {
      const message = await Message.create({
        header: messages.errorHeader,
        message: error.code !== undefined ? messages.errorMessage || '' : error.message,
        kind: MessageKind.error,
      });
      await message.write(this.input.io);
      return undefined;
    }
  }

  public async result(messages: IExcuteMessages) {
    if (messages.header || messages.message) {
      if (!this.input.options.quiet) {
        const message = await Message.create({
          header: messages.header,
          message: messages.message || '',
          kind: MessageKind.result,
        });
        await message.write(this.input.io);
        this.input.io.spin(true);
      }
    }
  }
}
