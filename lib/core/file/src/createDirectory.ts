import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import isDirectory from './isDirectory';

const mkdir = promisify(fs.mkdir);

export default async function createDirectory(
  path: string,
  options: {
    mode?: number;
    ensurePath?: boolean;
    errorIfExists?: boolean;
  } = {}
): Promise<void> {
  options.ensurePath = options.ensurePath === false ? false : true;

  if (await isDirectory(path)) {
    if (options.errorIfExists) {
      throw new Error(`Directory already exists: ${path}`);
    }

    return;
  }

  if (options.ensurePath) {
    const recursiveOptions = {
      ensurePath: true,
      mode: options.mode,
    };

    const parentPath = join(path, '..');
    await createDirectory(parentPath, recursiveOptions);
  }

  try {
    await mkdir(path, options.mode);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
