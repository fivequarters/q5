import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const lstat = promisify(fs.lstat);

// ------------------
// Exported Functions
// ------------------

export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}
