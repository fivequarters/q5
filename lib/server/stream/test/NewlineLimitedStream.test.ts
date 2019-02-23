import { Writable } from 'stream';
import { NewlineLimitedStream } from '../src';

describe('NewlineLimitedStream', () => {
  it('should limit newlines in text', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const newlineLimitedStream = new NewlineLimitedStream();
    newlineLimitedStream.pipe(sinkStream);
    newlineLimitedStream.write('hello\n\n\nfriend');

    expect(actual).toBe('hello\nfriend');
  });

  it('should limit newlines across stream pushes', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const newlineLimitedStream = new NewlineLimitedStream(2);
    newlineLimitedStream.pipe(sinkStream);
    newlineLimitedStream.write('hello\n');
    newlineLimitedStream.write('\n');
    newlineLimitedStream.write('\nfriend');

    expect(actual).toBe('hello\n\nfriend');
  });

  it('should work for following test sets', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const testSet = [
      { limit: 0, pushes: ['a\nb0'], expected: 'ab0' },
      { limit: 0, pushes: ['a\n', 'b1'], expected: 'ab1' },
      { limit: 0, pushes: ['a\n', '\nb2\n'], expected: 'ab2' },
      { limit: 0, pushes: ['a\n   ', '\nb3\n'], expected: 'ab3' },
      { limit: 0, pushes: ['a\n   \n', '\nb4\n'], expected: 'ab4' },
      { limit: 1, pushes: ['a\nb5', '\n', '\n'], expected: 'a\nb5\n' },
      { limit: 1, pushes: ['a\n', '\n', 'b6'], expected: 'a\nb6' },
      { limit: 1, pushes: ['a\n  ', '\n', 'b7'], expected: 'a\nb7' },
      { limit: 1, pushes: ['a\n  ', '\n   \n', 'b8'], expected: 'a\nb8' },
      { limit: 1, pushes: ['a\n  ', '\n   \n', ' b9'], expected: 'a\n b9' },
      { limit: 1, pushes: ['a\n  ', '\n   \n', ' b10\n'], expected: 'a\n b10\n' },
      { limit: 2, pushes: ['a\nb11'], expected: 'a\nb11' },
      { limit: 2, pushes: ['a\nb12\n\n'], expected: 'a\nb12\n\n' },
      { limit: 2, pushes: ['a\nb13\n\n   '], expected: 'a\nb13\n\n' },
      { limit: 2, pushes: ['a', '\nb14\n\n', '   '], expected: 'a\nb14\n\n' },
    ];

    for (const test of testSet) {
      actual = '';
      const newlineLimitedStream = new NewlineLimitedStream(test.limit);
      newlineLimitedStream.pipe(sinkStream);
      for (const push of test.pushes) {
        newlineLimitedStream.write(push);
      }
      newlineLimitedStream.unpipe(sinkStream);
      expect(actual).toBe(test.expected);
    }
  });

  it('should allow the limit to be set', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const newlineLimitedStream = new NewlineLimitedStream();
    newlineLimitedStream.pipe(sinkStream);
    newlineLimitedStream.write('hello\n\n\nfriend\n');
    newlineLimitedStream.Limit = 2;
    newlineLimitedStream.write('hello\n\n\nfriend');

    expect(actual).toBe('hello\nfriend\nhello\n\nfriend');
  });

  it('should ignore limit values less than 0', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const newlineLimitedStream = new NewlineLimitedStream(-5);
    newlineLimitedStream.pipe(sinkStream);
    newlineLimitedStream.write('hello\n\n\nfriend');

    expect(actual).toBe('hello\nfriend');
    expect(newlineLimitedStream.Limit).toBe(1);
  });

  it('should return the limit value', async () => {
    const newlineLimitedStream = new NewlineLimitedStream(3);
    expect(newlineLimitedStream.Limit).toBe(3);
  });

  it('should default to a limit value of 1', async () => {
    const newlineLimitedStream = new NewlineLimitedStream();
    expect(newlineLimitedStream.Limit).toBe(1);
  });

  it('should not limit newlines in text if not enabled', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const newlineLimitedStream = new NewlineLimitedStream();
    newlineLimitedStream.Enabled = false;
    newlineLimitedStream.pipe(sinkStream);
    newlineLimitedStream.write('hello\n\n\nfriend');

    expect(actual).toBe('hello\n\n\nfriend');
    expect(newlineLimitedStream.Enabled).toBe(false);
  });

  it('should return the enabled value', async () => {
    const newlineLimitedStream = new NewlineLimitedStream();
    expect(newlineLimitedStream.Enabled).toBe(true);
  });
});
