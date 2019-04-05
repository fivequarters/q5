import { startsWith } from '../src';

describe('startsWith()', () => {
  it('should return false if the target array is shorter than the search array', () => {
    expect(startsWith([0, 1], [0, 1, 2])).toBe(false);
  });

  it('should return true if the target array starts with the search array', () => {
    const obj1 = { x: 'foo1', y: 'bar1' };
    const obj2 = { x: 'foo2', y: 'bar2' };
    const obj3 = { x: 'foo3', y: 'bar3' };

    const tests: any = [
      { target: [], search: [] },
      { target: [0], search: [] },
      { target: [0, 1], search: [0] },
      { target: [0, 1], search: [0, 1] },
      { target: [0, 1, 2], search: [0] },
      { target: [0, 1, 2], search: [0, 1] },
      { target: [0, 1, 2], search: [0, 1, 2] },
      { target: [true, false, true], search: [true] },
      { target: [true, false, true], search: [true, false] },
      { target: [true, false, true], search: [true, false, true] },
      { target: ['abc', 'qrs', 'xyz'], search: ['abc'] },
      { target: ['abc', 'qrs', 'xyz'], search: ['abc', 'qrs'] },
      { target: ['abc', 'qrs', 'xyz'], search: ['abc', 'qrs', 'xyz'] },
      { target: [obj1, obj2, obj3], search: [obj1] },
      { target: [obj1, obj2, obj3], search: [obj1, obj2] },
      { target: [obj1, obj2, obj3], search: [obj1, obj2, obj3] },
    ];
    for (const test of tests) {
      expect(startsWith(test.target, test.search)).toBe(true);
    }
  });

  it('should return false if the target array does not start with the search array', () => {
    const obj1 = { x: 'foo1', y: 'bar1' };
    const obj2 = { x: 'foo2', y: 'bar2' };
    const obj3 = { x: 'foo3', y: 'bar3' };

    const tests: any = [
      { target: [0, 2, 1], search: [0, 1, 2] },
      { target: [0, 2], search: [0, 1, 2] },
      { target: [false], search: [true] },
      { target: ['abc', 'abc', 'abc'], search: ['abc', 'qrs', 'xyz'] },
      { target: [obj1, obj3, obj3], search: [obj1, obj2, obj3] },
    ];
    for (const test of tests) {
      expect(startsWith(test.target, test.search)).toBe(false);
    }
  });
});
