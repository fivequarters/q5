import fs from 'fs';
import { promisify } from 'util';

const access = promisify(fs.access);

export default async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
