import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';
import * as SlackCliPlugin from './SlackPluginService';

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
        if (!this.input.options.quiet && this.isPrettyOutput()) {
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

  private isPrettyOutput() {
    const output = this.input.options.output;
    return !output || output === 'pretty';
  }

  public async newLine() {
    if (this.isPrettyOutput()) {
      return this.input.io.writeLine();
    }
  }

  public async message(header: IText, message: IText, kind: MessageKind = MessageKind.result) {
    if (!this.input.options.quiet && this.isPrettyOutput()) {
      const formattedMessage = await Message.create({ header, message, kind });
      await formattedMessage.write(this.input.io);
      if (await SlackCliPlugin.isSetup()) {
        await SlackCliPlugin.writeMessage(
          header.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''),
          message.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
        );
      }
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
