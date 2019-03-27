import Bunyan, { LogLevelString } from 'bunyan';
import { ZmqBunyanStream } from './ZmqBunyanStream';

export { LogLevelString } from 'bunyan';

// -------------------
// Exported Interfaces
// -------------------

export interface IZmqLoggerOptions extends Bunyan.LoggerOptions {
  zmqPublishUrl: string;
  zmqPublishLevel?: LogLevelString;
  zmqKeepStdoutStream?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class ZmqLogger extends Bunyan {
  public static create(options: IZmqLoggerOptions) {
    return new ZmqLogger(options);
  }
  private zmqStream: any;

  private constructor(options: IZmqLoggerOptions) {
    const bunyanOptions = options as Bunyan.LoggerOptions;
    if (!bunyanOptions.streams && !bunyanOptions.stream && !options.zmqKeepStdoutStream) {
      bunyanOptions.streams = [];
    }
    super(options);
    this.zmqStream = new ZmqBunyanStream({ zmqPublishUrl: options.zmqPublishUrl });
    this.addStream({
      type: 'raw',
      stream: this.zmqStream,
      closeOnExit: true,
      level: options.zmqPublishLevel || 'info',
      reemitErrorEvents: false,
    });
  }

  public close() {
    this.zmqStream.end();
  }
}
