import { PassThrough } from 'stream';
import { StringDecoder } from 'string_decoder';

export class TextCaptureStream extends PassThrough {
  private text: string;

  constructor() {
    super();
    this.text = '';
  }

  public push(chunk: any, encoding?: BufferEncoding): boolean {
    if (chunk) {
      const decoder = new StringDecoder(encoding);
      this.text += decoder.write(chunk);
    }
    return super.push(chunk, encoding);
  }

  public toString() {
    return this.text;
  }
}
