import { join } from 'path';
import { isFile } from '../src';

describe('isFile()', () => {
  it('should return false for a directory', async () => {
    expect(await isFile(__dirname)).toBe(false);
  });

  it('should return true for a file', async () => {
    expect(await isFile(__filename)).toBe(true);
  });

  it('should return false for a non-existing directory', async () => {
    expect(await isFile(join(__dirname, 'no-such-dir/'))).toBe(false);
  });

  it('should return false for a non-existing file', async () => {
    expect(await isFile(join(__dirname, 'no-such-file.txt'))).toBe(false);
  });
});
