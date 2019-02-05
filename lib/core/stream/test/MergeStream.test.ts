import { Writable } from 'stream';
import { MergeStream } from '../src';

describe('MergeStream', () => {
  it('should merge multiple source streams into the sink stream', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    source2.write('goodbye ');
    source1.write('hello ');
    source2.write('buddy');
    source1.write('friend ');
    source2.end();
    source1.end();

    await new Promise(resolve => process.nextTick(resolve));

    expect(actual).toBe('hello friend goodbye buddy');
  });

  it('should properly handle source streams that have already closed', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    const source3 = mergeStream.createSourceStream();
    source2.write('goodbye ');
    source1.write('hello ');
    source2.write('buddy ');
    source2.end();
    source3.write('later ');
    source1.write('friend ');
    source1.end();
    source3.write('alligator');

    await new Promise(resolve => process.nextTick(resolve));

    expect(actual).toBe('hello friend goodbye buddy later alligator');
  });

  it('should properly handle source streams that have been closed', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    const source3 = mergeStream.createSourceStream();
    source2.write('goodbye ');
    source1.write('hello ');
    source2.write('buddy ');
    source2.destroy();
    source3.write('later ');
    source1.write('friend ');
    source1.end();
    source3.write('alligator');

    await new Promise(resolve => process.nextTick(resolve));

    expect(actual).toBe('hello friend goodbye buddy later alligator');
  });

  it('should properly handle source streams that have an error', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    const source3 = mergeStream.createSourceStream();
    source2.write('goodbye ');
    source1.write('hello ');
    source2.write('buddy ');
    source2.destroy(new Error());
    source3.write('later ');
    source1.write('friend ');
    source1.end();
    source3.write('alligator');

    await new Promise(resolve => process.nextTick(resolve));

    expect(actual).toBe('hello friend goodbye buddy later alligator');
  });

  it('should destroy the source streams if the sink stream errors', async () => {
    const sinkStream = new Writable();
    let actual = '';
    let error: Error;
    sinkStream._write = (chunk, encoding, callback) => {
      if (error) {
        return callback(error);
      }
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    const source3 = mergeStream.createSourceStream();

    const actualErrors: Error[] = [];
    source1.on('error', anError => (actualErrors[0] = anError));
    source2.on('error', anError => (actualErrors[1] = anError));
    source3.on('error', anError => (actualErrors[2] = anError));

    source2.write('goodbye ');
    source1.write('hello ');
    source2.write('buddy ');

    error = new Error('oops');
    source3.write('later ');

    expect(actualErrors).toEqual([]);
    source1.write('friend ');
    source3.write('alligator');

    await new Promise(resolve => process.nextTick(resolve));

    expect(actualErrors).toEqual([error, error, error]);
    expect(actual).toBe('hello ');
  });

  it('should handle the sink stream being destroyed more than once', async () => {
    const sinkStream = new Writable();
    let actual = '';
    sinkStream._write = (chunk, encoding, callback) => {
      actual += chunk.toString();
      callback();
    };

    const mergeStream = new MergeStream(sinkStream);
    sinkStream.destroy(new Error());

    await new Promise(resolve => process.nextTick(resolve));
    const source1 = mergeStream.createSourceStream();
    const source2 = mergeStream.createSourceStream();
    source2.write('goodbye ');
    source1.write('hello ');

    sinkStream.destroy();

    source2.write('buddy');
    source1.write('friend ');

    source2.end();
    source1.end();

    expect(actual).toBe('');
  });
});
