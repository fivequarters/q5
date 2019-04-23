import { EOL } from 'os';
import { PassThrough } from 'stream';
import { StringDecoder } from 'string_decoder';

function indentFromNumber(value: number) {
  let indent = '';
  while (value-- > 0) {
    indent += ' ';
  }
  return indent;
}

export class IndentTextStream extends PassThrough {
  private indent: number = 0;
  private indentString: string = '';
  private trailingWhitespace: string = '';

  constructor(indent: number = 0) {
    super();
    this.Indent = indent;
  }

  get Indent(): number {
    return this.indent;
  }

  set Indent(value: number) {
    if (value >= 0) {
      this.indent = value;
      this.indentString = indentFromNumber(value);
    }
  }

  public push(chunk: any, encoding?: string): boolean {
    if (chunk) {
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
            lines.push(this.indentString + text);
          }
          break;
        }

        const segment = text.substr(start, end);
        if (segment.trim() !== '') {
          lines.push(this.indentString + segment);
        }

        lines.push(EOL);

        if (end + 1 >= text.length) {
          break;
        }

        text = text.substr(end + 1);
      }
      chunk = Buffer.from(lines.join(''), encoding as BufferEncoding);
    }
    return super.push(chunk, encoding);
  }
}
