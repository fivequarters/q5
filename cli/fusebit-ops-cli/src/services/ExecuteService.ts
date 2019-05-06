import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';

// -------------------
// Exported Interfaces
// -------------------

export interface IExcuteMessages {
  header?: IText;
  message?: IText;
  kind?: MessageKind;
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
      if (func) {
        const result = await func();
        return result;
      }
      return undefined;
    } catch (error) {
      const message = await Message.create({
        header: messages.errorHeader,
        message: messages.errorMessage || error.message,
        kind: MessageKind.error,
      });
      await message.write(this.input.io);
      throw error;
    }
  }

  public async message(header: IText, message: IText, kind: MessageKind = MessageKind.result) {
    if (!this.input.options.quiet) {
      const formattedMessage = await Message.create({ header, message, kind });
      await formattedMessage.write(this.input.io);
    }
  }

  public async result(header: IText, message: IText) {
    return this.message(header, message, MessageKind.result);
  }

  public async warning(header: IText, message: IText) {
    return this.message(header, message, MessageKind.warning);
  }

  public async error(header: IText, message: IText) {
    return this.message(header, message, MessageKind.error);
  }

  public async info(header: IText, message: IText) {
    return this.message(header, message, MessageKind.info);
  }
}
