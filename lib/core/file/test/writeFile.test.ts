import { tmpdir } from 'os';
import { join } from 'path';
import { isFile, readFile, writeFile } from '../src';

describe('writeFile()', () => {
  it('should write a file', async () => {
    const path = join(tmpdir(), `testing-write-file-${Date.now()}`);
    await writeFile(path, 'hello world');
    expect(await isFile(path)).toBe(true);
  });

  it('should overwrite existing file', async () => {
    const path = join(tmpdir(), `testing-write-file-${Date.now()}`);
    const message = `File already exists: ${path}`;
    await writeFile(path, 'hello world');
    await writeFile(path, 'goodbye world');
    const actual = await readFile(path);
    expect(actual.toString()).toBe('goodbye world');
  });

  it('should error if file already exists and option set', async () => {
    const path = join(tmpdir(), `testing-write-file-${Date.now()}`);
    const message = `File already exists: ${path}`;
    await writeFile(path, 'hello world', { errorIfExists: true });

    let actual = null;
    try {
      await writeFile(path, 'hello world', { errorIfExists: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should error if parent directory does not exist and option set', async () => {
    const path = join(tmpdir(), `no-such-dir`, `testing-write-file-${Date.now()}`);
    const message = `ENOENT: no such file or directory, open '${path}'`;

    let actual = null;
    try {
      await writeFile(path, 'hello world', { ensurePath: false });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should create directory if parent directory does not exist', async () => {
    const path = join(tmpdir(), `parent-dir-${Date.now()}`, 'testing-write-file');
    await writeFile(path, 'hello world');
    expect(await isFile(path)).toBe(true);
  });
});
