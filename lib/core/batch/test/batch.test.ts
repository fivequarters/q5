import { batch } from '../src';

describe('batch()', () => {
  it('should batch array items correctly', () => {
    const tests = [
      { size: 3, items: [0, 1], expected: [[0, 1]] },
      { size: 3, items: [0, 1, 2], expected: [[0, 1, 2]] },
      { size: 3, items: [0, 1, 2, 3, 4, 5, 6, 7, 8], expected: [[0, 1, 2], [3, 4, 5], [6, 7, 8]] },
      { size: 2, items: [0, 1, 2, 3, 4, 5, 6, 7, 8], expected: [[0, 1], [2, 3], [4, 5], [6, 7], [8]] },
      { size: 1, items: [0, 1, 2, 3, 4, 5, 6, 7, 8], expected: [[0], [1], [2], [3], [4], [5], [6], [7], [8]] },
      { size: 0, items: [0, 1, 2, 3, 4, 5, 6, 7, 8], expected: [] },
      { size: -1, items: [0, 1, 2, 3, 4, 5, 6, 7, 8], expected: [] },
    ];
    for (const test of tests) {
      expect(batch(test.size, test.items)).toEqual(test.expected);
    }
  });
});
