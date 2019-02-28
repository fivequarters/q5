import { toHex, fromHex } from '../src/index';

describe('toHex', () => {
  it('should convert a string to hex string', () => {
    const actual = toHex('This is a sentence');
    expect(actual).toBe('5468697320697320612073656e74656e6365');
  });
  it('should convert a hex string to a string', () => {
    const actual = fromHex('5468697320697320612073656e74656e6365');
    expect(actual).toBe('This is a sentence');
  });
});
