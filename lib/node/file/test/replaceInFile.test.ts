import { tmpdir } from 'os';
import { join } from 'path';
import { isFile, readFile, replaceInFile, writeFile } from '../src';

describe('replaceInFile()', () => {
  it('should replace all instances of a search string', async () => {
    const path = join(tmpdir(), `testing-find-in-file-1-${Date.now()}`);
    await writeFile(path, 'hello hello\nhello');
    await replaceInFile(path, [{ search: 'hello', replace: 'bye' }]);
    expect((await readFile(path)).toString()).toBe('bye bye\nbye');
  });

  it('should replace all instances of a regex', async () => {
    const path = join(tmpdir(), `testing-find-in-file-2-${Date.now()}`);
    await writeFile(path, 'hello hello\nhello');
    await replaceInFile(path, [{ search: /^hello/m, replace: 'bye' }]);
    expect((await readFile(path)).toString()).toBe('bye hello\nbye');
  });

  it('should do nothing if search does not match', async () => {
    const path = join(tmpdir(), `testing-find-in-file-3-${Date.now()}`);
    await writeFile(path, 'hello hello\nhello');
    await replaceInFile(path, [{ search: 'hey', replace: 'bye' }]);
    expect((await readFile(path)).toString()).toBe('hello hello\nhello');
  });

  it('should support multiple searches', async () => {
    const path = join(tmpdir(), `testing-find-in-file-4-${Date.now()}`);
    await writeFile(path, 'hello hey\nhello');
    await replaceInFile(path, [
      { search: 'hey', replace: 'yo' },
      { search: 'hello', replace: 'bye' },
    ]);
    expect((await readFile(path)).toString()).toBe('bye yo\nbye');
  });

  it('should not lead to an infinite regression', async () => {
    const path = join(tmpdir(), `testing-find-in-file-4-${Date.now()}`);
    await writeFile(path, 'hello hey\nhello');
    await replaceInFile(path, [{ search: 'hey', replace: 'hey hey' }]);
    expect((await readFile(path)).toString()).toBe('hello hey hey\nhello');
  });

  it('should not lead to an infinite regression with a RegExp', async () => {
    const path = join(tmpdir(), `testing-find-in-file-4-${Date.now()}`);
    await writeFile(path, 'hello hey\nhello');
    await replaceInFile(path, [{ search: /hey/g, replace: 'hey hey' }]);
    expect((await readFile(path)).toString()).toBe('hello hey hey\nhello');
  });

  it('should not lead to an infinite regression with a RegExp with modifiers', async () => {
    const path = join(tmpdir(), `testing-find-in-file-4-${Date.now()}`);
    await writeFile(path, 'hello hey\nhello');
    await replaceInFile(path, [{ search: /hey\nhello/m, replace: 'hey hey' }]);
    expect((await readFile(path)).toString()).toBe('hello hey hey');
  });

  it('should do nothing if file does not exist', async () => {
    const path = join(tmpdir(), `testing-find-in-file-5-${Date.now()}`);
    await replaceInFile(path, [{ search: 'hello', replace: 'bye' }]);
    expect(await isFile(path)).toBe(false);
  });

  it('should error if file does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-find-in-file-6-${Date.now()}`);
    const message = `ENOENT: no such file or directory, open '${path}'`;
    let actual = null;
    try {
      await replaceInFile(path, [{ search: 'hello', replace: 'bye' }], { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
