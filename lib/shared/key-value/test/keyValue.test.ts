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

  it('should properly update when the value property is updated and serialized is undefined', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated' },
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe('key1=value1\n#comment\nkey2=value2-updated');
    expect(updated.values).toEqual(current.values);
  });

  it('should properly update when the serialized property is updated and values is unchanged', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2' },
      serialized: 'key1=value1\n#comment\nkey2=value2-updated\n#another comment',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2-updated' });
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

  it('should properly update when the serialized property removes a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2' },
      serialized: 'key1=value1\n#comment has changed',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1' });
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

  it('should properly update when the serialized property adds a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2' },
      serialized: 'key1=value1\n#comment has changed\nkey2=value2\n\n\n# comment again\nkey3 = value3',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key2: 'value2', key3: 'value3' });
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

  it('should properly update when the serialized property replaces a key', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2' },
      serialized: 'key1=value1\n#comment has changed\nkey3=value3\n\n\n# comment again\n',
    };
    const updated = update(previous, current);
    expect(updated.serialized).toBe(current.serialized);
    expect(updated.values).toEqual({ key1: 'value1', key3: 'value3' });
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

  it('should throw an exception if both the values and serialized have changed', () => {
    const previous = 'key1=value1\n#comment\nkey2=value2';
    const current = {
      values: { key1: 'value1', key2: 'value2-updated-a' },
      serialized: 'key1=value1\n#comment\nkey2=value2-updated-b',
    };

    let error;
    try {
      update(previous, current);
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.code).toBe(KeyValueExceptionCode.serializedAndValuesUpdated);
  });
});
