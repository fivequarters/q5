import * as Utilities from '../src/utilities';

describe('utilities', () => {
  it('duplicate', async () => {
    const o = { a: [], b: 1, c: 'asdfa', d: { f: 1 } };
    const k = Utilities.duplicate({}, o);
    expect(k).toEqual(o);
  }, 180000);
});
