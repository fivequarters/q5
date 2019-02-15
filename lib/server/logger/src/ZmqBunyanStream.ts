import { Writable } from 'stream';
import Zmq from 'zeromq';

export interface IZmqBunyanStreamOptions {
  zmqPublishUrl: string;
}

export default class ZmqBunyanStream extends Writable {
  psoc: Zmq.Socket;
  readyState: number = 0;
  buffer: any[] = [];

  public constructor(public options: IZmqBunyanStreamOptions) {
    super();
    if (!options || !options.zmqPublishUrl) {
      throw new Error('options.zmqPublishUrl must be provided');
    }
    this.psoc = Zmq.socket('pub');
    this.psoc.on('error', e => this.emit('error', e));
    this.psoc.on('close', () => this.emit('close'));
  }

  write(entry: any) {
    this.buffer.push(entry);
    if (this.readyState < 2) {
      if (this.readyState < 1) {
        this.readyState = 1;
        this.psoc.monitor();
        this.psoc.connect(this.options.zmqPublishUrl);
        this.psoc.on('connect', () => {
          this.readyState = 2;
          this._flush();
        });
      }
      return false;
    } else {
      this._flush();
      return true;
    }
  }

  _flush() {
    this.buffer.forEach(entry => {
      let topics: string[] = entry.topics || [];
      if (topics.length === 0) {
        if (entry.level >= 50) {
          topics.push(`logs:errors:${entry.name}:`);
        }
        topics.push(`logs:system:${entry.name}:${'*'.repeat(Math.min(10, (entry.level || 10) / 10))}:`);
      }
      let msg = JSON.stringify(entry);
      for (let n = 0; n < topics.length; n++) {
        try {
          this.psoc.send(`${topics[n]} ${msg}`);
        } catch (_) {}
      }
    });
    this.buffer = [];
  }
}
