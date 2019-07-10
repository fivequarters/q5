import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';
import { IHttpRequest, request as sendRequest } from '@5qtrs/request';
import { VersionService } from './VersionService';

// ------------------
// Internal Constants
// ------------------

const prettyOutput = 'pretty';
const rawOutput = 'raw';
const jsonOutput = 'json';

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
        const output = this.input.options.output;
        if (!output || output === prettyOutput) {
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
      throw error;
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
    const output = this.input.options.output;
    if (!output || output === prettyOutput) {
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
    if (this.input.options.output === prettyOutput) {
      return this.message(header, message, MessageKind.error);
    } else if (this.input.options.output === rawOutput) {
      return this.input.io.writeLineRaw(`ERROR: ${header} - ${message}`);
    } else if (this.input.options.output === jsonOutput) {
      const json = {
        error: {
          status: header.toString(false),
          message: message.toString(false),
        },
      };
      this.input.io.writeLineRaw(JSON.stringify(json, null, 2));
    }
  }

  public async info(header: IText, message: IText) {
    return this.message(header, message, MessageKind.info);
  }

  public async newLine() {
    const output = this.input.options.output;
    if (!output || output === prettyOutput) {
      return this.input.io.writeLine();
    }
  }
}
