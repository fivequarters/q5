import fs from 'fs';
import { promisify } from 'util';

const lstat = promisify(fs.lstat);

export default async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}
