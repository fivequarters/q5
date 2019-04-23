import { tmpdir } from 'os';
import { basename, join } from 'path';
import { createDirectory, readDirectory, writeFile } from '../src';

describe('readDirectory()', () => {
  it('should read a directory', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { recursive: true })).toEqual([
      basename(directory1),
      join(basename(directory1), basename(file3)),
      basename(directory2),
      basename(file1),
      basename(file2),
    ]);
  });

  it('should return joined paths if option is set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { joinPaths: true })).toEqual([directory1, file3, directory2, file1, file2]);
  });

  it('should not read directory recursively if option set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { recursive: false })).toEqual([
      basename(directory1),
      basename(directory2),
      basename(file1),
      basename(file2),
    ]);
  });

  it('should return files only and not recursive if option set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { recursive: false, filesOnly: true })).toEqual([
      basename(file1),
      basename(file2),
    ]);
  });

  it('should recursively return files only if option set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { filesOnly: true })).toEqual([
      join(basename(directory1), basename(file3)),
      basename(file1),
      basename(file2),
    ]);
  });

  it('should read directory recursively and with joined paths if options set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { joinPaths: true })).toEqual([directory1, file3, directory2, file1, file2]);
  });

  it('should recursively return files only and with joined paths if options set', async () => {
    const path = join(tmpdir(), `testing-read-dir-${Date.now()}`);
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
    expect(await readDirectory(path, { joinPaths: true, filesOnly: true })).toEqual([file3, file1, file2]);
  });

  it('should return empty array if directory does not exist', async () => {
    const path = join(__dirname, 'no-such-dir');
    expect(await readDirectory(path)).toEqual([]);
  });

  it('should error if directory does not exist and option is set', async () => {
    const path = join(__dirname, 'no-such-dir');
    const message = `ENOENT: no such file or directory, scandir '${path}'`;
    let actual = null;
    try {
      await readDirectory(path, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
