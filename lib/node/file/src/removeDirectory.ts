import fs from 'fs';
import { promisify } from 'util';
import { isDirectory } from './isDirectory';
import { readDirectory } from './readDirectory';
import { removeFile } from './removeFile';

// ------------------
// Internal Constants
// ------------------

const rmdir = promisify(fs.rmdir);

// ------------------
// Exported Functions
// ------------------

export async function removeDirectory(
  path: string,
  options: {
    recursive?: boolean;
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  if (options.recursive !== false) {
    const items = await readDirectory(path, { joinPaths: true });
    for (const item of items) {
      if (await isDirectory(item)) {
        await removeDirectory(item, { recursive: true });
      } else {
        await removeFile(item);
      }
    }
  }

  try {
    await rmdir(path);
  } catch (error) {
    if (options.errorIfNotExist || error.code !== 'ENOENT') {
      throw error;
    }
  }
}
