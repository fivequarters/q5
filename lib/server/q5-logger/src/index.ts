import ZmqBunyanStream from './ZmqBunyanStream';
import Bunyan from 'bunyan';

export interface IQ5LoggerOptions extends Bunyan.LoggerOptions {
  zmqPublishUrl?: string;
  zmqPublishLevel?: Bunyan.LogLevelString;
}

export default function createLogger(options: IQ5LoggerOptions): Bunyan {
  let logger = Bunyan.createLogger(options);
  let zmqPublishUrl = options.zmqPublishUrl || process.env.ZMQ_PUBLISH_URL;
  if (zmqPublishUrl) {
    logger.addStream({
      type: 'raw',
      stream: new ZmqBunyanStream({ zmqPublishUrl }),
      level:
        options.zmqPublishLevel ||
        (process.env.ZMQ_PUBLISH_LEVEL ? <Bunyan.LogLevelString>process.env.ZMQ_PUBLISH_LEVEL : 'info'),
      reemitErrorEvents: false,
    });
  }
  return logger;
}
