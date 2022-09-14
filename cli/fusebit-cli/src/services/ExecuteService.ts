import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { IText } from '@5qtrs/text';
import { IHttpRequest, IHttpResponse, request as sendRequest } from '@5qtrs/request';
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

  private constructor(input: IExecuteInput) {
    this.input = input;
  }

  public static async create(input: IExecuteInput) {
    return new ExecuteService(input);
  }

  public static addCommonHeaders(headers: any) {
    headers['User-Agent'] = `${COMMAND_MODE.toLowerCase()}-cli/${VersionService.getVersion()}`;
    if (process.env.FUSEBIT_AUTHORIZATION_ACCOUNT_ID) {
      headers['fusebit-authorization-account-id'] = process.env.FUSEBIT_AUTHORIZATION_ACCOUNT_ID;
    }
  }

  public async execute<T>(messages: IExcuteMessages, func?: () => Promise<T | undefined>) {
    try {
      if (messages.header || messages.message) {
        if (this.isPrettyOutput()) {
          await this.info(messages.header || '', messages.message || '');
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
      const message =
        error.code !== undefined
          ? `${messages.errorMessage ? messages.errorMessage + ': ' : ''}${error.message}`
          : error.message;
      await this.error(header, message);
    }
  }

  private validateSimpleResponse(response: IHttpResponse) {
    if (response.status === 404) {
      const message = 'The given entity does not exist';
      throw new Error(message);
    }
    if (response.status === 403) {
      const message = 'Access was not authorized; contact an account admin to request access';
      throw new Error(message);
    }
    if (response.status >= 500) {
      const message = 'An unknown error occurred on the server';
      throw new Error(message);
    }
    if (response.status >= 400) {
      throw new Error(response.data.message);
    }
  }

  public async executeRequest<T>(messages: IExcuteMessages, request: IHttpRequest, retryOn201: boolean = false) {
    const headers = (request.headers = request.headers || {});
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    ExecuteService.addCommonHeaders(headers);

    const func = async (): Promise<any> => {
      const response = await sendRequest(request);
      if (this.input.options.verbose) {
        console.log('EXECUTE SERVICE REQUEST', request, '\nEXECUTE SERVICE RESPONSE', {
          status: response.status,
          headers: response.headers,
          data: response.data,
        });
      }
      if (response.status === 201 && retryOn201) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await func();
      }
      this.validateSimpleResponse(response);

      return response.data;
    };

    return this.execute(messages, func);
  }

  public async executeSimpleRequest<T>(messages: IExcuteMessages, request: IHttpRequest) {
    const headers = (request.headers = request.headers || {});
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    ExecuteService.addCommonHeaders(headers);
    return this.execute(messages, async (): Promise<any> => sendRequest(request));
  }

  public async simpleRequest(request: IHttpRequest) {
    const headers = (request.headers = request.headers || {});
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    ExecuteService.addCommonHeaders(headers);
    const response = await sendRequest(request);
    if (this.input.options.verbose) {
      console.log('EXECUTE SERVICE REQUEST', request, '\nEXECUTE SERVICE RESPONSE', {
        status: response.status,
        headers: response.headers,
        data: response.data,
      });
    }
    this.validateSimpleResponse(response);

    return response.data;
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

  public async error(header: IText, message: IText, error?: Error) {
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
    throw error || new Error(`${header} - ${message}`);
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
    return output === 'raw' || output === 'export64';
  }

  private isJsonOutput() {
    const output = this.input.options.output;
    return output === 'json' || output === 'export';
  }
}
