import { tmpdir } from 'os';
import { join } from 'path';
import { exists, removeFile, writeFile } from '../src';

describe('removefile()', () => {
  it('should remove a file', async () => {
    const tempPath = tmpdir();
    const newFilePath = join(tempPath, `testing-write-file-${Date.now()}`);
    await writeFile(newFilePath, 'hello world');
    await removeFile(newFilePath);
    expect(await exists(newFilePath)).toBe(false);
  });

  it('should do nothing if file does not exist', async () => {
    const path = join(__dirname, 'no-such-file');
    await removeFile(path);
    expect(await exists(path)).toBe(false);
  });

  it('should error if file does not exist and option is set', async () => {
    const path = join(__dirname, 'no-such-file');
    const message = `ENOENT: no such file or directory, unlink '${path}'`;
    let actual = null;
    try {
      await removeFile(path, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
