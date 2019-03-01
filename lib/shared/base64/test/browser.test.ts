import { fromBase64, toBase64 } from '../src/browser';

describe('toBase64', () => {
  it('should convert a string to base64', () => {
    const actual = toBase64('This is a sentence');
    expect(actual).toBe('VGhpcyBpcyBhIHNlbnRlbmNl');
  });
});

describe('fromBase64', () => {
  it('should convert a string from base64', () => {
    const actual = fromBase64('VGhpcyBpcyBhIHNlbnRlbmNl');
    expect(actual).toBe('This is a sentence');
  });
});
