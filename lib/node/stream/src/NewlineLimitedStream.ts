import { EOL } from 'os';
import { PassThrough } from 'stream';
import { StringDecoder } from 'string_decoder';

const defaultLimit = 1;

export class NewlineLimitedStream extends PassThrough {
  private enabled: boolean = true;
  private limit: number = defaultLimit;
  private newlineCount: number = 0;
  private trailingWhitespace: string = '';

  constructor(limit: number = defaultLimit) {
    super();
    this.Limit = limit;
  }

  get Enabled(): boolean {
    return this.enabled;
  }

  set Enabled(value: boolean) {
    this.enabled = value;
  }

  get Limit(): number {
    return this.limit;
  }

  set Limit(value: number) {
    if (value >= 0) {
      this.limit = value;
    }
  }

  public push(chunk: any, encoding?: BufferEncoding): boolean {
    if (this.Enabled && chunk) {
      const decoder = new StringDecoder(encoding);
      let text = decoder.write(chunk);

      if (this.trailingWhitespace.length) {
        text = this.trailingWhitespace + text;
        this.trailingWhitespace = '';
      }

      const start = 0;
      const lines: string[] = [];

      while (true) {
        const end = text.indexOf(EOL, start);
        if (end === -1) {
          if (text.trim() === '') {
            this.trailingWhitespace = text;
          } else {
            lines.push(text);
            this.newlineCount = 0;
          }
          break;
        }

        const segment = text.substr(start, end);
        if (segment.trim() !== '') {
          lines.push(segment);
          this.newlineCount = 0;
        }

        if (this.newlineCount < this.limit) {
          lines.push(EOL);
        }

        this.newlineCount++;

        if (end + 1 >= text.length) {
          break;
        }

        text = text.substr(end + 1);
      }
      chunk = Buffer.from(lines.join(''), encoding);
    }
    return super.push(chunk, encoding);
  }
}
