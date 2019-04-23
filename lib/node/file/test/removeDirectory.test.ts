import { tmpdir } from 'os';
import { join } from 'path';
import { createDirectory, exists, removeDirectory, writeFile } from '../src';

describe('removeDirectory()', () => {
  it('should remove a directory', async () => {
    const path = join(tmpdir(), `testing-remove-dir-1-${Date.now()}`);
    await createDirectory(path);
    await removeDirectory(path);
    expect(await exists(path)).toBe(false);
  });

  it('should do nothing if directory does not exist', async () => {
    const path = join(__dirname, 'no-such-file');
    await removeDirectory(path);
    expect(await exists(path)).toBe(false);
  });

  it('should error if directory does not exist and option is set', async () => {
    const path = join(__dirname, 'no-such-file');
    const message = `ENOENT: no such file or directory, rmdir '${path}'`;
    let actual = null;
    try {
      await removeDirectory(path, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should error if directory is not empty and option is set', async () => {
    const path = join(tmpdir(), `testing-remove-dir-2-${Date.now()}`);
    const directory1 = join(path, 'dir1');
    await createDirectory(directory1);

    const message = `ENOTEMPTY: directory not empty, rmdir '${path}'`;
    let actual = null;
    try {
      await removeDirectory(path, { recursive: false });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should remove directory recursively', async () => {
    const path = join(tmpdir(), `testing-remove-dir-3-${Date.now()}`);
    const directory1 = join(path, 'dir1');
    const directory2 = join(path, 'dir2');
    const file1 = join(path, 'file1');
    const file2 = join(path, 'file2');
    const file3 = join(directory1, 'file3');
    await createDirectory(path);
    await createDirectory(directory1);
    await createDirectory(directory2);
    await writeFile(file1, 'file 1');
    await writeFile(file2, 'file 2');
    await writeFile(file3, 'file 3');
    await removeDirectory(path);
    expect(await exists(file1)).toBe(false);
    expect(await exists(file2)).toBe(false);
    expect(await exists(file3)).toBe(false);
    expect(await exists(directory1)).toBe(false);
    expect(await exists(directory2)).toBe(false);
    expect(await exists(path)).toBe(false);
  });
});
