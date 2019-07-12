import { stringify } from '../src';

describe('stringify', () => {
  it('should stringify an object in a JSON.stringify compatible way', () => {
    const data = {
      array: [5, '"hello world"', "'hello world'", '\\hello world\\', '\\"hello world\\"', true, null, undefined],
      obj: {
        5: 5,
        '"hello world"': '"hello world"',
        "'hello world'": "'hello world'",
        '\\hello world\\': '\\hello world\\',
        '\\"hello world\\"': '\\"hello world\\"',
        true: true,
        null: null,
        undefined: undefined,
      },
    };

    const jsonNative = JSON.stringify(data);
    const jsonUnderTest = stringify(data);
    expect(JSON.parse(jsonUnderTest)).toEqual(JSON.parse(jsonNative));
  });

  it('should stringify in a stable, key-sorted way', () => {
    const data1 = { a: 5, c: 12, b: 2 };
    const data2 = { b: 2, a: 5, c: 12 };
    expect(stringify(data1)).toEqual(stringify(data2));
  });
});
