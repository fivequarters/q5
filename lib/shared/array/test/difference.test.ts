import { difference } from '../src';

describe('difference()', () => {
  it('should return an empty array if arrays contain the same items', () => {
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
      expect(difference(test.array1, test.array2)).toEqual([]);
      expect(difference(test.array2, test.array1)).toEqual([]);
    }
  });

  it('should return the items not in the second array', () => {
    const obj1 = { x: 'foo1', y: 'bar1' };
    const obj2 = { x: 'foo2', y: 'bar2' };
    const obj3 = { x: 'foo3', y: 'bar3' };

    const tests: any = [
      { array1: [0, 1], array2: [0], expected: [1] },
      { array1: [0, 2, 1], array2: [1, 0], expected: [2] },
      { array1: [0, 1, 2], array2: [2, 0], expected: [1] },
      { array1: [true, false], array2: [true], expected: [false] },
      { array1: [true, false], array2: [false], expected: [true] },
      { array1: ['abc', 'qrs', 'xyz'], array2: ['abc'], expected: ['qrs', 'xyz'] },
      { array1: ['abc', 'qrs', 'xyz'], array2: [], expected: ['abc', 'qrs', 'xyz'] },
      { array1: [obj1, obj2], array2: [obj2, obj3], expected: [obj1] },
      { array1: [obj1], array2: [obj1, obj2, obj3], expected: [] },
    ];
    for (const test of tests) {
      expect(difference(test.array1, test.array2)).toEqual(test.expected);
    }
  });
});
