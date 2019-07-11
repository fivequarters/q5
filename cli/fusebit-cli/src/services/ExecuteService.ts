import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';
import { IHttpRequest, request as sendRequest } from '@5qtrs/request';
import { VersionService } from './VersionService';

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

export interface ILogEntry {
  header?: IText;
  message?: IText;
  error?: Error;
  date: Date;
}

// ----------------
// Exported Classes
// ----------------

export class ExecuteService {
  private input: IExecuteInput;
  private versionService: VersionService;

  private constructor(input: IExecuteInput, versionService: VersionService) {
    this.input = input;
    this.versionService = versionService;
  }

  public static async create(input: IExecuteInput) {
    const versionService = await VersionService.create(input);
    return new ExecuteService(input, versionService);
  }

  public async execute<T>(messages: IExcuteMessages, func?: () => Promise<T | undefined>) {
    try {
      if (messages.header || messages.message) {
        if (this.isPrettyOutput()) {
          this.info(messages.header || '', messages.message || '');
          this.input.io.spin(true);
        }
      }
      if (func) {
        const result = await func();
        return result;
      }
      return undefined;
    } catch (error) {
      const header = messages.errorHeader || '';
      const message = error.code !== undefined ? messages.errorMessage || '' : error.message;
      this.error(header, message);
    }
  }

  public async executeRequest<T>(messages: IExcuteMessages, request: IHttpRequest) {
    const headers = (request.headers = request.headers || {});
    const version = await this.versionService.getVersion();
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    headers['User-Agent'] = `fusebit-cli/${version}`;

    const func = async () => {
      const response = await sendRequest(request);
      if (response.status === 404) {
        const message = 'The given entity does not exist.';
        throw new Error(message);
      }
      if (response.status === 403) {
        const message = 'Access was not authorized. Contact an account admin to request access.';
        throw new Error(message);
      }
      if (response.status >= 500) {
        const message = 'An unknown error occured on the server.';
        throw new Error(message);
      }
      if (response.status >= 400) {
        throw new Error(response.data.message);
      }

      return response.data;
    };

    return this.execute(messages, func);
  }

  public async message(header: IText, message: IText, kind: MessageKind = MessageKind.result) {
    if (this.isPrettyOutput()) {
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
    if (this.isPrettyOutput()) {
      await this.message(header, message, MessageKind.error);
    } else if (this.isRawOutput()) {
      await this.input.io.writeLineRaw(`ERROR: ${header} - ${message}`);
    } else if (this.isJsonOutput()) {
      const json = {
        error: {
          status: header.toString(false),
          message: message.toString(false),
        },
      };
      await this.input.io.writeLineRaw(JSON.stringify(json, null, 2));
    }
    throw new Error(`${header} - ${message}`);
  }

  public async info(header: IText, message: IText) {
    return this.message(header, message, MessageKind.info);
  }

  public async newLine() {
    if (this.isPrettyOutput()) {
      return this.input.io.writeLine();
    }
  }

  private isPrettyOutput() {
    const output = this.input.options.output;
    return !output || output === 'pretty';
  }

  private isRawOutput() {
    const output = this.input.options.output;
    return output === 'raw';
  }

  private isJsonOutput() {
    const output = this.input.options.output;
    return output === 'json';
  }
}
