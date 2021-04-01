import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const lstat = promisify(fs.lstat);

// ------------------
// Exported Functions
// ------------------

export async function isDirectory(path: string, followSymlinks?: boolean): Promise<boolean> {
  try {
    const stats = await lstat(path);
    if (!followSymlinks || !stats.isSymbolicLink()) {
      return stats.isDirectory();
    }
    return isDirectory(fs.realpathSync(path), followSymlinks);
  } catch (error) {
    return false;
  }
}
