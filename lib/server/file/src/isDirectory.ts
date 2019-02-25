import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const lstat = promisify(fs.lstat);

// ------------------
// Exported Functions
// ------------------

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}
