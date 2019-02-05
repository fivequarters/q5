import { tmpdir } from 'os';
import { join } from 'path';
import { createDirectory, isDirectory } from '../src';

describe('createDirectory()', () => {
  it('should create a new directory', async () => {
    const path = join(tmpdir(), `testing-create-dir-${Date.now()}`);
    await createDirectory(path);
    expect(await isDirectory(path)).toBe(true);
  });

  it('should error if parent directory does not exist and option set', async () => {
    const path = join(tmpdir(), 'no-such-parent-dir', `testing-create-dir-${Date.now()}`);
    const message = `ENOENT: no such file or directory, mkdir '${path}'`;
    let actual = null;
    try {
      await createDirectory(path, { ensurePath: false });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should create directory if parent directory does not exist', async () => {
    const path = join(tmpdir(), 'parent-dir', `testing-create-dir-${Date.now()}`);
    await createDirectory(path);
    expect(await isDirectory(path)).toBe(true);
  });

  it('should error only if existing directory and option set', async () => {
    const path = join(tmpdir(), `testing-create-dir-${Date.now()}`);
    const message = `Directory already exists: ${path}`;
    await createDirectory(path, { errorIfExists: true });

    let actual = null;
    try {
      await createDirectory(path, { errorIfExists: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should not error with a directory creation race', async () => {
    const path = join(tmpdir(), `testing-create-dir-${Date.now()}`);
    await Promise.all([
      createDirectory(path),
      createDirectory(path),
      createDirectory(path),
      createDirectory(path),
      createDirectory(path),
    ]);

    expect(await isDirectory(path)).toBe(true);
  });
});
