import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const access = promisify(fs.access);

// ------------------
// Exported Functions
// ------------------

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
