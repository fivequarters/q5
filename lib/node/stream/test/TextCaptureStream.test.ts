import { Writable } from 'stream';
import { TextCaptureStream } from '../src';

describe('TextStream', () => {
  it('should capture the text written to it', async () => {
    const textStream = new TextCaptureStream();
    textStream.write('hello\nfriend');
    expect(textStream.toString()).toBe('hello\nfriend');
  });
});
