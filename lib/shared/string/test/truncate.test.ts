import { truncate } from '../src';

describe('truncate', () => {
  it('should not truncate a string that is less than the width', () => {
    expect(truncate('hello', 10)).toEqual(['hello']);
  });
  it('should not truncate a string that is less than the width when split by lines', () => {
    expect(truncate('hello\nworld', 10)).toEqual(['hello', 'world']);
  });
  it('should truncate a line at the space', () => {
    expect(truncate('hello world', 10)).toEqual(['hello…']);
  });
  it('should truncate a line at the tab', () => {
    expect(truncate('hello\tworld', 10)).toEqual(['hello…']);
  });
  it('should truncate using the indent character provided', () => {
    expect(truncate('hello world', 10, '')).toEqual(['hello']);
  });

  it('should truncate even if no whitespace is present', () => {
    expect(truncate('ABCDEFGHIJKLMNOP', 10)).toEqual(['ABCDEFGHI…']);
  });
  it('should truncate if no whitespace is present using the ellipsis character', () => {
    expect(truncate('ABCDEFGHIJKLMNOP', 10, '-')).toEqual(['ABCDEFGHI-']);
  });
  it('should accept an array of strings', () => {
    expect(truncate(['hello', 'world'], 10)).toEqual(['hello', 'world']);
  });
  it('should truncate even with small values', () => {
    expect(truncate('1 2 3 4 5', 1)).toEqual(['1']);
  });
});
