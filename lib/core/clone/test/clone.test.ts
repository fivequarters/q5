import { clone } from '../src';

describe('Clone', () => {
  it('should correctly clone all primitives', () => {
    const tests = ['a', 5, new Date(Date.now()), true, false];
    for (const test of tests) {
      expect(clone(test)).toEqual(test);
    }
  });
  it('should correctly clone object', () => {
    const tests = [{ a: 5, b: 'hello', c: true }];
    for (const test of tests) {
      const actual = clone(test);
      expect(actual).toEqual(test);
      actual.a = -actual.a;
      expect(actual.a).not.toEqual(test.a);
    }
  });
  it('should correctly clone array', () => {
    const tests = [[5, 'hello', false]];
    for (const test of tests) {
      const actual = clone(test);
      expect(actual).toEqual(test);
      actual[0] = -actual[0];
      expect(actual[0]).not.toEqual(test[0]);
    }
  });
});
