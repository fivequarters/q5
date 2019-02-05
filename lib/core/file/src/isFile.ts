import fs from 'fs';
import { promisify } from 'util';

const lstat = promisify(fs.lstat);

export default async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}
