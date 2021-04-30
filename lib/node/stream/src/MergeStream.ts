import { Writable } from 'stream';

interface ISourceStream {
  stream: Writable;
  finished: boolean;
  buffered: {
    chunk: any;
    encoding: BufferEncoding;
  }[];
}

export class MergeStream {
  private sinkStream: Writable;
  private sourceStreams: ISourceStream[];
  private currentSourceStream?: ISourceStream;
  private sinkClosed: boolean;

  constructor(sinkStream: Writable) {
    this.sinkStream = sinkStream;
    this.sinkClosed = false;
    this.sourceStreams = [];

    const done = (error?: Error) => {
      if (!this.sinkClosed) {
        this.sinkClosed = true;
        if (this.currentSourceStream) {
          this.currentSourceStream.stream.destroy(error);
          this.currentSourceStream.finished = true;
        }
        for (const sourceStream of this.sourceStreams) {
          sourceStream.stream.destroy(error);
          sourceStream.finished = true;
        }
      }
    };

    sinkStream.on('error', done);
    sinkStream.on('close', done);
  }

  public createSourceStream() {
    const stream = new Writable();
    const sourceStream = {
      buffered: new Array<{ chunk: any; encoding: BufferEncoding }>(),
      finished: false,
      stream,
    };

    this.sourceStreams.push(sourceStream);
    if (!this.currentSourceStream) {
      this.currentSourceStream = this.sourceStreams.shift();
    }

    stream._write = (chunk, encoding: BufferEncoding, callback) => {
      if (!this.sinkClosed) {
        if (sourceStream === this.currentSourceStream) {
          this.sinkStream.write(chunk, encoding, callback);
        } else {
          sourceStream.buffered.push({ chunk, encoding });
          callback();
        }
      }
    };

    const getNextSourceStream = () => {
      if (!this.sinkClosed) {
        this.currentSourceStream = this.sourceStreams.shift();
        if (this.currentSourceStream) {
          const buffered = this.currentSourceStream.buffered;
          while (buffered.length) {
            const nextWrite = buffered.shift();
            this.sinkStream.write(nextWrite!.chunk, nextWrite!.encoding);
          }
          if (this.currentSourceStream.finished) {
            getNextSourceStream();
          }
        }
      }
    };

    const done = () => {
      sourceStream.finished = true;
      if (sourceStream === this.currentSourceStream) {
        getNextSourceStream();
      }
    };

    stream.on('error', done);
    stream.on('close', done);
    stream.on('finish', done);

    return stream;
  }
}
