import { random } from '../src';

const hexChars = '0123456789abcdef';

describe('random', () => {
  it('should return a random hex string of length 32 by default', () => {
    const actual = random() as string;
    expect(actual.length).toBe(32);
    expect(typeof actual).toBe('string');
    for (const char of actual) {
      expect(hexChars.indexOf(char)).toBeGreaterThan(-1);
    }
  });

  it('should return a random string of any given length with the option', () => {
    const tests = [1, 5, 32, 33];
    for (const test of tests) {
      expect(random({ lengthInBytes: test }).length).toBe(test * 2);
    }
  });

  it('should return a byte array with the option', () => {
    const actual = random({ asByteArray: true }) as number[];
    expect(actual.length).toBe(16);
    for (const byte of actual) {
      expect(typeof byte).toBe('number');
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });
});
