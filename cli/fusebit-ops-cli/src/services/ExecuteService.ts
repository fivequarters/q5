import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/fusebit-ops-core';
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
  private core: FlexdOpsCore;
  private input: IExecuteInput;

  private constructor(core: FlexdOpsCore, input: IExecuteInput) {
    this.core = core;
    this.input = input;
  }

  public static async create(core: FlexdOpsCore, input: IExecuteInput) {
    return new ExecuteService(core, input);
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
        message: error.code !== undefined ? messages.errorMessage || '' : error.message,
        kind: MessageKind.error,
      });
      await message.write(this.input.io);
      console.log(error);
      await this.core.logError(error, message.toString());
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
