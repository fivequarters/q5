import { parse, serialize } from '../src';

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
