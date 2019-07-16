import { EOL } from 'os';
import http from 'http';
import https from 'https';

// ------------------
// Internal Functions
// ------------------

function isHttps(url: string) {
  return (
    url &&
    url
      .toLowerCase()
      .trim()
      .indexOf('https://') === 0
  );
}

function parseLinesIntoStreamMessage(lines: string[]): IEventMessage[] {
  let nextMessage: IEventMessage | undefined;
  let rawLines: string[] = [];

  const messages: IEventMessage[] = [];

  let line;
  while ((line = lines.shift()) !== undefined) {
    if (nextMessage) {
      if (nextMessage.data === undefined) {
        if (line.indexOf('data:') === 0) {
          rawLines.push(line);
          nextMessage.data = line.replace(/^data:\s+/, '');
        }
      } else if (line.trim() === '') {
        if (rawLines[rawLines.length - 1] === '') {
          messages.push(nextMessage);
          rawLines = [];
        } else {
          rawLines.push('');
        }
      } else {
        rawLines.push(line);
        nextMessage.data = nextMessage.data + line;
      }
    } else {
      const segments = line.split(/\s+/);
      if (segments.length === 2 && segments[0] === 'event:') {
        rawLines = [line];
        nextMessage = {
          name: segments[1],
          data: undefined,
        };
      }
    }
  }

  if (rawLines.length) {
    lines.push(...rawLines);
  }

  return messages;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IEventMessage {
  name: string;
  data: any;
}

export interface IEventStreamOptions {
  headers?: { [index: string]: string };
  onMessage?: (message: IEventMessage) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

// ----------------
// Exported Classes
// ----------------

export class EventStream {
  private response: http.IncomingMessage;

  public static async create(url: string, options?: IEventStreamOptions): Promise<EventStream> {
    return new Promise((resolve, reject) => {
      const requestOptions: any = {};
      if (options && options.headers) {
        requestOptions.headers = options.headers;
      }
      const scheme = isHttps(url) ? https : http;
      const request = scheme.request(url, requestOptions, response => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to connect. HTTP response status code: ${response.statusCode}`));
        } else {
          resolve(new EventStream(response, options || {}));
        }
      });

      request.on('error', reject);
      request.end();
    });
  }

  private constructor(response: http.IncomingMessage, options: IEventStreamOptions) {
    this.response = response;

    let buffer: string[] = [];

    this.response.on('end', () => {
      if (options.onEnd) {
        options.onEnd();
      }
    });

    this.response.setEncoding('utf8');
    this.response.on('data', (chunk: string) => {
      if (options.onMessage) {
        buffer.push(...chunk.split(EOL));
        const messages = parseLinesIntoStreamMessage(buffer);
        for (const message of messages) {
          options.onMessage(message);
        }
      }
    });

    this.response.on('error', (error: Error) => {
      if (options.onError) {
        options.onError(error);
      }
    });
  }

  public close() {
    this.response.emit('close');
  }
}
