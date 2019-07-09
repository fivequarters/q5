import { zip, unzip } from '../src';

describe('gzip', () => {
  it('should zip and unzip a string', async () => {
    const value = 'Hello world';
    const zipped = await zip(value);
    const unzipped = await unzip(zipped);
    expect(unzipped).toBe(value);
  });

  it('should reasonably compress a JSON file', async () => {
    const json = require('./testJson.json');
    const value = JSON.stringify(json);
    const zipped = await zip(value);
    const unzipped = await unzip(zipped);
    expect(unzipped).toBe(value);

    const compressedPercent = 100 - 100 * (zipped.length / value.length);
    expect(compressedPercent).toBeGreaterThan(50);
  });
});
