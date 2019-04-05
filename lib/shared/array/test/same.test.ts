import { same } from '../src';

describe('same()', () => {
  it('should return false if the array1 is shorter than array2', () => {
    expect(same([0, 1], [0, 1, 2])).toBe(false);
  });

  it('should return false if the array2 is shorter than array1', () => {
    expect(same([0, 1, 2, 3], [0, 1, 2])).toBe(false);
  });

  it('should return true if arrays contain the same items', () => {
    const obj1 = { x: 'foo1', y: 'bar1' };
    const obj2 = { x: 'foo2', y: 'bar2' };
    const obj3 = { x: 'foo3', y: 'bar3' };

    const tests: any = [
      { array1: [], array2: [] },
      { array1: [0], array2: [0] },
      { array1: [0, 1], array2: [1, 0] },
      { array1: [0, 1, 2], array2: [2, 1, 0] },
      { array1: [true, false, true], array2: [true, true, false] },
      { array1: [true, false, true], array2: [true, false, true] },
      { array1: ['abc', 'qrs', 'xyz'], array2: ['qrs', 'xyz', 'abc'] },
      { array1: ['abc', 'qrs', 'xyz'], array2: ['abc', 'qrs', 'xyz'] },
      { array1: [obj1, obj2, obj3], array2: [obj2, obj1, obj3] },
      { array1: [obj1, obj2, obj3], array2: [obj1, obj2, obj3] },
    ];
    for (const test of tests) {
      expect(same(test.array1, test.array2)).toBe(true);
    }
  });

  it('should return false if arrays contain different items', () => {
    const obj1 = { x: 'foo1', y: 'bar1' };
    const obj2 = { x: 'foo2', y: 'bar2' };
    const obj3 = { x: 'foo3', y: 'bar3' };

    const tests: any = [
      { array1: [0, 1], array2: [0] },
      { array1: [0, 1, 2], array2: [2, 1, 0, 2] },
      { array1: [true, false, true], array2: [true, true, false, false] },
      { array1: [true, false, true], array2: [true, false] },
      { array1: ['abc', 'qrs', 'xyz'], array2: ['qrs', 'xyz', 'abc', 'qrs'] },
      { array1: ['abc', 'qrs', 'xyz'], array2: ['abc', 'xyz'] },
      { array1: [obj1, obj2, obj3], array2: [obj2, obj2, obj3] },
      { array1: [obj1, obj2, obj3], array2: [obj1, obj2] },
    ];
    for (const test of tests) {
      expect(same(test.array1, test.array2)).toBe(false);
    }
  });
});
