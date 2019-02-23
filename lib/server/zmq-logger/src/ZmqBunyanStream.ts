import { Writable } from 'stream';
import Zmq from 'zeromq';

// -------------------
// Internal Interfaces
// -------------------

interface IZmqBunyanStreamOptions {
  zmqPublishUrl: string;
}

// ----------------
// Exported Classes
// ----------------

export class ZmqBunyanStream extends Writable {
  public psoc: Zmq.Socket;
  public readyState: number = 0;
  public buffer: any[] = [];

  public constructor(public options: IZmqBunyanStreamOptions) {
    super();
    if (!options || !options.zmqPublishUrl) {
      throw new Error('options.zmqPublishUrl must be provided');
    }
    this.psoc = Zmq.socket('pub');
    this.psoc.on('error', e => this.emit('error', e));
    this.psoc.on('close', () => this.emit('close'));
  }

  public write(entry: any) {
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

  public _flush() {
    this.buffer.forEach(entry => {
      const topics: string[] = entry.topics || [];
      if (topics.length === 0) {
        if (entry.level >= 50) {
          topics.push(`logs:errors:${entry.name}:`);
        }
        topics.push(`logs:system:${entry.name}:${'*'.repeat(Math.min(10, (entry.level || 10) / 10))}:`);
      }
      const msg = JSON.stringify(entry);
      for (const topic of topics) {
        try {
          this.psoc.send(`${topic} ${msg}`);
        } catch (_) {
          // do nothing
        }
      }
    });
    this.buffer = [];
  }

  public end(cb?: () => void) {
    this.psoc.close();
    if (cb) {
      cb();
    }
  }
}
