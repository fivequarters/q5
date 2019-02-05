import { join } from 'path';
import { readFile } from '../src';

describe('readFile()', () => {
  it('should read a file', async () => {
    const contents = await readFile(__filename);
    expect(contents.toString().length).toBeGreaterThan(10);
  });

  it('should return empty buffer if no file exists', async () => {
    const path = join(__dirname, 'no-such-file');
    const contents = await readFile(path);
    expect(contents.toString().length).toBe(0);
  });

  it('should error if no file exists and option is set', async () => {
    const path = join(__dirname, 'no-such-file');
    const message = `ENOENT: no such file or directory, open '${path}'`;
    let actual = null;
    try {
      await readFile(path, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should error for directory', async () => {
    const message = 'EISDIR: illegal operation on a directory, read';
    let actual = null;
    try {
      await readFile(__dirname);
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
