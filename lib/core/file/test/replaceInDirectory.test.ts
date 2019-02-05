import { tmpdir } from 'os';
import { join } from 'path';
import { isDirectory, readFile, replaceInDirectory, writeFile } from '../src';

describe('replaceInDirectory()', () => {
  it('should replace all instances of a search string in multiple files', async () => {
    const path = join(tmpdir(), `testing-find-in-dir-1-${Date.now()}`);
    const dir1 = join(path, 'dir1');
    const file1 = join(path, 'file1');
    const file2 = join(dir1, 'file2');
    await writeFile(file1, 'hello hello\nhello');
    await writeFile(file2, 'hello hey\nhello');

    await replaceInDirectory(path, [{ search: 'hello', replace: 'bye' }], { recursive: false });
    expect((await readFile(file1)).toString()).toBe('bye bye\nbye');
    expect((await readFile(file2)).toString()).toBe('hello hey\nhello');
  });

  it('should recursively replace all instances of a search string in multiple files', async () => {
    const path = join(tmpdir(), `testing-find-in-dir-2-${Date.now()}`);
    const dir1 = join(path, 'dir1');
    const file1 = join(path, 'file1');
    const file2 = join(dir1, 'file2');
    await writeFile(file1, 'hello hello\nhello');
    await writeFile(file2, 'hello hey\nhello');

    await replaceInDirectory(path, [{ search: 'hello', replace: 'bye' }]);
    expect((await readFile(file1)).toString()).toBe('bye bye\nbye');
    expect((await readFile(file2)).toString()).toBe('bye hey\nbye');
  });

  it('should do nothing if directory does not exist', async () => {
    const path = join(tmpdir(), `testing-find-in-dir-3-${Date.now()}`);
    await replaceInDirectory(path, [{ search: 'hello', replace: 'bye' }]);
    expect(await isDirectory(path)).toBe(false);
  });

  it('should error if file does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-find-in-dir-4-${Date.now()}`);
    const message = `ENOENT: no such file or directory, scandir '${path}'`;
    let actual = null;
    try {
      await replaceInDirectory(path, [{ search: 'hello', replace: 'bye' }], { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
