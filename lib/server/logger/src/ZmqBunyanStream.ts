import { Writable } from 'stream';
import Zmq from 'zeromq';

export interface IZmqBunyanStreamOptions {
  zmqPublishUrl: string;
}

export default class ZmqBunyanStream extends Writable {
  psoc: Zmq.Socket;

  public constructor(options: IZmqBunyanStreamOptions) {
    if (!options || !options.zmqPublishUrl) {
      throw new Error('options.zmqPublishUrl must be provided');
    }
    super();
    this.psoc = Zmq.socket('pub');
    this.psoc.connect(options.zmqPublishUrl);
    this.psoc.on('error', e => this.emit('error', e));
    this.psoc.on('close', () => this.emit('close'));
  }

  write(entry: any) {
    if (entry && entry.topic) {
      let topics = Array.isArray(entry.topic) ? entry.topic : [entry.topic];
      for (let n = 0; n < topics.length; n++) {
        this.psoc.send(`${topics[n]} ${JSON.stringify(entry)}`);
      }
      return false;
    }
    return true;
  }
}
