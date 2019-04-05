import { Message, MessageKind, IExecuteInput } from '@5qtrs/cli';
import { Text, IText } from '@5qtrs/text';
import { IHttpRequest, request as sendRequest } from '@5qtrs/request';
import { Table } from '@5qtrs/table';

// -------------------
// Internal Interfaces
// -------------------

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
  private logs: ILogEntry[];

  private constructor(input: IExecuteInput) {
    this.input = input;
    this.logs = [];
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
        message: error.code !== undefined ? messages.errorMessage || '' : error.message,
        kind: MessageKind.error,
      });
      await message.write(this.input.io);
      this.logs.push({ header: messages.errorHeader, message: messages.errorMessage, error, date: new Date() });
      return undefined;
    }
  }

  public async executeRequest<T>(messages: IExcuteMessages, request: IHttpRequest) {
    const headers = (request.headers = request.headers || {});
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

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
        const message = 'An unknown error occured.';
        throw new Error(message);
      }

      return response.data;
    };

    return this.execute(messages, func);
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

  public async verbose() {
    if (this.input.options.verbose && this.logs.length) {
      const table = await Table.create({
        width: this.input.io.outputWidth,
        count: 2,
        gutter: Text.dim('  │  '),
        columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
      });

      table.addRow([Text.yellow('Error Logs'), 'The following errors were captured during command execution']);

      for (const log of this.logs) {
        if (log.message || log.error) {
          table.addRow(['', '']);
          const [date, time] = log.date.toLocaleString().split(',');
          const details = Text.create(
            date.trim(),
            Text.dim(' • '),
            time.trim(),
            log.message ? Text.create(Text.eol(), Text.dim(log.message.toString(false))) : '',
            log.error && log.error.message ? Text.create(Text.eol(), log.error.message) : ''
          );
          table.addRow([Text.yellow(log.header || 'Entry'), details]);
        }
      }

      this.input.io.writeLine(table.toText());
    }
  }
}
