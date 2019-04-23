import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const unlink = promisify(fs.unlink);

// ------------------
// Exported Functions
// ------------------

export async function removeFile(
  path: string,
  options: {
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (options.errorIfNotExist || error.code !== 'ENOENT') {
      throw error;
    }
  }
}
