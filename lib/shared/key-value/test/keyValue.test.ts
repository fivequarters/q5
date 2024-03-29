import { parse, serialize, update, KeyValueExceptionCode } from '../src';

describe('serialize', () => {
  it('should properly serialize a key-value object', () => {
    const actual = serialize({ a: 'hello', c: 5, b: 'world', d: undefined });
    expect(actual).toBe('a=hello\nb=world\nc=5');
  });

  it('should serialize in a stable way', () => {
    const actual1 = serialize({ a: 'hello', c: 5, b: 'world', d: undefined });
    const actual2 = serialize({ b: 'world', c: 5, d: undefined, a: 'hello' });
    expect(actual1).toBe(actual2);
  });
});

describe('parse', () => {
  it('should properly parse a key-value string', () => {
    const actual = parse('a=hello\nb=world\nc=5');
    expect(actual).toEqual({ a: 'hello', c: '5', b: 'world' });
  });

  it('should properly parse a key-value string even with whitespace', () => {
    const actual = parse('a=   \t hello \nb  \t =world\nc =  5 ');
    expect(actual).toEqual({ a: 'hello', c: '5', b: 'world' });
  });

  it('should properly parse a key-value string even with comment lines', () => {
    const actual = parse('# this a comment\na=hello\nb=world\n#comment\nc=5');
    expect(actual).toEqual({ a: 'hello', c: '5', b: 'world' });
  });
});

describe('update', () => {
  it('should properly update when the serialized property is updated and values is undefined', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      serialized: 'key1=value1\n#comment\nkey2=value2-updated\n#another comment',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2-updated' });
  });

  it('should properly update when the serialized property is updated and values and previous is undefined', () => {
    const previous = '';
    const current = {
      serialized: 'key1=value1\n#comment\nkey2=value2-updated\n#another comment',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2-updated' });
  });

  it('should properly update when the serialized property is unchanged and values is undefined', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2-updated\n#another comment';
    const current = {
      serialized: 'key1=value1\n#comment\nkey2=value2-updated\n#another comment',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2-updated' });
  });

  it('should properly update when the value property is updated and serialized is undefined', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated' },
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=value2-updated');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when the value property is updated and serialized is unchanged', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated' },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=value2-updated');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when the values property removes a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1' },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment');
    expect(updated.values).toEqual({ key1: 'value1' });
  });

  it('should properly update when the values property adds a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2', key3: 'value3' },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=value2\nkey3=value3');
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2', key3: 'value3' });
  });

  it('should properly update when the values property replaces a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key3: 'value3' },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey3=value3');
    expect(updated.values).toEqual({ key1: 'value1', key3: 'value3' });
  });

  it('should properly update when the values property contains a key with an undefined value', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: undefined },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment');
    expect(updated.values).toEqual({ key1: 'value1' });
  });

  it('should properly update when the values property contains a key with an empty string', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: '' },
      serialized: 'key1=value1\n#comment\nkey2=value2',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=');
    expect(updated.values).toEqual({ key1: 'value1', key2: '' });
  });

  it('should properly treat serialized property as previous', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2' },
      serialized: 'key1=value1\n#comment has changed\nkey2=value2\n\n\n# comment again\nkey3 = value3',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment has changed\nkey2=value2\n\n\n# comment again');
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should properly handle empty strings and undefined values', () => {
    const previous = '';
    const current = {
      values: { key1: undefined },
      serialized: '',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('');
    expect(updated.values).toEqual({});
  });

  it('should properly update when both the values and serialized have changed in the same way', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated' },
      serialized: 'key1=value1\n#comment has also changed\nkey2=value2-updated',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment has also changed\nkey2=value2-updated');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when both the values and serialized have changed in the same way with number values', () => {
    const previous = 'key1=value1\n#comment\nkey2=4';
    const current = {
      values: { key1: 'value1', key2: 5 },
      serialized: 'key1=value1\n#comment has also changed\nkey2=5',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment has also changed\nkey2=5');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when both the values and serialized have changed and booleans are involved', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: {
        memorySize: 128,
        timeout: 60,
        staticIp: false,
      },
      serialized: 'memorySize=128\ntimeout=60\nstaticIp=false',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('memorySize=128\ntimeout=60\nstaticIp=false');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when a boolean value changes', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: {
        memorySize: 128,
        timeout: 30,
        staticIp: true,
      },
      serialized: 'memorySize=128\ntimeout=30\nstaticIp=false',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('memorySize=128\ntimeout=30\nstaticIp=true');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly recreate serialized if an empty string', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: {
        memorySize: 128,
        timeout: 30,
        staticIp: false,
      },
      serialized: '',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe(previous);
    expect(updated.values).toEqual(current.values);
  });

  it('should properly handle serialized without any values', () => {
    const previous = '';
    const current = {
      values: undefined,
      serialized: '# this is just a comment',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({});
  });

  it('should properly clear serialized if values is an empty object', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: {},
      serialized: 'memorySize=128\ntimeout=30\nstaticIp=false',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('');
    expect(updated.values).toEqual({});
  });

  it('should ignore serialized if it undefined', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: {
        memorySize: 128,
        timeout: 30,
        staticIp: false,
      },
      serialized: undefined,
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');
    expect(updated.values).toEqual(current.values);
  });

  it('should ignore values if undefined', () => {
    const previous = 'memorySize=128\ntimeout=30\nstaticIp=false';
    const current = {
      values: undefined,
      serialized: 'memorySize=128\ntimeout=30\nstaticIp=true',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('memorySize=128\ntimeout=30\nstaticIp=true');
    expect(updated.values).toEqual({ memorySize: '128', timeout: '30', staticIp: 'true' });
  });

  it('should return empty values if all inputs are undefined', () => {
    const previous = '';
    const current = {
      values: undefined,
      serialized: undefined,
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('');
    expect(updated.values).toEqual({});
  });

  it('should return empty values if all inputs are undefined regardless of previous value', () => {
    const previous = 'key1=value1';
    const current = {
      values: undefined,
      serialized: undefined,
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('');
    expect(updated.values).toEqual({});
  });

  it('should treat serialized as previous if both the values and serialized have changed', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated-a' },
      serialized: 'key1=value1\n#comment\nkey2=value2-updated-b\n # new comment',
    };

    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=value2-updated-a\n # new comment');
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2-updated-a' });
  });
});
