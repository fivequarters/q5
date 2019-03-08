import { wrap } from '../src';

describe('wrap', () => {
  it('should not wrap a string that is less than the width', () => {
    expect(wrap('hello', 10)).toEqual(['hello']);
  });
  it('should not wrap a string that is less than the width when split by lines', () => {
    expect(wrap('hello\nworld', 10)).toEqual(['hello', 'world']);
  });
  it('should wrap a line at the space', () => {
    expect(wrap('hello world', 10)).toEqual(['hello', '  world']);
  });
  it('should wrap a line at the tab', () => {
    expect(wrap('hello\tworld', 10)).toEqual(['hello', '  world']);
  });
  it('should wrap using the indent character provided', () => {
    expect(wrap('hello world', 10, '')).toEqual(['hello', 'world']);
  });
  it('should wrap mulitple times correctly', () => {
    expect(wrap('the quick brown fox jumped over the fence and ran away', 20)).toEqual([
      'the quick brown fox',
      '  jumped over the',
      '  fence and ran away',
    ]);
  });
  it('should hypenate if no whitespace is present', () => {
    expect(wrap('ABCDEFGHIJKLMNOP', 10)).toEqual(['ABCDEFGHI-', 'JKLMNOP']);
  });
  it('should hypenate if no whitespace is present using the hypenate character', () => {
    expect(wrap('ABCDEFGHIJKLMNOP', 10, '', ' - ')).toEqual(['ABCDEFG - ', 'HIJKLMNOP']);
  });
  it('should not add any extra empty lines', () => {
    expect(wrap('hello ', 5, '')).toEqual(['hello']);
  });
  it('should accept an array of strings', () => {
    expect(wrap(['hello', 'world'], 10)).toEqual(['hello', 'world']);
  });
  it('should wrap even with small values', () => {
    expect(wrap('1 2 3 4 5', 1)).toEqual(['1', '2', '3', '4', '5']);
  });
});
