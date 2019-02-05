import { tmpdir } from 'os';
import { join } from 'path';
import { copyFile, createDirectory, isFile, readFile, writeFile } from '../src';

describe('copyFile()', () => {
  it('should copy a file', async () => {
    const path = join(tmpdir(), `testing-copy-file-1-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    await writeFile(source, 'hello world');
    await copyFile(source, destination);
    expect(await isFile(destination)).toBe(true);
  });

  it('should overwrite existing file', async () => {
    const path = join(tmpdir(), `testing-copy-file-2-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    await writeFile(source, 'hello world');
    await writeFile(destination, 'goodbye world');
    await copyFile(source, destination);
    const actual = await readFile(destination);
    expect(actual.toString()).toBe('hello world');
  });

  it('should error if file already exists and option set', async () => {
    const path = join(tmpdir(), `testing-copy-file-3-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    const message = `File already exists: ${destination}`;
    await writeFile(source, 'hello world');
    await copyFile(source, destination, { errorIfExists: true });

    let actual = null;
    try {
      await copyFile(source, destination, { errorIfExists: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should error if parent directory does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-copy-file-5-${Date.now()}`);
    const source = join(path, 'source-dir', 'source');
    const destination = join(path, 'destination-dir', 'destination');
    const message = `ENOENT: no such file or directory, copyfile '${source}' -> '${destination}'`;
    await writeFile(source, 'hello world');

    let actual = null;
    try {
      await copyFile(source, destination, { ensurePath: false });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should create directory if parent directory does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-copy-file-6-${Date.now()}`);
    const source = join(path, 'source-dir', 'source');
    const destination = join(path, 'destination-dir', 'destination');
    await writeFile(source, 'hello world');
    await copyFile(source, destination);
    expect(await isFile(destination)).toBe(true);
  });

  it('should do nothing if source does not exist', async () => {
    const path = join(tmpdir(), `testing-copy-file-7-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    await createDirectory(path);
    await copyFile(source, destination);
    expect(await isFile(destination)).toBe(false);
  });

  it('should error if source does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-copy-file-8-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    const message = `ENOENT: no such file or directory, copyfile '${source}' -> '${destination}'`;
    await createDirectory(path);

    let actual = null;
    try {
      await copyFile(source, destination, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });
});
