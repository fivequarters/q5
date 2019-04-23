import { tmpdir } from 'os';
import { join } from 'path';
import { copyDirectory, createDirectory, isDirectory, isFile, readFile, writeFile } from '../src';

describe('copyDirectory()', () => {
  it('should copy a directory', async () => {
    const path = join(tmpdir(), `testing-copy-directory-1-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');

    await copyDirectory(source, destination);
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(true);
    expect(await isDirectory(destinationDir2)).toBe(true);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect(await isFile(destinationFile3)).toBe(true);
  });

  it('should overwrite existing files', async () => {
    const path = join(tmpdir(), `testing-copy-directory-2-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');
    await writeFile(destinationFile1, 'original file 1');

    await copyDirectory(source, destination);
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(true);
    expect(await isDirectory(destinationDir2)).toBe(true);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect((await readFile(destinationFile3)).toString()).toBe('file 3');
  });

  it('should error if file already exists and option set', async () => {
    const path = join(tmpdir(), `testing-copy-directory-3-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationFile1 = join(destination, 'file1');
    await writeFile(destinationFile1, 'original file 1');

    const message = `Directory already exists: ${destination}`;

    let actual = null;
    try {
      await copyDirectory(source, destination, { errorIfExists: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should error if parent directory does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-directory-file-4-${Date.now()}`);
    const source = join(path, 'source-dir');
    const sourceFile1 = join(source, 'file1');
    await writeFile(sourceFile1, 'hello world');

    const destination = join(path, 'destination-dir', 'destination-subdir');
    const destinationFile1 = join(destination, 'file1');
    const message = `ENOENT: no such file or directory, mkdir '${destination}'`;

    let actual = null;
    try {
      await copyDirectory(source, destination, { errorIfNotExist: true, ensurePath: false });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should create directory if parent directory does not exist', async () => {
    const path = join(tmpdir(), `testing-copy-directory-5-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination-dir', 'destination-subdir');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');

    await copyDirectory(source, destination);
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(true);
    expect(await isDirectory(destinationDir2)).toBe(true);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect((await readFile(destinationFile3)).toString()).toBe('file 3');
  });

  it('should do nothing if source does not exist', async () => {
    const path = join(tmpdir(), `testing-copy-directory-6-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    await createDirectory(path);
    await copyDirectory(source, destination);
    expect(await isDirectory(destination)).toBe(false);
  });

  it('should error if source does not exist and option set', async () => {
    const path = join(tmpdir(), `testing-copy-directory-7-${Date.now()}`);
    const source = join(path, 'source');
    const destination = join(path, 'destination');
    const message = `ENOENT: no such file or directory, scandir '${source}'`;
    await createDirectory(path);

    let actual = null;
    try {
      await copyDirectory(source, destination, { errorIfNotExist: true });
    } catch (error) {
      actual = error;
    }
    expect(actual.message).toBe(message);
  });

  it('should not copy a directory recursively if option is set', async () => {
    const path = join(tmpdir(), `testing-copy-directory-8-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');

    await copyDirectory(source, destination, { recursive: false });
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(true);
    expect(await isDirectory(destinationDir2)).toBe(true);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect(await isFile(destinationFile3)).toBe(false);
  });

  it('should copy files only if option set', async () => {
    const path = join(tmpdir(), `testing-copy-directory-9-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');

    await copyDirectory(source, destination, { filesOnly: true });
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(true);
    expect(await isDirectory(destinationDir2)).toBe(false);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect((await readFile(destinationFile3)).toString()).toBe('file 3');
  });

  it('should copy files only and not recursively if option set', async () => {
    const path = join(tmpdir(), `testing-copy-directory-10-${Date.now()}`);
    const source = join(path, 'source');
    const sourceDir1 = join(source, 'dir1');
    const sourceDir2 = join(source, 'dir2');
    const sourceFile1 = join(source, 'file1');
    const sourceFile2 = join(source, 'file2');
    const sourceFile3 = join(sourceDir1, 'file3');
    await createDirectory(sourceDir1);
    await createDirectory(sourceDir2);
    await writeFile(sourceFile1, 'file 1');
    await writeFile(sourceFile2, 'file 2');
    await writeFile(sourceFile3, 'file 3');

    const destination = join(path, 'destination');
    const destinationDir1 = join(destination, 'dir1');
    const destinationDir2 = join(destination, 'dir2');
    const destinationFile1 = join(destination, 'file1');
    const destinationFile2 = join(destination, 'file2');
    const destinationFile3 = join(destinationDir1, 'file3');

    await copyDirectory(source, destination, { filesOnly: true, recursive: false });
    expect(await isDirectory(destination)).toBe(true);
    expect(await isDirectory(destinationDir1)).toBe(false);
    expect(await isDirectory(destinationDir2)).toBe(false);
    expect((await readFile(destinationFile1)).toString()).toBe('file 1');
    expect((await readFile(destinationFile2)).toString()).toBe('file 2');
    expect(await isFile(destinationFile3)).toBe(false);
  });
});
