import { width } from '../src';

describe('width', () => {
  it('should return the length of a single line of text', () => {
    expect(width('hello')).toBe(5);
  });

  it('should return the length of the longest line', () => {
    expect(width('hello\nbrave new world\ngoodbye')).toBe(15);
  });
});
