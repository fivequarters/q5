import { Writable } from 'stream';
import { IndentTextStream } from '../src';

describe('IndentTextStream', () => {
  it('should indent text', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.write('hello\nfriend');

    expect(actual).toBe('  hello\n  friend');
  });

  it('should not indent text with just new lines', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.write('hello\nfriend');
    indentTextStream.write('\n');

    expect(actual).toBe('  hello\n  friend\n');
  });

  it('should allow the indent width to be set', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.write('hello\nfriend');
    indentTextStream.Indent = 4;
    indentTextStream.write('\nyep');

    expect(actual).toBe('  hello\n  friend\n    yep');
  });

  it('should ignore indent values less than 0', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(-5);
    indentTextStream.pipe(sinkStream);
    indentTextStream.write('hello\nfriend');
    indentTextStream.Indent = -1;
    indentTextStream.write('\n');

    expect(actual).toBe('hello\nfriend\n');
    expect(indentTextStream.Indent).toBe(0);
  });

  it('should return the indent value', async () => {
    const indentTextStream = new IndentTextStream(3);
    expect(indentTextStream.Indent).toBe(3);
  });

  it('should default to an indent value of 0', async () => {
    const indentTextStream = new IndentTextStream();
    expect(indentTextStream.Indent).toBe(0);
  });

  it('should handle an empty write', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.write('');

    expect(actual).toBe('');
    expect(indentTextStream.Indent).toBe(2);
  });

  it('should handle an empty push chunk', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.push(null, 'utf8');

    expect(actual).toBe('');
    expect(indentTextStream.Indent).toBe(2);
  });

  it('should handle an unspecified encoding', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.push('hello');

    expect(actual).toBe('  hello');
    expect(indentTextStream.Indent).toBe(2);
  });

  it('should remember whitespace when another write occurs', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const indentTextStream = new IndentTextStream(2);
    indentTextStream.pipe(sinkStream);
    indentTextStream.push('hello\n');
    indentTextStream.push('   ');
    indentTextStream.push('again!');

    expect(actual).toBe('  hello\n     again!');
    expect(indentTextStream.Indent).toBe(2);
  });
});
